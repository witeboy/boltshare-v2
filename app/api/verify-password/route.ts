import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json()

    if (!token || !password) {
      return NextResponse.json({ error: 'token and password are required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get the file with password hash
    const { data: file, error: fileError } = await supabase
      .from('shared_files')
      .select('id, password_hash')
      .eq('share_token', token)
      .limit(1)
      .maybeSingle()

    if (fileError || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    if (!file.password_hash) {
      // No password set — allow access
      return NextResponse.json({ valid: true })
    }

    // Hash the submitted password using SHA-256 and compare
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    const valid = hashHex === file.password_hash

    return NextResponse.json({ valid })
  } catch (error) {
    console.error('verify-password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
