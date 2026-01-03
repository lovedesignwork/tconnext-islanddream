import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createStripeClient, formatStripeAmount } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import type Stripe from 'stripe'
import type { CompanySettings } from '@/types'

// Lazy initialization to avoid build-time errors
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured')
  }
  return new Resend(process.env.RESEND_API_KEY)
}

/**
 * POST /api/stripe/webhook
 * Handle Stripe webhook events from company Stripe accounts
 * 
 * Note: Each company needs to configure their own webhook endpoint in Stripe Dashboard
 * pointing to: https://yourapp.com/api/stripe/webhook
 * 
 * The webhook secret should be saved in their company settings.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
    }

    // Parse the body to get company_id from metadata (before verification)
    // We need this to look up the company's webhook secret
    let rawEvent: any
    try {
      rawEvent = JSON.parse(body)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // Get company_id from the event data
    const companyId = rawEvent?.data?.object?.metadata?.company_id
    
    if (!companyId) {
      console.log('Webhook received without company_id in metadata:', rawEvent?.type)
      // Still return 200 to acknowledge receipt
      return NextResponse.json({ received: true, message: 'No company_id in metadata' })
    }

    const supabase = getSupabase()

    // Look up company and their Stripe settings
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single()

    if (companyError || !company) {
      console.error('Company not found for webhook:', companyId)
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const settings = company.settings as CompanySettings | null
    const stripeSettings = settings?.stripe

    if (!stripeSettings?.secret_key) {
      console.error('Company has no Stripe secret key:', companyId)
      return NextResponse.json({ error: 'Stripe not configured for company' }, { status: 400 })
    }

    // Verify webhook signature using company's webhook secret
    let event: Stripe.Event
    try {
      const stripe = createStripeClient(stripeSettings.secret_key)
      
      if (stripeSettings.webhook_secret) {
        // Verify signature if webhook secret is configured
        event = stripe.webhooks.constructEvent(body, signature, stripeSettings.webhook_secret)
      } else {
        // If no webhook secret, trust the event (less secure, but functional)
        console.warn('No webhook secret configured for company:', companyId)
        event = rawEvent as Stripe.Event
      }
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent, company)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: error.message || 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle successful payment - create booking and send confirmation email
 */
async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent, company: any) {
  const metadata = paymentIntent.metadata

  // Validate required metadata
  if (!metadata.company_id || !metadata.program_id || !metadata.activity_date) {
    console.error('Missing required metadata in payment intent:', paymentIntent.id)
    return
  }

  const supabase = getSupabase()
  
  try {
    // Generate booking number
    const { data: bookingNum, error: seqError } = await supabase
      .rpc('generate_booking_number', { p_company_id: company.id, p_payment_type: 'regular' })

    if (seqError) {
      console.error('Failed to generate booking number:', seqError)
      return
    }

    // Parse guest counts
    const adults = parseInt(metadata.adults || '1')
    const children = parseInt(metadata.children || '0')
    const infants = parseInt(metadata.infants || '0')
    const isComeDirect = metadata.is_come_direct === 'true'

    // Calculate total from payment intent (convert from satang to THB)
    const totalAmount = paymentIntent.amount / 100

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        company_id: company.id,
        booking_number: bookingNum,
        activity_date: metadata.activity_date,
        program_id: metadata.program_id,
        customer_name: metadata.customer_name,
        customer_email: metadata.customer_email,
        customer_whatsapp: metadata.customer_whatsapp || null,
        adults,
        children,
        infants,
        hotel_id: metadata.hotel_id || null,
        custom_pickup_location: metadata.custom_pickup_location || null,
        room_number: metadata.room_number || null,
        notes: metadata.notes || null,
        status: 'confirmed', // Auto-confirm paid bookings
        payment_type: 'regular',
        is_direct_booking: true,
        booking_source: 'DIRECT BOOKING - website purchase',
        is_come_direct: isComeDirect,
        stripe_payment_id: paymentIntent.id,
        collect_money: 0, // Already paid
      })
      .select('*, program:programs(name, nickname)')
      .single()

    if (bookingError) {
      console.error('Failed to create booking:', bookingError)
      return
    }

    console.log('Booking created successfully:', booking.booking_number)

    // Send confirmation email
    await sendConfirmationEmail(booking, company, totalAmount)
  } catch (error) {
    console.error('Error handling payment success:', error)
  }
}

