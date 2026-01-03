"use client"

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Ship, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BrandingSettings {
  logo_url: string | null
  logo_url_dark: string | null
  favicon_url: string | null
}

interface PlatformLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'admin' | 'light'
  showText?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
}

const iconSizes = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
}

const textSizes = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-3xl',
}

// Event-based cache invalidation
let brandingVersion = 0

export function invalidateBrandingCache() {
  brandingVersion++
  // Dispatch a custom event to notify all components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('branding-updated'))
  }
}

async function fetchBranding(): Promise<BrandingSettings> {
  try {
    const res = await fetch('/api/branding', { cache: 'no-store' })
    const data = await res.json()
    return data.branding || { logo_url: null, logo_url_dark: null, favicon_url: null }
  } catch {
    return { logo_url: null, logo_url_dark: null, favicon_url: null }
  }
}

export function PlatformLogo({ 
  size = 'md', 
  variant = 'default',
  showText = true,
  className 
}: PlatformLogoProps) {
  const [branding, setBranding] = useState<BrandingSettings>({ logo_url: null, logo_url_dark: null, favicon_url: null })
  const [mounted, setMounted] = useState(false)
  const [currentLogo, setCurrentLogo] = useState<string | null>(null)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
    fetchBranding().then(setBranding)

    // Listen for branding updates
    const handleBrandingUpdate = () => {
      fetchBranding().then(setBranding)
    }
    window.addEventListener('branding-updated', handleBrandingUpdate)

    return () => {
      window.removeEventListener('branding-updated', handleBrandingUpdate)
    }
  }, [])

  // Update the current logo when theme or branding changes
  useEffect(() => {
    if (!mounted) {
      setCurrentLogo(branding.logo_url)
      return
    }
    
    if (resolvedTheme === 'dark') {
      setCurrentLogo(branding.logo_url_dark || branding.logo_url)
    } else {
      setCurrentLogo(branding.logo_url)
    }
  }, [mounted, resolvedTheme, branding.logo_url, branding.logo_url_dark])

  // Update favicon when branding loads
  useEffect(() => {
    if (mounted && branding.favicon_url) {
      updateFavicon(branding.favicon_url)
    }
  }, [mounted, branding.favicon_url])

  const updateFavicon = (url: string) => {
    // Remove existing favicons
    const existingFavicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]')
    existingFavicons.forEach(el => el.remove())
    
    // Add new favicon
    const link = document.createElement('link')
    link.rel = 'icon'
    link.href = url
    document.head.appendChild(link)
  }

  const FallbackIcon = variant === 'admin' ? Shield : Ship

  const containerClasses = cn(
    'flex items-center justify-center rounded-xl overflow-hidden shrink-0',
    sizeClasses[size],
    variant === 'light' 
      ? 'bg-gradient-to-br from-cyan-400 to-blue-500' 
      : 'bg-primary/10',
    className
  )

  const iconClasses = cn(
    iconSizes[size],
    variant === 'light' ? 'text-white' : 'text-primary'
  )

  return (
    <div className="flex items-center gap-3">
      <div className={containerClasses}>
        {currentLogo ? (
          <img 
            src={currentLogo} 
            alt="TConnext Logo" 
            className="w-full h-full object-contain p-1"
          />
        ) : (
          <FallbackIcon className={iconClasses} />
        )}
      </div>
      {showText && !currentLogo && (
        <span className={cn(
          'font-bold tracking-tight',
          textSizes[size],
          variant === 'light' ? 'text-white' : ''
        )}>
          TConnext
        </span>
      )}
    </div>
  )
}

// Hook to get branding data
export function usePlatformBranding() {
  const [branding, setBranding] = useState<BrandingSettings>({ logo_url: null, logo_url_dark: null, favicon_url: null })
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [currentLogo, setCurrentLogo] = useState<string | null>(null)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
    fetchBranding()
      .then(setBranding)
      .finally(() => setLoading(false))

    // Listen for branding updates
    const handleBrandingUpdate = () => {
      fetchBranding().then(setBranding)
    }
    window.addEventListener('branding-updated', handleBrandingUpdate)

    return () => {
      window.removeEventListener('branding-updated', handleBrandingUpdate)
    }
  }, [])

  // Update the current logo when theme or branding changes
  useEffect(() => {
    if (!mounted) {
      setCurrentLogo(branding.logo_url)
      return
    }
    
    if (resolvedTheme === 'dark') {
      setCurrentLogo(branding.logo_url_dark || branding.logo_url)
    } else {
      setCurrentLogo(branding.logo_url)
    }
  }, [mounted, resolvedTheme, branding.logo_url, branding.logo_url_dark])

  return { branding, loading, currentLogo }
}
