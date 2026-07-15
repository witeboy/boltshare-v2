import { NextResponse } from 'next/server'

// Password verification is intentionally coupled to the download request so a
// successful check cannot be replayed against a public storage URL.
export async function POST() {
  return NextResponse.json(
    { error: 'Password verification is part of the secure download request' },
    { status: 410, headers: { 'Cache-Control': 'no-store' } }
  )
}
