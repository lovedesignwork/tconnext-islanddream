import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile for company_id
    const { data: profile } = await supabase
      .from('users')
      .select('company_id')
      .eq('auth_id', authUser.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'User not associated with a company' }, { status: 400 })
    }

    // Get company with settings
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name, settings')
      .eq('id', profile.company_id)
      .single()

    if (companyError || !company) {
      return NextResponse.json({ error: 'Company not found', details: companyError }, { status: 404 })
    }

    const settings = company.settings as any

    // Return detailed debug info
    return NextResponse.json({
      company_id: company.id,
      company_name: company.name,
      settings_type: typeof settings,
      settings_keys: settings ? Object.keys(settings) : [],
      logo_url_root: settings?.logo_url || null,
      logo_url_branding: settings?.branding?.logo_url || null,
      logo_url_resolved: settings?.logo_url || settings?.branding?.logo_url || null,
      raw_settings: settings,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

