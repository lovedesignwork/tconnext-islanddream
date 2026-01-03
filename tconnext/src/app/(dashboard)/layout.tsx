"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AuthProvider, useAuth } from '@/components/providers/auth-provider'
import { PageLockProvider } from '@/components/providers/page-lock-provider'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  // Track if we've ever shown the dashboard - prevents unmounting children on subsequent loading states
  const hasShownDashboardRef = useRef(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) {
      setSidebarCollapsed(JSON.parse(saved))
    }
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  const handleSidebarToggle = () => {
    const newState = !sidebarCollapsed
    setSidebarCollapsed(newState)
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newState))
  }

  // Only show loading spinner on INITIAL load, not on subsequent loading states
  // This prevents children (like settings page) from being unmounted when auth refreshes
  const isInitialLoad = !mounted || (loading && !hasShownDashboardRef.current)
  
  if (isInitialLoad) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Spinner size="lg" />
        <p className="text-muted-foreground animate-pulse">Loading dashboard...</p>
      </div>
    )
  }

  // Mark that we've shown the dashboard at least once
  hasShownDashboardRef.current = true

  if (!user) {
    return null
  }

  return (
    <PageLockProvider>
      <div className="min-h-screen bg-background">
        <Sidebar collapsed={sidebarCollapsed} onToggle={handleSidebarToggle} />
        <Header sidebarCollapsed={sidebarCollapsed} />
        <main
          className={cn(
            'pt-16 transition-all duration-300',
            sidebarCollapsed ? 'pl-16' : 'pl-64'
          )}
        >
          <div className="p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </PageLockProvider>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </AuthProvider>
  )
}

