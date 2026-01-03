import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

// Admin client to bypass RLS
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get date from query params
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getAdminClient()

    // Get the user's company_id
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('company_id')
      .eq('auth_id', authUser.id)
      .single()

    if (!userData?.company_id) {
      // Try team members
      const { data: teamMemberData } = await supabaseAdmin
        .from('company_team_members')
        .select('company_id')
        .eq('auth_id', authUser.id)
        .single()

      if (!teamMemberData?.company_id) {
        return NextResponse.json(
          { error: 'User not associated with a company' },
          { status: 403 }
        )
      }
    }

    const companyId = userData?.company_id

    // Fetch bookings and boat assignments in parallel
    const [bookingsRes, assignmentsRes] = await Promise.all([
      supabaseAdmin
        .from('bookings')
        .select(`
          *,
          program:programs(id, name, nickname, color),
          hotel:hotels(id, name, area),
          driver:drivers(id, name, nickname),
          boat:boats(id, name, captain_name),
          guide:guides(id, name, nickname),
          restaurant:restaurants(id, name, location),
          agent:agents(id, name),
          agent_staff:agent_staff(id, full_name, nickname)
        `)
        .eq('company_id', companyId)
        .eq('activity_date', date)
        .not('status', 'in', '("void","cancelled")')
        .is('deleted_at', null)
        .order('customer_name'),
      supabaseAdmin
        .from('boat_assignment_locks')
        .select(`
          boat_id,
          guide_id,
          restaurant_id,
          guide:guides(id, name, nickname),
          restaurant:restaurants(id, name, location)
        `)
        .eq('company_id', companyId)
        .eq('activity_date', date)
    ])

    if (bookingsRes.error) {
      console.error('Error fetching bookings:', bookingsRes.error)
      return NextResponse.json(
        { error: 'Failed to fetch bookings' },
        { status: 500 }
      )
    }

    // Build assignments map
    const assignmentsMap: Record<string, any> = {}
    if (!assignmentsRes.error && assignmentsRes.data) {
      assignmentsRes.data.forEach((assignment: any) => {
        assignmentsMap[assignment.boat_id] = {
          boat_id: assignment.boat_id,
          guide_id: assignment.guide_id,
          restaurant_id: assignment.restaurant_id,
          guide: assignment.guide,
          restaurant: assignment.restaurant,
        }
      })
    }

    // Enrich bookings with boat assignments
    const enrichedBookings = (bookingsRes.data || []).map((booking: any) => {
      const boatAssignment = booking.boat_id ? assignmentsMap[booking.boat_id] : null
      return {
        ...booking,
        boatGuide: boatAssignment?.guide || null,
        boatRestaurant: boatAssignment?.restaurant || null,
      }
    })

    return NextResponse.json({
      bookings: enrichedBookings,
      boatAssignmentsMap: assignmentsMap,
    })
  } catch (error) {
    console.error('OP Report data error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

