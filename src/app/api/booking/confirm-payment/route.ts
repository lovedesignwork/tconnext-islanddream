import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { sendEmail, getBookingConfirmationEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Admin client to bypass RLS
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(url, key)
}

// Generate booking number with robust fallback
async function generateBookingNumber(supabase: ReturnType<typeof getAdminClient>, companyId: string): Promise<string> {
  console.log('[ConfirmPayment] Generating booking number for company:', companyId)
  
  // Try RPC first
  try {
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('generate_booking_number', { 
        p_company_id: companyId,
        p_payment_type: 'paid'
      })
    
    if (!rpcError && rpcResult) {
      console.log('[ConfirmPayment] RPC generated booking number:', rpcResult)
      return rpcResult
    }
    console.warn('[ConfirmPayment] RPC failed:', rpcError?.message || 'No result')
  } catch (e: any) {
    console.warn('[ConfirmPayment] RPC exception:', e.message)
  }
  
  // Fallback: generate locally
  console.log('[ConfirmPayment] Using fallback booking number generation')
  
  const { data: companyData } = await supabase
    .from('companies')
    .select('name, initials, booking_sequence')
    .eq('id', companyId)
    .single()
  
  let initials = companyData?.initials || 'BK'
  
  if (!companyData?.initials && companyData?.name) {
    const words = companyData.name.replace(/[.,]|Co\.|Ltd\.?|Inc\.?|LLC|Corporation/gi, '').trim().split(/\s+/)
    initials = words.map(word => word.charAt(0).toUpperCase()).join('').substring(0, 5) || 'BK'
  }
  
  let sequence = (companyData?.booking_sequence || 0) + 1
  
  await supabase
    .from('companies')
    .update({ booking_sequence: sequence, initials: initials })
    .eq('id', companyId)
  
  const bookingNumber = `${initials}-${sequence.toString().padStart(6, '0')}`
  console.log('[ConfirmPayment] Generated booking number:', bookingNumber)
  return bookingNumber
}

// Format activity date
function formatActivityDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

interface ConfirmPaymentRequest {
  paymentIntentId: string
  companyId: string
}

/**
 * POST /api/booking/confirm-payment
 * Client-side fallback to confirm payment and create booking if webhook hasn't
 */
