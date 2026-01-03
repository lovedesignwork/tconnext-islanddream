"use client"

import { useEffect, useLayoutEffect } from 'react'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Force light theme IMMEDIATELY before first paint using useLayoutEffect
  // This prevents any flash of dark theme
  useLayoutEffect(() => {
    const html = document.documentElement
    
    // Force light theme by removing 'dark' class and ensuring 'light' is set
    html.classList.remove('dark')
    html.classList.add('light')
    html.style.colorScheme = 'light'
    // Also set data attribute for any CSS that uses it
    html.setAttribute('data-theme', 'light')
  }, [])

  // Restore original theme class when leaving public page
  useEffect(() => {
    return () => {
      const html = document.documentElement
      // Check localStorage for the user's actual theme preference
      const storedTheme = localStorage.getItem('theme')
      
      if (storedTheme === 'dark') {
        html.classList.remove('light')
        html.classList.add('dark')
        html.style.colorScheme = 'dark'
        html.setAttribute('data-theme', 'dark')
      } else if (storedTheme === 'system') {
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        if (prefersDark) {
          html.classList.remove('light')
          html.classList.add('dark')
          html.style.colorScheme = 'dark'
          html.setAttribute('data-theme', 'dark')
        }
      }
      // If storedTheme is 'light' or undefined, keep light theme
    }
  }, [])

  // Wrap children in a container with explicit light theme styling
  // This ensures that even if global theme changes, this content stays light
  return (
    <div className="light" style={{ colorScheme: 'light' }} data-theme="light">
      {children}
    </div>
  )
}












