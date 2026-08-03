import type { User } from '@supabase/supabase-js'

export type UserName = {
  firstName: string
  lastName: string
}

export function getUserName(user: User | null | undefined): UserName {
  const metadata = user?.user_metadata ?? {}
  const firstName = typeof metadata.first_name === 'string' ? metadata.first_name.trim() : ''
  const lastName = typeof metadata.last_name === 'string' ? metadata.last_name.trim() : ''

  if (firstName) return { firstName, lastName }

  const legacyFullName = typeof metadata.full_name === 'string' ? metadata.full_name.trim() : ''
  if (!legacyFullName) return { firstName: '', lastName: '' }

  const [legacyFirstName, ...legacyLastName] = legacyFullName.split(/\s+/)
  return { firstName: legacyFirstName ?? '', lastName: legacyLastName.join(' ') }
}

export function hasDismissedNamePrompt(user: User | null | undefined) {
  return user?.user_metadata?.name_prompt_dismissed === true
}

export function namePromptStorageKey(userId: string) {
  return `boltshare_name_prompt_${userId}`
}