export async function POST(request: NextRequest) {
  console.log('[ConfirmPayment] ========== CONFIRM PAYMENT REQUEST ==========')
  
  try {
    const body: ConfirmPaymentRequest = await request.json()
    const { paymentIntentId, companyId } = body

    console.log('[ConfirmPayment] Payment Intent ID:', paymentIntentId)
    console.log('[ConfirmPayment] Company ID:', companyId)

    if (!paymentIntentId || !companyId) {
      console.error('[ConfirmPayment] Missing required fields')
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = getAdminClient()

    // Wait a moment for webhook to complete (it runs in parallel)
    console.log('[ConfirmPayment] Waiting 2 seconds for webhook to complete...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Check if booking already exists (created by webhook) - retry up to 3 times
    console.log('[ConfirmPayment] Checking for existing booking...')
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { data: existingBooking, error: existingError } = await supabase
          .from('bookings')
          .select('id, booking_number')
          .eq('stripe_payment_intent_id', paymentIntentId)
          .maybeSingle()

        if (existingError) {
          console.warn('[ConfirmPayment] Error checking existing:', existingError.message)
        } else if (existingBooking) {
          // Booking already exists (created by webhook) - don't send another email!
          console.log('[ConfirmPayment] Booking already exists (webhook handled it):', existingBooking.booking_number)
          return NextResponse.json({
            success: true,
            booking_id: existingBooking.id,
            booking_number: existingBooking.booking_number,
            created_by: 'webhook',
            email_sent_by: 'webhook' // Email already sent by webhook
          })
        }
        
        // If not found on first attempts, wait and retry
        if (attempt < 3) {
          console.log(`[ConfirmPayment] Booking not found, retry ${attempt}/3...`)
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      } catch (e: any) {
        console.warn('[ConfirmPayment] Exception checking existing:', e.message)
      }
    }
    
    console.log('[ConfirmPayment] No existing booking found after retries, proceeding to create...')

    // Get company and Stripe settings
    console.log('[ConfirmPayment] Fetching company...')
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single()

    if (companyError || !company) {
      console.error('[ConfirmPayment] Company not found:', companyError)
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    console.log('[ConfirmPayment] Company found:', company.name)

    const settings = company.settings || {}
    const stripeSettings = settings.stripe || {}

    if (!stripeSettings.secret_key) {
      console.error('[ConfirmPayment] Stripe not configured')
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 400 })
    }

    // Verify payment intent with Stripe
    console.log('[ConfirmPayment] Verifying payment intent with Stripe...')
    const stripe = new Stripe(stripeSettings.secret_key, { apiVersion: '2024-11-20.acacia' as any })
    
    let paymentIntent: Stripe.PaymentIntent
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
      console.log('[ConfirmPayment] Payment Intent status:', paymentIntent.status)
    } catch (stripeError: any) {
      console.error('[ConfirmPayment] Failed to retrieve payment intent:', stripeError.message)
      return NextResponse.json({ error: 'Invalid payment intent' }, { status: 400 })
    }

    // Verify payment succeeded
    if (paymentIntent.status !== 'succeeded') {
      console.error('[ConfirmPayment] Payment not completed, status:', paymentIntent.status)
      return NextResponse.json({ 
        error: 'Payment not completed',
        status: paymentIntent.status 
      }, { status: 400 })
    }

    // Verify company matches
    if (paymentIntent.metadata.company_id !== companyId) {
      console.error('[ConfirmPayment] Company mismatch')
      return NextResponse.json({ error: 'Company mismatch' }, { status: 400 })
    }

    const metadata = paymentIntent.metadata
    console.log('[ConfirmPayment] Metadata:', JSON.stringify(metadata))

    // Generate booking number
    console.log('[ConfirmPayment] Generating booking number...')
    const bookingNumber = await generateBookingNumber(supabase, companyId)

    // Build booking data - only include columns that exist
    const bookingData: Record<string, any> = {
      company_id: companyId,
      booking_number: bookingNumber,
      activity_date: metadata.activity_date,
      program_id: metadata.program_id,
      customer_name: metadata.customer_name,
      customer_email: metadata.customer_email,
      customer_whatsapp: metadata.customer_whatsapp || null,
      adults: parseInt(metadata.adults) || 1,
      children: parseInt(metadata.children) || 0,
      infants: parseInt(metadata.infants) || 0,
      hotel_id: metadata.hotel_id || null,
      custom_pickup_location: metadata.custom_pickup_location || null,
      room_number: metadata.room_number || null,
      is_come_direct: metadata.is_come_direct === 'true',
      notes: metadata.notes || null,
      status: 'confirmed',
      payment_type: 'regular', // valid values: regular, foc, insp
      is_direct_booking: true,
      collect_money: 0,
      stripe_payment_intent_id: paymentIntent.id,
    }
    
    if (metadata.custom_location_google_maps) {
      bookingData.custom_location_google_maps = metadata.custom_location_google_maps
    }

    console.log('[ConfirmPayment] Creating booking...')

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select('id, booking_number')
      .single()

    if (bookingError) {
      console.error('[ConfirmPayment] ❌ Failed to create booking:', bookingError)
      
      // Check if it's a duplicate key error (webhook created it)
      if (bookingError.code === '23505') {
        console.log('[ConfirmPayment] Duplicate key - booking created by webhook')
        const { data: existingNow } = await supabase
          .from('bookings')
          .select('id, booking_number')
          .eq('stripe_payment_intent_id', paymentIntentId)
          .maybeSingle()
        
        if (existingNow) {
          return NextResponse.json({
            success: true,
            booking_id: existingNow.id,
            booking_number: existingNow.booking_number,
            created_by: 'webhook'
          })
        }
      }
      
      // Try without stripe_payment_intent_id
      if (bookingError.message?.includes('stripe_payment_intent_id')) {
        console.log('[ConfirmPayment] Retrying without stripe_payment_intent_id...')
        delete bookingData.stripe_payment_intent_id
        
        const { data: retryBooking, error: retryError } = await supabase
          .from('bookings')
          .insert(bookingData)
          .select('id, booking_number')
          .single()
          
        if (retryError) {
          console.error('[ConfirmPayment] ❌ Retry also failed:', retryError)
          return NextResponse.json({ 
            error: 'Failed to create booking', 
            details: retryError.message 
          }, { status: 500 })
        }
        
        console.log('[ConfirmPayment] ✅ Booking created (without payment intent ID):', retryBooking.booking_number)
        
        // Send email to customer
        await sendConfirmationEmail(metadata, bookingNumber, paymentIntent.amount, company, settings)
        
        // Send notification emails to configured recipients
        await sendBookingNotificationEmails(metadata, bookingNumber, paymentIntent.amount, company, settings)
        
        return NextResponse.json({
          success: true,
          booking_id: retryBooking.id,
          booking_number: retryBooking.booking_number,
          created_by: 'confirm-api'
        })
      }
      
      return NextResponse.json({ 
        error: 'Failed to create booking',
        details: bookingError.message 
      }, { status: 500 })
    }

    console.log('[ConfirmPayment] ✅ Booking created:', booking.booking_number)

    // Send confirmation email to customer
    await sendConfirmationEmail(metadata, bookingNumber, paymentIntent.amount, company, settings)

    // Send notification emails to configured recipients
    await sendBookingNotificationEmails(metadata, bookingNumber, paymentIntent.amount, company, settings)

    console.log('[ConfirmPayment] ========== COMPLETE ==========')

    return NextResponse.json({
      success: true,
      booking_id: booking.id,
      booking_number: booking.booking_number,
      created_by: 'confirm-api'
    })
  } catch (error: any) {
    console.error('[ConfirmPayment] ❌ Unhandled error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to confirm payment' },
      { status: 500 }
    )
  }
}

