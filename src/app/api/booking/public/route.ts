import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// CORS headers for public access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

// GET - Fetch company and programs for public booking page
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    const programSlug = searchParams.get('programSlug')

    const supabaseAdmin = getAdminClient()

    let companyData = null

    if (slug) {
      // Fetch company by slug (subdomain)
      const { data } = await supabaseAdmin
        .from('companies')
        .select('*')
        .eq('slug', slug)
        .single()
      companyData = data
    } else {
      // Single-tenant: Fetch the first/only company
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
    
    // Check if Stripe is properly configured
    const stripeEnabled = !!(stripeConfig.public_key && stripeConfig.secret_key) && 
      bookingSettings.stripe_payments_enabled !== false
    
    // Create sanitized company data without secret keys
    const sanitizedCompany = {
      ...companyData,
      settings: {
        ...settings,
        stripe: {
          public_key: stripeConfig.public_key || null,
          test_mode: stripeConfig.test_mode,
        },
        stripe_enabled: stripeEnabled,
      },
    }

    // If programSlug is provided, fetch specific program
    if (programSlug) {
      const { data: program, error } = await supabaseAdmin
        .from('programs')
        .select('*')
        .eq('company_id', companyData.id)
        .eq('slug', programSlug)
        .eq('status', 'active')
        .eq('direct_booking_enabled', true)
        .single()

      if (error || !program) {
        return NextResponse.json(
          { error: 'Program not found' },
          { status: 404, headers: corsHeaders }
        )
      }

      return NextResponse.json(
        { company: sanitizedCompany, program, stripeEnabled },
        { headers: corsHeaders }
      )
    }

    // Fetch all programs enabled for direct booking
    const { data: programs } = await supabaseAdmin
      .from('programs')
      .select('*')
      .eq('company_id', companyData.id)
      .eq('status', 'active')
      .eq('direct_booking_enabled', true)
      .order('name')

    return NextResponse.json(
      { company: sanitizedCompany, programs: programs || [], stripeEnabled },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('Public booking fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

