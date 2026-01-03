import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, getPickupTimeEmail, getComeDirectEmail } from '@/lib/email'

// Format pickup time as HH:MM only
function formatPickupTime(time: string | null): string {
  if (!time) return ''
  const parts = time.split(':')
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`
  }
  return time
}

// Format time to 12-hour format with AM/PM
function formatTo12Hour(hours: number, minutes: number): string {
  const period = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
  return `${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`
}

// Get pickup time range (e.g., "09:00 AM - 09:15 AM")
function getPickupTimeRange(time: string): string {
  const formatted = formatPickupTime(time)
  const [hours, mins] = formatted.split(':').map(Number)
  const endMinutes = mins + 15
  const endHours = hours + Math.floor(endMinutes / 60)
  const endMins = endMinutes % 60
  return `${formatTo12Hour(hours, mins)} - ${formatTo12Hour(endHours, endMins)}`
}

// Format single time (e.g., "09:00 AM")
function formatSingleTime(time: string): string {
  const formatted = formatPickupTime(time)
  const [hours, mins] = formatted.split(':').map(Number)
  return formatTo12Hour(hours, mins)
}

// Format activity date as "Saturday, December 27, 2025"
function formatActivityDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Get the booking with related data
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        program:programs(name, come_direct_location, default_pickup_time),
        hotel:hotels(name, pickup_notes),
        company:companies(name, settings)
      `)
      .eq('id', params.id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    if (!booking.customer_email) {
      return NextResponse.json(
        { error: 'Customer email not available' },
        { status: 400 }
      )
    }

    const company = booking.company as any
    const program = booking.program as any
    const hotel = booking.hotel as any
    
    // Get contact info and logo from company settings
    const pickupContactInfo = company?.settings?.pickup?.contact_info || ''
    const companyLogoUrl = company?.settings?.logo_url || company?.settings?.branding?.logo_url || null
    console.log(`[Pickup Email] Company: ${company?.name}, Logo URL: ${companyLogoUrl || 'NOT FOUND'}`)

    let html: string
    let subject: string

    // Check if this is a Come Direct booking
    if (booking.is_come_direct) {
      // For Come Direct bookings - send meeting point info
      const comeDirectLocation = program?.come_direct_location || {}
      const meetingTime = program?.default_pickup_time 
        ? formatSingleTime(program.default_pickup_time) 
        : '08:00 AM'

      html = getComeDirectEmail({
        customerName: booking.customer_name,
        bookingNumber: booking.booking_number,
        programName: program?.name || 'Tour',
        bookingDate: formatActivityDate(booking.activity_date),
        meetingTime,
        meetingPointName: comeDirectLocation.name || 'Meeting Point',
        meetingPointAddress: comeDirectLocation.address || '',
        meetingPointGoogleMaps: comeDirectLocation.google_maps_link || '',
        adults: booking.adults || 0,
        children: booking.children || 0,
        infants: booking.infants || 0,
        contactInfo: pickupContactInfo,
        companyName: company?.name || 'TConnext',
        companyEmail: company?.settings?.email?.reply_to,
        companyLogoUrl,
      })
      subject = `Meeting Point Confirmed - ${booking.booking_number}`
    } else {
      // Regular pickup booking
      if (!booking.pickup_time) {
        return NextResponse.json(
          { error: 'Pickup time not set' },
          { status: 400 }
        )
      }

      html = getPickupTimeEmail({
        customerName: booking.customer_name,
        bookingNumber: booking.booking_number,
        programName: program?.name || 'Tour',
        bookingDate: formatActivityDate(booking.activity_date),
        pickupTime: getPickupTimeRange(booking.pickup_time),
        hotelName: hotel?.name || booking.custom_pickup_location || 'Your hotel',
        adults: booking.adults || 0,
        children: booking.children || 0,
        infants: booking.infants || 0,
        pickupContactInfo,
        companyName: company?.name || 'TConnext',
        companyEmail: company?.settings?.email?.reply_to,
        companyLogoUrl,
      })
      subject = `Pickup Time Confirmed - ${booking.booking_number}`
    }

    await sendEmail({
      to: booking.customer_email,
      subject,
      html,
      from: company?.settings?.email?.from_name 
        ? `${company.settings.email.from_name} <noreply@tconnext.app>`
        : undefined,
    })

    // Mark as sent
    await supabase
      .from('bookings')
      .update({ pickup_email_sent: true })
      .eq('id', params.id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Send pickup email error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    )
  }
}







