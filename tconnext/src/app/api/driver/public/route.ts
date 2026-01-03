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

// GET - Fetch driver by unique_link_id (public, no auth required)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const linkId = searchParams.get('linkId')

    if (!linkId) {
      return NextResponse.json(
        { error: 'Link ID is required' }, 
        { status: 400, headers: corsHeaders }
      )
    }

    const supabaseAdmin = getAdminClient()

    // Fetch driver by unique_link_id with company info
    const { data: driver, error } = await supabaseAdmin
      .from('drivers')
      .select(`
        id,
        name,
        nickname,
        status,
        access_pin,
        unique_link_id,
        company_id,
        company:companies(
          id,
          name,
          slug,
          settings
        )
      `)
      .eq('unique_link_id', linkId)
      .single()

    if (error) {
      console.error('Supabase query error:', error)
      return NextResponse.json(
        { error: 'Driver not found', details: error.message }, 
        { status: 404, headers: corsHeaders }
      )
    }

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver not found' }, 
        { status: 404, headers: corsHeaders }
      )
    }

    return NextResponse.json({ driver }, { headers: corsHeaders })
  } catch (error) {
    console.error('Public driver fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500, headers: corsHeaders }
    )
  }
}

