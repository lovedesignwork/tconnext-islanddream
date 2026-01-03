import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Admin client to bypass RLS
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST - Create a new agent
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const supabaseAdmin = getAdminClient()

    // Get user's company_id (check users table first, then team members)
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

    const body = await request.json()
    const { 
      name, unique_code, contact_person, email, phone, whatsapp, 
      status, agent_type, notes, tax_id, address, tax_applied 
    } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const { data: agent, error } = await supabaseAdmin
      .from('agents')
      .insert({
        company_id: companyId,
        name,
        unique_code: unique_code?.trim() || null,
        contact_person: contact_person || null,
        email: email || null,
        phone: phone || null,
        whatsapp: whatsapp || null,
        status: status || 'active',
        agent_type: agent_type || 'agent',
        notes: notes || null,
        tax_id: tax_id || null,
        address: address || null,
        tax_applied: tax_applied || false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating agent:', error)
      return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 })
    }

    return NextResponse.json({ success: true, agent })
  } catch (error) {
    console.error('Create agent error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update an agent
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const supabaseAdmin = getAdminClient()

    // Get user's company_id (check users table first, then team members)
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

    const body = await request.json()
    const { 
      id, name, unique_code, contact_person, email, phone, whatsapp, 
      status, agent_type, notes, tax_id, address, tax_applied 
    } = body

    if (!id) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 })
    }

    // Verify agent belongs to this company
    const { data: existingAgent } = await supabaseAdmin
      .from('agents')
      .select('id, company_id')
      .eq('id', id)
      .eq('company_id', companyId)
      .single()

    if (!existingAgent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const { error } = await supabaseAdmin
      .from('agents')
      .update({
        name,
        unique_code: unique_code?.trim() || null,
        contact_person: contact_person || null,
        email: email || null,
        phone: phone || null,
        whatsapp: whatsapp || null,
        status,
        agent_type,
        notes: notes || null,
        tax_id: tax_id || null,
        address: address || null,
        tax_applied,
      })
      .eq('id', id)

    if (error) {
      console.error('Error updating agent:', error)
      return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update agent error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Soft delete an agent
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const supabaseAdmin = getAdminClient()

    // Get user's company_id (check users table first, then team members)
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

    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('agents')
      .update({ status: 'deleted' })
      .eq('id', id)
      .eq('company_id', companyId)

    if (error) {
      console.error('Error deleting agent:', error)
      return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete agent error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

