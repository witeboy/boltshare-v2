import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { fileId, receiverEmail } = await req.json()

    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get current file to check max downloads
    const { data: file } = await supabase
      .from('shared_files')
      .select('id, download_count, max_downloads, sender_email, file_name, notify_on_download')
      .eq('id', fileId)
      .single()

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Check max downloads
    if (file.max_downloads && file.download_count >= file.max_downloads) {
      return NextResponse.json({ error: 'Max downloads reached' }, { status: 403 })
    }

    // Increment download count
    await supabase
      .from('shared_files')
      .update({ download_count: (file.download_count || 0) + 1 })
      .eq('id', fileId)

    // Log the download
    await supabase.from('download_logs').insert({
      file_id:        fileId,
      ip_address:     req.headers.get('x-forwarded-for') || 'unknown',
      user_agent:     req.headers.get('user-agent') || 'unknown',
      receiver_email: receiverEmail || null,
      downloaded_at:  new Date().toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('track-download error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}