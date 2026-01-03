"use client"

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSubdomain } from '@/hooks/use-subdomain'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Separator } from '@/components/ui/separator'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { Ship, Calendar, Users, CreditCard, CheckCircle } from 'lucide-react'
import type { Program, Hotel, Company, ReferenceHotel } from '@/types'

// Combined hotel type for display
interface CombinedHotel {
  id: string
  name: string
  area: string
  isCustom: boolean
}

function DirectBookingContent() {
  const subdomain = useSubdomain()
  
  const [company, setCompany] = useState<Company | null>(null)
  const [programs, setPrograms] = useState<Program[]>([])
  const [referenceHotels, setReferenceHotels] = useState<ReferenceHotel[]>([])
  const [customLocations, setCustomLocations] = useState<Hotel[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [bookingNumber, setBookingNumber] = useState('')

  const [formData, setFormData] = useState({
    program_id: '',
    booking_date: '',
    adults: 1,
    children: 0,
    infants: 0,
    hotel_id: '',
    notes: '',
    customer_name: '',
    customer_email: '',
    customer_whatsapp: '',
  })

  useEffect(() => {
    // Wait for subdomain to be detected
    if (!subdomain) return
    
    async function fetchData() {
      const supabase = createClient()

      // Fetch company by slug
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('slug', subdomain)
        .single()

      if (!companyData) {
        setLoading(false)
        return
      }

      setCompany(companyData)

      const region = companyData.region || 'Phuket'

      // Build reference hotels query based on region
      let referenceQuery = supabase
        .from('reference_hotels')
        .select('*')
        .order('area')
        .order('name')

      if (region !== 'Both') {
        referenceQuery = referenceQuery.eq('province', region)
      }

      // Fetch programs, reference hotels, and custom locations
      const [programsRes, referenceHotelsRes, customLocationsRes] = await Promise.all([
        supabase
          .from('programs')
          .select('*')
          .eq('company_id', companyData.id)
          .eq('status', 'active')
          .order('name'),
        referenceQuery,
        supabase
          .from('hotels')
          .select('*')
          .eq('company_id', companyData.id)
          .order('area')
          .order('name'),
      ])

      setPrograms(programsRes.data || [])
      setReferenceHotels(referenceHotelsRes.data || [])
      setCustomLocations(customLocationsRes.data || [])
      setLoading(false)
    }

    fetchData()
  }, [subdomain])

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const selectedProgram = programs.find(p => p.id === formData.program_id)
  const totalGuests = formData.adults + formData.children + formData.infants
  const totalPrice = selectedProgram ? selectedProgram.base_price * (formData.adults + formData.children * 0.5) : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!company || !formData.program_id || !formData.booking_date || !formData.customer_name || !formData.customer_email) {
      toast.error('Please fill in all required fields')
      return
    }

    setSubmitting(true)

    try {
      const supabase = createClient()

      // Generate booking number
      const { data: bookingNum, error: seqError } = await supabase
        .rpc('generate_booking_number', { p_company_id: company.id, p_payment_type: 'regular' })

      if (seqError) throw seqError

      // Determine hotel_id and custom_pickup_location based on selection
      let hotelId: string | null = null
      let customPickupLocation: string | null = null

      if (formData.hotel_id) {
        if (formData.hotel_id.startsWith('custom-')) {
          // Selected from company's custom locations (hotels table)
          hotelId = formData.hotel_id.replace('custom-', '')
        } else if (formData.hotel_id.startsWith('ref-')) {
          // Selected from reference hotels - store the hotel name as custom location
          const refHotel = referenceHotels.find(h => `ref-${h.id}` === formData.hotel_id)
          if (refHotel) {
            customPickupLocation = `${refHotel.name} (${refHotel.area})`
          }
        }
      }

      // Create booking
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          company_id: company.id,
          booking_number: bookingNum,
          activity_date: formData.booking_date,
          program_id: formData.program_id,
          customer_name: formData.customer_name,
          customer_email: formData.customer_email,
          customer_whatsapp: formData.customer_whatsapp || null,
          adults: formData.adults,
          children: formData.children,
          infants: formData.infants,
          hotel_id: hotelId,
          custom_pickup_location: customPickupLocation,
          notes: formData.notes || null,
          status: 'pending',
          payment_type: 'regular',
          is_direct_booking: true,
          collect_money: totalPrice,
        })
        .select()
        .single()

      if (error) throw error

      setBookingNumber(bookingNum)
      setSuccess(true)
      toast.success('Booking submitted successfully!')
    } catch (error: any) {
      console.error('Booking error:', error)
      toast.error(error.message || 'Failed to submit booking')
    } finally {
      setSubmitting(false)
    }
  }

  // Combine reference hotels and custom locations for display
  const combinedHotels: CombinedHotel[] = [
    ...customLocations.map(h => ({
      id: `custom-${h.id}`,
      name: h.name,
      area: h.area,
      isCustom: true,
    })),
    ...referenceHotels.map(h => ({
      id: `ref-${h.id}`,
      name: h.name,
      area: h.area,
      isCustom: false,
    })),
  ]

  // Group hotels by area
  const hotelsByArea = combinedHotels.reduce((acc, hotel) => {
    const areaKey = hotel.isCustom ? `⭐ Custom - ${hotel.area}` : hotel.area
    if (!acc[areaKey]) {
      acc[areaKey] = []
    }
    acc[areaKey].push(hotel)
    return acc
  }, {} as Record<string, CombinedHotel[]>)

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-16 w-48" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Ship className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Company Not Found</h2>
            <p className="text-muted-foreground">
              The company you&apos;re looking for doesn&apos;t exist.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background gradient-mesh flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Booking Confirmed!</h2>
            <p className="text-muted-foreground mb-4">
              Your booking has been submitted successfully.
            </p>
            <div className="p-4 bg-muted rounded-lg mb-4">
              <p className="text-sm text-muted-foreground">Booking Reference</p>
              <p className="text-2xl font-mono font-bold">{bookingNumber}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              A confirmation email has been sent to your email address.
              We will contact you with the pickup time.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background gradient-mesh">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
            <Ship className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{company.name}</h1>
            <p className="text-sm text-muted-foreground">Book Your Tour</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tour Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Tour Selection
              </CardTitle>
              <CardDescription>Choose your tour and date</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="program_id">Program *</Label>
                <Select
                  value={formData.program_id}
                  onValueChange={(v) => handleChange('program_id', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((program) => (
                      <SelectItem key={program.id} value={program.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: (program as any).color || '#3B82F6' }}
                          />
                          {program.name} - {formatCurrency(program.base_price)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="booking_date">Tour Date *</Label>
                <Input
                  id="booking_date"
                  type="date"
                  value={formData.booking_date}
                  onChange={(e) => handleChange('booking_date', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Guest Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Guest Details
              </CardTitle>
              <CardDescription>Number of guests and pickup location</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="adults">Adults</Label>
                  <Input
                    id="adults"
                    type="number"
                    min="1"
                    value={formData.adults}
                    onChange={(e) => handleChange('adults', parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="children">Children</Label>
                  <Input
                    id="children"
                    type="number"
                    min="0"
                    value={formData.children}
                    onChange={(e) => handleChange('children', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="infants">Infants</Label>
                  <Input
                    id="infants"
                    type="number"
                    min="0"
                    value={formData.infants}
                    onChange={(e) => handleChange('infants', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hotel_id">Pickup Hotel</Label>
                <Select
                  value={formData.hotel_id}
                  onValueChange={(v) => handleChange('hotel_id', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your hotel" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(hotelsByArea).map(([area, areaHotels]) => (
                      <div key={area}>
                        <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                          {area}
                        </div>
                        {areaHotels.map((hotel) => (
                          <SelectItem key={hotel.id} value={hotel.id}>
                            {hotel.name}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Special Requests</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Dietary requirements, allergies, special requests..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>We&apos;ll use this to confirm your booking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer_name">Full Name *</Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => handleChange('customer_name', e.target.value)}
                  placeholder="John Smith"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="customer_email">Email *</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => handleChange('customer_email', e.target.value)}
                    placeholder="john@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_whatsapp">WhatsApp</Label>
                  <Input
                    id="customer_whatsapp"
                    value={formData.customer_whatsapp}
                    onChange={(e) => handleChange('customer_whatsapp', e.target.value)}
                    placeholder="+66 812 345 678"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedProgram && formData.booking_date ? (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Program</span>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: (selectedProgram as any).color || '#3B82F6' }}
                        />
                        {selectedProgram.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date</span>
                      <span>{formatDate(formData.booking_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Guests</span>
                      <span>
                        {formData.adults}A
                        {formData.children > 0 && ` ${formData.children}C`}
                        {formData.infants > 0 && ` ${formData.infants}I`}
                      </span>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(totalPrice)}</span>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Select a program and date to see the total
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={submitting || !formData.program_id || !formData.booking_date}
              >
                {submitting ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Submitting...
                  </>
                ) : (
                  'Book Now'
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Payment will be collected at the time of pickup or via bank transfer.
                Pickup time will be confirmed separately.
              </p>
            </CardContent>
          </Card>
        </form>
      </main>
    </div>
  )
}

export default function DirectBookingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-16 w-48" />
          <Skeleton className="h-96" />
        </div>
      </div>
    }>
      <DirectBookingContent />
    </Suspense>
  )
}

