import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// CORS headers for public access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Admin client to bypass RLS
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

// POST - Fetch pickups for a driver (requires PIN verification)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { driverId, pin, date } = body

    if (!driverId || !pin) {
      return NextResponse.json(
        { error: 'Driver ID and PIN are required' }, 
        { status: 400, headers: corsHeaders }
      )
    }

    const supabaseAdmin = getAdminClient()

    // Fetch driver to verify PIN
    const { data: driver, error: driverError } = await supabaseAdmin
      .from('drivers')
      .select('id, access_pin, status')
      .eq('id', driverId)
      .single()

    if (driverError || !driver) {
      return NextResponse.json(
        { error: 'Driver not found' }, 
        { status: 404, headers: corsHeaders }
      )
    }

    if (driver.status !== 'active') {
      return NextResponse.json(
        { error: 'Driver account is suspended' }, 
        { status: 403, headers: corsHeaders }
      )
    }

    // Verify PIN (support both hashed and plain text)
    let isValid = false
    if (driver.access_pin.startsWith('$2')) {
      isValid = await bcrypt.compare(pin, driver.access_pin)
    } else {
      isValid = pin === driver.access_pin
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid PIN' }, 
        { status: 401, headers: corsHeaders }
      )
    }

    // Fetch pickups for the date
    const { data: pickups, error: pickupsError } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        hotel:hotels(*)
      `)
      .eq('driver_id', driver.id)
      .eq('activity_date', date)
      .is('deleted_at', null)
      .order('pickup_time')

    if (pickupsError) {
      console.error('Error fetching pickups:', pickupsError)
      return NextResponse.json(
        { error: 'Failed to fetch pickups' }, 
        { status: 500, headers: corsHeaders }
      )
    }

    return NextResponse.json(
      { pickups: pickups || [], authenticated: true },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('Pickups fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500, headers: corsHeaders }
    )
  }
}

