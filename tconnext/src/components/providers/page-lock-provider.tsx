"use client"

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { PinLockDialog, usePinLock } from '@/components/ui/pin-lock-dialog'
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
}

const PageLockContext = createContext<PageLockContextType>({
  pageLocks: {},
  pinEnabled: false,
  companyPin: '',
  isPageLocked: () => false,
  verifyPin: () => {},
  isVerified: () => true,
  refreshLocks: async () => {},
})

export function usePageLock() {
  return useContext(PageLockContext)
}

interface PageLockProviderProps {
  children: ReactNode
}

export function PageLockProvider({ children }: PageLockProviderProps) {
  const { user } = useAuth()
  const [pageLocks, setPageLocks] = useState<PageLockSettings>({})
  const [pinEnabled, setPinEnabled] = useState(false)
  const [companyPin, setCompanyPin] = useState('')
  const [verifiedPages, setVerifiedPages] = useState<Set<string>>(new Set())

  const fetchLocks = useCallback(async () => {
    if (!user?.company_id) return

    const supabase = createClient()
    const { data } = await supabase
      .from('companies')
      .select('page_locks, pricing_pin_enabled, pricing_pin')
      .eq('id', user.company_id)
      .single()

    if (data) {
      setPageLocks((data.page_locks as PageLockSettings) || {})
      setPinEnabled(data.pricing_pin_enabled || false)
      setCompanyPin(data.pricing_pin || '')
    }
  }, [user?.company_id])

  useEffect(() => {
    fetchLocks()
  }, [fetchLocks])

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
  const { isPageLocked, companyPin, verifyPin, isVerified, pinEnabled } = usePageLock()
  const router = useRouter()
  const [showPinDialog, setShowPinDialog] = useState(false)
  const [initialized, setInitialized] = useState(false)

  const isMasterAdmin = user?.role === 'master_admin'
  const locked = isPageLocked(pageKey)
  const verified = isVerified(pageKey)

  useEffect(() => {
    // Wait for page lock context to be ready
    if (!pinEnabled && !locked) {
      setInitialized(true)
      return
    }

    // Master admin bypasses PIN
    if (isMasterAdmin) {
      setInitialized(true)
      return
    }

    // If page is locked and not verified, show PIN dialog
    if (locked && !verified) {
      setShowPinDialog(true)
    }

    setInitialized(true)
  }, [locked, verified, isMasterAdmin, pinEnabled])

  const handlePinSuccess = () => {
    verifyPin(pageKey)
    setShowPinDialog(false)
  }

  const handlePinCancel = () => {
    setShowPinDialog(false)
    router.push('/dashboard')
  }

  // Don't render anything until initialized
  if (!initialized) {
    return null
  }

  // If locked and not verified (and not admin), show dialog over blank page
  if (locked && !verified && !isMasterAdmin && !isSuperAdmin) {
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






