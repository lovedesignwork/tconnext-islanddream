"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  const error = searchParams.get('error')

  // Fetch branding logo
  useEffect(() => {
    async function fetchBranding() {
      try {
        const response = await fetch('/api/branding')
        if (response.ok) {
          const data = await response.json()
          if (data.branding?.logo_url) {
            setLogoUrl(data.branding.logo_url)
          }
        }
      } catch (error) {
        console.error('Failed to fetch branding:', error)
      }
    }
    fetchBranding()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Unable to sign in')
        setLoading(false)
        return
      }

      window.location.href = '/dashboard'
    } catch (err) {
      console.error('Login error', err)
      toast.error('An error occurred during login')
      setLoading(false)
    }
  }

  // Force light theme on login page
  useEffect(() => {
    document.documentElement.classList.remove('dark')
    document.documentElement.classList.add('light')
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-100">
      <div className="w-full max-w-md flex-1 flex flex-col justify-center">
        {/* Company Logo - 30% smaller (266px instead of 380px) */}
        <div className="flex justify-center mb-8">
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt="Logo" 
              style={{ width: '266px', maxWidth: '100%', height: 'auto' }}
              className="object-contain"
            />
          ) : (
            <div style={{ width: '266px', height: '70px' }} className="bg-gray-200 rounded animate-pulse" />
          )}
        </div>

        <Card className="border shadow-lg bg-white">
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4 pt-6">
              {error === 'unauthorized' && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                  You are not authorized to access this account.
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email or Staff ID
                </Label>
                <Input
                  id="email"
                  type="text"
                  placeholder="email@example.com or 35688-1"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  className="h-11"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-11"
                />
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full h-11"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      {/* TConnext Branding Footer */}
      <div className="mt-8 mb-4 text-center space-y-2">
        <p className="text-xs text-gray-500 leading-tight">
          Tour Booking Management System powered by
        </p>
        <a 
          href="https://www.tconnext.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="block hover:opacity-80 transition-opacity"
        >
          {/* TConnext Logo - Light theme version for login page */}
          <img 
            src="https://tconnext.com/logo-light.png"
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
          className="text-xs text-gray-500 hover:text-primary transition-colors"
        >
          www.tconnext.com
        </a>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-100">
        <div className="w-full max-w-md flex-1 flex flex-col justify-center">
          <div className="flex justify-center mb-8">
            <div style={{ width: '266px', height: '70px' }} className="bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
