import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { name, companyName } = await request.json()

    const supabaseAdmin = getAdminClient()

    // Get user's company_id
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('company_id')
      .eq('auth_id', authUser.id)
      .single()

    let companyId = userData?.company_id
    let isTeamMember = false

    if (!companyId) {
      const { data: teamMemberData } = await supabaseAdmin
        .from('company_team_members')
        .select('company_id')
        .eq('auth_id', authUser.id)
        .single()

      companyId = teamMemberData?.company_id
      isTeamMember = true
    }

    // Update user name
    if (name) {
      if (isTeamMember) {
        const { error: nameError } = await supabaseAdmin
          .from('company_team_members')
          .update({ name })
          .eq('auth_id', authUser.id)

        if (nameError) {
          console.error('Error updating team member name:', nameError)
          return NextResponse.json({ error: 'Failed to update name' }, { status: 500 })
        }
      } else {
        const { error: nameError } = await supabaseAdmin
          .from('users')
          .update({ name })
          .eq('auth_id', authUser.id)

        if (nameError) {
          console.error('Error updating user name:', nameError)
          return NextResponse.json({ error: 'Failed to update name' }, { status: 500 })
        }
      }
    }

    // Update company name if provided and user has a company
    if (companyName && companyId) {
      const { error: companyError } = await supabaseAdmin
        .from('companies')
        .update({ name: companyName })
        .eq('id', companyId)

      if (companyError) {
        console.error('Error updating company name:', companyError)
        return NextResponse.json({ error: 'Failed to update company name' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

