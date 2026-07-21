import { AbortMultipartUploadCommand, CreateMultipartUploadCommand } from '@aws-sdk/client-s3'
import { NextRequest, NextResponse } from 'next/server'
import {
  chooseR2PartSize,
  getMaxTransferBytes,
  getR2Client,
  getR2Config,
  MAX_PENDING_UPLOADS_PER_USER,
} from '@/lib/r2'
import { createAdminClient, createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function cleanContentType(value: unknown) {
  if (typeof value !== 'string') return 'application/octet-stream'
  const cleaned = value.replace(/[\r\n\0]/g, '').slice(0, 255)
  return cleaned || 'application/octet-stream'
}

export async function POST(req: NextRequest) {
  let objectPath = ''
  let uploadId = ''

  try {
    const userClient = await createServerClient()
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'You must be signed in to upload files' }, { status: 401 })
    }

    const payload = await req.json()
    const fileSize = Number(payload.fileSize)
    const maxFileSize = getMaxTransferBytes()
    if (!Number.isSafeInteger(fileSize) || fileSize <= 0 || fileSize > maxFileSize) {
      return NextResponse.json({ error: 'The file size exceeds the storage limit' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { count, error: countError } = await admin
      .from('pending_uploads')
      .select('object_path', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gt('expires_at', new Date().toISOString())
    if (countError) throw countError
    if ((count || 0) >= MAX_PENDING_UPLOADS_PER_USER) {
      return NextResponse.json(
        { error: 'Too many unfinished uploads. Try again after they expire.' },
        { status: 429 },
      )
    }

    const partSize = chooseR2PartSize(fileSize)
    const { bucket } = getR2Config()
    objectPath = `${user.id}/${crypto.randomUUID()}`
    const multipart = await getR2Client().send(new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: objectPath,
      ContentType: cleanContentType(payload.fileType),
      Metadata: {
        owner: user.id,
        expected_size: String(fileSize),
      },
    }))
    uploadId = multipart.UploadId || ''
    if (!uploadId) throw new Error('R2 did not create a multipart upload')

    const { error: pendingError } = await admin.from('pending_uploads').insert({
      object_path: objectPath,
      user_id: user.id,
      expected_size: fileSize,
      storage_provider: 'r2',
      upload_id: uploadId,
      part_size: partSize,
    })
    if (pendingError) throw pendingError

    return NextResponse.json({
      objectPath,
      uploadId,
      partSize,
      partCount: Math.ceil(fileSize / partSize),
    })
  } catch (error) {
    if (objectPath && uploadId) {
      try {
        const { bucket } = getR2Config()
        await getR2Client().send(new AbortMultipartUploadCommand({
          Bucket: bucket,
          Key: objectPath,
          UploadId: uploadId,
        }))
      } catch (abortError) {
        console.error('Failed to abort unregistered R2 upload:', abortError)
      }
    }
    console.error('Upload authorization failed:', error)
    return NextResponse.json({ error: 'Upload could not be authorized' }, { status: 500 })
  }
}
