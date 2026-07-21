import {
  CompleteMultipartUploadCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'
import { NextRequest, NextResponse } from 'next/server'
import { TRANSFER_TTL_HOURS } from '@/lib/config'
import {
  abortR2MultipartUpload,
  deleteR2Object,
  getR2Client,
  getR2Config,
  isR2ObjectPath,
} from '@/lib/r2'
import { createAdminClient, createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const SHARE_TOKEN_PATTERN = /^[A-Z2-9]{10}$/
const PASSWORD_HASH_PATTERN = /^[a-f0-9]{64}$/
const ETAG_PATTERN = /^"?[a-f0-9]{32}"?$/i

function cleanFileName(value: string) {
  return value.replace(/[\r\n\0]/g, '_').slice(0, 255) || 'file'
}

function cleanContentType(value: unknown) {
  if (typeof value !== 'string') return 'application/octet-stream'
  return value.replace(/[\r\n\0]/g, '').slice(0, 255) || 'application/octet-stream'
}

type CompletedPart = { partNumber: number; etag: string }

function validCompletedParts(value: unknown, expectedCount: number): value is CompletedPart[] {
  if (!Array.isArray(value) || value.length !== expectedCount) return false
  return value.every((part, index) => (
    Number(part?.partNumber) === index + 1 &&
    typeof part?.etag === 'string' &&
    ETAG_PATTERN.test(part.etag)
  ))
}

export async function POST(req: NextRequest) {
  let objectPath = ''
  let uploadId = ''
  let objectCompleted = false

  try {
    const userClient = await createServerClient()
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user?.email) {
      return NextResponse.json({ error: 'You must be signed in to finish uploads' }, { status: 401 })
    }

    const payload = await req.json()
    const fileName = cleanFileName(typeof payload.fileName === 'string' ? payload.fileName : '')
    const requestedType = cleanContentType(payload.fileType)
    const requestedSize = Number(payload.fileSize)
    objectPath = typeof payload.objectPath === 'string' ? payload.objectPath : ''
    uploadId = typeof payload.uploadId === 'string' ? payload.uploadId : ''
    const shareToken = typeof payload.shareToken === 'string' ? payload.shareToken.toUpperCase() : ''
    const maxDownloads = payload.maxDownloads === null ? null : Number(payload.maxDownloads)
    const passwordHash = typeof payload.passwordHash === 'string' ? payload.passwordHash : ''

    if (!isR2ObjectPath(objectPath, user.id) || !uploadId) {
      return NextResponse.json({ error: 'The uploaded file path is invalid' }, { status: 400 })
    }
    if (!Number.isSafeInteger(requestedSize) || requestedSize <= 0) {
      return NextResponse.json({ error: 'The file size is invalid' }, { status: 400 })
    }
    if (!SHARE_TOKEN_PATTERN.test(shareToken)) {
      return NextResponse.json({ error: 'Invalid share code' }, { status: 400 })
    }
    if (maxDownloads !== null && (!Number.isInteger(maxDownloads) || maxDownloads < 1 || maxDownloads > 1000)) {
      return NextResponse.json({ error: 'Invalid download limit' }, { status: 400 })
    }
    if (passwordHash && !PASSWORD_HASH_PATTERN.test(passwordHash)) {
      return NextResponse.json({ error: 'Invalid password protection data' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: pending, error: pendingError } = await admin
      .from('pending_uploads')
      .select('expected_size, expires_at, storage_provider, upload_id, part_size')
      .eq('object_path', objectPath)
      .eq('user_id', user.id)
      .maybeSingle()
    if (
      pendingError ||
      !pending ||
      pending.storage_provider !== 'r2' ||
      pending.upload_id !== uploadId ||
      new Date(pending.expires_at).getTime() <= Date.now() ||
      Number(pending.expected_size) !== requestedSize
    ) {
      return NextResponse.json({ error: 'The upload authorization is invalid or expired' }, { status: 400 })
    }

    const expectedPartCount = Math.ceil(requestedSize / Number(pending.part_size))
    if (!validCompletedParts(payload.parts, expectedPartCount)) {
      return NextResponse.json({ error: 'The completed upload parts are invalid' }, { status: 400 })
    }

    const { bucket } = getR2Config()
    const r2 = getR2Client()
    await r2.send(new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: objectPath,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: payload.parts.map((part: CompletedPart) => ({
          PartNumber: part.partNumber,
          ETag: part.etag,
        })),
      },
    }))
    objectCompleted = true

    const objectInfo = await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: objectPath }))
    const storedSize = Number(objectInfo.ContentLength || 0)
    if (storedSize !== requestedSize) {
      await deleteR2Object(objectPath)
      await admin.from('pending_uploads').delete().eq('object_path', objectPath)
      console.error('R2 object size verification failed:', { requestedSize, storedSize })
      return NextResponse.json({ error: 'The uploaded file could not be verified' }, { status: 400 })
    }

    const expiresAt = new Date(Date.now() + TRANSFER_TTL_HOURS * 60 * 60 * 1000).toISOString()
    const { data: row, error: databaseError } = await admin
      .from('shared_files')
      .insert({
        file_name: fileName,
        file_type: objectInfo.ContentType || requestedType,
        file_url: null,
        file_size: storedSize,
        bunny_path: null,
        storage_provider: 'r2',
        storage_path: objectPath,
        share_token: shareToken,
        sender_email: user.email.toLowerCase(),
        expires_at: expiresAt,
        expiry_hours: TRANSFER_TTL_HOURS,
        max_downloads: maxDownloads,
        password_hash: passwordHash || null,
        status: 'active',
        share_method: 'link',
      })
      .select('id, expires_at')
      .single()

    if (databaseError || !row) {
      await deleteR2Object(objectPath)
      await admin.from('pending_uploads').delete().eq('object_path', objectPath)
      console.error('Shared file insert failed:', databaseError?.message)
      return NextResponse.json({ error: 'The file uploaded, but the share could not be created' }, { status: 500 })
    }

    const { error: pendingDeleteError } = await admin
      .from('pending_uploads')
      .delete()
      .eq('object_path', objectPath)
    if (pendingDeleteError) console.error('Pending upload cleanup failed:', pendingDeleteError.message)

    return NextResponse.json({
      id: row.id,
      expiresAt: row.expires_at,
      fileName,
      fileSize: storedSize,
    })
  } catch (error) {
    if (objectPath) {
      try {
        if (objectCompleted) await deleteR2Object(objectPath)
        else if (uploadId) await abortR2MultipartUpload(objectPath, uploadId)
        const admin = createAdminClient()
        await admin.from('pending_uploads').delete().eq('object_path', objectPath)
      } catch (cleanupError) {
        console.error('Failed to clean up unsuccessful R2 upload:', cleanupError)
      }
    }
    console.error('Upload completion failed:', error)
    return NextResponse.json({ error: 'Upload could not be completed' }, { status: 500 })
  }
}
