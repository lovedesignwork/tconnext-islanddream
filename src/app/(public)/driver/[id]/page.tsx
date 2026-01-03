"use client"

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Separator } from '@/components/ui/separator'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Car,
  Lock,
  Calendar,
  MapPin,
  Phone,
  MessageCircle,
  Clock,
  Download,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'
import type { Driver, Booking, Company, Hotel } from '@/types'

interface PickupItem extends Booking {
  hotel?: Hotel
}

interface DriverWithCompany extends Driver {
  company: Company
}

// Rate limiting constants
const MAX_PIN_ATTEMPTS = 15
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes in ms

function getRateLimitKey(driverId: string) {
  return `driver_pin_attempts_${driverId}`
}

function getLockoutKey(driverId: string) {
  return `driver_pin_lockout_${driverId}`
}

function getAttempts(driverId: string): number {
  if (typeof window === 'undefined') return 0
  const stored = localStorage.getItem(getRateLimitKey(driverId))
  return stored ? parseInt(stored, 10) : 0
}

function incrementAttempts(driverId: string): number {
  if (typeof window === 'undefined') return 0
  const current = getAttempts(driverId) + 1
  localStorage.setItem(getRateLimitKey(driverId), current.toString())
  return current
}

function resetAttempts(driverId: string) {
  if (typeof window === 'undefined') return
  localStorage.removeItem(getRateLimitKey(driverId))
  localStorage.removeItem(getLockoutKey(driverId))
}

function isLockedOut(driverId: string): { locked: boolean; remainingMs: number } {
  if (typeof window === 'undefined') return { locked: false, remainingMs: 0 }
  const lockoutTime = localStorage.getItem(getLockoutKey(driverId))
  if (!lockoutTime) return { locked: false, remainingMs: 0 }
  
  const lockoutEnd = parseInt(lockoutTime, 10)
  const now = Date.now()
  
  if (now >= lockoutEnd) {
    // Lockout expired, reset
    resetAttempts(driverId)
    return { locked: false, remainingMs: 0 }
  }
  
  return { locked: true, remainingMs: lockoutEnd - now }
}

function setLockout(driverId: string) {
  if (typeof window === 'undefined') return
  const lockoutEnd = Date.now() + LOCKOUT_DURATION
  localStorage.setItem(getLockoutKey(driverId), lockoutEnd.toString())
}

