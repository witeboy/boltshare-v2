'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AuthChangeEvent, User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  isAuthenticated: boolean
  isLoadingAuth: boolean
  updateProfileName: (firstName: string, lastName: string) => Promise<User>
  dismissNamePrompt: () => Promise<User>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoadingAuth: true,
  updateProfileName: async () => { throw new Error('Authentication is not ready') },
  dismissNamePrompt: async () => { throw new Error('Authentication is not ready') },
  logout: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session } }: { data: { session: Session | null } }) => {
        setSession(session)
        setUser(session?.user ?? null)
      })
      .catch((error: unknown) => {
        console.error('Unable to restore the BoltShare session:', error)
        setSession(null)
        setUser(null)
      })
      .finally(() => setIsLoadingAuth(false))

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setSession(session)
        setUser(session?.user ?? null)
        setIsLoadingAuth(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }

  const updateUserMetadata = async (metadata: Record<string, unknown>) => {
    const { data, error } = await supabase.auth.updateUser({
      data: {
        ...(user?.user_metadata ?? {}),
        ...metadata,
      },
    })

    if (error || !data.user) throw error ?? new Error('Profile could not be updated')
    setUser(data.user)
    setSession(current => current ? { ...current, user: data.user } : current)
    return data.user
  }

  const updateProfileName = async (firstName: string, lastName: string) => {
    const normalizedFirstName = firstName.trim().replace(/\s+/g, ' ')
    const normalizedLastName = lastName.trim().replace(/\s+/g, ' ')

    if (!normalizedFirstName || !normalizedLastName) {
      throw new Error('First and last name are required')
    }

    return updateUserMetadata({
      first_name: normalizedFirstName,
      last_name: normalizedLastName,
      full_name: `${normalizedFirstName} ${normalizedLastName}`,
      name_prompt_completed: true,
      name_prompt_dismissed: false,
    })
  }

  const dismissNamePrompt = async () => updateUserMetadata({ name_prompt_dismissed: true })

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated: !!user,
        isLoadingAuth,
        updateProfileName,
        dismissNamePrompt,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
