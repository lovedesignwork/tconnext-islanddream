"use client"

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useSubdomain } from '@/hooks/use-subdomain'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { toast } from 'sonner'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { 
  Ship, 
  Calendar, 
  Users, 
  CreditCard, 
  MapPin, 
  ChevronLeft,
  Clock,
  Minus,
  Plus,
  Building2,
  Navigation,
  Banknote,
  CheckCircle,
  Check,
  ChevronsUpDown,
  Search,
  CalendarIcon,
  Download,
  FileText,
  Car,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import type { Program, Hotel, Company, ReferenceHotel, ComeDirectLocation, ProgramAvailability } from '@/types'

interface ProgramWithBookingFields extends Program {
  slug: string | null
  thumbnail_url: string | null
  direct_booking_enabled: boolean
  short_description: string | null
  adult_selling_price: number
  child_selling_price: number
  come_direct_location: ComeDirectLocation | null
}

// Combined hotel type for display
interface CombinedHotel {
  id: string
  name: string
  area: string
  isCustom: boolean
}

type PickupType = 'hotel' | 'custom' | 'come_direct'
type PaymentMethod = 'stripe' | 'cash'

export default function ProgramBookingPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const subdomain = useSubdomain()
  
  const [company, setCompany] = useState<Company | null>(null)
  const [program, setProgram] = useState<ProgramWithBookingFields | null>(null)
  const [referenceHotels, setReferenceHotels] = useState<ReferenceHotel[]>([])
  const [customLocations, setCustomLocations] = useState<Hotel[]>([])
  const [availability, setAvailability] = useState<ProgramAvailability[]>([])
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)

  const [formData, setFormData] = useState({
    activity_date: '',
    adults: 1,
    children: 0,
    infants: 0,
    pickup_type: 'come_direct' as PickupType,
    hotel_id: '',
    custom_location: '',
    custom_location_google_maps: '',
    room_number: '',
    customer_name: '',
    customer_email: '',
    customer_whatsapp: '',
    notes: '',
    payment_method: 'cash' as PaymentMethod, // Default to cash
  })

  // Stripe publishable key from payment intent response
  const [stripePublishableKey, setStripePublishableKey] = useState<string | null>(null)

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

      // Fetch program by slug
      const { data: programData } = await supabase
        .from('programs')
        .select('*')
        .eq('company_id', companyData.id)
        .eq('slug', slug)
        .eq('status', 'active')
        .eq('direct_booking_enabled', true)
        .single()

      if (!programData) {
        setLoading(false)
        return
      }

      setProgram(programData as ProgramWithBookingFields)

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

      // Fetch hotels and availability (next 3 months)
      const today = new Date()
      const threeMonthsLater = addMonths(today, 3)

      const [referenceHotelsRes, customLocationsRes, availabilityRes, bookingsRes] = await Promise.all([
        referenceQuery,
        supabase
          .from('hotels')
          .select('*')
          .eq('company_id', companyData.id)
          .order('area')
          .order('name'),
        // Fetch program availability
        supabase
          .from('program_availability')
          .select('*')
          .eq('program_id', programData.id)
          .gte('date', format(today, 'yyyy-MM-dd'))
          .lte('date', format(threeMonthsLater, 'yyyy-MM-dd')),
        // Fetch booking counts per date
        supabase
          .from('bookings')
          .select('activity_date, adults, children')
          .eq('company_id', companyData.id)
          .eq('program_id', programData.id)
          .neq('status', 'cancelled')
          .gte('activity_date', format(today, 'yyyy-MM-dd'))
          .lte('activity_date', format(threeMonthsLater, 'yyyy-MM-dd')),
      ])

      setReferenceHotels(referenceHotelsRes.data || [])
      setCustomLocations(customLocationsRes.data || [])
      setAvailability(availabilityRes.data || [])

      // Calculate booking counts per date
      const counts: Record<string, number> = {}
      if (bookingsRes.data) {
        bookingsRes.data.forEach((booking: any) => {
          const dateKey = booking.activity_date
          const pax = (booking.adults || 0) + (booking.children || 0)
          counts[dateKey] = (counts[dateKey] || 0) + pax
        })
      }
      setBookingCounts(counts)
      
      setLoading(false)
    }

    fetchData()
  }, [subdomain, slug])

  // Set default payment method based on what's available
  useEffect(() => {
    if (!company) return
    
    const settings = company.settings || {}
    const bookingConfig = settings.booking || {}
    const stripeConfig = settings.stripe || {}
    const cashAllowed = bookingConfig.allow_cash_on_tour !== false
    const stripeReady = !!(stripeConfig.public_key && stripeConfig.secret_key)
    
    // If current selection is not available, switch to an available option
    if (formData.payment_method === 'cash' && !cashAllowed && stripeReady) {
      setFormData(prev => ({ ...prev, payment_method: 'stripe' }))
    } else if (formData.payment_method === 'stripe' && !stripeReady && cashAllowed) {
      setFormData(prev => ({ ...prev, payment_method: 'cash' }))
    } else if (!cashAllowed && stripeReady && formData.payment_method === 'cash') {
      setFormData(prev => ({ ...prev, payment_method: 'stripe' }))
    }
  }, [company, formData.payment_method])

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const incrementGuest = (field: 'adults' | 'children' | 'infants') => {
    setFormData(prev => ({ ...prev, [field]: prev[field] + 1 }))
  }

  const decrementGuest = (field: 'adults' | 'children' | 'infants') => {
    const min = field === 'adults' ? 1 : 0
    setFormData(prev => ({ ...prev, [field]: Math.max(min, prev[field] - 1) }))
  }

  // Calculate pricing
  const adultPrice = program?.adult_selling_price || program?.selling_price || program?.base_price || 0
  const childPrice = program?.child_selling_price || (adultPrice * 0.5)
  const totalPrice = (formData.adults * adultPrice) + (formData.children * childPrice)

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
    const areaKey = hotel.isCustom ? `⭐ ${hotel.area}` : hotel.area
    if (!acc[areaKey]) {
      acc[areaKey] = []
    }
    acc[areaKey].push(hotel)
    return acc
  }, {} as Record<string, CombinedHotel[]>)

  // Helper function to get date availability status
  const getDateStatus = useCallback((date: Date): { isAvailable: boolean; isFull: boolean; isClosed: boolean; remaining: number } => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const avail = availability.find(a => a.date === dateStr)
    const booked = bookingCounts[dateStr] || 0
    
    // If no availability record, check default behavior
    if (!avail) {
      // Default: open with unlimited slots
      return { isAvailable: true, isFull: false, isClosed: false, remaining: 999 }
    }
    
    // If explicitly closed
    if (!avail.is_open) {
      return { isAvailable: false, isFull: false, isClosed: true, remaining: 0 }
    }
    
    // Check if full
    const remaining = avail.total_slots - booked
    const isFull = remaining <= 0
    
    return { 
      isAvailable: !isFull, 
      isFull, 
      isClosed: false, 
      remaining: Math.max(0, remaining) 
    }
  }, [availability, bookingCounts])

  // Only disable past dates - full/closed dates will be styled differently but still clickable
  // (clicking them will show an error message)
  const isDateDisabled = useCallback((date: Date): boolean => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Only disable past dates
    return date < today
  }, [])

  // Custom day render for calendar to show full/closed dates
  const modifiers = useMemo(() => ({
    full: (date: Date) => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (date < today) return false // Don't apply to past dates
      const status = getDateStatus(date)
      return status.isFull
    },
    closed: (date: Date) => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (date < today) return false // Don't apply to past dates
      const status = getDateStatus(date)
      return status.isClosed
    },
  }), [getDateStatus])

  // Modifier class names - the Calendar component handles styling for full/closed
  const modifiersClassNames = {
    full: 'full',
    closed: 'closed',
  }

  // Check if Cash on Tour is allowed (default to true for backwards compatibility)
  const companySettings = company?.settings || {}
  const bookingSettings = companySettings.booking || {}
  const stripeConfig = companySettings.stripe || {}
  const allowCashOnTour = bookingSettings.allow_cash_on_tour !== false

  // Check if Stripe is available (keys configured + enabled in settings)
  const isStripeAvailable = !!(stripeConfig.public_key && stripeConfig.secret_key) && 
    bookingSettings.stripe_payments_enabled !== false

  // Create payment intent when form is valid and payment method is stripe
  const createPaymentIntent = useCallback(async () => {
    if (!subdomain || !company || !program || !formData.activity_date || !formData.customer_name || !formData.customer_whatsapp) {
      return
    }

    // Determine pickup location
    let hotelId: string | undefined
    let customPickupLocation: string | undefined

    if (formData.pickup_type === 'hotel' && formData.hotel_id) {
      if (formData.hotel_id.startsWith('custom-')) {
        hotelId = formData.hotel_id.replace('custom-', '')
      } else if (formData.hotel_id.startsWith('ref-')) {
        const refHotel = referenceHotels.find(h => `ref-${h.id}` === formData.hotel_id)
        if (refHotel) {
          customPickupLocation = `${refHotel.name} (${refHotel.area})`
        }
      }
    } else if (formData.pickup_type === 'custom') {
      customPickupLocation = formData.custom_location
    }

    try {
      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companySlug: subdomain,
          programId: program.id,
          activityDate: formData.activity_date,
          adults: formData.adults,
          children: formData.children,
          infants: formData.infants,
          customerName: formData.customer_name,
          customerEmail: formData.customer_email,
          customerWhatsapp: formData.customer_whatsapp,
          hotelId,
          customPickupLocation,
          customLocationGoogleMaps: formData.pickup_type === 'custom' ? formData.custom_location_google_maps : undefined,
          roomNumber: formData.pickup_type === 'hotel' ? formData.room_number : undefined,
          isComeDirect: formData.pickup_type === 'come_direct',
          notes: formData.notes,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment')
      }

      setClientSecret(data.clientSecret)
      setStripePublishableKey(data.publishableKey) // Store publishable key from response
      setPaymentError(null)
    } catch (error: any) {
      console.error('Payment intent error:', error)
      setPaymentError(error.message)
    }
  }, [company, program, formData, subdomain, referenceHotels])

  // Handle cash booking submission
  const handleCashBooking = async () => {
    if (!company || !program) return

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

      if (formData.pickup_type === 'hotel' && formData.hotel_id) {
        if (formData.hotel_id.startsWith('custom-')) {
          hotelId = formData.hotel_id.replace('custom-', '')
        } else if (formData.hotel_id.startsWith('ref-')) {
          const refHotel = referenceHotels.find(h => `ref-${h.id}` === formData.hotel_id)
          if (refHotel) {
            customPickupLocation = `${refHotel.name} (${refHotel.area})`
          }
        }
      } else if (formData.pickup_type === 'custom') {
        customPickupLocation = formData.custom_location
        if (formData.custom_location_google_maps) {
          customPickupLocation += ` | Maps: ${formData.custom_location_google_maps}`
        }
      }

      // Create booking with pending status
      const { error: bookingError } = await supabase
        .from('bookings')
        .insert({
          company_id: company.id,
          booking_number: bookingNum,
          activity_date: formData.activity_date,
          program_id: program.id,
          customer_name: formData.customer_name,
          customer_email: formData.customer_email,
          customer_whatsapp: formData.customer_whatsapp,
          adults: formData.adults,
          children: formData.children,
          infants: formData.infants,
          hotel_id: hotelId,
          custom_pickup_location: customPickupLocation,
          room_number: formData.pickup_type === 'hotel' ? formData.room_number : null,
          notes: formData.notes || null,
          status: 'pending', // Cash bookings start as pending
          payment_type: 'regular',
          is_direct_booking: true,
          booking_source: 'DIRECT BOOKING - Cash on Tour',
          is_come_direct: formData.pickup_type === 'come_direct',
          collect_money: totalPrice, // Amount to collect
        })

      if (bookingError) throw bookingError

      // Redirect to success page
      router.push(`/booking/success?payment=cash&ref=${bookingNum}`)
    } catch (error: any) {
      console.error('Cash booking error:', error)
      toast.error(error.message || 'Failed to submit booking')
      setSubmitting(false)
    }
  }

  // Check if form is ready for booking
  const isFormValid = 
    formData.activity_date && 
    formData.customer_name && 
    formData.customer_email &&
    formData.customer_whatsapp &&
    (formData.pickup_type === 'come_direct' || 
     (formData.pickup_type === 'hotel' && formData.hotel_id) ||
     (formData.pickup_type === 'custom' && formData.custom_location))

  const brandingSettings = companySettings.branding || {}
  const primaryColor = brandingSettings.primary_color || '#3B82F6'
  const programColor = program?.color || primaryColor

  // Load Stripe with company's publishable key (only when we have clientSecret and publishable key)
  const stripePromise = useMemo(() => {
    if (stripePublishableKey && clientSecret) {
      return loadStripe(stripePublishableKey)
    }
    return null
  }, [stripePublishableKey, clientSecret])

  const comeDirectLocation = program?.come_direct_location

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-16 w-48" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  if (!company || !program) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Ship className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Program Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The program you&apos;re looking for doesn&apos;t exist or is not available for booking.
            </p>
            <Button onClick={() => router.push(`/booking`)}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Programs
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/booking`)}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div 
              className="flex items-center justify-center w-10 h-10 rounded-lg text-white"
              style={{ backgroundColor: programColor }}
            >
              <Ship className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">{program.nickname || program.name}</h1>
              <p className="text-sm text-slate-500">{company.name}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Desktop: 2-column layout, Mobile: stacked */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-8">
          {/* Left Column - Program Info (sticky on desktop) */}
          <div className="lg:sticky lg:top-24 lg:self-start mb-6 lg:mb-0">
            {/* Program Hero Image */}
            <div className="relative h-48 md:h-64 lg:h-80 rounded-xl overflow-hidden mb-4">
              <img
                src={program.thumbnail_url || 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=600&fit=crop'}
                alt={program.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <h2 className="text-white text-2xl lg:text-3xl font-bold drop-shadow-lg">
                  {program.name}
                </h2>
                {program.duration && (
                  <div className="flex items-center gap-1 text-white/90 text-sm mt-2">
                    <Clock className="w-4 h-4" />
                    {program.duration}
                  </div>
                )}
              </div>
            </div>

            {/* Download Buttons - Mobile only */}
            <div className="flex gap-2 mb-6 lg:hidden">
              <Button variant="outline" size="sm" className="flex-1">
                <Download className="w-4 h-4 mr-1" />
                Brochure
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <FileText className="w-4 h-4 mr-1" />
                Itinerary
              </Button>
            </div>

            {/* Description */}
            {(program.short_description || program.description) && (
              <p className="text-slate-600 mb-6 lg:text-lg">
                {program.short_description || program.description}
              </p>
            )}

            {/* Price Summary Card - Desktop only */}
            <div className="hidden lg:block">
              <Card className="border-2" style={{ borderColor: `${programColor}30` }}>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Adult Price</span>
                      <span className="text-xl font-bold" style={{ color: programColor }}>
                        {formatCurrency(adultPrice)}
                      </span>
                    </div>
                    {childPrice > 0 && childPrice !== adultPrice && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Child Price</span>
                        <span className="text-lg font-semibold text-slate-700">
                          {formatCurrency(childPrice)}
                        </span>
                      </div>
                    )}
                    <Separator />
                    <div className="text-center text-sm text-slate-500">
                      Infants (0-2 years) are free
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Download Buttons */}
              <div className="flex gap-3 mt-4">
                <Button variant="outline" className="flex-1 bg-[#BEDEFE] hover:bg-[#a8d4fd] border-[#BEDEFE]">
                  <Download className="w-4 h-4 mr-2" />
                  Download Brochure
                </Button>
                <Button variant="outline" className="flex-1 bg-[#9EFFD2] hover:bg-[#7af5bc] border-[#9EFFD2]">
                  <FileText className="w-4 h-4 mr-2" />
                  Download Itinerary
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column - Booking Form */}
          <div className="space-y-6">
          {/* Tour Date */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5" style={{ color: programColor }} />
                Tour Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-12 text-base",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-5 w-5" />
                    {selectedDate ? format(selectedDate, 'EEE, d MMM yyyy') : 'Select tour date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        const status = getDateStatus(date)
                        if (!status.isAvailable) {
                          toast.error(status.isClosed ? 'This date is closed' : 'This date is fully booked')
                          return
                        }
                        setSelectedDate(date)
                        handleChange('activity_date', format(date, 'yyyy-MM-dd'))
                        setCalendarOpen(false)
                      }
                    }}
                    disabled={isDateDisabled}
                    modifiers={modifiers}
                    modifiersClassNames={modifiersClassNames}
                    initialFocus
                    fromDate={new Date()}
                    toDate={addMonths(new Date(), 3)}
                  />
                  {/* Legend */}
                  <div className="p-3 border-t flex items-center justify-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded bg-red-500"></div>
                      <span className="text-muted-foreground">Full</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded bg-gray-300"></div>
                      <span className="text-muted-foreground">Closed</span>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              {selectedDate && (
                <div className="mt-2 text-sm text-muted-foreground">
                  {(() => {
                    const status = getDateStatus(selectedDate)
                    if (status.remaining < 10 && status.remaining > 0) {
                      return (
                        <span className="text-orange-600">
                          Only {status.remaining} spot{status.remaining !== 1 ? 's' : ''} left!
                        </span>
                      )
                    }
                    return null
                  })()}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Guest Count */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" style={{ color: programColor }} />
                Number of Guests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Adults */}
                <div className="p-3 rounded-lg border bg-slate-50">
                  <p className="text-xs lg:text-sm font-medium text-slate-500 text-center mb-2">Adults</p>
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex items-center border rounded-lg overflow-hidden bg-white">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-none border-r h-10 w-10 hover:bg-slate-100"
                        onClick={() => decrementGuest('adults')}
                        disabled={formData.adults <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-10 text-center font-semibold text-lg">{formData.adults}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-none border-l h-10 w-10 hover:bg-slate-100"
                        onClick={() => incrementGuest('adults')}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {/* Mobile: stacked, Desktop: inline */}
                    <div className="flex flex-col lg:flex-row items-end lg:items-center justify-center min-w-[70px] lg:min-w-[100px] lg:gap-1">
                      <span className="font-semibold text-lg leading-tight">{(formData.adults * adultPrice).toLocaleString()}</span>
                      <span className="text-[10px] lg:text-lg text-slate-400 lg:text-slate-700 lg:font-semibold leading-tight">THB</span>
                    </div>
                  </div>
                </div>

                {/* Children */}
                <div className="p-3 rounded-lg border bg-slate-50">
                  <p className="text-xs lg:text-sm font-medium text-slate-500 text-center mb-2">Children <span className="font-normal text-slate-400">(2-14 years)</span></p>
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex items-center border rounded-lg overflow-hidden bg-white">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-none border-r h-10 w-10 hover:bg-slate-100"
                        onClick={() => decrementGuest('children')}
                        disabled={formData.children <= 0}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-10 text-center font-semibold text-lg">{formData.children}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-none border-l h-10 w-10 hover:bg-slate-100"
                        onClick={() => incrementGuest('children')}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {/* Mobile: stacked, Desktop: inline */}
                    <div className="flex flex-col lg:flex-row items-end lg:items-center justify-center min-w-[70px] lg:min-w-[100px] lg:gap-1">
                      <span className="font-semibold text-lg leading-tight">
                        {formData.children > 0 ? (formData.children * childPrice).toLocaleString() : '-'}
                      </span>
                      {formData.children > 0 && <span className="text-[10px] lg:text-lg text-slate-400 lg:text-slate-700 lg:font-semibold leading-tight">THB</span>}
                    </div>
                  </div>
                </div>

                {/* Infants */}
                <div className="p-3 rounded-lg border bg-slate-50">
                  <p className="text-xs lg:text-sm font-medium text-slate-500 text-center mb-2">Infants <span className="font-normal text-slate-400">(0-2 years)</span></p>
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex items-center border rounded-lg overflow-hidden bg-white">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-none border-r h-10 w-10 hover:bg-slate-100"
                        onClick={() => decrementGuest('infants')}
                        disabled={formData.infants <= 0}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-10 text-center font-semibold text-lg">{formData.infants}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-none border-l h-10 w-10 hover:bg-slate-100"
                        onClick={() => incrementGuest('infants')}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-col lg:flex-row items-end lg:items-center justify-center min-w-[70px] lg:min-w-[100px]">
                      <span className="font-semibold text-lg text-green-600 leading-tight">FREE</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pickup & Drop-off */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Car className="h-5 w-5" style={{ color: programColor }} />
                Pick-up & Drop-off
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Need Pickup Checkbox */}
              <div 
                className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-colors cursor-pointer ${
                  formData.pickup_type !== 'come_direct' 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={(e) => {
                  // Prevent double-toggle when clicking checkbox directly
                  e.preventDefault()
                  // Toggle between pickup and come_direct
                  if (formData.pickup_type === 'come_direct') {
                    handleChange('pickup_type', 'hotel')
                  } else {
                    handleChange('pickup_type', 'come_direct')
                  }
                }}
              >
                <Checkbox
                  id="needs-pickup"
                  checked={formData.pickup_type !== 'come_direct'}
                  className="pointer-events-none"
                />
                <div className="flex-1">
                  <span className="font-medium">Yes, I need pick-up & drop-off</span>
                  <span className="text-sm text-green-600 inline-flex items-center gap-1 ml-2">
                    <CheckCircle className="w-4 h-4" />
                    FREE (Included)
                  </span>
                </div>
              </div>

              {/* Pickup Options - Only show when needs pickup */}
              {formData.pickup_type !== 'come_direct' && (
                <div className="space-y-4 pt-2">
                  {/* Pickup Type Selection */}
                  <div className="space-y-2">
                    <Label>Pick-up Location Type</Label>
                    <Select
                      value={formData.pickup_type}
                      onValueChange={(value) => handleChange('pickup_type', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select pickup option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hotel">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            <span>Hotel Pick-up</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="custom">
                          <div className="flex items-center gap-2">
                            <Navigation className="w-4 h-4" />
                            <span>Custom Location</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Hotel selection - Searchable Combobox */}
                  {formData.pickup_type === 'hotel' && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Hotel Name</Label>
                        <HotelCombobox
                          hotels={combinedHotels}
                          hotelsByArea={hotelsByArea}
                          value={formData.hotel_id}
                          onChange={(v) => handleChange('hotel_id', v)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Room Number (Optional)</Label>
                        <Input
                          value={formData.room_number}
                          onChange={(e) => handleChange('room_number', e.target.value)}
                          placeholder="e.g., 301"
                        />
                      </div>
                    </div>
                  )}

                  {/* Custom location input */}
                  {formData.pickup_type === 'custom' && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Location Name / Address</Label>
                        <Input
                          value={formData.custom_location}
                          onChange={(e) => handleChange('custom_location', e.target.value)}
                          placeholder="e.g., Villa Sunrise, 123 Beach Road"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Google Maps Link (Optional)</Label>
                        <Input
                          value={formData.custom_location_google_maps}
                          onChange={(e) => handleChange('custom_location_google_maps', e.target.value)}
                          placeholder="https://maps.google.com/..."
                        />
                        <p className="text-xs text-slate-500">
                          Share your location link from Google Maps for accurate pickup
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Come Direct - No pickup needed */}
              {formData.pickup_type === 'come_direct' && (
                <div className="p-4 rounded-lg bg-slate-50 border">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" style={{ color: programColor }} />
                    Come Direct - Meeting Point
                  </h4>
                  {comeDirectLocation ? (
                    <>
                      {comeDirectLocation.name && (
                        <p className="font-semibold text-slate-800">{comeDirectLocation.name}</p>
                      )}
                      {comeDirectLocation.address && (
                        <p className="text-sm text-slate-600 mt-1">{comeDirectLocation.address}</p>
                      )}
                      {comeDirectLocation.contact_info && (
                        <p className="text-sm text-slate-600 mt-1">{comeDirectLocation.contact_info}</p>
                      )}
                      {comeDirectLocation.google_maps_url && (
                        <a
                          href={comeDirectLocation.google_maps_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm mt-2"
                          style={{ color: programColor }}
                        >
                          <MapPin className="w-4 h-4" />
                          View on Google Maps
                        </a>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-slate-600">
                      Meeting point details will be sent to you via WhatsApp after booking confirmation.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Contact Information</CardTitle>
              <CardDescription>We&apos;ll use this to confirm your booking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  value={formData.customer_name}
                  onChange={(e) => handleChange('customer_name', e.target.value)}
                  placeholder="John Smith"
                />
              </div>

              <div className="space-y-2">
                <Label>Email Address *</Label>
                <Input
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => handleChange('customer_email', e.target.value)}
                  placeholder="john@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label>Mobile / WhatsApp *</Label>
                <PhoneInput
                  international
                  defaultCountry="TH"
                  value={formData.customer_whatsapp}
                  onChange={(value) => handleChange('customer_whatsapp', value || '')}
                  placeholder="Enter phone number"
                  className="phone-input-container"
                />
                <p className="text-xs text-slate-500">
                  We&apos;ll send your pickup time via WhatsApp
                </p>
              </div>

              <div className="space-y-2">
                <Label>Special Requests (Optional)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Dietary requirements, allergies, special requests..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Summary */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Program</span>
                  <span className="font-medium">{program.name}</span>
                </div>
                {formData.activity_date && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Date</span>
                    <span>{formatDate(formData.activity_date)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-600">Adults ({formData.adults}x)</span>
                  <span>{formatCurrency(formData.adults * adultPrice)}</span>
                </div>
                {formData.children > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Children ({formData.children}x)</span>
                    <span>{formatCurrency(formData.children * childPrice)}</span>
                  </div>
                )}
                {formData.infants > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Infants ({formData.infants}x)</span>
                    <span>Free</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span style={{ color: programColor }}>{formatCurrency(totalPrice)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5" style={{ color: programColor }} />
                Payment Method
              </CardTitle>
              <CardDescription>Choose how you&apos;d like to pay</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Show warning if no payment methods available */}
              {!allowCashOnTour && !isStripeAvailable && (
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-sm text-amber-800">
                    Online booking is temporarily unavailable. Please contact us directly to make a reservation.
                  </p>
                </div>
              )}

              {(allowCashOnTour || isStripeAvailable) && (
                <RadioGroup
                  value={formData.payment_method}
                  onValueChange={(value) => {
                    handleChange('payment_method', value)
                    // Reset Stripe state when switching payment methods
                    if (value === 'cash') {
                      setClientSecret(null)
                      setStripePublishableKey(null)
                      setPaymentError(null)
                    }
                  }}
                  className="space-y-3"
                >
                  {/* Cash on Tour option - Only if allowed */}
                  {allowCashOnTour && (
                    <div 
                      className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-colors cursor-pointer ${
                        formData.payment_method === 'cash' 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() => handleChange('payment_method', 'cash')}
                    >
                      <RadioGroupItem value="cash" id="cash" className="mt-0.5" />
                      <Label htmlFor="cash" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Banknote className="w-5 h-5 text-green-600" />
                          <span className="font-medium">Cash on Tour</span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                          Pay in cash when you join the tour. Your booking will be pending until confirmed by our team.
                        </p>
                      </Label>
                    </div>
                  )}

                  {/* Stripe option - Only if configured */}
                  {isStripeAvailable ? (
                    <div 
                      className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-colors cursor-pointer ${
                        formData.payment_method === 'stripe' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() => handleChange('payment_method', 'stripe')}
                    >
                      <RadioGroupItem value="stripe" id="stripe" className="mt-0.5" />
                      <Label htmlFor="stripe" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-5 h-5 text-blue-600" />
                          <span className="font-medium">Pay Online Now</span>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                          Pay securely with credit/debit card. Your booking will be instantly confirmed.
                        </p>
                      </Label>
                    </div>
                  ) : allowCashOnTour ? (
                    <div className="flex items-start space-x-3 p-4 rounded-lg border-2 border-slate-100 bg-slate-50 opacity-60">
                      <div className="mt-0.5 w-4 h-4 rounded-full border-2 border-slate-300" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-5 h-5 text-slate-400" />
                          <span className="font-medium text-slate-400">Pay Online</span>
                        </div>
                        <p className="text-sm text-slate-400 mt-1">
                          Online payment is not yet available. Please use Cash on Tour.
                        </p>
                      </div>
                    </div>
                  ) : null}
                </RadioGroup>
              )}

              {/* Book Now Button */}
              {formData.payment_method === 'cash' && isFormValid && (
                <>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleCashBooking}
                    disabled={submitting}
                    style={{ backgroundColor: programColor }}
                  >
                    {submitting ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Banknote className="w-4 h-4 mr-2" />
                        Book Now - Pay on Tour
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-center text-slate-500">
                    Your booking will be pending until confirmed by our team. We&apos;ll contact you via WhatsApp.
                  </p>
                </>
              )}

              {/* Stripe Payment */}
              {formData.payment_method === 'stripe' && isFormValid && stripePromise && (
                <>
                  {!clientSecret ? (
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={createPaymentIntent}
                      style={{ backgroundColor: programColor }}
                    >
                      Proceed to Payment
                    </Button>
                  ) : (
                    <Elements 
                      stripe={stripePromise} 
                      options={{ 
                        clientSecret,
                        appearance: {
                          theme: 'stripe',
                          variables: {
                            colorPrimary: programColor,
                          },
                        },
                      }}
                    >
                      <CheckoutForm 
                        programColor={programColor}
                      />
                    </Elements>
                  )}

                  {paymentError && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                      {paymentError}
                    </div>
                  )}
                </>
              )}

              {!isFormValid && (
                <p className="text-sm text-center text-slate-500">
                  Please fill in all required fields to proceed
                </p>
              )}
            </CardContent>
          </Card>
        </div>
        </div>
      </main>
    </div>
  )
}

// Hotel Combobox Component - Searchable hotel selector
function HotelCombobox({
  hotels,
  hotelsByArea,
  value,
  onChange,
}: {
  hotels: CombinedHotel[]
  hotelsByArea: Record<string, CombinedHotel[]>
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Find selected hotel name
  const selectedHotel = hotels.find(h => h.id === value)

  // Filter hotels based on search query
  const filteredHotelsByArea = useMemo(() => {
    if (!searchQuery.trim()) return hotelsByArea

    const query = searchQuery.toLowerCase()
    const filtered: Record<string, CombinedHotel[]> = {}

    Object.entries(hotelsByArea).forEach(([area, areaHotels]) => {
      const matchingHotels = areaHotels.filter(hotel =>
        hotel.name.toLowerCase().includes(query) ||
        area.toLowerCase().includes(query)
      )
      if (matchingHotels.length > 0) {
        filtered[area] = matchingHotels
      }
    })

    return filtered
  }, [hotelsByArea, searchQuery])

  const hasResults = Object.keys(filteredHotelsByArea).length > 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedHotel ? selectedHotel.name : "Type to search hotel..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search hotel name..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList className="max-h-[300px]">
            {!hasResults && (
              <CommandEmpty>
                <div className="py-6 text-center text-sm">
                  <p>No hotel found.</p>
                  <p className="text-muted-foreground mt-1">
                    Try a different search or select &quot;Custom Location&quot;
                  </p>
                </div>
              </CommandEmpty>
            )}
            {Object.entries(filteredHotelsByArea).map(([area, areaHotels]) => (
              <CommandGroup key={area} heading={area}>
                {areaHotels.map((hotel) => (
                  <CommandItem
                    key={hotel.id}
                    value={hotel.id}
                    onSelect={() => {
                      onChange(hotel.id)
                      setOpen(false)
                      setSearchQuery('')
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === hotel.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {hotel.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// Checkout Form Component for Stripe
function CheckoutForm({ 
  programColor 
}: { 
  programColor: string 
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setProcessing(true)
    setError(null)

    const { error: submitError } = await elements.submit()
    if (submitError) {
      setError(submitError.message || 'Payment failed')
      setProcessing(false)
      return
    }

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/booking/success?payment=stripe`,
      },
    })

    if (confirmError) {
      if (confirmError.type === 'card_error' || confirmError.type === 'validation_error') {
        setError(confirmError.message || 'Payment failed')
      } else {
        setError('An unexpected error occurred.')
      }
      setProcessing(false)
    }
    // If successful, user will be redirected to success page
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={!stripe || processing}
        style={{ backgroundColor: programColor }}
      >
        {processing ? (
          <>
            <Spinner size="sm" className="mr-2" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Pay & Book Now
          </>
        )}
      </Button>

      <p className="text-xs text-center text-slate-500">
        Your payment is secured by Stripe. Your booking will be instantly confirmed.
      </p>
    </form>
  )
}