// Helper function to send confirmation email
async function sendConfirmationEmail(
  metadata: Record<string, string>,
  bookingNumber: string,
  amount: number,
  company: any,
  settings: any
) {
  console.log('[ConfirmPayment] Sending confirmation email to:', metadata.customer_email)
  
  // Get company logo from settings (stored at root level, not in branding)
  const companyLogoUrl = settings?.logo_url || settings?.branding?.logo_url || null
  console.log(`[Confirm Payment Email] Company: ${company.name}, Logo URL: ${companyLogoUrl || 'NOT FOUND'}`)
  
  try {
    const emailHtml = getBookingConfirmationEmail({
      customerName: metadata.customer_name,
      bookingNumber: bookingNumber,
      programName: metadata.program_name || 'Tour',
      bookingDate: formatActivityDate(metadata.activity_date),
      adults: parseInt(metadata.adults) || 1,
      children: parseInt(metadata.children) || 0,
      infants: parseInt(metadata.infants) || 0,
      totalAmount: amount / 100,
      currency: 'THB',
      companyName: company.name || 'TConnext',
      companyLogoUrl: companyLogoUrl,
      isComeDirect: metadata.is_come_direct === 'true',
      pickupLocation: metadata.custom_pickup_location || null,
    })

    await sendEmail({
      to: metadata.customer_email,
      subject: `Booking Confirmed - ${bookingNumber}`,
      html: emailHtml,
      from: settings.email?.from_name 
        ? `${settings.email.from_name} <noreply@tconnext.app>`
        : undefined,
    })

    console.log('[ConfirmPayment] ✅ Email sent successfully')
  } catch (emailError: any) {
    console.error('[ConfirmPayment] ⚠️ Failed to send email:', emailError.message)
  }
}

