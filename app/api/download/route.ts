import { NextRequest, NextResponse } from 'next/server'
import { MAX_TRANSFER_BYTES } from '@/lib/config'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const SHARE_TOKEN_PATTERN = /^[A-Z2-9]{10}$/

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

function safeDownloadName(value: string) {
  return value.replace(/[\r\n"\\/]/g, '_').slice(0, 180) || 'download'
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    const fileId = typeof payload.fileId === 'string' ? payload.fileId : ''
    const token = typeof payload.token === 'string' ? payload.token.toUpperCase() : ''
    const password = typeof payload.password === 'string' ? payload.password : ''

    if (!fileId || !SHARE_TOKEN_PATTERN.test(token)) {
      return NextResponse.json({ error: 'Invalid download request' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: file, error: lookupError } = await admin
      .from('shared_files')
      .select('id, file_name, file_type, file_url, file_size, status, expires_at, max_downloads, download_count, password_hash')
      .eq('id', fileId)
      .eq('share_token', token)
      .maybeSingle()

    if (lookupError || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
    if (file.status !== 'active' || new Date(file.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'This file is no longer available' }, { status: 410 })
    }

    const currentCount = Number(file.download_count || 0)
    if (file.max_downloads && currentCount >= file.max_downloads) {
      return NextResponse.json({ error: 'The download limit has been reached' }, { status: 403 })
    }
    if (file.password_hash && (!password || await sha256(password) !== file.password_hash)) {
      return NextResponse.json({ error: 'Wrong password' }, { status: 401 })
    }
    if (Number(file.file_size || 0) > MAX_TRANSFER_BYTES) {
      return NextResponse.json({ error: 'This legacy file is too large for the current secure download route' }, { status: 413 })
    }

    const allowedCdn = process.env.BUNNY_CDN_HOSTNAME
    if (!allowedCdn) {
      return NextResponse.json({ error: 'File storage is not configured' }, { status: 503 })
    }

    const fileUrl = new URL(file.file_url)
    const allowedHost = new URL(allowedCdn.includes('://') ? allowedCdn : `https://${allowedCdn}`).host
    if (fileUrl.protocol !== 'https:' || fileUrl.host !== allowedHost) {
      console.error('Blocked unexpected file host:', fileUrl.host)
      return NextResponse.json({ error: 'File location is invalid' }, { status: 500 })
    }

    const storageResponse = await fetch(fileUrl, {
      cache: 'no-store',
      signal: AbortSignal.timeout(45_000),
    })
    if (!storageResponse.ok || !storageResponse.body) {
      return NextResponse.json({ error: 'The stored file could not be retrieved' }, { status: 502 })
    }

    let updateQuery = admin
      .from('shared_files')
      .update({ download_count: currentCount + 1 })
      .eq('id', file.id)

    updateQuery = file.download_count === null
      ? updateQuery.is('download_count', null)
      : updateQuery.eq('download_count', file.download_count)

    const { data: claimed, error: updateError } = await updateQuery
      .select('id')
      .maybeSingle()

    if (updateError || !claimed) {
      return NextResponse.json({ error: 'Another download started first. Please try again.' }, { status: 409 })
    }

    const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const { error: logError } = await admin.from('download_logs').insert({
      file_id: file.id,
      ip_address: forwardedFor,
      user_agent: req.headers.get('user-agent') || 'unknown',
      receiver_email: null,
      downloaded_at: new Date().toISOString(),
    })
    if (logError) console.error('Download log insert failed:', logError.message)

    const name = safeDownloadName(file.file_name)
    return new NextResponse(storageResponse.body, {
      status: 200,
      headers: {
        'Content-Type': file.file_type || storageResponse.headers.get('content-type') || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`,
        'Content-Length': String(file.file_size || storageResponse.headers.get('content-length') || ''),
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('Download route error:', error)
    return NextResponse.json({ error: 'Download failed. Please try again.' }, { status: 500 })
  }
}