export default function DriverPortalPage() {
  const params = useParams()
  const driverId = params.id as string

  const [driver, setDriver] = useState<DriverWithCompany | null>(null)
  const [pickups, setPickups] = useState<PickupItem[]>([])
  const [loading, setLoading] = useState(true)
  const [authenticating, setAuthenticating] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [pin, setPin] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [attemptCount, setAttemptCount] = useState(0)
  const [lockoutRemaining, setLockoutRemaining] = useState(0)

  // Force light theme
  useEffect(() => {
    document.documentElement.classList.remove('dark')
    document.documentElement.classList.add('light')
    document.documentElement.style.colorScheme = 'light'
  }, [])

  // Check rate limiting on mount and update countdown
  useEffect(() => {
    if (!driverId) return
    
    const checkLockout = () => {
      const { locked, remainingMs } = isLockedOut(driverId)
      setLockoutRemaining(remainingMs)
      setAttemptCount(getAttempts(driverId))
      return locked
    }
    
    checkLockout()
    
    // Update countdown every second if locked
    const interval = setInterval(() => {
      if (checkLockout()) {
        // Continue interval
      }
    }, 1000)
    
    return () => clearInterval(interval)
  }, [driverId])

  // Fetch driver data from public API route
  useEffect(() => {
    async function fetchDriver() {
      try {
        const response = await fetch(`/api/driver/public?linkId=${driverId}`)
        
        if (!response.ok) {
          setLoading(false)
          return
        }

        const { driver: driverData } = await response.json()
        setDriver(driverData)
      } catch (error) {
        console.error('Failed to fetch driver:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDriver()
  }, [driverId])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!driver || !pin) return

    // Check if locked out
    const { locked, remainingMs } = isLockedOut(driverId)
    if (locked) {
      const minutes = Math.ceil(remainingMs / 60000)
      toast.error(`Too many attempts. Please wait ${minutes} minute${minutes > 1 ? 's' : ''}.`)
      return
    }

    setAuthenticating(true)

    try {
      // Plain text PIN comparison
      const isValid = pin === driver.access_pin
      
      if (isValid) {
        resetAttempts(driverId)
        setAuthenticated(true)
        fetchPickups()
      } else {
        const attempts = incrementAttempts(driverId)
        setAttemptCount(attempts)
        
        if (attempts >= MAX_PIN_ATTEMPTS) {
          setLockout(driverId)
          const { remainingMs } = isLockedOut(driverId)
          setLockoutRemaining(remainingMs)
          toast.error('Too many failed attempts. Please wait 15 minutes.')
        } else {
          const remaining = MAX_PIN_ATTEMPTS - attempts
          toast.error(`Invalid PIN. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`)
        }
      }
    } catch (error) {
      toast.error('Authentication failed')
    } finally {
      setAuthenticating(false)
      setPin('')
    }
  }

  const fetchPickups = useCallback(async () => {
    if (!driver) return

    try {
      const response = await fetch('/api/driver/pickups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: driver.id,
          pin: driver.access_pin, // We're already authenticated
          date: selectedDate,
        }),
      })

      if (response.ok) {
        const { pickups: data } = await response.json()
        setPickups(data || [])
      }
    } catch (error) {
      console.error('Failed to fetch pickups:', error)
    }
  }, [driver, selectedDate])

  useEffect(() => {
    if (authenticated && driver) {
      fetchPickups()
    }
  }, [selectedDate, authenticated, driver, fetchPickups])

  const changeDate = (days: number) => {
    const date = new Date(selectedDate)
    date.setDate(date.getDate() + days)
    setSelectedDate(date.toISOString().split('T')[0])
  }

  const totalPax = pickups.reduce(
    (sum, p) => sum + (p.adults || 0) + (p.children || 0) + (p.infants || 0),
    0
  )

  // Get company logo from settings
  const companySettings = driver?.company?.settings as Record<string, any> || {}
  const logoUrl = companySettings.logo_url || null

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-4 flex items-center justify-center">
        <Spinner size="lg" className="text-blue-600" />
      </div>
    )
  }

  if (!driver) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-lg bg-white border-slate-200">
          <CardContent className="pt-6 text-center">
            <Car className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-slate-900">Portal Not Found</h2>
            <p className="text-slate-500">
              This driver portal link is invalid or has been disabled.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (driver.status !== 'active') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-lg bg-white border-slate-200">
          <CardContent className="pt-6 text-center">
            <Lock className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-slate-900">Access Suspended</h2>
            <p className="text-slate-500">
              Your driver account has been suspended. Please contact the admin.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if locked out for UI
  const isCurrentlyLocked = lockoutRemaining > 0
  const lockoutMinutes = Math.ceil(lockoutRemaining / 60000)
  const lockoutSeconds = Math.ceil((lockoutRemaining % 60000) / 1000)

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-xl bg-white border-slate-200">
          <CardHeader className="text-center pb-2 bg-white rounded-t-lg">
            {/* Company Logo */}
            <div className="flex justify-center mb-4">
              {logoUrl ? (
                <div className="relative h-16 w-48">
                  <Image
                    src={logoUrl}
                    alt={driver.company.name || 'Company Logo'}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                  <Car className="h-8 w-8 text-blue-600" />
                </div>
              )}
            </div>
            <CardTitle className="text-xl text-slate-900">Driver Portal</CardTitle>
            <CardDescription className="text-slate-600">
              Welcome, {driver.nickname || driver.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="bg-white rounded-b-lg">
            {isCurrentlyLocked ? (
              <div className="text-center py-6">
                <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h3 className="font-semibold text-lg text-slate-900 mb-2">Too Many Attempts</h3>
                <p className="text-slate-600 mb-4">
                  Please wait before trying again.
                </p>
                <div className="text-3xl font-mono font-bold text-slate-900">
                  {String(Math.floor(lockoutRemaining / 60000)).padStart(2, '0')}:
                  {String(lockoutSeconds).padStart(2, '0')}
                </div>
                <p className="text-xs text-slate-500 mt-2">minutes remaining</p>
              </div>
            ) : (
              <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pin" className="text-slate-700 font-medium">Enter 4-Digit PIN</Label>
                  <Input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="••••"
                    className="text-center text-3xl tracking-[0.5em] h-14 font-mono bg-white text-slate-900 border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                    maxLength={4}
                    required
                    autoFocus
                  />
                  {attemptCount > 0 && attemptCount < MAX_PIN_ATTEMPTS && (
                    <p className="text-xs text-amber-600 text-center">
                      {MAX_PIN_ATTEMPTS - attemptCount} attempts remaining
                    </p>
                  )}
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 text-white" 
                  disabled={authenticating || pin.length !== 4}
                >
                  {authenticating ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5 mr-2" />
                      Access Portal
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              {logoUrl ? (
                <div className="relative h-8 w-24">
                  <Image
                    src={logoUrl}
                    alt={driver.company.name || 'Company Logo'}
                    fill
                    className="object-contain object-left"
                    unoptimized
                  />
                </div>
              ) : (
                <Car className="h-6 w-6 text-blue-600" />
              )}
              <h1 className="font-semibold text-slate-900 text-sm">{driver.nickname || driver.name}</h1>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-0 text-xs font-medium">
              {totalPax} Pax
            </Badge>
          </div>
        </div>
      </header>

      {/* Date Navigator */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => changeDate(-1)} className="text-slate-600 hover:bg-slate-100">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <p className="font-semibold text-slate-900">{formatDate(selectedDate)}</p>
            <p className="text-xs text-slate-600">
              {pickups.length} pickup{pickups.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => changeDate(1)} className="text-slate-600 hover:bg-slate-100">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Pickup List */}
      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {pickups.length === 0 ? (
          <Card className="shadow-sm bg-white border-slate-200">
            <CardContent className="py-12 text-center bg-white rounded-lg">
              <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No pickups for this date</p>
            </CardContent>
          </Card>
        ) : (
          pickups.map((pickup, index) => (
            <Card key={pickup.id} className="shadow-sm bg-white border-slate-200">
              <CardHeader className="pb-2 bg-white rounded-t-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2 text-slate-900">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center">
                        {index + 1}
                      </span>
                      {pickup.customer_name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1 text-slate-600">
                      <Clock className="h-3 w-3" />
                      {pickup.pickup_time || 'Time TBD'}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-0">
                    {pickup.adults}A
                    {pickup.children > 0 && ` ${pickup.children}C`}
                    {pickup.infants > 0 && ` ${pickup.infants}I`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 bg-white rounded-b-lg">
                {/* Hotel Info */}
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-slate-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900">
                      {pickup.hotel?.name || 'No hotel specified'}
                    </p>
                    {pickup.room_number && (
                      <p className="text-sm text-slate-600">
                        Room {pickup.room_number}
                      </p>
                    )}
                    {pickup.hotel?.pickup_notes && (
                      <p className="text-sm text-slate-600">
                        {pickup.hotel.pickup_notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {pickup.notes && (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
                    {pickup.notes}
                  </div>
                )}

                <Separator className="bg-slate-200" />

                {/* Contact Buttons */}
                <div className="flex gap-2">
                  {pickup.customer_whatsapp && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-white border-green-300 text-green-700 hover:bg-green-50"
                      asChild
                    >
                      <a
                        href={`https://wa.me/${pickup.customer_whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        WhatsApp
                      </a>
                    </Button>
                  )}
                  {pickup.customer_whatsapp && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-white border-blue-300 text-blue-700 hover:bg-blue-50"
                      asChild
                    >
                      <a href={`tel:${pickup.customer_whatsapp}`}>
                        <Phone className="h-4 w-4 mr-2" />
                        Call
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}

        {/* Download Button */}
        {pickups.length > 0 && (
          <Button variant="outline" className="w-full bg-white border-slate-300 text-slate-700 hover:bg-slate-50">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        )}
      </main>
    </div>
  )
}
