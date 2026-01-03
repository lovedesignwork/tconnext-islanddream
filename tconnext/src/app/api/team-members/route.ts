import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Create admin client inside function to ensure env vars are available
function getSupabaseAdmin() {
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

    const supabaseAdmin = getSupabaseAdmin()

    // Get the user's company_id from users table
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('company_id, role')
      .eq('auth_id', authUser.id)
      .single()

    if (!userData) {
      // Check if they're a team member
      const { data: teamMemberData } = await supabaseAdmin
        .from('company_team_members')
        .select('company_id')
        .eq('auth_id', authUser.id)
        .single()

      if (!teamMemberData) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      // Team members can only view team members from their company
      const { data: members, error } = await supabaseAdmin
        .from('company_team_members')
        .select('*')
        .eq('company_id', teamMemberData.company_id)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching team members:', error)
        return NextResponse.json(
          { error: 'Failed to fetch team members' },
          { status: 500 }
        )
      }

      return NextResponse.json({ members })
    }

    // Regular users (master_admin) can view their company's team members
    const { data: members, error } = await supabaseAdmin
      .from('company_team_members')
      .select('*')
      .eq('company_id', userData.company_id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching team members:', error)
      return NextResponse.json(
        { error: 'Failed to fetch team members' },
        { status: 500 }
      )
    }

    return NextResponse.json({ members })
  } catch (error) {
    console.error('Team members API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

