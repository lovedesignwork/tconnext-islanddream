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

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    const supabaseAdmin = getAdminClient()

    // Verify user belongs to this company
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('company_id')
      .eq('auth_id', authUser.id)
      .single()

    let userCompanyId = userData?.company_id

    if (!userCompanyId) {
      const { data: teamMemberData } = await supabaseAdmin
        .from('company_team_members')
        .select('company_id')
        .eq('auth_id', authUser.id)
        .single()

      userCompanyId = teamMemberData?.company_id
    }

    // Security check: user must belong to the requested company
    if (userCompanyId !== companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Fetch page locks for the company using admin client
    const { data, error } = await supabaseAdmin
      .from('companies')
      .select('page_locks, pricing_pin_enabled, pricing_pin')
      .eq('id', companyId)
      .single()

    if (error) {
      console.error('Error fetching page locks:', error)
      return NextResponse.json({ error: 'Failed to fetch page locks' }, { status: 500 })
    }

    return NextResponse.json({
      page_locks: data?.page_locks || {},
      pricing_pin_enabled: data?.pricing_pin_enabled || false,
      pricing_pin: data?.pricing_pin || '',
    })
  } catch (error) {
    console.error('Page locks API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

