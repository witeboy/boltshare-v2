import { NextResponse } from 'next/server'
import { getSupabasePublicConfig } from '@/lib/config'

export const dynamic = 'force-dynamic'

export async function GET() {
  const checkedAt = new Date().toISOString()
  try {
    const { url, anonKey } = getSupabasePublicConfig()
    const response = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anonKey },
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    })
    if (!response.ok) {
      return NextResponse.json(
        { status: 'degraded', authentication: 'unavailable', checkedAt },
        { status: 503, headers: { 'Cache-Control': 'no-store' } }
      )
    }
    return NextResponse.json(
      { status: 'healthy', authentication: 'available', checkedAt },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json(
      { status: 'degraded', authentication: 'unavailable', checkedAt },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
