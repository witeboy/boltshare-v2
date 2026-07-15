import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const SHARE_TOKEN_PATTERN = /^[A-Z2-9]{10}$/

export async function GET(_req: NextRequest, context: RouteContext<'/api/share/[token]'>) {
  const { token: rawToken } = await context.params
  const token = rawToken.toUpperCase()

  if (!SHARE_TOKEN_PATTERN.test(token)) {
    return NextResponse.json({ error: 'Share not found' }, { status: 404 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('shared_files')
    .select('id, file_name, file_type, file_size, status, expires_at, max_downloads, download_count, password_hash, created_at')
    .eq('share_token', token)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Share lookup failed:', error.message)
    return NextResponse.json({ error: 'Share is temporarily unavailable' }, { status: 503 })
  }

  if (!data?.length) {
    return NextResponse.json({ error: 'This link is invalid or has been removed' }, { status: 404 })
  }

  const files = data.map(file => ({
    id: file.id,
    fileName: file.file_name,
    fileType: file.file_type,
    fileSize: Number(file.file_size || 0),
    status: file.status,
    expiresAt: file.expires_at,
    maxDownloads: file.max_downloads,
    downloadCount: file.download_count || 0,
    passwordProtected: Boolean(file.password_hash),
  }))

  return NextResponse.json(
    { files },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } }
  )
}
