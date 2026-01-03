import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Public endpoint to get company branding (no auth required)
// For single-tenant deployment, fetches from the company settings
export async function GET(request: NextRequest) {
  try {
    // Use service role to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // For single-tenant: get the first company
    // This could be extended to support multi-tenant by accepting a company_id or slug parameter
    const { data: companyData } = await supabase
      .from('companies')
      .select('settings, name')
      .limit(1)
      .single()

    const settings = (companyData?.settings as Record<string, any>) || {}
    
    const branding = {
      logo_url: settings.logo_url || null,           // Light theme logo (default)
      logo_url_dark: settings.logo_url_dark || null, // Dark theme logo (sidebar only)
      favicon_url: settings.favicon_url || null,
      company_name: companyData?.name || 'TConnext',
    }

    return NextResponse.json({ 
      branding,
    }, {
      headers: {
        // No caching - always fetch fresh branding data
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    })
  } catch (error) {
    console.error('Branding fetch error:', error)
    return NextResponse.json({ 
      branding: { logo_url: null, logo_url_dark: null, favicon_url: null, company_name: 'TConnext' } 
    })
  }
}
