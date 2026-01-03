"use client"

import { useState, useEffect } from 'react'

/**
 * Extracts the subdomain from the current hostname.
 * 
 * Examples:
 * - demo.tconnext.app -> "demo"
 * - mycompany.tconnext.app -> "mycompany"
 * - tconnext.app -> null
 * - www.tconnext.app -> null
 * - localhost -> null
 * 
 * For local development, you can use subdomain.localhost:3000 format
 * or the subdomain query parameter as a fallback.
 */
export function getSubdomain(): string | null {
  if (typeof window === 'undefined') return null
  
  const hostname = window.location.hostname
  
  // Local development with subdomain.localhost format (e.g., demo.localhost)
  if (hostname.endsWith('.localhost') || hostname.includes('.localhost:')) {
    const parts = hostname.split('.')
    if (parts.length >= 2) {
      const sub = parts[0]
      if (sub !== 'www') {
        return sub
      }
    }
    return null
  }
  
  // Regular localhost without subdomain - check query param as fallback for dev
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // For development, allow query param fallback
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get('subdomain')
  }
  
  // Production: Extract subdomain from hostname
  // e.g., demo.tconnext.app -> demo
  const parts = hostname.split('.')
  
  // Need at least 3 parts for a subdomain (sub.domain.tld)
  // Or 2 parts with tconnext (sub.tconnext.app has 3 parts)
  if (parts.length >= 3) {
    const sub = parts[0]
    // Skip common non-tenant subdomains
    if (sub !== 'www' && sub !== 'app' && sub !== 'admin' && sub !== 'api') {
      return sub
    }
  }
  
  return null
}

/**
 * Cleans up the URL by removing the ?subdomain= query parameter
 * when subdomain is already in the hostname (production).
 * This ensures clean URLs like demo.tconnext.app/booking instead of
 * demo.tconnext.app/booking?subdomain=demo
 */
function cleanupSubdomainQueryParam(): void {
  if (typeof window === 'undefined') return
  
  const hostname = window.location.hostname
  
  // Only cleanup in production (when subdomain is in hostname)
  // Don't cleanup on localhost where query param is needed
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return
  }
  
  const urlParams = new URLSearchParams(window.location.search)
  
  // If ?subdomain= exists in URL, remove it
  if (urlParams.has('subdomain')) {
    urlParams.delete('subdomain')
    
    // Build new URL without the subdomain param
    const newSearch = urlParams.toString()
    const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash
    
    // Replace URL without reloading the page
    window.history.replaceState({}, '', newUrl)
  }
}

/**
 * React hook to get the current subdomain.
 * Returns null during SSR and on the main domain.
 * Also cleans up redundant ?subdomain= query params from the URL.
 */
export function useSubdomain(): string | null {
  const [subdomain, setSubdomain] = useState<string | null>(null)

  useEffect(() => {
    const sub = getSubdomain()
    setSubdomain(sub)
    
    // Clean up URL if subdomain query param exists but isn't needed
    if (sub) {
      cleanupSubdomainQueryParam()
    }
  }, [])

  return subdomain
}

/**
 * React hook that provides the subdomain with a loading state.
 * Useful when you need to wait for client-side hydration.
 */
export function useSubdomainWithLoading(): { subdomain: string | null; isLoading: boolean } {
  const [subdomain, setSubdomain] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setSubdomain(getSubdomain())
    setIsLoading(false)
  }, [])

  return { subdomain, isLoading }
}

