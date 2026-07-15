import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getSupabasePublicConfig, getSupabaseServiceRoleKey } from '@/lib/config'

/**
 * Creates a user-scoped Supabase client for Route Handlers and Server Components.
 * The cookie bridge is what lets a PKCE magic-link exchange persist a browser session.
 */
export async function createServerClient() {
  const cookieStore = await cookies()
  const { url, anonKey } = getSupabasePublicConfig()

  return createSupabaseServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Server Components cannot write cookies. Route Handlers can, which
            // covers authentication callbacks and all state-changing API routes.
          }
        },
      },
    }
  )
}

export function createAdminClient() {
  const { url } = getSupabasePublicConfig()
  return createSupabaseClient(
    url,
    getSupabaseServiceRoleKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
