import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { format, addMonths } from 'date-fns'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// CORS headers for public access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Admin client to bypass RLS for public access
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(url, key)
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// GET - Fetch all data for booking page
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    const programSlug = searchParams.get('programSlug')

    const supabaseAdmin = getAdminClient()

    let companyData = null

    if (slug) {
      const { data } = await supabaseAdmin
        .from('companies')
        .select('*')
        .eq('slug', slug)
        .single()
      companyData = data
    } else {
      const { data } = await supabaseAdmin
        .from('companies')
        .select('*')
        .limit(1)
        .single()
      companyData = data
    }

    if (!companyData) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Sanitize company data - don't expose sensitive keys to frontend
    const settings = companyData.settings || {}
    const stripeConfig = settings.stripe || {}
    const bookingSettings = settings.booking || {}
    
    // Check if Stripe is properly configured (has both keys and is enabled)
    const stripeEnabled = !!(stripeConfig.public_key && stripeConfig.secret_key) && 
      bookingSettings.stripe_payments_enabled !== false
    
    // Check if Cash on Tour is explicitly enabled (must be true, not undefined)
    const allowCashOnTour = bookingSettings.allow_cash_on_tour === true
    
    // Create sanitized company data without secret keys
    const sanitizedCompany = {
      ...companyData,
      settings: {
        ...settings,
        stripe: {
          // Only include safe info, never the secret key
          public_key: stripeConfig.public_key || null,
          test_mode: stripeConfig.test_mode,
        },
        booking: {
          // Include booking settings for payment methods
          ...bookingSettings,
          allow_cash_on_tour: allowCashOnTour,
        },
        // Add a clear flag for frontend to check
        stripe_enabled: stripeEnabled,
      },
    }

    // If no program slug, return just company (for listing page)
    if (!programSlug) {
      return NextResponse.json(
        { company: sanitizedCompany, stripeEnabled },
        { headers: corsHeaders }
      )
    }

    // Fetch program by slug
    const { data: programData, error: programError } = await supabaseAdmin
      .from('programs')
      .select('*')
      .eq('company_id', companyData.id)
      .eq('slug', programSlug)
      .eq('status', 'active')
      .eq('direct_booking_enabled', true)
      .single()

    if (programError || !programData) {
      return NextResponse.json(
        { error: 'Program not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    const region = companyData.region || 'Phuket'

    // Build reference hotels query
    let referenceQuery = supabaseAdmin
      .from('reference_hotels')
      .select('*')
      .order('area')
      .order('name')

    if (region !== 'Both') {
      referenceQuery = referenceQuery.eq('province', region)
    }

    // Fetch all booking-related data
    const today = new Date()
    const threeMonthsLater = addMonths(today, 3)

    const [referenceHotelsRes, customLocationsRes, availabilityRes] = await Promise.all([
      referenceQuery,
      supabaseAdmin
        .from('hotels')
        .select('*')
        .eq('company_id', companyData.id)
        .order('area')
        .order('name'),
      supabaseAdmin
        .from('program_availability')
        .select('*')
        .eq('program_id', programData.id)
        .gte('date', format(today, 'yyyy-MM-dd'))
        .lte('date', format(threeMonthsLater, 'yyyy-MM-dd')),
    ])

    return NextResponse.json({
      company: sanitizedCompany,
      program: programData,
      referenceHotels: referenceHotelsRes.data || [],
      customLocations: customLocationsRes.data || [],
      availability: availabilityRes.data || [],
      stripeEnabled,
    }, { headers: corsHeaders })
  } catch (error) {
    console.error('Booking data fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// POST - Create a booking
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabaseAdmin = getAdminClient()

    // Validate required fields
    const { 
      company_id, 
      program_id, 
      customer_name, 
      customer_email,
      customer_whatsapp,
      activity_date,
      adults,
      children,
      infants,
      total_amount,
      payment_method,
      hotel_id,
      pickup_type,
      custom_pickup_location,
      room_number,
      notes,
    } = body

    if (!company_id || !program_id || !customer_name || !activity_date || !adults) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Generate booking number
    const date = new Date()
    const datePrefix = format(date, 'yyMMdd')
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
    const booking_number = `BK${datePrefix}${randomSuffix}`

    // Create booking
    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .insert({
        company_id,
        program_id,
        booking_number,
        customer_name,
        customer_email,
        customer_whatsapp,
        activity_date,
        adults: adults || 1,
        children: children || 0,
        infants: infants || 0,
        total_amount: total_amount || 0,
        payment_status: payment_method === 'cash' ? 'pending' : 'pending',
        payment_method,
        hotel_id: pickup_type === 'hotel' ? hotel_id : null,
        pickup_type,
        custom_pickup_location: pickup_type === 'custom' ? custom_pickup_location : null,
        room_number,
        notes,
        source: 'direct_booking',
        status: 'confirmed',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating booking:', error)
      return NextResponse.json(
        { error: 'Failed to create booking' },
        { status: 500, headers: corsHeaders }
      )
    }

    return NextResponse.json(
      { success: true, booking },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('Booking creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

