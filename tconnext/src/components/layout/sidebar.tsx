"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { useAuth } from '@/components/providers/auth-provider'
import { hasPermission } from '@/lib/auth-utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  CalendarCheck,
  Calendar,
  CalendarDays,
  MapPin,
  Users,
  Car,
  Ship,
  FileText,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Anchor,
  Wallet,
  MapPinned,
  Wrench,
  UserCheck,
  UtensilsCrossed,
  ClipboardList,
  Lock,
  Building2,
  Globe,
  Banknote,
  CreditCard,
  Mail,
  Clock,
  Shield,
} from 'lucide-react'
import type { PageLockSettings } from '@/types'

interface BrandingSettings {
  logo_url: string | null
  logo_url_dark: string | null
  favicon_url: string | null
}

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

// Map href to page lock key
const hrefToLockKey: Record<string, keyof PageLockSettings> = {
  '/dashboard': 'dashboard',
  '/slots': 'slots',
  '/pickup': 'pickup',
  '/set-boat': 'set_boat',
  '/op-report': 'op_report',
  '/invoices': 'invoices',
  '/finance': 'finance',
  '/reports': 'reports',
  '/programs': 'programs',
  '/agents': 'agents',
  '/drivers': 'drivers',
  '/guides': 'guides',
  '/restaurants': 'restaurants',
  '/boats': 'boats',
  '/hotels': 'hotels',
}

// Main navigation items (non-setup)
const mainNavigation = [
  {
    name: 'Bookings',
    href: '/dashboard',
    icon: CalendarCheck,
    permission: 'dashboard' as const,
  },
  {
    name: 'Program Slots',
    href: '/slots',
    icon: CalendarDays,
    permission: 'programs' as const,
  },
  {
    name: 'Pick-up / Drop-off',
    href: '/pickup',
    icon: MapPinned,
    permission: 'drivers' as const,
  },
  {
    name: 'Set Boat',
    href: '/set-boat',
    icon: Anchor,
    permission: 'boats' as const,
  },
  {
    name: 'OP Report',
    href: '/op-report',
    icon: ClipboardList,
    permission: 'reports' as const,
  },
  {
    name: 'Invoices',
    href: '/invoices',
    icon: FileText,
    permission: 'invoices' as const,
  },
  {
    name: 'Finance',
    href: '/finance',
    icon: Wallet,
    permission: 'finance' as const,
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: BarChart3,
    permission: 'reports' as const,
  },
]

// Setup sub-navigation items
const setupNavigation = [
  {
    name: 'Program Setup',
    href: '/programs',
    icon: Calendar,
    permission: 'programs' as const,
  },
  {
    name: 'Agents Setup',
    href: '/agents',
    icon: Users,
    permission: 'agents' as const,
  },
  {
    name: 'Driver Setup',
    href: '/drivers',
    icon: Car,
    permission: 'drivers' as const,
  },
  {
    name: 'Guide Setup',
    href: '/guides',
    icon: UserCheck,
    permission: 'dashboard' as const,
  },
  {
    name: 'Restaurant Setup',
    href: '/restaurants',
    icon: UtensilsCrossed,
    permission: 'dashboard' as const,
  },
  {
    name: 'Boat Setup',
    href: '/boats',
    icon: Anchor,
    permission: 'boats' as const,
  },
  {
    name: 'Location Setup',
    href: '/hotels',
    icon: MapPin,
    permission: 'dashboard' as const,
  },
]

