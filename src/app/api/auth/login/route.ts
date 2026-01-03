import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// Service role client for looking up staff codes
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Check if input looks like a staff code (format: 12345-1)
function isStaffCode(input: string): boolean {
  return /^\d{5}-\d+$/.test(input)
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    let body: { email?: string; password?: string } | null = null

    try {
      body = rawBody ? (JSON.parse(rawBody) as { email?: string; password?: string }) : null
    } catch (parseError) {
      console.error('[api/auth/login] Failed to parse JSON', parseError)
    }

    if (!body) {
      return NextResponse.json(
        { error: 'Invalid request payload' },
        { status: 400 }
      )
    }

    const { email: inputIdentifier, password } = body

    if (!inputIdentifier || !password) {
      return NextResponse.json(
        { error: 'Email/Staff ID and password are required' },
        { status: 400 }
      )
    }

    let loginEmail = inputIdentifier
    let isTeamMember = false

    // Check if input is a staff code
    if (isStaffCode(inputIdentifier)) {
      // Look up the team member by staff code
      const { data: teamMember } = await supabaseAdmin
        .from('company_team_members')
        .select('auth_id, email, staff_code')
        .eq('staff_code', inputIdentifier)
        .single()

      if (!teamMember) {
        return NextResponse.json(
          { error: 'Invalid Staff ID or password' },
          { status: 401 }
        )
      }

      // Get the auth user's email
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(teamMember.auth_id)
      
      if (authError || !authUser.user) {
        return NextResponse.json(
          { error: 'Account not found' },
          { status: 401 }
        )
      }

      loginEmail = authUser.user.email!
      isTeamMember = true
    }

    const supabase = await createClient()
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    })

    if (error) {
      console.error('[api/auth/login] Supabase error', error.message)
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // First check if this is a regular user (use admin client to bypass RLS)
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('id, role, company_id, name, permissions')
      .eq('auth_id', data.user.id)
      .single()

    if (userData) {
      return NextResponse.json({
        success: true,
        user: {
          id: userData.id,
          email: data.user.email,
          name: userData.name,
          role: userData.role,
          company_id: userData.company_id,
          permissions: userData.permissions,
          is_team_member: false,
        },
      })
    }

    // Check if this is a team member (use admin client to bypass RLS)
    const { data: teamMemberData } = await supabaseAdmin
      .from('company_team_members')
      .select('id, company_id, name, email, staff_code, permissions, status')
      .eq('auth_id', data.user.id)
      .single()

    if (teamMemberData) {
      // Check if team member is active
      if (teamMemberData.status !== 'active') {
        await supabase.auth.signOut()
        return NextResponse.json(
          { error: 'Your account has been suspended. Please contact your administrator.' },
          { status: 403 }
        )
      }

      return NextResponse.json({
        success: true,
        user: {
          id: teamMemberData.id,
          email: teamMemberData.email || data.user.email,
          name: teamMemberData.name,
          role: 'staff', // Team members are staff role
          company_id: teamMemberData.company_id,
          permissions: teamMemberData.permissions,
          staff_code: teamMemberData.staff_code,
          is_team_member: true,
        },
      })
    }

    // User not found in either table
    await supabase.auth.signOut()
    return NextResponse.json(
      { error: 'User not found in system' },
      { status: 404 }
    )
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
