import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerClient } from '@/lib/supabase/server'

function hostname(value: string) {
  return new URL(value.includes('://') ? value : `https://${value}`).host
}

export async function POST(req: NextRequest) {
  try {
    const userClient = await createServerClient()
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { fileId } = await req.json()
    if (typeof fileId !== 'string' || !fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: file, error: fileError } = await admin
      .from('shared_files')
      .select('id, bunny_path')
      .eq('id', fileId)
      .eq('sender_email', user.email.toLowerCase())
      .maybeSingle()

    if (fileError || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    if (file.bunny_path) {
      const storageZone = process.env.BUNNY_STORAGE_ZONE
      const storageHost = process.env.BUNNY_STORAGE_HOST
      const storagePassword = process.env.BUNNY_STORAGE_PASSWORD
      if (!storageZone || !storageHost || !storagePassword) {
        return NextResponse.json({ error: 'File storage is not configured' }, { status: 503 })
      }

      const deleteUrl = `https://${hostname(storageHost)}/${encodeURIComponent(storageZone)}${file.bunny_path}`
      const storageResponse = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: { AccessKey: storagePassword },
        signal: AbortSignal.timeout(15_000),
      })

      if (!storageResponse.ok && storageResponse.status !== 404) {
        return NextResponse.json({ error: 'Stored file could not be deleted' }, { status: 502 })
      }
    }

    const { error: deleteError } = await admin.from('shared_files').delete().eq('id', file.id)
    if (deleteError) {
      console.error('Shared file delete failed:', deleteError.message)
      return NextResponse.json({ error: 'File record could not be deleted' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete route error:', error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
