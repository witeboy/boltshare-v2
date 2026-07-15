import { NextRequest, NextResponse } from 'next/server'
import { MAX_TRANSFER_BYTES } from '@/lib/config'
import { createAdminClient, createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const SHARE_TOKEN_PATTERN = /^[A-Z2-9]{10}$/
const PASSWORD_HASH_PATTERN = /^[a-f0-9]{64}$/
const ALLOWED_EXPIRY_HOURS = new Set([1, 6, 24, 72, 168])

function hostname(value: string) {
  const url = new URL(value.includes('://') ? value : `https://${value}`)
  if (url.protocol !== 'https:') throw new Error('Storage host must use HTTPS')
  return url.host
}

export async function POST(req: NextRequest) {
  let uploadedUrl: string | null = null

  try {
    const userClient = await createServerClient()
    const { data: { user }, error: authError } = await userClient.auth.getUser()

    if (authError || !user?.email) {
      return NextResponse.json({ error: 'You must be signed in to upload files' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file')
    const requestedName = String(formData.get('fileName') || '')
    const requestedType = String(formData.get('fileType') || '')
    const shareToken = String(formData.get('shareToken') || '').toUpperCase()
    const expiresAt = String(formData.get('expiresAt') || '')
    const expiryHours = Number(formData.get('expiryHours'))
    const maxDownloadsRaw = String(formData.get('maxDownloads') || '')
    const passwordHash = String(formData.get('passwordHash') || '')

    if (!(file instanceof File) || !requestedName) {
      return NextResponse.json({ error: 'A file is required' }, { status: 400 })
    }
    if (file.size <= 0 || file.size > MAX_TRANSFER_BYTES) {
      return NextResponse.json({ error: 'Each file must be 4 MB or smaller' }, { status: 413 })
    }
    if (!SHARE_TOKEN_PATTERN.test(shareToken)) {
      return NextResponse.json({ error: 'Invalid share code' }, { status: 400 })
    }
    if (!ALLOWED_EXPIRY_HOURS.has(expiryHours)) {
      return NextResponse.json({ error: 'Invalid expiry period' }, { status: 400 })
    }

    const expiryDate = new Date(expiresAt)
    const maximumExpiry = Date.now() + (168 * 60 * 60 * 1000) + 60_000
    if (!Number.isFinite(expiryDate.getTime()) || expiryDate.getTime() <= Date.now() || expiryDate.getTime() > maximumExpiry) {
      return NextResponse.json({ error: 'Invalid expiry date' }, { status: 400 })
    }

    const maxDownloads = maxDownloadsRaw ? Number(maxDownloadsRaw) : null
    if (maxDownloads !== null && (!Number.isInteger(maxDownloads) || maxDownloads < 1 || maxDownloads > 1000)) {
      return NextResponse.json({ error: 'Invalid download limit' }, { status: 400 })
    }
    if (passwordHash && !PASSWORD_HASH_PATTERN.test(passwordHash)) {
      return NextResponse.json({ error: 'Invalid password protection data' }, { status: 400 })
    }

    const storageZone = process.env.BUNNY_STORAGE_ZONE
    const storageHost = process.env.BUNNY_STORAGE_HOST
    const storagePassword = process.env.BUNNY_STORAGE_PASSWORD
    const cdnHostname = process.env.BUNNY_CDN_HOSTNAME

    if (!storageZone || !storageHost || !storagePassword || !cdnHostname) {
      return NextResponse.json({ error: 'File storage is not configured' }, { status: 503 })
    }

    const safeFileName = requestedName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180) || 'file'
    const uniqueId = crypto.randomUUID().replace(/-/g, '')
    const bunnyPath = `/boltshare/shared/${uniqueId}-${safeFileName}`
    const uploadUrl = `https://${hostname(storageHost)}/${encodeURIComponent(storageZone)}${bunnyPath}`
    const fileUrl = `https://${hostname(cdnHostname)}${bunnyPath}`
    uploadedUrl = uploadUrl

    const bunnyResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        AccessKey: storagePassword,
        'Content-Type': requestedType || file.type || 'application/octet-stream',
      },
      body: await file.arrayBuffer(),
      signal: AbortSignal.timeout(55_000),
    })

    if (!bunnyResponse.ok) {
      console.error('Bunny upload failed:', bunnyResponse.status, await bunnyResponse.text())
      return NextResponse.json({ error: 'File storage rejected the upload' }, { status: 502 })
    }

    const admin = createAdminClient()
    const { data: row, error: databaseError } = await admin
      .from('shared_files')
      .insert({
        file_name: safeFileName,
        file_type: requestedType || file.type || 'application/octet-stream',
        file_url: fileUrl,
        file_size: file.size,
        bunny_path: bunnyPath,
        share_token: shareToken,
        sender_email: user.email.toLowerCase(),
        expires_at: expiryDate.toISOString(),
        expiry_hours: expiryHours,
        max_downloads: maxDownloads,
        password_hash: passwordHash || null,
        status: 'active',
        share_method: 'link',
      })
      .select('id')
      .single()

    if (databaseError || !row) {
      await fetch(uploadUrl, {
        method: 'DELETE',
        headers: { AccessKey: storagePassword },
        signal: AbortSignal.timeout(10_000),
      }).catch(() => undefined)
      console.error('Shared file insert failed:', databaseError?.message)
      return NextResponse.json({ error: 'The file uploaded, but the share could not be created' }, { status: 500 })
    }

    return NextResponse.json({
      id: row.id,
      bunnyPath,
      fileUrl,
      fileName: safeFileName,
      fileSize: file.size,
    })
  } catch (error) {
    console.error('Upload route error:', error, uploadedUrl ? 'after storage upload started' : 'before storage upload')
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
  }
}
