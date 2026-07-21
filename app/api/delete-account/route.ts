import { NextResponse } from 'next/server'
import { createAdminClient, createServerClient } from '@/lib/supabase/server'
import { deletePendingStoredFile, deleteStoredFile } from '@/lib/storage-server'

export async function POST() {
  try {
    const userClient = await createServerClient()
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const email = user.email.toLowerCase()
    const { data: files, error: fileError } = await admin
      .from('shared_files')
      .select('id, bunny_path, file_url, storage_provider, storage_path')
      .eq('sender_email', email)
    if (fileError) throw fileError

    for (const file of files || []) {
      await deleteStoredFile(admin, file)
    }

    const { data: pendingUploads, error: pendingLookupError } = await admin
      .from('pending_uploads')
      .select('object_path, storage_provider, upload_id')
      .eq('user_id', user.id)
    if (pendingLookupError) throw pendingLookupError
    for (const upload of pendingUploads || []) {
      await deletePendingStoredFile(admin, upload)
    }
    const { error: pendingDeleteError } = await admin
      .from('pending_uploads')
      .delete()
      .eq('user_id', user.id)
    if (pendingDeleteError) throw pendingDeleteError

    const fileIds = (files || []).map(file => file.id)
    if (fileIds.length) {
      const { error: logsError } = await admin.from('download_logs').delete().in('file_id', fileIds)
      if (logsError) throw logsError
      const { error: filesError } = await admin.from('shared_files').delete().in('id', fileIds)
      if (filesError) throw filesError
    }
    const { error: membershipError } = await admin.from('org_members').delete().eq('user_email', email)
    if (membershipError) throw membershipError

    const { error: deleteUserError } = await admin.auth.admin.deleteUser(user.id)
    if (deleteUserError) throw deleteUserError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Account deletion failed:', error)
    return NextResponse.json({ error: 'Account deletion failed' }, { status: 500 })
  }
}
