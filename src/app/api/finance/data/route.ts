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

    let companyId = userData?.company_id

    if (!companyId) {
      const { data: teamMemberData } = await supabaseAdmin
        .from('company_team_members')
        .select('company_id')
        .eq('auth_id', authUser.id)
        .single()

      if (!teamMemberData?.company_id) {
        return NextResponse.json({ error: 'User not associated with a company' }, { status: 403 })
      }
      companyId = teamMemberData.company_id
    }

    // First get agent IDs for this company
    const { data: agentIds } = await supabaseAdmin
      .from('agents')
      .select('id')
      .eq('company_id', companyId)
      .neq('status', 'deleted')
    
    const agentIdList = agentIds?.map(a => a.id) || []

    // Fetch bookings, programs, agents, and invoices in parallel
    const [bookingsRes, programsRes, agentsRes, invoicesRes] = await Promise.all([
      supabaseAdmin
        .from('bookings')
        .select(`
          *,
          program:programs(id, name, nickname, base_price, adult_selling_price, child_selling_price, pricing_type),
          hotel:hotels(id, name, area),
          agent:agents(id, name, unique_code, agent_type),
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
        .select('id, name, unique_code, agent_type')
        .eq('company_id', companyId)
        .neq('status', 'deleted'),
      supabaseAdmin
        .from('invoices')
        .select('id, invoice_number, status')
        .eq('company_id', companyId),
    ])

    // Fetch invoice items separately using invoice IDs
    const invoiceIds = invoicesRes.data?.map((i: any) => i.id) || []
    const invoiceItemsRes = invoiceIds.length > 0 
      ? await supabaseAdmin
          .from('invoice_items')
          .select('booking_id, invoice_id')
          .in('invoice_id', invoiceIds)
      : { data: [], error: null }

    // Fetch agent pricing for this company's agents
    let agentPricingRes: { data: any[] | null; error: any } = { data: [], error: null }
    if (agentIdList.length > 0) {
      agentPricingRes = await supabaseAdmin
        .from('agent_pricing')
        .select('agent_id, program_id, agent_price, adult_agent_price, child_agent_price')
        .in('agent_id', agentIdList)
    }

    if (bookingsRes.error) {
      console.error('Error fetching bookings:', bookingsRes.error)
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
    }

    return NextResponse.json({
      bookings: bookingsRes.data || [],
      programs: programsRes.data || [],
      agents: agentsRes.data || [],
      invoices: invoicesRes.data || [],
      invoiceItems: invoiceItemsRes.data || [],
      agentPricing: agentPricingRes.data || [],
    })
  } catch (error) {
    console.error('Finance data error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

