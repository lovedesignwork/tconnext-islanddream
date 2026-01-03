import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { type, pinEnabled, pin, pageLocks } = body

    const supabaseAdmin = getAdminClient()

    // Get user's company_id
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('company_id, role')
      .eq('auth_id', authUser.id)
      .single()

    let companyId = userData?.company_id
    let userRole = userData?.role

    if (!companyId) {
      const { data: teamMemberData } = await supabaseAdmin
        .from('company_team_members')
        .select('company_id')
        .eq('auth_id', authUser.id)
        .single()

      companyId = teamMemberData?.company_id
      userRole = 'staff'
    }

    if (!companyId) {
      return NextResponse.json({ error: 'User not associated with a company' }, { status: 403 })
    }

    // Only master_admin can update security settings
    if (userRole !== 'master_admin' && userRole !== 'super_admin') {
      return NextResponse.json({ error: 'Only administrators can update security settings' }, { status: 403 })
    }

    if (type === 'pin') {
      // Update PIN settings
      const { error } = await supabaseAdmin
        .from('companies')
        .update({
          pricing_pin_enabled: pinEnabled,
          pricing_pin: pinEnabled ? pin : null,
        })
        .eq('id', companyId)

      if (error) {
        console.error('Error saving PIN settings:', error)
        return NextResponse.json({ error: 'Failed to save PIN settings' }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'PIN settings saved' })
    }

    if (type === 'pageLocks') {
      // Update page locks
      const { error } = await supabaseAdmin
        .from('companies')
        .update({ page_locks: pageLocks })
        .eq('id', companyId)

      if (error) {
        console.error('Error saving page locks:', error)
        return NextResponse.json({ error: 'Failed to save page lock settings' }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'Page lock settings saved' })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    console.error('Security settings API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