// Helper function to send booking notification emails to configured recipients
async function sendBookingNotificationEmails(
  metadata: Record<string, string>,
  bookingNumber: string,
  amount: number,
  company: any,
  settings: any
) {
  const notificationEmails = settings.email?.booking_notification_emails || []
  
  if (notificationEmails.length === 0) {
    console.log('[ConfirmPayment] No booking notification emails configured')
    return
  }
  
  console.log('[ConfirmPayment] Sending notification emails to:', notificationEmails.join(', '))
  
  const adults = parseInt(metadata.adults) || 1
  const children = parseInt(metadata.children) || 0
  const infants = parseInt(metadata.infants) || 0
  const totalPax = adults + children + infants
  const totalAmount = (amount / 100).toLocaleString('en-US', { style: 'currency', currency: 'THB' })
  
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 30px 20px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🎉 New Website Booking!</h1>
      </div>
      
      <div style="background: #f8fafc; padding: 30px 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="margin: 0 0 20px 0; font-size: 16px;">A new booking has been received through the website.</p>
        
        <div style="background: white; border-radius: 8px; padding: 20px; border: 1px solid #e2e8f0;">
          <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #0ea5e9; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
            📋 Booking Details
          </h2>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; width: 140px;">Booking #:</td>
              <td style="padding: 8px 0; font-weight: 600;">${bookingNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Customer:</td>
              <td style="padding: 8px 0; font-weight: 600;">${metadata.customer_name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Email:</td>
              <td style="padding: 8px 0;"><a href="mailto:${metadata.customer_email}" style="color: #0ea5e9;">${metadata.customer_email}</a></td>
            </tr>
            ${metadata.customer_whatsapp ? `
            <tr>
              <td style="padding: 8px 0; color: #64748b;">WhatsApp:</td>
              <td style="padding: 8px 0;">${metadata.customer_whatsapp}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Program:</td>
              <td style="padding: 8px 0; font-weight: 600;">${metadata.program_name || 'Tour'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Tour Date:</td>
              <td style="padding: 8px 0; font-weight: 600;">${formatActivityDate(metadata.activity_date)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Guests:</td>
              <td style="padding: 8px 0;">${adults} Adult${adults > 1 ? 's' : ''}${children > 0 ? `, ${children} Child${children > 1 ? 'ren' : ''}` : ''}${infants > 0 ? `, ${infants} Infant${infants > 1 ? 's' : ''}` : ''} (${totalPax} total)</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Amount Paid:</td>
              <td style="padding: 8px 0; font-weight: 600; color: #16a34a; font-size: 18px;">${totalAmount}</td>
            </tr>
            ${metadata.custom_pickup_location ? `
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Pickup:</td>
              <td style="padding: 8px 0;">${metadata.custom_pickup_location}</td>
            </tr>
            ` : ''}
            ${metadata.notes ? `
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Notes:</td>
              <td style="padding: 8px 0;">${metadata.notes}</td>
            </tr>
            ` : ''}
          </table>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #ecfdf5; border-radius: 8px; border-left: 4px solid #16a34a;">
          <p style="margin: 0; color: #15803d; font-weight: 500;">
            ✅ Payment received successfully via Stripe
          </p>
        </div>
        
        <p style="margin-top: 20px; font-size: 14px; color: #64748b; text-align: center;">
          This is an automated notification from ${company.name || 'TConnext'}
        </p>
      </div>
    </body>
    </html>
  `
  
  // Send to all configured recipients
  for (const recipient of notificationEmails) {
    try {
      await sendEmail({
        to: recipient,
        subject: `🎉 New Booking: ${bookingNumber} - ${metadata.customer_name}`,
        html: emailHtml,
        from: settings.email?.from_name 
          ? `${settings.email.from_name} <noreply@tconnext.app>`
          : undefined,
      })
      console.log('[ConfirmPayment] ✅ Notification email sent to:', recipient)
    } catch (emailError: any) {
      console.error('[ConfirmPayment] ⚠️ Failed to send notification email to', recipient, ':', emailError.message)
    }
  }
}
