import { NextResponse } from 'next/server'
import { createAdminClient, createServerClient } from '@/lib/supabase/server'

function hostname(value: string) {
  const url = new URL(value.includes('://') ? value : `https://${value}`)
  if (url.protocol !== 'https:') throw new Error('Storage host must use HTTPS')
  return url.host
}

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
      .select('id, bunny_path')
      .eq('sender_email', email)
    if (fileError) throw fileError

    const storageZone = process.env.BUNNY_STORAGE_ZONE
    const storageHost = process.env.BUNNY_STORAGE_HOST
    const storagePassword = process.env.BUNNY_STORAGE_PASSWORD
    if ((files?.some(file => file.bunny_path) ?? false) && (!storageZone || !storageHost || !storagePassword)) {
      return NextResponse.json({ error: 'File storage is not configured' }, { status: 503 })
    }

    for (const file of files || []) {
      if (!file.bunny_path) continue
      const deleteUrl = `https://${hostname(storageHost!)}/${encodeURIComponent(storageZone!)}${file.bunny_path}`
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: { AccessKey: storagePassword! },
        signal: AbortSignal.timeout(15_000),
      })
      if (!response.ok && response.status !== 404) {
        return NextResponse.json({ error: 'One or more stored files could not be deleted' }, { status: 502 })
      }
    }

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
