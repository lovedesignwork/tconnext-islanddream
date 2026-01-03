"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
import bcrypt from 'bcryptjs'
import {
  Car,
  Lock,
  Calendar,
  MapPin,
  Phone,
  MessageCircle,
  Users,
  Clock,
  Download,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { Driver, Booking, Company, Hotel } from '@/types'

interface PickupItem extends Booking {
  hotel?: Hotel
}

export default function DriverPortalPage() {
  const params = useParams()
  const driverId = params.id as string

  const [driver, setDriver] = useState<Driver | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [pickups, setPickups] = useState<PickupItem[]>([])
  const [loading, setLoading] = useState(true)
  const [authenticating, setAuthenticating] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [pin, setPin] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    async function fetchDriver() {
      const supabase = createClient()

      // Fetch driver by unique link ID
      const { data: driverData, error } = await supabase
        .from('drivers')
        .select(`
          *,
          company:companies(*)
        `)
        .eq('unique_link_id', driverId)
        .single()

      if (error || !driverData) {
        setLoading(false)
        return
      }

      setDriver(driverData)
      setCompany(driverData.company as Company)
      setLoading(false)
    }

    fetchDriver()
  }, [driverId])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!driver || !pin) return

    setAuthenticating(true)

    try {
      const isValid = await bcrypt.compare(pin, driver.access_pin)
      
      if (isValid) {
        setAuthenticated(true)
        toast.success('Welcome!')
        fetchPickups()
      } else {
        toast.error('Invalid PIN')
      }
    } catch (error) {
      toast.error('Authentication failed')
    } finally {
      setAuthenticating(false)
    }
  }

  const fetchPickups = async () => {
    if (!driver) return

    const supabase = createClient()
    const { data } = await supabase
      .from('bookings')
      .select(`
        *,
        hotel:hotels(*)
      `)
      .eq('driver_id', driver.id)
      .eq('activity_date', selectedDate)
      .is('deleted_at', null)
      .order('pickup_time')

    setPickups(data || [])
  }

  useEffect(() => {
    if (authenticated) {
      fetchPickups()
    }
  }, [selectedDate, authenticated])

  const changeDate = (days: number) => {
    const date = new Date(selectedDate)
    date.setDate(date.getDate() + days)
    setSelectedDate(date.toISOString().split('T')[0])
  }

  const totalPax = pickups.reduce(
    (sum, p) => sum + (p.adults || 0) + (p.children || 0) + (p.infants || 0),
    0
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!driver || !company) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Portal Not Found</h2>
            <p className="text-muted-foreground">
              This driver portal link is invalid or has been disabled.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (driver.status !== 'active') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Suspended</h2>
            <p className="text-muted-foreground">
              Your driver account has been suspended. Please contact the admin.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background gradient-mesh flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Car className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>{company.name}</CardTitle>
            <CardDescription>Driver Portal - {driver.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pin">Enter PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••••"
                  className="text-center text-2xl tracking-widest"
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={authenticating}>
                {authenticating ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Access Portal
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-semibold">{driver.name}</h1>
              <p className="text-sm text-muted-foreground">{company.name}</p>
            </div>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {totalPax} pax
            </Badge>
          </div>
        </div>
      </header>

      {/* Date Navigator */}
      <div className="border-b bg-muted/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => changeDate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <p className="font-semibold">{formatDate(selectedDate)}</p>
            <p className="text-xs text-muted-foreground">
              {pickups.length} pickup{pickups.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => changeDate(1)}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Pickup List */}
      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {pickups.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No pickups for this date</p>
            </CardContent>
          </Card>
        ) : (
          pickups.map((pickup, index) => (
            <Card key={pickup.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">
                        {index + 1}
                      </span>
                      {pickup.customer_name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" />
                      {pickup.pickup_time || 'Time TBD'}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">
                    {pickup.adults}A
                    {pickup.children > 0 && ` ${pickup.children}C`}
                    {pickup.infants > 0 && ` ${pickup.infants}I`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Hotel Info */}
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">
                      {pickup.hotel?.name || 'No hotel specified'}
                    </p>
                    {pickup.room_number && (
                      <p className="text-sm text-muted-foreground">
                        Room {pickup.room_number}
                      </p>
                    )}
                    {pickup.hotel?.pickup_notes && (
                      <p className="text-sm text-muted-foreground">
                        {pickup.hotel.pickup_notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {pickup.notes && (
                  <div className="p-2 bg-muted rounded-md text-sm">
                    {pickup.notes}
                  </div>
                )}

                <Separator />

                {/* Contact Buttons */}
                <div className="flex gap-2">
                  {pickup.customer_whatsapp && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
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
                      className="flex-1"
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
          <Button variant="outline" className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        )}
      </main>
    </div>
  )
}



