import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel cron or with the secret
  const authHeader = req.headers.get('authorization')
  const secret     = process.env.CRON_SECRET || process.env.CLEANUP_SECRET

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now      = new Date().toISOString()

  // Find all expired active files
  const { data: expiredFiles, error: lookupError } = await supabase
    .from('shared_files')
    .select('id, bunny_path, file_name')
    .eq('status', 'active')
    .lt('expires_at', now)

  if (lookupError) {
    console.error('Expired-file lookup failed:', lookupError.message)
    return NextResponse.json({ error: 'Cleanup lookup failed' }, { status: 500 })
  }

  if (!expiredFiles || expiredFiles.length === 0) {
    return NextResponse.json({ message: 'No expired files', deleted: 0 })
  }

  let deleted = 0
  const errors: string[] = []

  for (const file of expiredFiles) {
    try {
      // Delete from Bunny CDN
      if (file.bunny_path) {
        const storageZone = process.env.BUNNY_STORAGE_ZONE
        const storageHost = process.env.BUNNY_STORAGE_HOST
        const storagePass = process.env.BUNNY_STORAGE_PASSWORD

        if (storageZone && storageHost && storagePass) {
          const storageResponse = await fetch(
            `https://${storageHost}/${storageZone}${file.bunny_path}`,
            { method: 'DELETE', headers: { AccessKey: storagePass }, signal: AbortSignal.timeout(15_000) }
          )
          if (!storageResponse.ok && storageResponse.status !== 404) {
            throw new Error(`Bunny delete failed with ${storageResponse.status}`)
          }
        } else {
          throw new Error('Bunny storage is not configured')
        }
      }

      // Mark as expired in Supabase
      const { error: updateError } = await supabase
        .from('shared_files')
        .update({ status: 'expired' })
        .eq('id', file.id)

      if (updateError) throw updateError

      deleted++
    } catch (err) {
      console.error('Cleanup failed for file:', file.id, err)
      errors.push(file.id)
    }
  }

  return NextResponse.json({
    message:  `Cleanup complete`,
    deleted,
    errors:   errors.length,
    total:    expiredFiles.length,
  })
}