// Settings sub-navigation items
const settingsNavigation = [
  { name: 'General', tab: 'general', icon: Building2 },
  { name: 'Team', tab: 'team', icon: Users },
  { name: 'Invoice', tab: 'invoice', icon: FileText },
  { name: 'Online Payment', tab: 'payment', icon: CreditCard },
  { name: 'Email', tab: 'email', icon: Mail },
  { name: 'Pickup', tab: 'pickup', icon: Car },
  { name: 'OP Report', tab: 'op-report', icon: Clock },
  { name: 'Security', tab: 'security', icon: Shield },
]

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  const [setupOpen, setSetupOpen] = useState(() => {
    // Auto-expand if current path is in setup navigation
    return setupNavigation.some(item => 
      pathname === item.href || pathname.startsWith(`${item.href}/`)
    )
  })
  const [settingsOpen, setSettingsOpen] = useState(() => {
    // Auto-expand if current path is settings
    return pathname.startsWith('/settings')
  })
  const [pageLocks, setPageLocks] = useState<PageLockSettings>({})
  const [pinEnabled, setPinEnabled] = useState(false)
  const [branding, setBranding] = useState<BrandingSettings>({ logo_url: null, logo_url_dark: null, favicon_url: null })
  const [mounted, setMounted] = useState(false)
  const [currentLogo, setCurrentLogo] = useState<string | null>(null)
  const { resolvedTheme } = useTheme()

  const isMasterAdmin = user?.role === 'master_admin'

  // Wait for hydration to avoid theme mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Update the current logo when theme or branding changes
  useEffect(() => {
    if (!mounted) {
      setCurrentLogo(branding.logo_url)
      return
    }
    
    if (resolvedTheme === 'dark') {
      // Dark mode: use dark logo, fallback to light
      setCurrentLogo(branding.logo_url_dark || branding.logo_url)
    } else {
      // Light mode: use light logo
      setCurrentLogo(branding.logo_url)
    }
  }, [mounted, resolvedTheme, branding.logo_url, branding.logo_url_dark])

  // Fetch platform branding
  useEffect(() => {
    async function fetchBrandingData() {
      try {
        const response = await fetch('/api/branding', { cache: 'no-store' })
        if (response.ok) {
          const data = await response.json()
          if (data.branding) {
            setBranding(data.branding)
            // Update favicon
            if (data.branding.favicon_url) {
              const existingFavicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]')
              existingFavicons.forEach(el => el.remove())
              const link = document.createElement('link')
              link.rel = 'icon'
              link.href = data.branding.favicon_url
              document.head.appendChild(link)
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch branding:', error)
      }
    }
    fetchBrandingData()

    // Listen for branding updates (when logo is uploaded)
    const handleBrandingUpdate = () => {
      fetchBrandingData()
    }
    window.addEventListener('branding-updated', handleBrandingUpdate)

    return () => {
      window.removeEventListener('branding-updated', handleBrandingUpdate)
    }
  }, [])

  // Fetch page lock settings
  useEffect(() => {
    async function fetchPageLocks() {
      if (!user?.company_id) return

      const supabase = createClient()
      const { data } = await supabase
        .from('companies')
        .select('page_locks, pricing_pin_enabled')
        .eq('id', user.company_id)
        .single()

      if (data) {
        setPageLocks((data.page_locks as PageLockSettings) || {})
        setPinEnabled(data.pricing_pin_enabled || false)
      }
    }

    fetchPageLocks()
  }, [user?.company_id])

  const filterNavigation = (items: typeof mainNavigation) => {
    return items.filter(item => {
      if (isMasterAdmin) return true
      if (!user?.permissions) return false
      return hasPermission(user.permissions, item.permission, 'view')
    })
  }

  const visibleMainNavigation = filterNavigation(mainNavigation)
  const visibleSetupNavigation = filterNavigation(setupNavigation)

  // Check if any setup item is active
  const isSetupActive = setupNavigation.some(item => 
    pathname === item.href || pathname.startsWith(`${item.href}/`)
  )

  // Check if a page is locked
  const isPageLocked = (href: string): boolean => {
    if (!pinEnabled) return false
    const lockKey = hrefToLockKey[href]
    return lockKey ? pageLocks[lockKey] === true : false
  }

  // Don't render anything if user data isn't ready yet
  if (!user) return null

  const renderNavItem = (item: typeof mainNavigation[0], isSubItem = false) => {
    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
    const Icon = item.icon
    const locked = isPageLocked(item.href)

    if (collapsed) {
      return (
        <Tooltip key={item.name}>
          <TooltipTrigger asChild>
            <Link
              href={item.href}
              prefetch={true}
              className={cn(
                'flex items-center justify-center h-10 w-full rounded-md transition-colors relative',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              {locked && (
                <Lock className="w-3 h-3 absolute top-1 right-1 text-amber-500" />
              )}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {item.name}
            {locked && <Lock className="w-3 h-3 text-amber-500" />}
          </TooltipContent>
        </Tooltip>
      )
    }

    return (
      <Link
        key={item.name}
        href={item.href}
        prefetch={true}
        className={cn(
          'flex items-center gap-3 h-10 rounded-md transition-colors',
          isSubItem ? 'px-3 pl-10' : 'px-3',
          isActive
            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
        )}
      >
        <Icon className="w-5 h-5 shrink-0" />
        <span className="text-sm font-medium flex-1">{item.name}</span>
        {locked && (
          <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        )}
      </Link>
    )
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo - Centered horizontally and vertically */}
        <div className={cn(
          'flex items-center justify-center h-16 px-4 border-b border-sidebar-border'
        )}>
          <Link href="/dashboard" prefetch={true} className="flex items-center justify-center">
            {currentLogo ? (
              // When logo exists, show it with proportional sizing (uses theme-appropriate logo)
              collapsed ? (
                // Collapsed: square container
                <div className="flex items-center justify-center w-8 h-8 rounded-lg overflow-hidden bg-muted">
                  <img 
                    src={currentLogo} 
                    alt="Logo" 
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                // Expanded: flexible container for logo only (no text)
                <div className="flex items-center justify-center overflow-hidden" style={{ maxWidth: '180px', maxHeight: '40px' }}>
                  <img 
                    src={currentLogo} 
                    alt="Logo" 
                    className="max-h-[40px] max-w-[180px] object-contain"
                  />
                </div>
              )
            ) : (
              // No logo: show icon + text
              <>
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
                  <Ship className="w-5 h-5" />
                </div>
                {!collapsed && (
                  <span className="text-lg font-bold text-sidebar-foreground ml-3">
                    TConnext
                  </span>
                )}
              </>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <nav className="p-2 space-y-1">
            {/* Main Navigation Items */}
            {visibleMainNavigation.map((item) => renderNavItem(item))}

            {/* Setup Section */}
            {visibleSetupNavigation.length > 0 && (
              <>
                <Separator className="my-2" />
                
                {collapsed ? (
                  // When collapsed, show setup items as tooltips
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setSetupOpen(!setupOpen)}
                        className={cn(
                          'flex items-center justify-center h-10 w-full rounded-md transition-colors',
                          isSetupActive
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        )}
                      >
                        <Wrench className="w-5 h-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="flex flex-col gap-1 p-2">
                      <span className="font-semibold mb-1">Setup</span>
                      {visibleSetupNavigation.map((item) => {
                        const locked = isPageLocked(item.href)
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            prefetch={true}
                            className={cn(
                              'text-sm px-2 py-1 rounded hover:bg-accent flex items-center gap-2',
                              (pathname === item.href || pathname.startsWith(`${item.href}/`))
                                ? 'font-medium text-primary'
                                : ''
                            )}
                          >
                            {item.name}
                            {locked && <Lock className="w-3 h-3 text-amber-500" />}
                          </Link>
                        )
                      })}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  // When expanded, show collapsible section
                  <Collapsible open={setupOpen} onOpenChange={setSetupOpen}>
                    <CollapsibleTrigger asChild>
                      <button
                        className={cn(
                          'flex items-center justify-between w-full h-10 px-3 rounded-md transition-colors',
                          isSetupActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Wrench className="w-5 h-5 shrink-0" />
                          <span className="text-sm font-medium">Setup</span>
                        </div>
                        <ChevronDown
                          className={cn(
                            'w-4 h-4 transition-transform duration-200',
                            setupOpen ? 'rotate-180' : ''
                          )}
                        />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 mt-1">
                      {visibleSetupNavigation.map((item) => renderNavItem(item, true))}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </>
            )}

            {isMasterAdmin && (
              <>
                <Separator className="my-2" />
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setSettingsOpen(!settingsOpen)}
                        className={cn(
                          'flex items-center justify-center h-10 w-full rounded-md transition-colors',
                          pathname.startsWith('/settings')
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        )}
                      >
                        <Settings className="w-5 h-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="flex flex-col gap-1 p-2">
                      <span className="font-semibold mb-1">Settings</span>
                      {settingsNavigation.map((item) => (
                        <Link
                          key={item.tab}
                          href={`/settings?tab=${item.tab}`}
                          prefetch={true}
                          className="text-sm px-2 py-1 rounded hover:bg-accent"
                        >
                          {item.name}
                        </Link>
                      ))}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
                    <CollapsibleTrigger asChild>
                      <button
                        className={cn(
                          'flex items-center justify-between w-full h-10 px-3 rounded-md transition-colors',
                          pathname.startsWith('/settings')
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Settings className="w-5 h-5 shrink-0" />
                          <span className="text-sm font-medium">Settings</span>
                        </div>
                        <ChevronDown
                          className={cn(
                            'w-4 h-4 transition-transform duration-200',
                            settingsOpen ? 'rotate-180' : ''
                          )}
                        />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 mt-1">
                      {settingsNavigation.map((item) => {
                        const Icon = item.icon
                        return (
                          <Link
                            key={item.tab}
                            href={`/settings?tab=${item.tab}`}
                            prefetch={true}
                            className={cn(
                              'flex items-center gap-3 h-10 px-3 pl-10 rounded-md transition-colors',
                              'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                            )}
                          >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="text-sm">{item.name}</span>
                          </Link>
                        )
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </>
            )}
          </nav>
        </ScrollArea>

        {/* TConnext Branding Footer */}
        {!collapsed && (
          <div className="absolute bottom-14 left-0 right-0 px-4 py-3 border-t border-sidebar-border">
            <div className="text-center space-y-2">
              <p className="text-xs text-muted-foreground leading-tight">
                Tour Booking Management System<br />powered by
              </p>
              <a 
                href="https://www.tconnext.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block hover:opacity-80 transition-opacity"
              >
                {/* TConnext Logo - placeholder URLs, will be replaced */}
                <img 
                  src={resolvedTheme === 'dark' 
                    ? 'https://tconnext.com/logo-dark.png'  // Dark theme logo URL
                    : 'https://tconnext.com/logo-light.png' // Light theme logo URL
                  }
                  alt="TConnext"
                  className="h-6 mx-auto object-contain"
                  onError={(e) => {
                    // Fallback to text if image fails
                    e.currentTarget.style.display = 'none'
                    e.currentTarget.nextElementSibling?.classList.remove('hidden')
                  }}
                />
                <span className="hidden text-sm font-semibold text-primary">TConnext</span>
              </a>
              <a 
                href="https://www.tconnext.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                www.tconnext.com
              </a>
            </div>
          </div>
        )}

        {/* Collapse toggle */}
        <div className="absolute bottom-0 left-0 right-0 p-2 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'w-full justify-center text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              collapsed ? 'px-0' : ''
            )}
            onClick={onToggle}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Collapse
              </>
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
