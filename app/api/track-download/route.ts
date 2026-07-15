import { NextResponse } from 'next/server'

// Download counting is performed only after /api/download has validated the
// share and claimed a download slot. Keeping this endpoint disabled prevents
// anonymous callers from inflating analytics without downloading a file.
export async function POST() {
  return NextResponse.json(
    { error: 'Use the secure download endpoint' },
    { status: 410, headers: { 'Cache-Control': 'no-store' } }
  )
}
