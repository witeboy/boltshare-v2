import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseTusEndpoint, TRANSFER_BUCKET } from '@/lib/config'
import { createAdminClient, createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const userClient = await createServerClient()
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'You must be signed in to upload files' }, { status: 401 })
    }

    const payload = await req.json()
    const fileSize = Number(payload.fileSize)
    if (!Number.isSafeInteger(fileSize) || fileSize <= 0) {
      return NextResponse.json({ error: 'The file size is invalid' }, { status: 400 })
    }

    const objectPath = `${user.id}/${crypto.randomUUID()}`
    const admin = createAdminClient()
    const { error: pendingError } = await admin.from('pending_uploads').insert({
      object_path: objectPath,
      user_id: user.id,
      expected_size: fileSize,
    })
    if (pendingError) {
      console.error('Pending upload registration failed:', pendingError.message)
      return NextResponse.json({ error: 'Upload could not be prepared' }, { status: 500 })
    }

    const { data, error } = await admin.storage
      .from(TRANSFER_BUCKET)
      .createSignedUploadUrl(objectPath)

    if (error || !data?.token) {
      await admin.from('pending_uploads').delete().eq('object_path', objectPath)
      console.error('Signed upload authorization failed:', error?.message)
      return NextResponse.json({ error: 'File storage is not configured' }, { status: 503 })
    }

    return NextResponse.json({
      bucketName: TRANSFER_BUCKET,
      objectPath,
      uploadEndpoint: getSupabaseTusEndpoint(),
      uploadToken: data.token,
    })
  } catch (error) {
    console.error('Upload authorization failed:', error)
    return NextResponse.json({ error: 'Upload could not be authorized' }, { status: 500 })
  }
}
