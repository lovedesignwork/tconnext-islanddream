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

export async function PUT(request: NextRequest) {
  try {
    const { team_member_id, name, email, password, status, permissions } = await request.json()

    // Validate required fields
    if (!team_member_id) {
      return NextResponse.json(
        { error: 'Team member ID is required' },
        { status: 400 }
      )
    }

    // Verify the requesting user is authorized
    const supabase = await createServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the team member to check company
    const { data: teamMember } = await supabaseAdmin
      .from('company_team_members')
      .select('id, company_id, auth_id')
      .eq('id', team_member_id)
      .single()

    if (!teamMember) {
      return NextResponse.json(
        { error: 'Team member not found' },
        { status: 404 }
      )
    }

    const { data: requestingUser } = await supabase
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
    const isMasterAdmin = requestingUser.role === 'master_admin' && requestingUser.company_id === teamMember.company_id

    if (!isMasterAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized to update this team member' },
        { status: 403 }
      )
    }

    // Update team member record
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (status !== undefined) updateData.status = status
    if (permissions !== undefined) updateData.permissions = permissions

    const { data: updatedMember, error: updateError } = await supabaseAdmin
      .from('company_team_members')
      .update(updateData)
      .eq('id', team_member_id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // Update password if provided
    if (password && teamMember.auth_id) {
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
        teamMember.auth_id,
        { password }
      )

      if (passwordError) {
        console.error('Failed to update password:', passwordError)
        // Don't fail the whole request, just log the error
        return NextResponse.json({
          success: true,
          data: updatedMember,
          warning: 'Team member updated but password change failed',
        })
      }
    }

    // Update email in auth if it changed
    if (email && teamMember.auth_id) {
      const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(
        teamMember.auth_id,
        { email }
      )

      if (emailError) {
        console.error('Failed to update auth email:', emailError)
        // Don't fail the whole request
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedMember,
    })
  } catch (error: any) {
    console.error('Error updating team member:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update team member' },
      { status: 500 }
    )
  }
}

// DELETE method for removing team members
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamMemberId = searchParams.get('id')

    if (!teamMemberId) {
      return NextResponse.json(
        { error: 'Team member ID is required' },
        { status: 400 }
      )
    }

    // Verify the requesting user is authorized
    const supabase = await createServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the team member
    const { data: teamMember } = await supabaseAdmin
      .from('company_team_members')
      .select('id, company_id, auth_id')
      .eq('id', teamMemberId)
      .single()

    if (!teamMember) {
      return NextResponse.json(
        { error: 'Team member not found' },
        { status: 404 }
      )
    }

    const { data: requestingUser } = await supabase
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
    const isMasterAdmin = requestingUser.role === 'master_admin' && requestingUser.company_id === teamMember.company_id

    if (!isMasterAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this team member' },
        { status: 403 }
      )
    }

    // Delete auth user first
    if (teamMember.auth_id) {
      await supabaseAdmin.auth.admin.deleteUser(teamMember.auth_id)
    }

    // Delete team member record
    const { error: deleteError } = await supabaseAdmin
      .from('company_team_members')
      .delete()
      .eq('id', teamMemberId)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({
      success: true,
      message: 'Team member deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting team member:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete team member' },
      { status: 500 }
    )
  }
}

