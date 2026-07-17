export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://boltshare.rcinc.app'

export const NATIVE_AUTH_CALLBACK_URL =
  process.env.NEXT_PUBLIC_NATIVE_AUTH_CALLBACK_URL ||
  'boltshare://auth/callback'

// Vercel Functions reject request or response bodies above 4.5 MB. Keep a
// safety margin for multipart form-data overhead until direct-to-storage
// uploads are enabled for this deployment.
export const MAX_TRANSFER_BYTES = 4_000_000

export function getSupabasePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('BoltShare authentication is not configured')
  }

  let parsedUrl: URL

  try {
    parsedUrl = new URL(url)
  } catch {
    throw new Error('BoltShare authentication URL is invalid')
  }

  if (
    parsedUrl.protocol !== 'https:' ||
    !parsedUrl.hostname.endsWith('.supabase.co')
  ) {
    throw new Error('BoltShare authentication URL is invalid')
  }

  return {
    url: parsedUrl.toString().replace(/\/$/, ''),
    anonKey,
  }
}

export function getSupabaseServiceRoleKey() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error('Supabase service role is not configured')
  }

  return serviceRoleKey
}
