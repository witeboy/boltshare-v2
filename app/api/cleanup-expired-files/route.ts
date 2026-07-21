import { NextRequest, NextResponse } from 'next/server'
import { TRANSFER_BUCKET } from '@/lib/config'
import { createAdminClient } from '@/lib/supabase/server'
import { deleteStoredFile } from '@/lib/storage-server'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel cron or with the secret
  const authHeader = req.headers.get('authorization')
  const secret     = process.env.CRON_SECRET || process.env.CLEANUP_SECRET

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now      = new Date().toISOString()

  // Keep each invocation bounded; an hourly cron will continue draining a backlog.
  const { data: expiredFiles, error: lookupError } = await supabase
    .from('shared_files')
    .select('id, bunny_path, file_url, storage_provider, storage_path')
    .lte('expires_at', now)
    .order('expires_at', { ascending: true })
    .limit(200)

  if (lookupError) {
    console.error('Expired-file lookup failed:', lookupError.message)
    return NextResponse.json({ error: 'Cleanup lookup failed' }, { status: 500 })
  }

  const { data: abandonedUploads, error: abandonedLookupError } = await supabase
    .from('pending_uploads')
    .select('object_path')
    .lte('expires_at', now)
    .order('expires_at', { ascending: true })
    .limit(200)

  if (abandonedLookupError) {
    console.error('Abandoned-upload lookup failed:', abandonedLookupError.message)
    return NextResponse.json({ error: 'Cleanup lookup failed' }, { status: 500 })
  }

  let deleted = 0
  let abandonedDeleted = 0
  const errors: string[] = []

  for (const file of expiredFiles) {
    try {
      await deleteStoredFile(supabase, file)

      // Deleting the transfer record also deletes associated download logs.
      const { error: deleteError } = await supabase
        .from('shared_files')
        .delete()
        .eq('id', file.id)

      if (deleteError) throw deleteError

      deleted++
    } catch (err) {
      console.error('Cleanup failed for file:', file.id, err)
      errors.push(file.id)
    }
  }

  for (const upload of abandonedUploads || []) {
    try {
      // A finalized share wins if its pending marker survived a transient DB error.
      const { data: activeShare, error: shareLookupError } = await supabase
        .from('shared_files')
        .select('id')
        .eq('storage_path', upload.object_path)
        .maybeSingle()
      if (shareLookupError) throw shareLookupError

      if (!activeShare) {
        const { error: storageError } = await supabase.storage
          .from(TRANSFER_BUCKET)
          .remove([upload.object_path])
        if (storageError) throw storageError
      }

      const { error: pendingDeleteError } = await supabase
        .from('pending_uploads')
        .delete()
        .eq('object_path', upload.object_path)
      if (pendingDeleteError) throw pendingDeleteError
      abandonedDeleted++
    } catch (err) {
      console.error('Abandoned upload cleanup failed:', upload.object_path, err)
      errors.push(upload.object_path)
    }
  }

  return NextResponse.json({
    message:  'Cleanup complete',
    deleted,
    abandonedDeleted,
    errors:   errors.length,
    total:    (expiredFiles?.length || 0) + (abandonedUploads?.length || 0),
  })
}
