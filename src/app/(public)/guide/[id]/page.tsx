"use client"

import { useEffect, useState } from 'react'
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
  UserCheck,
  Lock,
  Calendar,
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
  notes?: string
  program?: Program
  agent?: { id: string; name: string }
  collect_money?: number
  is_direct_booking?: boolean
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
      try {
        // Use API route to bypass RLS for public access
        const response = await fetch(`/api/guide/${guideId}`)
        
        if (!response.ok) {
          setLoading(false)
          return
        }

        const { guide: guideData } = await response.json()

        if (!guideData) {
          setLoading(false)
          return
        }

        setGuide(guideData)
        setCompany(guideData.company as Company)
      } catch (error) {
        console.error('Error fetching guide:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchGuide()
  }, [guideId])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guide || !pin) return

    setAuthenticating(true)

    try {
      // Plain text PIN comparison - trim and ensure string comparison
      const accessPin = String(guide.access_pin || '').trim()
      const enteredPin = String(pin).trim()
      const isValid = enteredPin === accessPin
      
      if (isValid) {
        setAuthenticated(true)
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

    try {
      // Use API route to bypass RLS for public access
      const response = await fetch(`/api/guide/${guideId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          guideId: guide.id,
        }),
      })

      if (!response.ok) {
        setAssignments([])
        return
      }

      const { assignments: assignmentsData } = await response.json()
      setAssignments(assignmentsData || [])
    } catch (error) {
      console.error('Error fetching assignments:', error)
      setAssignments([])
    }
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

  // Get company logo from settings
  const companySettings = company?.settings as Record<string, any> || {}
  const logoUrl = companySettings.logo_url || null

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
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-xl bg-white border-slate-200">
          <CardHeader className="text-center pb-2 bg-white rounded-t-lg">
            {/* Company Logo */}
            <div className="flex justify-center mb-4">
              {logoUrl ? (
                <div className="relative h-16 w-48">
                  <Image
                    src={logoUrl}
                    alt={company.name || 'Company Logo'}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCheck className="h-8 w-8 text-primary" />
                </div>
              )}
            </div>
            <CardTitle>Guide Report</CardTitle>
            <CardDescription>{guide.name}</CardDescription>
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
            <div className="flex flex-col gap-1">
              {logoUrl ? (
                <div className="relative h-8 w-24">
                  <Image
                    src={logoUrl}
                    alt={company.name || 'Company Logo'}
                    fill
                    className="object-contain object-left"
                    unoptimized
                  />
                </div>
              ) : (
                <h1 className="font-semibold">{company.name}</h1>
              )}
              <p className="text-sm text-muted-foreground">{guide.name}</p>
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

                        {/* Agent */}
                        {(customer.agent || customer.is_direct_booking) && (
                          <div className="flex items-center gap-2 text-sm mb-2">
                            <span className={`w-2 h-2 rounded-full ${customer.is_direct_booking ? 'bg-green-500' : 'bg-orange-500'}`} />
                            <span className="text-muted-foreground">
                              {customer.is_direct_booking ? 'Direct Booking' : customer.agent?.name}
                            </span>
                          </div>
                        )}

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
                            <span>
                              {customer.hotel?.name || customer.custom_pickup_location}
                            </span>
                          </div>
                        )}

                        {/* Collect Money */}
                        {customer.collect_money && customer.collect_money > 0 && (
                          <div className="flex items-center gap-2 text-sm mb-2">
                            <span className="text-green-600 font-medium">
                              💵 Collect: {customer.collect_money.toLocaleString()} THB
                            </span>
                          </div>
                        )}

                        {/* Notes */}
                        {customer.notes && (
                          <div className="p-2 bg-muted rounded-md text-sm mt-2">
                            {customer.notes}
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










