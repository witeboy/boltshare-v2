import { NextRequest, NextResponse } from 'next/server'
import { TRANSFER_BUCKET, TRANSFER_TTL_HOURS } from '@/lib/config'
import { createAdminClient, createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const SHARE_TOKEN_PATTERN = /^[A-Z2-9]{10}$/
const PASSWORD_HASH_PATTERN = /^[a-f0-9]{64}$/
const OBJECT_ID_PATTERN = /^[a-f0-9-]{36}$/

function cleanFileName(value: string) {
  return value.replace(/[\r\n\0]/g, '_').slice(0, 255) || 'file'
}

export async function POST(req: NextRequest) {
  let uploadedPath = ''

  try {
    const userClient = await createServerClient()
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user?.email) {
      return NextResponse.json({ error: 'You must be signed in to finish uploads' }, { status: 401 })
    }

    const payload = await req.json()
    const fileName = cleanFileName(typeof payload.fileName === 'string' ? payload.fileName : '')
    const requestedType = typeof payload.fileType === 'string'
      ? payload.fileType.slice(0, 255)
      : 'application/octet-stream'
    const requestedSize = Number(payload.fileSize)
    const objectPath = typeof payload.objectPath === 'string' ? payload.objectPath : ''
    const shareToken = typeof payload.shareToken === 'string' ? payload.shareToken.toUpperCase() : ''
    const maxDownloads = payload.maxDownloads === null ? null : Number(payload.maxDownloads)
    const passwordHash = typeof payload.passwordHash === 'string' ? payload.passwordHash : ''
    const [ownerId, objectId, ...extraSegments] = objectPath.split('/')

    if (
      ownerId !== user.id ||
      !OBJECT_ID_PATTERN.test(objectId || '') ||
      extraSegments.length > 0
    ) {
      return NextResponse.json({ error: 'The uploaded file path is invalid' }, { status: 400 })
    }
    uploadedPath = objectPath
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
      .select('expected_size, expires_at')
      .eq('object_path', objectPath)
      .eq('user_id', user.id)
      .maybeSingle()
    if (
      pendingError ||
      !pending ||
      new Date(pending.expires_at).getTime() <= Date.now() ||
      Number(pending.expected_size) !== requestedSize
    ) {
      return NextResponse.json({ error: 'The upload authorization is invalid or expired' }, { status: 400 })
    }

    const { data: objectInfo, error: infoError } = await admin.storage
      .from(TRANSFER_BUCKET)
      .info(objectPath)
    const storedSize = Number(objectInfo?.size ?? objectInfo?.metadata?.size ?? 0)

    if (infoError || !objectInfo || storedSize !== requestedSize) {
      if (objectInfo) {
        await admin.storage.from(TRANSFER_BUCKET).remove([objectPath]).catch(() => undefined)
      }
      await admin.from('pending_uploads').delete().eq('object_path', objectPath)
      console.error('Uploaded object verification failed:', infoError?.message, { requestedSize, storedSize })
      return NextResponse.json({ error: 'The uploaded file could not be verified' }, { status: 400 })
    }

    const expiresAt = new Date(Date.now() + TRANSFER_TTL_HOURS * 60 * 60 * 1000).toISOString()
    const { data: row, error: databaseError } = await admin
      .from('shared_files')
      .insert({
        file_name: fileName,
        file_type: objectInfo.contentType || requestedType || 'application/octet-stream',
        file_url: null,
        file_size: storedSize,
        bunny_path: null,
        storage_provider: 'supabase',
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
      await admin.storage.from(TRANSFER_BUCKET).remove([objectPath]).catch(() => undefined)
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
    if (uploadedPath) {
      const admin = createAdminClient()
      await admin.storage.from(TRANSFER_BUCKET).remove([uploadedPath]).catch(() => undefined)
      await admin.from('pending_uploads').delete().eq('object_path', uploadedPath)
    }
    console.error('Upload completion failed:', error)
    return NextResponse.json({ error: 'Upload could not be completed' }, { status: 500 })
  }
}
