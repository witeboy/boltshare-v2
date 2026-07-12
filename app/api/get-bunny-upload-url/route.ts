import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'You must be signed in to upload files' }, { status: 401 })
    }

    const formData   = await req.formData()
    const file       = formData.get('file') as File
    const fileName   = formData.get('fileName') as string || file?.name
    const fileType   = formData.get('fileType') as string || file?.type

    if (!file || !fileName) {
      return NextResponse.json({ error: 'file and fileName are required' }, { status: 400 })
    }

    const uniqueId     = crypto.randomUUID().replace(/-/g, '').substring(0, 16)
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._\-]/g, '_').substring(0, 200)
    const bunnyPath    = `/boltshare/shared/${uniqueId}-${safeFileName}`

    const storageZone = process.env.BUNNY_STORAGE_ZONE
    const storageHost = process.env.BUNNY_STORAGE_HOST
    const storagePass = process.env.BUNNY_STORAGE_PASSWORD
    const cdnHostname = process.env.BUNNY_CDN_HOSTNAME

    if (!storageZone || !storageHost || !storagePass || !cdnHostname) {
      return NextResponse.json({ error: 'Bunny CDN not configured' }, { status: 500 })
    }

    const uploadUrl = `https://${storageHost}/${storageZone}${bunnyPath}`

    // Upload file to Bunny from the server — no CORS issues
    const fileBuffer = await file.arrayBuffer()
    const bunnyRes   = await fetch(uploadUrl, {
      method:  'PUT',
      headers: {
        AccessKey:       storagePass,
        'Content-Type':  fileType || 'application/octet-stream',
      },
      body: fileBuffer,
    })

    if (!bunnyRes.ok) {
      const errText = await bunnyRes.text()
      console.error('Bunny upload failed:', bunnyRes.status, errText)
      return NextResponse.json(
        { error: `Bunny upload failed: ${bunnyRes.status}` },
        { status: 500 }
      )
    }

    const fileUrl = `https://${cdnHostname}${bunnyPath}`

    return NextResponse.json({
      bunnyPath,
      fileUrl,
      fileName:  safeFileName,
      fileSize:  file.size,
      fileType:  fileType || 'application/octet-stream',
    })
  } catch (error) {
    console.error('upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
