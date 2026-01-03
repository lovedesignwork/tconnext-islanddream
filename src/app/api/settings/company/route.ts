import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Admin client to bypass RLS
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET - Fetch company data
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const supabaseAdmin = getAdminClient()

    // Get user's company_id
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('company_id')
      .eq('auth_id', authUser.id)
      .single()

    if (!userData?.company_id) {
      return NextResponse.json({ error: 'User not associated with a company' }, { status: 403 })
    }

    // Fetch company data
    const { data: company, error } = await supabaseAdmin
      .from('companies')
      .select('*')
      .eq('id', userData.company_id)
      .single()

    if (error) {
      console.error('Error fetching company:', error)
      return NextResponse.json({ error: 'Failed to load company' }, { status: 500 })
    }

    return NextResponse.json({ company })
  } catch (error) {
    console.error('Get company error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update company settings
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const supabaseAdmin = getAdminClient()

    // Get user's company_id and role
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('company_id, role')
      .eq('auth_id', authUser.id)
      .single()

    if (!userData?.company_id) {
      return NextResponse.json({ error: 'User not associated with a company' }, { status: 403 })
    }

    // Only master_admin can update settings
    if (userData.role !== 'master_admin') {
      return NextResponse.json({ error: 'Not authorized to update settings' }, { status: 403 })
    }

    const body = await request.json()
    const { settingsKey, newValues, fullUpdate } = body

    // Get current company data
    const { data: currentCompany } = await supabaseAdmin
      .from('companies')
      .select('settings')
      .eq('id', userData.company_id)
      .single()

    let updatedSettings
    
    if (fullUpdate) {
      // Replace entire settings object
      updatedSettings = newValues
    } else {
      // Merge with existing settings
      const currentSettings = (currentCompany?.settings as Record<string, unknown>) || {}
      
      // Check if newValues is a primitive (string, number, boolean)
      // If so, set it directly; otherwise merge as an object
      if (typeof newValues !== 'object' || newValues === null) {
        // Top-level primitive value (e.g., timezone: 'Asia/Bangkok')
        updatedSettings = {
          ...currentSettings,
          [settingsKey]: newValues,
        }
      } else {
        // Nested object (e.g., stripe: { public_key: '...' })
        updatedSettings = {
          ...currentSettings,
          [settingsKey]: {
            ...((currentSettings[settingsKey] as Record<string, unknown>) || {}),
            ...newValues,
          },
        }
      }
    }

    // Update company settings
    const { error } = await supabaseAdmin
      .from('companies')
      .update({ settings: updatedSettings })
      .eq('id', userData.company_id)

    if (error) {
      console.error('Error updating settings:', error)
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }

    return NextResponse.json({ success: true, settings: updatedSettings })
  } catch (error) {
    console.error('Update settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

