import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

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

    // Fetch agents with staff
    const { data: agents, error } = await supabaseAdmin
      .from('agents')
      .select(`
        *,
        agent_staff(id, full_name, nickname, phone, status)
      `)
      .eq('company_id', companyId)
      .neq('status', 'deleted')
      .order('name')

    if (error) {
      console.error('Error fetching agents:', error)
      return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 })
    }

    // Fetch booking stats for each agent
    const agentsWithStats = await Promise.all(
      (agents || []).map(async (agent) => {
        const { count } = await supabaseAdmin
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('agent_id', agent.id)
          .is('deleted_at', null)
        
        return {
          ...agent,
          booking_count: count || 0
        }
      })
    )

    // Fetch programs for pricing
    const { data: programs } = await supabaseAdmin
      .from('programs')
      .select('id, name, nickname, base_price, adult_selling_price, child_selling_price, pricing_type')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .order('name')

    // Fetch agent pricing (only if there are agents)
    let agentPricing: any[] = []
    const agentIds = (agents || []).map(a => a.id)
    if (agentIds.length > 0) {
      const { data } = await supabaseAdmin
        .from('agent_pricing')
        .select('*')
        .in('agent_id', agentIds)
      agentPricing = data || []
    }

    return NextResponse.json({
      agents: agentsWithStats,
      programs: programs || [],
      agentPricing: agentPricing || [],
    })
  } catch (error) {
    console.error('Agents data error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

