import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createPaymentIntent, toStripeAmount, hasValidStripeConfig } from '@/lib/stripe'
import type { CompanySettings } from '@/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Admin client to bypass RLS for public access
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(url, key)
}

interface CreatePaymentIntentRequest {
  companyId?: string // Primary lookup method
  companySlug?: string // Fallback/metadata
  programId: string
  activityDate: string
  adults: number
  children: number
  infants: number
  customerName: string
  customerEmail: string
  customerWhatsapp?: string
  hotelId?: string
  customPickupLocation?: string
  customLocationGoogleMaps?: string
  roomNumber?: string
  isComeDirect: boolean
  notes?: string
}

/**
 * POST /api/stripe/create-payment-intent
 * Creates a payment intent for a direct booking using company's Stripe keys
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreatePaymentIntentRequest = await request.json()

    const {
      companyId,
      companySlug,
      programId,
      activityDate,
      adults,
      children,
      infants,
      customerName,
      customerEmail,
      customerWhatsapp,
      hotelId,
      customPickupLocation,
      customLocationGoogleMaps,
      roomNumber,
      isComeDirect,
      notes,
    } = body

    // Validate required fields
    if ((!companyId && !companySlug) || !programId || !activityDate || !customerName || !customerEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (adults < 1) {
      return NextResponse.json(
        { error: 'At least one adult is required' },
        { status: 400 }
      )
    }

    const supabase = getAdminClient()

    // Get company by ID (primary) or slug (fallback)
    let company = null
    let companyError = null

    if (companyId) {
      const result = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single()
      company = result.data
      companyError = result.error
    } else if (companySlug) {
      const result = await supabase
        .from('companies')
        .select('*')
        .eq('slug', companySlug)
        .single()
      company = result.data
      companyError = result.error
    }

    if (companyError || !company) {
      console.error('Company lookup error:', { companyId, companySlug, error: companyError })
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Get company's Stripe settings
    const settings = company.settings as CompanySettings | null
    const stripeSettings = settings?.stripe

    // Check if company has Stripe configured
    if (!hasValidStripeConfig(stripeSettings)) {
      return NextResponse.json(
        { error: 'Online payments are not available for this company' },
        { status: 400 }
      )
    }

    // Get program details
    const { data: program, error: programError } = await supabase
      .from('programs')
      .select('*')
      .eq('id', programId)
      .eq('company_id', company.id)
      .eq('status', 'active')
      .single()

    if (programError || !program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    // Check if program is enabled for direct booking
    if (!program.direct_booking_enabled) {
      return NextResponse.json(
        { error: 'This program is not available for online booking' },
        { status: 400 }
      )
    }

    // Calculate total price
    // Use selling prices (adult_selling_price and child_selling_price) for direct bookings
    const adultPrice = program.adult_selling_price || program.selling_price || program.base_price || 0
    const childPrice = program.child_selling_price || (adultPrice * 0.5) // Default to 50% if not set
    
    const totalAmount = (adults * adultPrice) + (children * childPrice)
    // Infants are typically free

    if (totalAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid booking amount' },
        { status: 400 }
      )
    }

    // Convert to smallest currency unit (satang for THB)
    const amountInSatang = toStripeAmount(totalAmount, 'thb')

    // Create payment intent metadata
    const metadata: Record<string, string> = {
      company_id: company.id,
      company_slug: companySlug,
      program_id: programId,
      program_name: program.name,
      activity_date: activityDate,
      adults: adults.toString(),
      children: children.toString(),
      infants: infants.toString(),
      customer_name: customerName,
      customer_email: customerEmail,
      is_come_direct: isComeDirect.toString(),
    }

    if (customerWhatsapp) metadata.customer_whatsapp = customerWhatsapp
    if (hotelId) metadata.hotel_id = hotelId
    if (customPickupLocation) metadata.custom_pickup_location = customPickupLocation
    if (customLocationGoogleMaps) metadata.custom_location_google_maps = customLocationGoogleMaps
    if (roomNumber) metadata.room_number = roomNumber
    if (notes) metadata.notes = notes.substring(0, 500) // Stripe metadata limit

    // Create payment intent using company's secret key
    const { clientSecret, paymentIntentId } = await createPaymentIntent(
      stripeSettings!.secret_key!,
      amountInSatang,
      'thb',
      metadata
    )

    return NextResponse.json({
      clientSecret,
      paymentIntentId,
      publishableKey: stripeSettings!.public_key, // Send publishable key for frontend
      amount: totalAmount,
      currency: 'THB',
      breakdown: {
        adults: { count: adults, price: adultPrice, total: adults * adultPrice },
        children: { count: children, price: childPrice, total: children * childPrice },
        infants: { count: infants, price: 0, total: 0 },
      },
    })
  } catch (error: any) {
    console.error('Create payment intent error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create payment' },
      { status: 500 }
    )
  }
}
