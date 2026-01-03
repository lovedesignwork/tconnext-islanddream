"use client"

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { PinLockDialog } from '@/components/ui/pin-lock-dialog'
import { useRouter } from 'next/navigation'
import type { PageLockSettings } from '@/types'

interface PageLockContextType {
  pageLocks: PageLockSettings
  pinEnabled: boolean
  companyPin: string
  isPageLocked: (pageKey: keyof PageLockSettings) => boolean
  verifyPin: (pageKey: string) => void
  isVerified: (pageKey: string) => boolean
  refreshLocks: () => Promise<void>
  isLoading: boolean
}

const PageLockContext = createContext<PageLockContextType>({
  pageLocks: {},
  pinEnabled: false,
  companyPin: '',
  isPageLocked: () => false,
  verifyPin: () => {},
  isVerified: () => true,
  refreshLocks: async () => {},
  isLoading: true,
})

export function usePageLock() {
  return useContext(PageLockContext)
}

interface PageLockProviderProps {
  children: ReactNode
}

export function PageLockProvider({ children }: PageLockProviderProps) {
  const { user, loading: authLoading } = useAuth()
  const [pageLocks, setPageLocks] = useState<PageLockSettings>({})
  const [pinEnabled, setPinEnabled] = useState(false)
  const [companyPin, setCompanyPin] = useState('')
  const [verifiedPages, setVerifiedPages] = useState<Set<string>>(new Set())
  const [locksLoading, setLocksLoading] = useState(true)

  // Combined loading state - wait for both auth AND locks to be ready
  const isLoading = authLoading || locksLoading

  const fetchLocks = useCallback(async () => {
    if (!user?.company_id) {
      setLocksLoading(false)
      return
    }

    try {
      // Use API route to bypass RLS issues for team members
      const response = await fetch(`/api/company/page-locks?companyId=${user.company_id}`)
      if (response.ok) {
        const data = await response.json()
        setPageLocks((data.page_locks as PageLockSettings) || {})
        setPinEnabled(data.pricing_pin_enabled || false)
        setCompanyPin(data.pricing_pin || '')
      }
    } catch (error) {
      console.error('Error fetching page locks:', error)
    } finally {
      setLocksLoading(false)
    }
  }, [user?.company_id])

  useEffect(() => {
    // Only fetch locks when auth is done loading
    if (!authLoading) {
      if (user?.company_id) {
        fetchLocks()
      } else {
        setLocksLoading(false)
      }
    }
  }, [fetchLocks, user?.company_id, authLoading])

  // Load verified pages from session storage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('verified_pages')
    if (stored) {
      try {
        setVerifiedPages(new Set(JSON.parse(stored)))
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, [])

  const isPageLocked = useCallback((pageKey: keyof PageLockSettings): boolean => {
    if (!pinEnabled) return false
    return pageLocks[pageKey] === true
  }, [pinEnabled, pageLocks])

  const verifyPin = useCallback((pageKey: string) => {
    setVerifiedPages(prev => {
      const newSet = new Set(prev)
      newSet.add(pageKey)
      sessionStorage.setItem('verified_pages', JSON.stringify([...newSet]))
      return newSet
    })
  }, [])

  const isVerified = useCallback((pageKey: string): boolean => {
    return verifiedPages.has(pageKey)
  }, [verifiedPages])

  return (
    <PageLockContext.Provider value={{
      pageLocks,
      pinEnabled,
      companyPin,
      isPageLocked,
      verifyPin,
      isVerified,
      refreshLocks: fetchLocks,
      isLoading,
    }}>
      {children}
    </PageLockContext.Provider>
  )
}

// HOC to wrap pages that need PIN protection
interface ProtectedPageProps {
  children: ReactNode
  pageKey: keyof PageLockSettings
  pageName: string
}

export function ProtectedPage({ children, pageKey, pageName }: ProtectedPageProps) {
  const { user } = useAuth()
  const { isPageLocked, companyPin, verifyPin, isVerified, isLoading } = usePageLock()
  const router = useRouter()
  const [showPinDialog, setShowPinDialog] = useState(false)

  // Admin roles bypass PIN - only master_admin and super_admin bypass
  const isAdmin = user?.role === 'master_admin' || user?.role === 'super_admin'
  const locked = isPageLocked(pageKey)
  const verified = isVerified(pageKey)

  useEffect(() => {
    // Wait for loading to complete before showing PIN dialog
    if (isLoading) return

    // If page is locked and not verified (and not admin), show PIN dialog
    if (locked && !verified && !isAdmin) {
      setShowPinDialog(true)
    }
  }, [locked, verified, isAdmin, isLoading])

  const handlePinSuccess = () => {
    verifyPin(pageKey)
    setShowPinDialog(false)
  }

  const handlePinCancel = () => {
    setShowPinDialog(false)
    router.push('/dashboard')
  }

  // Show loading state while fetching page locks
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  // Admin bypasses PIN
  if (isAdmin) {
    return <>{children}</>
  }

  // If locked and not verified, show dialog over blank page
  if (locked && !verified) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">This page requires PIN verification...</p>
        </div>
        <PinLockDialog
          open={showPinDialog}
          onOpenChange={setShowPinDialog}
          onSuccess={handlePinSuccess}
          onCancel={handlePinCancel}
          correctPin={companyPin}
          pageName={pageName}
        />
      </>
    )
  }

  return <>{children}</>
}






