import { UploadPartCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { NextRequest, NextResponse } from 'next/server'
import { getR2Client, getR2Config, isR2ObjectPath } from '@/lib/r2'
import { createAdminClient, createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const MAX_URLS_PER_REQUEST = 50

export async function POST(req: NextRequest) {
  try {
    const userClient = await createServerClient()
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'You must be signed in to continue uploading' }, { status: 401 })
    }

    const payload = await req.json()
    const objectPath = typeof payload.objectPath === 'string' ? payload.objectPath : ''
    const uploadId = typeof payload.uploadId === 'string' ? payload.uploadId : ''
    const partNumbers: number[] = Array.isArray(payload.partNumbers)
      ? payload.partNumbers.map((value: unknown) => Number(value))
      : []
    if (
      !isR2ObjectPath(objectPath, user.id) ||
      !uploadId ||
      partNumbers.length < 1 ||
      partNumbers.length > MAX_URLS_PER_REQUEST ||
      new Set(partNumbers).size !== partNumbers.length
    ) {
      return NextResponse.json({ error: 'The upload part request is invalid' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: pending, error: pendingError } = await admin
      .from('pending_uploads')
      .select('expected_size, expires_at, storage_provider, upload_id, part_size')
      .eq('object_path', objectPath)
      .eq('user_id', user.id)
      .maybeSingle()
    if (
      pendingError ||
      !pending ||
      pending.storage_provider !== 'r2' ||
      pending.upload_id !== uploadId ||
      new Date(pending.expires_at).getTime() <= Date.now()
    ) {
      return NextResponse.json({ error: 'The upload authorization is invalid or expired' }, { status: 400 })
    }

    const expectedParts = Math.ceil(Number(pending.expected_size) / Number(pending.part_size))
    if (partNumbers.some(part => !Number.isInteger(part) || part < 1 || part > expectedParts)) {
      return NextResponse.json({ error: 'The upload part number is invalid' }, { status: 400 })
    }

    const { bucket } = getR2Config()
    const r2 = getR2Client()
    const urls = await Promise.all(partNumbers.map(async partNumber => ({
      partNumber,
      url: await getSignedUrl(
        r2,
        new UploadPartCommand({
          Bucket: bucket,
          Key: objectPath,
          UploadId: uploadId,
          PartNumber: partNumber,
        }),
        { expiresIn: 15 * 60 },
      ),
    })))

    return NextResponse.json(
      { urls },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    )
  } catch (error) {
    console.error('Upload part signing failed:', error)
    return NextResponse.json({ error: 'Upload parts could not be authorized' }, { status: 500 })
  }
}
