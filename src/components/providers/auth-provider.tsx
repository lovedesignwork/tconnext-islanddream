"use client"

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AuthUser } from '@/types'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
})

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])
  
  // Track if initial load is complete - after this, we never show loading again
  const initialLoadCompleteRef = useRef(false)

  const buildUser = (
    authUser: NonNullable<Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user']>,
    userData?: {
      id: string
      email: string
      name: string
      role: AuthUser['role']
      company_id: string | null
      permissions: Record<string, unknown>
      companies?: { slug: string | null; name: string | null } | null
    }
  ): AuthUser => ({
    id: userData?.id ?? authUser.id,
    email: userData?.email ?? authUser.email ?? '',
    name: userData?.name ?? authUser.email?.split('@')[0] ?? 'User',
    role: userData?.role ?? 'staff',
    company_id: userData?.company_id ?? null,
    company_slug: userData?.companies?.slug ?? undefined,
    company_name: userData?.companies?.name ?? undefined,
    permissions: (userData?.permissions as AuthUser['permissions']) ?? {},
  })

  const loadUser = useCallback(async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (!authUser) {
        setUser(null)
        return
      }

      // Use the API endpoint which uses admin client to bypass RLS
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const { user: apiUser } = await response.json()
        if (apiUser) {
          setUser({
            id: apiUser.id,
            email: apiUser.email,
            name: apiUser.name,
            role: apiUser.role,
            company_id: apiUser.company_id,
            company_slug: apiUser.company_slug,
            company_name: apiUser.company_name,
            permissions: apiUser.permissions || {},
          })
          return
        }
      }

      // Fallback: check company_team_members (staff) via direct query
      const { data: teamMemberData } = await supabase
        .from('company_team_members')
        .select(
          'id, email, name, company_id, permissions, staff_code, status, companies:company_id ( slug, name )'
        )
        .eq('auth_id', authUser.id)
        .single()

      if (teamMemberData) {
        // Check if team member is active
        if (teamMemberData.status !== 'active') {
          await supabase.auth.signOut()
          setUser(null)
          return
        }

        setUser(buildUser(authUser, {
          id: teamMemberData.id,
          email: teamMemberData.email || authUser.email || '',
          name: teamMemberData.name,
          role: 'staff',
          company_id: teamMemberData.company_id,
          permissions: teamMemberData.permissions as Record<string, unknown>,
          companies: teamMemberData.companies as { slug: string | null; name: string | null } | null,
        }))
        return
      }

      // User not found in either table
      setUser(buildUser(authUser))
    } catch {
      setUser(null)
    }
  }, [supabase])

  useEffect(() => {
    let isMounted = true

    const initialize = async () => {
      setLoading(true)
      await loadUser()
      if (isMounted) {
        setLoading(false)
        initialLoadCompleteRef.current = true
      }
    }

    initialize()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // NEVER set loading to true after initial load - this prevents dashboard from unmounting
      // and losing form state on settings page
      
      // Ignore token refresh events completely
      if (event === 'TOKEN_REFRESHED') {
        return
      }

      // If user signed out, clear user but don't touch loading
      if (!session?.user) {
        setUser(null)
        if (!initialLoadCompleteRef.current) {
          setLoading(false)
        }
        return
      }

      // Only reload user data on SIGNED_IN (new login) or INITIAL_SESSION
      // But NEVER set loading to true after initial load
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (!initialLoadCompleteRef.current) {
          setLoading(true)
        }
        loadUser().finally(() => {
          if (!initialLoadCompleteRef.current) {
            setLoading(false)
            initialLoadCompleteRef.current = true
          }
        })
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [loadUser, supabase])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    window.location.href = '/login'
  }, [supabase])

  const refreshUser = useCallback(async () => {
    setLoading(true)
    await loadUser()
    setLoading(false)
  }, [loadUser])

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

