import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    // Verify auth
    const authHeader = req.headers.get('authorization')
    const supabase = createAdminClient()

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const { data } = await supabase.auth.getUser(token)
      if (!data.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const { bunnyPath } = await req.json()

    if (!bunnyPath) {
      return NextResponse.json({ error: 'bunnyPath is required' }, { status: 400 })
    }

    const storageZone = process.env.BUNNY_STORAGE_ZONE
    const storageHost = process.env.BUNNY_STORAGE_HOST
    const storagePass = process.env.BUNNY_STORAGE_PASSWORD

    if (!storageZone || !storageHost || !storagePass) {
      return NextResponse.json({ error: 'Bunny CDN not configured' }, { status: 500 })
    }

    const deleteUrl = `https://${storageHost}/${storageZone}${bunnyPath}`

    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        AccessKey: storagePass,
      },
    })

    if (!response.ok && response.status !== 404) {
      return NextResponse.json(
        { error: `Bunny delete failed: ${response.status}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('delete-from-bunny error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}