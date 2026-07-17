'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { NATIVE_AUTH_CALLBACK_URL } from '@/lib/config'

const AUTH_CALLBACK_MESSAGE = 'BOLTSHARE_AUTH_CALLBACK'
const AUTH_BRIDGE_READY_MESSAGE = 'BOLTSHARE_AUTH_BRIDGE_READY'

/*
 * These are the normal local origins used by a Capacitor wrapper.
 * The parent page is the native wrapper, while BoltShare runs inside
 * the child iframe.
 */
const ALLOWED_NATIVE_PARENT_ORIGINS = new Set([
  'capacitor://localhost',
  'http://localhost',
  'https://localhost',
])

interface NativeAuthCallbackMessage {
  type: typeof AUTH_CALLBACK_MESSAGE
  url: string
}

function isNativeAuthCallbackMessage(
  value: unknown,
): value is NativeAuthCallbackMessage {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    candidate.type === AUTH_CALLBACK_MESSAGE &&
    typeof candidate.url === 'string'
  )
}

function isExpectedNativeCallback(rawUrl: string) {
  try {
    const received = new URL(rawUrl)
    const expected = new URL(NATIVE_AUTH_CALLBACK_URL)

    return (
      received.protocol === expected.protocol &&
      received.hostname === expected.hostname &&
      received.pathname === expected.pathname
    )
  } catch {
    return false
  }
}

export function NativeAuthBridge() {
  /*
   * Prevent the same deep link from being exchanged more than once.
   * Supabase authorization codes are single-use.
   */
  const processingUrlRef = useRef<string | null>(null)

  useEffect(() => {
    /*
     * Do nothing when BoltShare is opened as a normal website.
     * The bridge is needed only when the site is inside the wrapper iframe.
     */
    if (window.parent === window) {
      return
    }

    const handleMessage = async (event: MessageEvent<unknown>) => {
      /*
       * Accept messages only from our immediate iframe parent.
       */
      if (event.source !== window.parent) {
        return
      }

      /*
       * Do not accept callback messages from arbitrary websites.
       */
      if (!ALLOWED_NATIVE_PARENT_ORIGINS.has(event.origin)) {
        return
      }

      if (!isNativeAuthCallbackMessage(event.data)) {
        return
      }

      if (!isExpectedNativeCallback(event.data.url)) {
        return
      }

      if (processingUrlRef.current === event.data.url) {
        return
      }

      processingUrlRef.current = event.data.url

      try {
        const callbackUrl = new URL(event.data.url)

        const authError =
          callbackUrl.searchParams.get('error_description') ??
          callbackUrl.searchParams.get('error')

        const code = callbackUrl.searchParams.get('code')

        if (authError || !code) {
          console.error(
            'Native authentication callback failed:',
            authError ?? 'Missing authorization code',
          )

          window.location.replace(
            '/?auth_error=magic_link_invalid',
          )

          return
        }

        /*
         * This runs inside the BoltShare iframe—the same browser context
         * that originally requested the magic link. The PKCE code verifier
         * is therefore available here.
         */
        const supabase = createClient()

        const { error } =
          await supabase.auth.exchangeCodeForSession(code)

        if (error) {
          console.error(
            'Native authorization-code exchange failed:',
            error.message,
          )

          window.location.replace(
            '/?auth_error=magic_link_invalid',
          )

          return
        }

        /*
         * Reload the authenticated dashboard after Supabase has persisted
         * the session.
         */
        window.location.replace('/dashboard')
      } catch (error) {
        console.error(
          'Unable to process native authentication callback:',
          error,
        )

        window.location.replace(
          '/?auth_error=magic_link_invalid',
        )
      }
    }

    window.addEventListener('message', handleMessage)

    /*
     * Tell the Capacitor parent that the iframe is ready.
     * The parent may already have a callback waiting from a cold launch.
     */
    window.parent.postMessage(
      {
        type: AUTH_BRIDGE_READY_MESSAGE,
      },
      '*',
    )

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [])

  return null
}
