import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerClient } from '@/lib/supabase/server'
import { deleteStoredFile } from '@/lib/storage-server'

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
      .select('id, bunny_path, file_url, storage_provider, storage_path')
      .eq('id', fileId)
      .eq('sender_email', user.email.toLowerCase())
      .maybeSingle()

    if (fileError || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    await deleteStoredFile(admin, file)

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