/**
 * Handle failed payment - log for debugging
 */
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment failed:', {
    id: paymentIntent.id,
    customer_email: paymentIntent.metadata.customer_email,
    amount: formatStripeAmount(paymentIntent.amount, paymentIntent.currency),
    error: paymentIntent.last_payment_error?.message,
  })
}

/**
 * Send booking confirmation email to customer
 */
async function sendConfirmationEmail(
  booking: any,
  company: any,
  totalAmount: number
) {
  const programName = booking.program?.nickname || booking.program?.name || 'Tour'
  const companySettings = company.settings || {}
  const emailSettings = companySettings.email || {}
  const brandingSettings = companySettings.branding || {}

  const fromName = emailSettings.from_name || company.name
  const replyTo = emailSettings.reply_to || 'noreply@tconnext.com'
  const primaryColor = brandingSettings.primary_color || '#3B82F6'

  // Format date
  const activityDate = new Date(booking.activity_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Build guest count string
  const guestParts = []
  if (booking.adults > 0) guestParts.push(`${booking.adults} Adult${booking.adults > 1 ? 's' : ''}`)
  if (booking.children > 0) guestParts.push(`${booking.children} Child${booking.children > 1 ? 'ren' : ''}`)
  if (booking.infants > 0) guestParts.push(`${booking.infants} Infant${booking.infants > 1 ? 's' : ''}`)
  const guestCount = guestParts.join(', ')

  // Pickup info
  let pickupInfo = 'To be confirmed'
  if (booking.is_come_direct) {
    pickupInfo = 'Come Direct - Location details will be sent separately'
  } else if (booking.custom_pickup_location) {
    pickupInfo = booking.custom_pickup_location
    if (booking.room_number) pickupInfo += ` (Room: ${booking.room_number})`
  }

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: ${primaryColor}; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Booking Confirmed!</h1>
      </div>
      
      <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="margin-top: 0;">Dear ${booking.customer_name},</p>
        
        <p>Thank you for your booking with <strong>${company.name}</strong>. Your payment has been received and your booking is confirmed.</p>
        
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h2 style="margin-top: 0; color: ${primaryColor}; font-size: 18px;">Booking Details</h2>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Booking Reference</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; text-align: right; font-weight: 600;">${booking.booking_number}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Program</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">${programName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Date</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">${activityDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Guests</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">${guestCount}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Pickup</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">${pickupInfo}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Total Paid</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 600; color: ${primaryColor};">฿${totalAmount.toLocaleString()}</td>
            </tr>
          </table>
        </div>
        
        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            <strong>Important:</strong> Your pickup time will be confirmed separately via email or WhatsApp. Please keep your phone accessible.
          </p>
        </div>
        
        ${booking.notes ? `
        <div style="margin: 20px 0;">
          <p style="color: #6b7280; margin-bottom: 5px; font-size: 14px;">Your Notes:</p>
          <p style="margin: 0; font-style: italic;">${booking.notes}</p>
        </div>
        ` : ''}
        
        <p style="margin-bottom: 0;">If you have any questions, please don't hesitate to contact us.</p>
        
        <p style="color: #6b7280;">
          Best regards,<br>
          <strong>${company.name}</strong>
        </p>
      </div>
      
      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p style="margin: 0;">${emailSettings.footer_text || `© ${new Date().getFullYear()} ${company.name}. All rights reserved.`}</p>
      </div>
    </body>
    </html>
  `

  try {
    const resend = getResend()
    await resend.emails.send({
      from: `${fromName} <bookings@tconnext.com>`,
      replyTo: replyTo,
      to: booking.customer_email,
      subject: `Booking Confirmed - ${programName} on ${activityDate}`,
      html: emailHtml,
    })
    console.log('Confirmation email sent to:', booking.customer_email)
  } catch (error) {
    console.error('Failed to send confirmation email:', error)
  }
}
