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
  UserCheck,
  Lock,
  Calendar,
  MapPin,
  Phone,
  MessageCircle,
  Users,
  Anchor,
  ChevronLeft,
  ChevronRight,
  Hotel,
  Utensils,
} from 'lucide-react'
import type { Guide, Company, Booking, Hotel as HotelType, Boat, Restaurant, Program } from '@/types'

interface CustomerItem {
  id: string
  customer_name: string
  adults: number
  children: number
  infants: number
  hotel?: HotelType
  custom_pickup_location?: string
  customer_whatsapp?: string
  notes?: string
  room_number?: string
  program?: Program
}

interface BoatAssignment {
  boat: Boat
  restaurant?: Restaurant
  customers: CustomerItem[]
}

export default function GuidePortalPage() {
  const params = useParams()
  const guideId = params.id as string

  const [guide, setGuide] = useState<Guide | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [assignments, setAssignments] = useState<BoatAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [authenticating, setAuthenticating] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [pin, setPin] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    async function fetchGuide() {
      const supabase = createClient()

      // Fetch guide by unique link ID
      const { data: guideData, error } = await supabase
        .from('guides')
        .select(`
          *,
          company:companies(*)
        `)
        .eq('unique_link_id', guideId)
        .single()

      if (error || !guideData) {
        setLoading(false)
        return
      }

      setGuide(guideData)
      setCompany(guideData.company as Company)
      setLoading(false)
    }

    fetchGuide()
  }, [guideId])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guide || !pin) return

    setAuthenticating(true)

    try {
      const isValid = await bcrypt.compare(pin, guide.access_pin || '')
      
      if (isValid) {
        setAuthenticated(true)
        toast.success('Welcome!')
        fetchAssignments()
      } else {
        toast.error('Invalid PIN')
      }
    } catch (error) {
      toast.error('Authentication failed')
    } finally {
      setAuthenticating(false)
    }
  }

  const fetchAssignments = async () => {
    if (!guide) return

    const supabase = createClient()
    
    // First, get boat assignment locks where this guide is assigned for the selected date
    const { data: locks } = await supabase
      .from('boat_assignment_locks')
      .select(`
        *,
        boat:boats(*),
        restaurant:restaurants(*)
      `)
      .eq('guide_id', guide.id)
      .eq('activity_date', selectedDate)

    if (!locks || locks.length === 0) {
      setAssignments([])
      return
    }

    // Get boat IDs where this guide is assigned
    const boatIds = locks.map(lock => lock.boat_id)

    // Fetch bookings for those boats on this date
    const { data: bookings } = await supabase
      .from('bookings')
      .select(`
        *,
        hotel:hotels(*),
        program:programs(*)
      `)
      .eq('activity_date', selectedDate)
      .in('boat_id', boatIds)
      .is('deleted_at', null)
      .not('status', 'in', '("void","cancelled")')
      .order('customer_name')

    // Group bookings by boat
    const boatAssignments: BoatAssignment[] = locks.map(lock => ({
      boat: lock.boat as Boat,
      restaurant: lock.restaurant as Restaurant | undefined,
      customers: (bookings || [])
        .filter(b => b.boat_id === lock.boat_id)
        .map(b => ({
          id: b.id,
          customer_name: b.customer_name,
          adults: b.adults || 0,
          children: b.children || 0,
          infants: b.infants || 0,
          hotel: b.hotel as HotelType | undefined,
          custom_pickup_location: b.custom_pickup_location,
          customer_whatsapp: b.customer_whatsapp,
          notes: b.notes,
          room_number: b.room_number,
          program: b.program as Program | undefined,
        }))
    }))

    setAssignments(boatAssignments)
  }

  useEffect(() => {
    if (authenticated) {
      fetchAssignments()
    }
  }, [selectedDate, authenticated])

  const changeDate = (days: number) => {
    const date = new Date(selectedDate)
    date.setDate(date.getDate() + days)
    setSelectedDate(date.toISOString().split('T')[0])
  }

  const totalPax = assignments.reduce((sum, a) => 
    sum + a.customers.reduce((s, c) => s + c.adults + c.children + c.infants, 0), 0
  )

  const totalCustomers = assignments.reduce((sum, a) => sum + a.customers.length, 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!guide || !company) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Portal Not Found</h2>
            <p className="text-muted-foreground">
              This guide portal link is invalid or has been disabled.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (guide.status !== 'active') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Suspended</h2>
            <p className="text-muted-foreground">
              Your guide account has been suspended. Please contact the admin.
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
              <UserCheck className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>{company.name}</CardTitle>
            <CardDescription>Guide Portal - {guide.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pin">Enter PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  className="text-center text-2xl tracking-widest"
                  maxLength={4}
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
              <h1 className="font-semibold">{guide.name}</h1>
              <p className="text-sm text-muted-foreground">{company.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Anchor className="h-3 w-3" />
                {assignments.length} boat{assignments.length !== 1 ? 's' : ''}
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {totalPax} pax
              </Badge>
            </div>
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
              {totalCustomers} customer{totalCustomers !== 1 ? 's' : ''}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => changeDate(1)}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Boat Assignments */}
      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {assignments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No boat assignments for this date</p>
            </CardContent>
          </Card>
        ) : (
          assignments.map((assignment) => {
            const boatPax = assignment.customers.reduce(
              (sum, c) => sum + c.adults + c.children + c.infants, 0
            )

            return (
              <Card key={assignment.boat.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Anchor className="h-5 w-5 text-primary" />
                        {assignment.boat.name}
                      </CardTitle>
                      <CardDescription>
                        Captain: {assignment.boat.captain_name || 'TBD'}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">
                      {boatPax}/{assignment.boat.capacity} pax
                    </Badge>
                  </div>
                  {assignment.restaurant && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Utensils className="h-4 w-4" />
                      <span>
                        Lunch: {assignment.restaurant.name}
                        {assignment.restaurant.location && ` (${assignment.restaurant.location})`}
                      </span>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="space-y-3">
                  {assignment.customers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No customers assigned to this boat yet
                    </p>
                  ) : (
                    assignment.customers.map((customer, index) => (
                      <div key={customer.id} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-medium">
                              {index + 1}
                            </span>
                            <span className="font-medium">{customer.customer_name}</span>
                          </div>
                          <Badge variant="secondary">
                            {customer.adults}A
                            {customer.children > 0 && ` ${customer.children}C`}
                            {customer.infants > 0 && ` ${customer.infants}I`}
                          </Badge>
                        </div>

                        {/* Program */}
                        {customer.program && (
                          <div className="flex items-center gap-2 text-sm mb-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: customer.program.color || '#6b7280' }}
                            />
                            <span className="text-muted-foreground">
                              {customer.program.nickname || customer.program.name}
                            </span>
                          </div>
                        )}

                        {/* Hotel/Location */}
                        {(customer.hotel || customer.custom_pickup_location) && (
                          <div className="flex items-start gap-2 text-sm mb-2">
                            <Hotel className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p>
                                {customer.hotel?.name || customer.custom_pickup_location}
                              </p>
                              {customer.room_number && (
                                <p className="text-muted-foreground">Room {customer.room_number}</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Notes */}
                        {customer.notes && (
                          <div className="p-2 bg-muted rounded-md text-sm mt-2">
                            {customer.notes}
                          </div>
                        )}

                        {/* Contact Button */}
                        {customer.customer_whatsapp && (
                          <div className="mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              asChild
                            >
                              <a
                                href={`https://wa.me/${customer.customer_whatsapp.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <MessageCircle className="h-4 w-4 mr-2" />
                                WhatsApp
                              </a>
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </main>
    </div>
  )
}










