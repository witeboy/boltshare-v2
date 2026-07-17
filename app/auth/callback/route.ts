import { NextRequest, NextResponse } from 'next/server'

// Preserve older links while moving all confirmation through the user-initiated
// mobile callback page. The callback page performs the one-time exchange only
// after the user taps Confirm, which protects links from email scanners.
export async function GET(request: NextRequest) {
  const source = new URL(request.url)
  const target = new URL('/auth/mobile/callback', request.url)

  for (const key of [
    'code',
    'token_hash',
    'next',
    'error',
    'error_description',
  ]) {
    const value = source.searchParams.get(key)
    if (value) target.searchParams.set(key, value)
  }

  return NextResponse.redirect(target)
}
