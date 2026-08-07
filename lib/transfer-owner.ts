import 'server-only'

import { cookies } from 'next/headers'
import { getSupabaseServiceRoleKey } from '@/lib/config'
import { createServerClient } from '@/lib/supabase/server'

const GUEST_COOKIE = 'bs_guest_transfer'
const GUEST_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function guestSigningKey() {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSupabaseServiceRoleKey()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

async function signedGuestToken(guestId: string) {
  const signature = await crypto.subtle.sign(
    'HMAC',
    await guestSigningKey(),
    new TextEncoder().encode(guestId),
  )
  return `${guestId}.${Buffer.from(signature).toString('base64url')}`
}

async function verifiedGuestId(token: string) {
  const [guestId, signature, ...extra] = token.split('.')
  if (!UUID_PATTERN.test(guestId || '') || !signature || extra.length) return null

  try {
    const valid = await crypto.subtle.verify(
      'HMAC',
      await guestSigningKey(),
      Buffer.from(signature, 'base64url'),
      new TextEncoder().encode(guestId),
    )
    return valid ? guestId : null
  } catch {
    return null
  }
}

export type TransferOwner = {
  ownerId: string
  userId: string | null
  guestId: string | null
  email: string | null
  isGuest: boolean
}

/**
 * Resolves an authenticated account when one exists. Otherwise it creates a
 * random, HttpOnly guest session that authorizes only that browser's uploads.
 * No email address or other personal information is required for guest use.
 */
export async function getTransferOwner(): Promise<TransferOwner> {
  const userClient = await createServerClient()
  const { data: { user } } = await userClient.auth.getUser()

  if (user?.id && user.email) {
    return {
      ownerId: user.id,
      userId: user.id,
      guestId: null,
      email: user.email.toLowerCase(),
      isGuest: false,
    }
  }

  const cookieStore = await cookies()
  const existingToken = cookieStore.get(GUEST_COOKIE)?.value || ''
  const verifiedId = await verifiedGuestId(existingToken)
  const guestId = verifiedId || crypto.randomUUID()

  if (!verifiedId) {
    cookieStore.set(GUEST_COOKIE, await signedGuestToken(guestId), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: GUEST_COOKIE_MAX_AGE_SECONDS,
      priority: 'high',
    })
  }

  return {
    ownerId: guestId,
    userId: null,
    guestId,
    email: null,
    isGuest: true,
  }
}
