import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createConnectAccount, createOnboardingLink, isStripeConfigured } from '@/lib/stripe'

/**
 * POST /api/stripe/connect
 * Creates a Stripe Connect Express account and returns the onboarding URL
 */
export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Please contact support to enable online payments.' },
        { status: 503 }
      )
    }

    const supabase = await createClient()

    // Get the current user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user details including company
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*, company:companies(*)')
      .eq('auth_id', authUser.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Only master_admin can connect Stripe
    if (userData.role !== 'master_admin') {
      return NextResponse.json({ error: 'Only administrators can connect Stripe' }, { status: 403 })
    }

    const company = userData.company
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Check if already connected
    if (company.stripe_account_id) {
      // If already has an account, create a new onboarding link (in case previous expired)
      const onboardingUrl = await createOnboardingLink(company.stripe_account_id)
      return NextResponse.json({ 
        url: onboardingUrl,
        accountId: company.stripe_account_id,
        isExisting: true
      })
    }

    // Get company email from settings or user email
    const companyEmail = company.settings?.email?.reply_to || userData.email

    // Create new Stripe Connect account
    const { accountId, onboardingUrl } = await createConnectAccount(
      companyEmail,
      company.name,
      'TH' // Thailand
    )

    // Save the account ID to the company
    const { error: updateError } = await supabase
      .from('companies')
      .update({
        stripe_account_id: accountId,
        stripe_connected: false, // Will be set to true after onboarding completes
        stripe_onboarding_complete: false,
      })
      .eq('id', company.id)

    if (updateError) {
      console.error('Failed to save Stripe account ID:', updateError)
      return NextResponse.json({ error: 'Failed to save Stripe account' }, { status: 500 })
    }

    return NextResponse.json({ 
      url: onboardingUrl,
      accountId,
      isExisting: false
    })
  } catch (error: any) {
    console.error('Stripe Connect error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create Stripe account' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/stripe/connect
 * Disconnects the Stripe account from the company
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get the current user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user details including company
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*, company:companies(*)')
      .eq('auth_id', authUser.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Only master_admin can disconnect Stripe
    if (userData.role !== 'master_admin') {
      return NextResponse.json({ error: 'Only administrators can disconnect Stripe' }, { status: 403 })
    }

    const company = userData.company
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    if (!company.stripe_account_id) {
      return NextResponse.json({ error: 'No Stripe account connected' }, { status: 400 })
    }

    // Remove Stripe connection from database
    // Note: We don't delete the Stripe account itself, just remove the connection
    const { error: updateError } = await supabase
      .from('companies')
      .update({
        stripe_account_id: null,
        stripe_connected: false,
        stripe_onboarding_complete: false,
        stripe_connected_at: null,
      })
      .eq('id', company.id)

    if (updateError) {
      console.error('Failed to disconnect Stripe:', updateError)
      return NextResponse.json({ error: 'Failed to disconnect Stripe' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Stripe disconnect error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect Stripe' },
      { status: 500 }
    )
  }
}

