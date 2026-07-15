import { createBrowserClient } from '@supabase/ssr'
import { getSupabasePublicConfig } from '@/lib/config'

let browserClient: ReturnType<typeof createBrowserClient> | undefined

export function createClient() {
  if (!browserClient) {
    const { url, anonKey } = getSupabasePublicConfig()
    browserClient = createBrowserClient(
      url,
      anonKey
    )
  }

  return browserClient
}
