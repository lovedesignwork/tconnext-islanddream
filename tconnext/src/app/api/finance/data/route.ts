import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

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
      const { data: teamMemberData } = await supabaseAdmin
        .from('company_team_members')
        .select('company_id')
        .eq('auth_id', authUser.id)
        .single()

      if (!teamMemberData?.company_id) {
        return NextResponse.json({ error: 'User not associated with a company' }, { status: 403 })
      }
    }

    const companyId = userData?.company_id

    // Fetch bookings, programs, agents, and invoices in parallel
    const [bookingsRes, programsRes, agentsRes, invoicesRes] = await Promise.all([
      supabaseAdmin
        .from('bookings')
        .select(`
          *,
          program:programs(id, name, nickname, base_price, adult_selling_price, child_selling_price, pricing_type),
          hotel:hotels(id, name, area),
          agent:agents(id, name, unique_code),
          agent_staff:agent_staff(id, full_name, nickname)
        `)
        .eq('company_id', companyId)
        .in('status', ['confirmed', 'completed'])
        .is('deleted_at', null)
        .order('activity_date', { ascending: false }),
      supabaseAdmin
        .from('programs')
        .select('id, name, nickname')
        .eq('company_id', companyId)
        .eq('status', 'active'),
      supabaseAdmin
        .from('agents')
        .select('id, name, unique_code')
        .eq('company_id', companyId)
        .neq('status', 'deleted'),
      supabaseAdmin
        .from('invoices')
        .select('id, invoice_number, status')
        .eq('company_id', companyId),
    ])

    if (bookingsRes.error) {
      console.error('Error fetching bookings:', bookingsRes.error)
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
    }

    return NextResponse.json({
      bookings: bookingsRes.data || [],
      programs: programsRes.data || [],
      agents: agentsRes.data || [],
      invoices: invoicesRes.data || [],
    })
  } catch (error) {
    console.error('Finance data error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

