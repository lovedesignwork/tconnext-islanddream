import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use admin client to bypass RLS for public guide portal access
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json({ error: 'Guide ID is required' }, { status: 400 })
    }

    const supabase = getAdminClient()

    // Fetch guide by unique link ID
    const { data: guide, error } = await supabase
      .from('guides')
      .select(`
        id,
        name,
        nickname,
        status,
        access_pin,
        unique_link_id,
        company_id,
        company:companies(id, name, settings)
      `)
      .eq('unique_link_id', id)
      .single()

    if (error || !guide) {
      return NextResponse.json({ error: 'Guide not found' }, { status: 404 })
    }

    return NextResponse.json({ guide })
  } catch (error) {
    console.error('Error fetching guide:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST endpoint for authenticated access to fetch assignments
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params
    const { date, guideId } = await request.json()

    if (!id || !date || !guideId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const supabase = getAdminClient()

    // Fetch boat assignment locks where this guide is assigned for the selected date
    const { data: locks, error: locksError } = await supabase
      .from('boat_assignment_locks')
      .select(`
        *,
        boat:boats(*),
        restaurant:restaurants(*)
      `)
      .eq('guide_id', guideId)
      .eq('activity_date', date)

    if (locksError) {
      console.error('Error fetching locks:', locksError)
      return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 })
    }

    if (!locks || locks.length === 0) {
      return NextResponse.json({ assignments: [] })
    }

    // Get boat IDs where this guide is assigned
    const boatIds = locks.map(lock => lock.boat_id)

    // Fetch bookings for those boats on this date
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        *,
        hotel:hotels(*),
        program:programs(*),
        agent:agents(id, name)
      `)
      .eq('activity_date', date)
      .in('boat_id', boatIds)
      .is('deleted_at', null)
      .not('status', 'in', '("void","cancelled")')
      .order('customer_name')

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
    }

    // Group bookings by boat
    const assignments = locks.map(lock => ({
      boat: lock.boat,
      restaurant: lock.restaurant,
      customers: (bookings || [])
        .filter(b => b.boat_id === lock.boat_id)
        .map(b => ({
          id: b.id,
          customer_name: b.customer_name,
          adults: b.adults || 0,
          children: b.children || 0,
          infants: b.infants || 0,
          hotel: b.hotel,
          custom_pickup_location: b.custom_pickup_location,
          notes: b.notes,
          program: b.program,
          agent: b.agent,
          collect_money: b.collect_money || 0,
          is_direct_booking: b.is_direct_booking || false,
        }))
    }))

    return NextResponse.json({ assignments })
  } catch (error) {
    console.error('Error fetching assignments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

