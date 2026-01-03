import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

// Use service role client for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const { company_id, name, email, password, permissions } = await request.json()

    // Validate required fields - email is now optional
    if (!company_id || !name || !password) {
      return NextResponse.json(
        { error: 'Missing required fields (company_id, name, password)' },
        { status: 400 }
      )
    }

    // Verify the requesting user is authorized (master_admin only)
    const supabase = await createServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Use admin client to bypass RLS for user lookup
    const { data: requestingUser } = await supabaseAdmin
      .from('users')
      .select('role, company_id')
      .eq('auth_id', authUser.id)
      .single()

    if (!requestingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check authorization - must be master_admin of the same company
    const isMasterAdmin = requestingUser.role === 'master_admin' && requestingUser.company_id === company_id

    if (!isMasterAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized to create team members for this company' },
        { status: 403 }
      )
    }

    // Get company info for generating staff code
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('company_code, staff_sequence')
      .eq('id', company_id)
      .single()

    if (companyError || !company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    // Generate staff code: company_code-sequence
    const newSequence = (company.staff_sequence || 0) + 1
    const staffCode = `${company.company_code}-${newSequence}`

    // Update company's staff sequence
    const { error: updateError } = await supabaseAdmin
      .from('companies')
      .update({ staff_sequence: newSequence })
      .eq('id', company_id)

    if (updateError) {
      console.error('Failed to update staff sequence:', updateError)
      return NextResponse.json(
        { error: 'Failed to generate staff code' },
        { status: 500 }
      )
    }

    // Determine the email to use for auth - if no email provided, generate one
    const authEmail = email 
      ? email.toLowerCase() 
      : `${staffCode}@staff.tconnext.local`

    // Check if email already exists in team members (only if real email provided)
    if (email) {
      const { data: existingMember } = await supabaseAdmin
        .from('company_team_members')
        .select('id')
        .eq('company_id', company_id)
        .eq('email', email.toLowerCase())
        .single()

      if (existingMember) {
        // Rollback sequence
        await supabaseAdmin
          .from('companies')
          .update({ staff_sequence: newSequence - 1 })
          .eq('id', company_id)
        
        return NextResponse.json(
          { error: 'A team member with this email already exists' },
          { status: 400 }
        )
      }
    }

    // Create auth user using admin client
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name,
        is_team_member: true,
        company_id,
        staff_code: staffCode,
      }
    })

    if (authError) {
      // Rollback sequence
      await supabaseAdmin
        .from('companies')
        .update({ staff_sequence: newSequence - 1 })
        .eq('id', company_id)

      // Check if user already exists in auth
      if (authError.message.includes('already been registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 400 }
        )
      }
      throw authError
    }

    // Create team member record with staff_code
    const { data: teamMember, error: teamError } = await supabaseAdmin
      .from('company_team_members')
      .insert({
        company_id,
        auth_id: authData.user.id,
        name,
        email: email ? email.toLowerCase() : null,
        staff_code: staffCode,
        username: staffCode,
        status: 'active',
        permissions: permissions || {},
      })
      .select()
      .single()

    if (teamError) {
      // Rollback: delete the auth user and reset sequence
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      await supabaseAdmin
        .from('companies')
        .update({ staff_sequence: newSequence - 1 })
        .eq('id', company_id)
      throw teamError
    }

    return NextResponse.json({
      success: true,
      data: teamMember,
    })
  } catch (error: any) {
    console.error('Error creating team member:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create team member' },
      { status: 500 }
    )
  }
}

