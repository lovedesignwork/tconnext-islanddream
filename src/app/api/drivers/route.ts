import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { nanoid } from 'nanoid'

export const dynamic = 'force-dynamic'

// Admin client to bypass RLS
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET - Fetch all drivers for the company
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

    // Fetch drivers
    const { data: drivers, error } = await supabaseAdmin
      .from('drivers')
      .select('*')
      .eq('company_id', userData.company_id)
      .neq('status', 'deleted')
      .order('name')

    if (error) {
      console.error('Error fetching drivers:', error)
      return NextResponse.json({ error: 'Failed to load drivers' }, { status: 500 })
    }

    return NextResponse.json({ drivers })
  } catch (error) {
    console.error('Get drivers error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new driver
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { name, nickname, phone, whatsapp, vehicle_info, car_capacity, status, access_pin } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Generate unique link ID
    const uniqueLinkId = nanoid(12)

    const { data: driver, error } = await supabaseAdmin
      .from('drivers')
      .insert({
        company_id: userData.company_id,
        name,
        nickname: nickname || null,
        phone: phone || null,
        whatsapp: whatsapp || null,
        vehicle_info: vehicle_info || null,
        car_capacity: car_capacity ? Number(car_capacity) : null,
        status: status || 'active',
        access_pin: access_pin && access_pin.length === 4 ? access_pin : null,
        unique_link_id: uniqueLinkId,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating driver:', error)
      return NextResponse.json({ error: 'Failed to create driver' }, { status: 500 })
    }

    return NextResponse.json({ success: true, driver, plain_pin: access_pin })
  } catch (error) {
    console.error('Create driver error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update a driver
export async function PUT(request: NextRequest) {
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

    const body = await request.json()
    const { id, name, nickname, phone, whatsapp, vehicle_info, car_capacity, status, access_pin } = body

    if (!id) {
      return NextResponse.json({ error: 'Driver ID is required' }, { status: 400 })
    }

    // Verify driver belongs to this company
    const { data: existingDriver } = await supabaseAdmin
      .from('drivers')
      .select('id, company_id')
      .eq('id', id)
      .eq('company_id', userData.company_id)
      .single()

    if (!existingDriver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
    }

    const updateData: Record<string, any> = {
      name,
      nickname: nickname || null,
      phone: phone || null,
      whatsapp: whatsapp || null,
      vehicle_info: vehicle_info || null,
      car_capacity: car_capacity ? Number(car_capacity) : null,
      status,
    }

    // Only update PIN if a new one is provided (store as plain text)
    if (access_pin && access_pin.length === 4) {
      updateData.access_pin = access_pin
    }

    const { error } = await supabaseAdmin
      .from('drivers')
      .update(updateData)
      .eq('id', id)

    if (error) {
      console.error('Error updating driver:', error)
      return NextResponse.json({ error: 'Failed to update driver' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update driver error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Soft delete a driver
export async function DELETE(request: NextRequest) {
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

    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Driver ID is required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('drivers')
      .update({ status: 'deleted' })
      .eq('id', id)
      .eq('company_id', userData.company_id)

    if (error) {
      console.error('Error deleting driver:', error)
      return NextResponse.json({ error: 'Failed to delete driver' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete driver error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

