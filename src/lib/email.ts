import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null

interface EmailAttachment {
  filename: string
  content: Buffer | string
  contentType?: string
}

interface EmailOptions {
  to: string
  subject: string
  html: string
  from?: string
  attachments?: EmailAttachment[]
}

export async function sendEmail({ to, subject, html, from, attachments }: EmailOptions) {
  if (!resend) {
    console.log('Email would be sent:', { to, subject, attachments: attachments?.map(a => a.filename) })
    return { success: true, mock: true }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: from || 'TConnext <noreply@tconnext.app>',
      to,
      subject,
      html,
      attachments: attachments?.map(a => ({
        filename: a.filename,
        content: a.content,
      })),
    })

    if (error) {
      throw error
    }

    return { success: true, data }
  } catch (error) {
    console.error('Email error:', error)
    throw error
  }
}

// ============================================================================
// SHARED EMAIL WRAPPER - White background for dark mode email apps
// ============================================================================
function getEmailWrapper(content: string, companyName: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="light">
      <meta name="supported-color-schemes" content="light">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f5;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); overflow: hidden;">
              ${content}
            </table>
            <table width="600" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding: 24px 20px; text-align: center;">
                  <p style="margin: 0; font-size: 13px; color: #9ca3af;">&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
}

// ============================================================================
// SHARED HEADER - Logo or Company Name with white background
// Note: Logo is wrapped in a white container with padding to ensure visibility in dark mode email clients
// ============================================================================
function getEmailHeader(companyName: string, companyLogoUrl?: string | null) {
  if (companyLogoUrl) {
    return `
      <tr>
        <td style="background-color: #1f2937; padding: 24px 40px; text-align: center;">
          <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto;">
            <tr>
              <td style="background-color: #ffffff; padding: 16px 24px; border-radius: 8px;">
                <img src="${companyLogoUrl}" alt="${companyName}" style="max-width: 200px; max-height: 60px; width: auto; height: auto; display: block;" />
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `
  }
  return `
    <tr>
      <td style="background-color: #ffffff; padding: 32px 40px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #1f2937;">${companyName}</h1>
      </td>
    </tr>
  `
}

// ============================================================================
// BOOKING CONFIRMATION EMAIL - GREEN THEME
// ============================================================================
export function getBookingConfirmationEmail(data: {
  customerName: string
  bookingNumber: string
  programName: string
  bookingDate: string
  adults: number
  children: number
  infants: number
  companyName: string
  companyEmail?: string
  companyLogoUrl?: string | null
  totalAmount?: number
  currency?: string
  isComeDirect?: boolean
  pickupLocation?: string | null
}) {
  const themeColor = '#10b981' // Green

  const paymentSection = data.totalAmount ? `
    <tr>
      <td style="padding: 0 40px 24px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ecfdf5; border-radius: 12px; border-left: 5px solid ${themeColor};">
          <tr>
            <td style="padding: 20px 24px;">
              <p style="margin: 0; font-size: 18px; font-weight: 700; color: #065f46;">✓ Payment Received: ${data.currency || 'THB'} ${data.totalAmount.toLocaleString()}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  ` : ''

  const pickupInfo = data.isComeDirect 
    ? `<p style="margin: 0; font-size: 16px; line-height: 1.6; color: #374151;"><strong>Meeting Point:</strong> You have selected to come directly to the meeting point. We will send you the meeting point details and time separately.</p>`
    : data.pickupLocation 
      ? `<p style="margin: 0; font-size: 16px; line-height: 1.6; color: #374151;"><strong>Pickup Location:</strong> ${data.pickupLocation}<br/>Your pickup time will be confirmed separately.</p>`
      : `<p style="margin: 0; font-size: 16px; line-height: 1.6; color: #374151;"><strong>Important:</strong> Your pickup time will be confirmed separately. Please keep your phone available for contact.</p>`

  const guestsText = `${data.adults} Adult${data.adults > 1 ? 's' : ''}${data.children > 0 ? `, ${data.children} Child${data.children > 1 ? 'ren' : ''}` : ''}${data.infants > 0 ? `, ${data.infants} Infant${data.infants > 1 ? 's' : ''}` : ''}`

  const content = `
    ${getEmailHeader(data.companyName, data.companyLogoUrl)}
    
    <!-- Badge -->
    <tr>
      <td style="background-color: ${themeColor}; padding: 16px 40px; text-align: center;">
        <span style="color: #ffffff; font-size: 16px; font-weight: 700; letter-spacing: 1px;">✓ BOOKING CONFIRMED</span>
      </td>
    </tr>
    
    <!-- Content -->
    <tr>
      <td style="padding: 32px 40px 24px 40px;">
        <p style="margin: 0 0 16px 0; font-size: 17px; color: #1f2937;">Dear <strong>${data.customerName}</strong>,</p>
        <p style="margin: 0; font-size: 16px; line-height: 1.7; color: #4b5563;">Thank you for your booking! Your payment has been received and your booking is confirmed.</p>
      </td>
    </tr>
    
    ${paymentSection}
    
    <!-- Booking Number -->
    <tr>
      <td style="padding: 0 40px 24px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border-radius: 12px;">
          <tr>
            <td style="padding: 24px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 2px;">Booking Reference</p>
              <p style="margin: 0; font-size: 28px; font-weight: 700; color: ${themeColor};">${data.bookingNumber}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    
    <!-- Details -->
    <tr>
      <td style="padding: 0 40px 24px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border-radius: 12px;">
          <tr>
            <td style="padding: 20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-size: 15px; color: #64748b;">Tour</span>
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                    <strong style="font-size: 15px; color: #1f2937;">${data.programName}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-size: 15px; color: #64748b;">Date</span>
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                    <strong style="font-size: 15px; color: #1f2937;">${data.bookingDate}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0;">
                    <span style="font-size: 15px; color: #64748b;">Guests</span>
                  </td>
                  <td style="padding: 10px 0; text-align: right;">
                    <strong style="font-size: 15px; color: #1f2937;">${guestsText}</strong>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    
    <!-- Pickup Info -->
    <tr>
      <td style="padding: 0 40px 28px 40px;">
        ${pickupInfo}
      </td>
    </tr>
    
    <!-- See You -->
    <tr>
      <td style="padding: 0 40px 28px 40px; text-align: center;">
        <p style="margin: 0; font-size: 18px; font-weight: 600; color: ${themeColor};">We look forward to seeing you!</p>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 20px 40px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; font-size: 14px; color: #6b7280; text-align: center;">If you have any questions, please contact us at <strong>${data.companyEmail || 'our office'}</strong>.</p>
      </td>
    </tr>
  `

  return getEmailWrapper(content, data.companyName)
}

// ============================================================================
// PICKUP TIME EMAIL - BLUE THEME
// ============================================================================
export function getPickupTimeEmail(data: {
  customerName: string
  bookingNumber: string
  programName: string
  bookingDate: string
  pickupTime: string
  hotelName: string
  adults: number
  children: number
  infants: number
  pickupContactInfo?: string
  companyName: string
  companyEmail?: string
  companyLogoUrl?: string | null
}) {
  const themeColor = '#0EA5E9' // Blue

  let guestInfo = `<p style="margin: 6px 0; font-size: 15px; color: #374151;"><strong>Adult Guests:</strong> ${data.adults}</p>`
  if (data.children > 0) {
    guestInfo += `<p style="margin: 6px 0; font-size: 15px; color: #374151;"><strong>Child Guests:</strong> ${data.children}</p>`
  }
  if (data.infants > 0) {
    guestInfo += `<p style="margin: 6px 0; font-size: 15px; color: #374151;"><strong>Infant Guests:</strong> ${data.infants}</p>`
  }

  const content = `
    ${getEmailHeader(data.companyName, data.companyLogoUrl)}
    
    <!-- Badge -->
    <tr>
      <td style="background-color: ${themeColor}; padding: 16px 40px; text-align: center;">
        <span style="color: #ffffff; font-size: 16px; font-weight: 700; letter-spacing: 1px;">🚐 PICKUP CONFIRMED</span>
      </td>
    </tr>
    
    <!-- Content -->
    <tr>
      <td style="padding: 32px 40px 24px 40px;">
        <p style="margin: 0 0 16px 0; font-size: 17px; color: #1f2937;">Dear <strong>${data.customerName}</strong>,</p>
        <p style="margin: 0; font-size: 16px; line-height: 1.7; color: #4b5563;">Thank you for your booking with us. Here are the details of your pickup:</p>
      </td>
    </tr>
    
    <!-- Booking Details -->
    <tr>
      <td style="padding: 0 40px 24px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border-radius: 12px;">
          <tr>
            <td style="padding: 20px 24px;">
              <p style="margin: 0 0 6px 0; font-size: 15px; color: #374151;"><strong>Tour Date:</strong> ${data.bookingDate}</p>
              <p style="margin: 0 0 6px 0; font-size: 15px; color: #374151;"><strong>Program:</strong> ${data.programName}</p>
              <p style="margin: 0 0 6px 0; font-size: 15px; color: #374151;"><strong>Name:</strong> ${data.customerName}</p>
              ${guestInfo}
            </td>
          </tr>
        </table>
      </td>
    </tr>
    
    <!-- Pickup Time -->
    <tr>
      <td style="padding: 0 40px 24px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0f9ff; border-radius: 12px;">
          <tr>
            <td style="padding: 24px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 2px;">Your Pickup Time</p>
              <p style="margin: 0; font-size: 32px; font-weight: 700; color: ${themeColor};">${data.pickupTime}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    
    <!-- Location -->
    <tr>
      <td style="padding: 0 40px 24px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fef3c7; border-radius: 12px; border-left: 5px solid #f59e0b;">
          <tr>
            <td style="padding: 20px 24px;">
              <p style="margin: 0; font-size: 16px; font-weight: 600; color: #92400e;">📍 ${data.hotelName} - LOBBY / ENTRANCE</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    
    <!-- Remark -->
    <tr>
      <td style="padding: 0 40px 28px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; border-radius: 12px;">
          <tr>
            <td style="padding: 20px 24px;">
              <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600; color: #1f2937;">Important:</p>
              <p style="margin: 0 0 10px 0; font-size: 15px; line-height: 1.6; color: #4b5563;">For a fast meet up with our driver, please wait in your lobby or in front of your hotel entrance. If you did not meet our driver, please contact us:</p>
              ${data.pickupContactInfo ? `<p style="margin: 0; font-size: 15px; font-weight: 600; color: #1f2937;">📞 ${data.pickupContactInfo}</p>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
    
    <!-- See You -->
    <tr>
      <td style="padding: 0 40px 28px 40px; text-align: center;">
        <p style="margin: 0; font-size: 18px; font-weight: 600; color: ${themeColor};">See you soon! 👋</p>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 20px 40px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; font-size: 14px; color: #6b7280; text-align: center;">Questions? Contact us at <strong>${data.companyEmail || 'our office'}</strong>.</p>
      </td>
    </tr>
  `

  return getEmailWrapper(content, data.companyName)
}

// ============================================================================
// COME DIRECT (MEETING POINT) EMAIL - TEAL THEME
// ============================================================================
export function getComeDirectEmail(data: {
  customerName: string
  bookingNumber: string
  programName: string
  bookingDate: string
  meetingTime: string
  meetingPointName: string
  meetingPointAddress?: string
  meetingPointGoogleMaps?: string
  adults: number
  children: number
  infants: number
  contactInfo?: string
  companyName: string
  companyEmail?: string
  companyLogoUrl?: string | null
}) {
  const themeColor = '#14b8a6' // Teal

  let guestInfo = `<p style="margin: 6px 0; font-size: 15px; color: #374151;"><strong>Adult Guests:</strong> ${data.adults}</p>`
  if (data.children > 0) {
    guestInfo += `<p style="margin: 6px 0; font-size: 15px; color: #374151;"><strong>Child Guests:</strong> ${data.children}</p>`
  }
  if (data.infants > 0) {
    guestInfo += `<p style="margin: 6px 0; font-size: 15px; color: #374151;"><strong>Infant Guests:</strong> ${data.infants}</p>`
  }

  const mapsLink = data.meetingPointGoogleMaps 
    ? `<p style="margin: 10px 0 0 0;"><a href="${data.meetingPointGoogleMaps}" style="color: #0EA5E9; font-size: 15px; font-weight: 600; text-decoration: none;">📍 View on Google Maps →</a></p>`
    : ''

  const content = `
    ${getEmailHeader(data.companyName, data.companyLogoUrl)}
    
    <!-- Badge -->
    <tr>
      <td style="background-color: ${themeColor}; padding: 16px 40px; text-align: center;">
        <span style="color: #ffffff; font-size: 16px; font-weight: 700; letter-spacing: 1px;">📍 MEETING POINT CONFIRMED</span>
      </td>
    </tr>
    
    <!-- Content -->
    <tr>
      <td style="padding: 32px 40px 24px 40px;">
        <p style="margin: 0 0 16px 0; font-size: 17px; color: #1f2937;">Dear <strong>${data.customerName}</strong>,</p>
        <p style="margin: 0; font-size: 16px; line-height: 1.7; color: #4b5563;">Thank you for your booking with us. Here are the details of your meeting point:</p>
      </td>
    </tr>
    
    <!-- Booking Details -->
    <tr>
      <td style="padding: 0 40px 24px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border-radius: 12px;">
          <tr>
            <td style="padding: 20px 24px;">
              <p style="margin: 0 0 6px 0; font-size: 15px; color: #374151;"><strong>Tour Date:</strong> ${data.bookingDate}</p>
              <p style="margin: 0 0 6px 0; font-size: 15px; color: #374151;"><strong>Program:</strong> ${data.programName}</p>
              <p style="margin: 0 0 6px 0; font-size: 15px; color: #374151;"><strong>Name:</strong> ${data.customerName}</p>
              ${guestInfo}
            </td>
          </tr>
        </table>
      </td>
    </tr>
    
    <!-- Arrival Time -->
    <tr>
      <td style="padding: 0 40px 24px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0fdfa; border-radius: 12px;">
          <tr>
            <td style="padding: 24px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 2px;">Please Arrive By</p>
              <p style="margin: 0; font-size: 32px; font-weight: 700; color: ${themeColor};">${data.meetingTime}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    
    <!-- Meeting Point -->
    <tr>
      <td style="padding: 0 40px 24px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #dbeafe; border-radius: 12px; border-left: 5px solid #3b82f6;">
          <tr>
            <td style="padding: 20px 24px;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #1e40af; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Meeting Point</p>
              <p style="margin: 0; font-size: 18px; font-weight: 700; color: #1e3a8a;">${data.meetingPointName}</p>
              ${data.meetingPointAddress ? `<p style="margin: 10px 0 0 0; font-size: 15px; color: #475569;">${data.meetingPointAddress}</p>` : ''}
              ${mapsLink}
            </td>
          </tr>
        </table>
      </td>
    </tr>
    
    <!-- Remark -->
    <tr>
      <td style="padding: 0 40px 28px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; border-radius: 12px;">
          <tr>
            <td style="padding: 20px 24px;">
              <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600; color: #1f2937;">Important:</p>
              <p style="margin: 0 0 10px 0; font-size: 15px; line-height: 1.6; color: #4b5563;">Please arrive at the meeting point on time. If you have any questions or need assistance, please contact us:</p>
              ${data.contactInfo ? `<p style="margin: 0; font-size: 15px; font-weight: 600; color: #1f2937;">📞 ${data.contactInfo}</p>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
    
    <!-- See You -->
    <tr>
      <td style="padding: 0 40px 28px 40px; text-align: center;">
        <p style="margin: 0; font-size: 18px; font-weight: 600; color: ${themeColor};">See you soon! 👋</p>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 20px 40px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; font-size: 14px; color: #6b7280; text-align: center;">Questions? Contact us at <strong>${data.companyEmail || 'our office'}</strong>.</p>
      </td>
    </tr>
  `

  return getEmailWrapper(content, data.companyName)
}

// ============================================================================
// INVOICE EMAIL - GOLD/AMBER THEME
// ============================================================================
export function getInvoiceEmail(data: {
  agentName: string
  invoiceNumber: string
  dateFrom: string
  dateTo: string
  totalAmount: number
  companyName: string
  bookingCount?: number
  dueDate?: string
  companyLogoUrl?: string | null
}) {
  const themeColor = '#d97706' // Amber/Gold

  const content = `
    ${getEmailHeader(data.companyName, data.companyLogoUrl)}
    
    <!-- Badge -->
    <tr>
      <td style="background-color: ${themeColor}; padding: 16px 40px; text-align: center;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="color: #ffffff; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">📄 INVOICE</td>
            <td style="color: #ffffff; font-size: 20px; font-weight: 700; text-align: right;">${data.invoiceNumber}</td>
          </tr>
        </table>
      </td>
    </tr>
    
    <!-- Content -->
    <tr>
      <td style="padding: 32px 40px 24px 40px;">
        <p style="margin: 0 0 16px 0; font-size: 17px; color: #1f2937;">Dear <strong>${data.agentName}</strong>,</p>
        <p style="margin: 0; font-size: 16px; line-height: 1.7; color: #4b5563;">Please find attached your invoice for services rendered during the period <strong>${data.dateFrom}</strong> to <strong>${data.dateTo}</strong>.</p>
      </td>
    </tr>
    
    <!-- Invoice Details -->
    <tr>
      <td style="padding: 0 40px 24px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fffbeb; border-radius: 12px; border: 1px solid #fde68a;">
          <tr>
            <td style="padding: 20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-bottom: 14px; border-bottom: 1px solid #fde68a;">
                    <span style="color: #64748b; font-size: 13px;">Invoice Number</span><br/>
                    <span style="color: #92400e; font-size: 17px; font-weight: 600;">${data.invoiceNumber}</span>
                  </td>
                  <td style="padding-bottom: 14px; border-bottom: 1px solid #fde68a; text-align: right;">
                    <span style="color: #64748b; font-size: 13px;">Period</span><br/>
                    <span style="color: #92400e; font-size: 17px; font-weight: 600;">${data.dateFrom} - ${data.dateTo}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 14px;">
                    <span style="color: #64748b; font-size: 13px;">Number of Bookings</span><br/>
                    <span style="color: #92400e; font-size: 17px; font-weight: 600;">${data.bookingCount || 0} booking(s)</span>
                  </td>
                  ${data.dueDate ? `
                  <td style="padding-top: 14px; text-align: right;">
                    <span style="color: #64748b; font-size: 13px;">Due Date</span><br/>
                    <span style="color: #dc2626; font-size: 17px; font-weight: 600;">${data.dueDate}</span>
                  </td>
                  ` : ''}
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    
    <!-- Total Amount -->
    <tr>
      <td style="padding: 0 40px 24px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${themeColor}; border-radius: 12px;">
          <tr>
            <td style="padding: 24px; text-align: center;">
              <span style="color: rgba(255,255,255,0.85); font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Total Amount Due</span>
              <div style="color: #ffffff; font-size: 36px; font-weight: 700; margin-top: 6px;">฿${data.totalAmount.toLocaleString()}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    
    <!-- Attachment Note -->
    <tr>
      <td style="padding: 0 40px 24px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fef3c7; border-radius: 12px; border-left: 5px solid #f59e0b;">
          <tr>
            <td style="padding: 16px 20px;">
              <span style="font-size: 18px; margin-right: 10px;">📎</span>
              <span style="color: #92400e; font-size: 15px;">The detailed invoice PDF is attached to this email.</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    
    <!-- Message -->
    <tr>
      <td style="padding: 0 40px 28px 40px;">
        <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #4b5563;">Please process the payment at your earliest convenience. If you have any questions regarding this invoice, please don't hesitate to contact us.</p>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 20px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="margin: 0; font-size: 15px; color: #6b7280;">Thank you for your business! 🙏</p>
      </td>
    </tr>
  `

  return getEmailWrapper(content, data.companyName)
}

// ============================================================================
// RECEIPT EMAIL - EMERALD GREEN THEME
// ============================================================================
export function getReceiptEmail(data: {
  agentName: string
  invoiceNumber: string
  receiptNumber: string
  dateFrom: string
  dateTo: string
  totalAmount: number
  paidAt: string
  companyName: string
  bookingCount?: number
  paymentMethod?: string
  companyLogoUrl?: string | null
}) {
  const themeColor = '#059669' // Emerald

  const content = `
    ${getEmailHeader(data.companyName, data.companyLogoUrl)}
    
    <!-- Badge -->
    <tr>
      <td style="background-color: ${themeColor}; padding: 16px 40px; text-align: center;">
        <span style="color: #ffffff; font-size: 16px; font-weight: 700; letter-spacing: 2px;">✓ PAID IN FULL</span>
      </td>
    </tr>
    
    <!-- Content -->
    <tr>
      <td style="padding: 32px 40px 24px 40px;">
        <p style="margin: 0 0 16px 0; font-size: 17px; color: #1f2937;">Dear <strong>${data.agentName}</strong>,</p>
        <p style="margin: 0; font-size: 16px; line-height: 1.7; color: #4b5563;">Thank you for your payment. This receipt confirms that your invoice has been paid in full.</p>
      </td>
    </tr>
    
    <!-- Receipt Details -->
    <tr>
      <td style="padding: 0 40px 24px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ecfdf5; border-radius: 12px; border: 1px solid #a7f3d0;">
          <tr>
            <td style="padding: 20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td colspan="2" style="padding-bottom: 14px; border-bottom: 1px solid #a7f3d0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td>
                          <span style="color: #64748b; font-size: 12px; text-transform: uppercase;">Receipt #</span><br/>
                          <span style="color: #065f46; font-size: 18px; font-weight: 700;">${data.receiptNumber}</span>
                        </td>
                        <td style="text-align: right;">
                          <span style="color: #64748b; font-size: 12px; text-transform: uppercase;">Invoice #</span><br/>
                          <span style="color: #065f46; font-size: 16px; font-weight: 600;">${data.invoiceNumber}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 14px; width: 50%;">
                    <span style="color: #64748b; font-size: 13px;">Period</span><br/>
                    <span style="color: #065f46; font-size: 15px; font-weight: 500;">${data.dateFrom} - ${data.dateTo}</span>
                  </td>
                  <td style="padding-top: 14px; text-align: right;">
                    <span style="color: #64748b; font-size: 13px;">Bookings</span><br/>
                    <span style="color: #065f46; font-size: 15px; font-weight: 500;">${data.bookingCount || 0} booking(s)</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 14px;">
                    <span style="color: #64748b; font-size: 13px;">Payment Date</span><br/>
                    <span style="color: #065f46; font-size: 15px; font-weight: 500;">${data.paidAt}</span>
                  </td>
                  ${data.paymentMethod ? `
                  <td style="padding-top: 14px; text-align: right;">
                    <span style="color: #64748b; font-size: 13px;">Payment Method</span><br/>
                    <span style="color: #065f46; font-size: 15px; font-weight: 500;">${data.paymentMethod}</span>
                  </td>
                  ` : ''}
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    
    <!-- Amount Paid -->
    <tr>
      <td style="padding: 0 40px 24px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${themeColor}; border-radius: 12px;">
          <tr>
            <td style="padding: 24px; text-align: center;">
              <span style="color: rgba(255,255,255,0.85); font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Amount Paid</span>
              <div style="color: #ffffff; font-size: 36px; font-weight: 700; margin-top: 6px;">฿${data.totalAmount.toLocaleString()}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    
    <!-- Attachment Note -->
    <tr>
      <td style="padding: 0 40px 28px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0fdf4; border-radius: 12px; border-left: 5px solid ${themeColor};">
          <tr>
            <td style="padding: 16px 20px;">
              <span style="font-size: 18px; margin-right: 10px;">📎</span>
              <span style="color: #065f46; font-size: 15px;">The detailed receipt PDF is attached to this email for your records.</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 20px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${themeColor};">Thank you for your business! 🙏</p>
      </td>
    </tr>
  `

  return getEmailWrapper(content, data.companyName)
}

// ============================================================================
// OPERATION REPORT EMAIL - SKY BLUE THEME
// ============================================================================
export function getOperationReportEmail(data: {
  reportDate: string
  reportType: 'full-report' | 'by-program' | 'by-driver' | 'by-boat'
  format: 'pdf' | 'csv'
  bookingCount: number
  totalGuests: number
  companyName: string
  companyLogoUrl?: string | null
}) {
  const themeColor = '#0284c7' // Sky Blue
  const reportTypeLabels = {
    'full-report': 'Full Operation Report',
    'by-program': 'Report by Program',
    'by-driver': 'Report by Driver',
    'by-boat': 'Report by Boat'
  }
  
  const content = `
    ${getEmailHeader(data.companyName, data.companyLogoUrl)}
    
    <!-- Badge -->
    <tr>
      <td style="background-color: ${themeColor}; padding: 16px 40px; text-align: center;">
        <span style="color: #ffffff; font-size: 16px; font-weight: 700; letter-spacing: 1px;">📊 OPERATION REPORT</span>
      </td>
    </tr>
    
    <!-- Date Banner -->
    <tr>
      <td style="padding: 32px 40px 24px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0f9ff; border-radius: 12px;">
          <tr>
            <td style="padding: 24px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 2px;">Tour Date</p>
              <p style="margin: 0; font-size: 28px; font-weight: 700; color: ${themeColor};">${data.reportDate}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    
    <!-- Report Type -->
    <tr>
      <td style="padding: 0 40px 24px 40px; text-align: center;">
        <span style="display: inline-block; background-color: #e0f2fe; color: #0369a1; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">${reportTypeLabels[data.reportType]}</span>
      </td>
    </tr>
    
    <!-- Stats -->
    <tr>
      <td style="padding: 0 40px 24px 40px;">
        <table width="100%" cellpadding="0" cellspacing="10" border="0">
          <tr>
            <td width="50%" style="text-align: center; padding: 20px; background-color: #f8fafc; border-radius: 12px;">
              <span style="font-size: 32px; font-weight: 700; color: ${themeColor}; display: block;">${data.bookingCount}</span>
              <span style="font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Bookings</span>
            </td>
            <td width="50%" style="text-align: center; padding: 20px; background-color: #f8fafc; border-radius: 12px;">
              <span style="font-size: 32px; font-weight: 700; color: ${themeColor}; display: block;">${data.totalGuests}</span>
              <span style="font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Total Guests</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    
    <!-- Attachment Note -->
    <tr>
      <td style="padding: 0 40px 28px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fef3c7; border-radius: 12px; border-left: 5px solid #f59e0b;">
          <tr>
            <td style="padding: 16px 20px;">
              <span style="font-size: 18px; margin-right: 10px;">📎</span>
              <span style="color: #92400e; font-size: 15px;">The <strong>${data.format.toUpperCase()}</strong> report is attached to this email.</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 20px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="margin: 0; font-size: 14px; color: #6b7280;">Generated by ${data.companyName}</p>
      </td>
    </tr>
  `

  return getEmailWrapper(content, data.companyName)
}

// ============================================================================
// AUTO OPERATION REPORT EMAIL - INDIGO THEME
// ============================================================================
export function getAutoOpReportEmail(data: {
  reportDate: string
  bookingCount: number
  totalGuests: number
  totalAdults: number
  totalChildren: number
  totalInfants: number
  uniqueDrivers: number
  uniqueBoats: number
  companyName: string
  companyLogoUrl?: string | null
}) {
  const themeColor = '#6366f1' // Indigo
  
  const content = `
    ${getEmailHeader(data.companyName, data.companyLogoUrl)}
    
    <!-- Badge -->
    <tr>
      <td style="background-color: ${themeColor}; padding: 16px 40px; text-align: center;">
        <span style="color: #ffffff; font-size: 16px; font-weight: 700; letter-spacing: 1px;">📧 DAILY OPERATION REPORT</span>
      </td>
    </tr>
    
    <!-- Date Banner -->
    <tr>
      <td style="padding: 32px 40px 24px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #eef2ff; border-radius: 12px;">
          <tr>
            <td style="padding: 24px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 2px;">Tour Date</p>
              <p style="margin: 0; font-size: 28px; font-weight: 700; color: ${themeColor};">${data.reportDate}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    
    <!-- Auto Backup Badge -->
    <tr>
      <td style="padding: 0 40px 24px 40px; text-align: center;">
        <span style="display: inline-block; background-color: #fef3c7; color: #92400e; padding: 6px 14px; border-radius: 16px; font-size: 13px; font-weight: 600;">AUTO BACKUP REPORT</span>
      </td>
    </tr>
    
    <!-- Stats -->
    <tr>
      <td style="padding: 0 40px 16px 40px;">
        <table width="100%" cellpadding="0" cellspacing="8" border="0">
          <tr>
            <td width="50%" style="text-align: center; padding: 18px; background-color: #f8fafc; border-radius: 12px;">
              <span style="font-size: 28px; font-weight: 700; color: ${themeColor}; display: block;">${data.bookingCount}</span>
              <span style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Bookings</span>
            </td>
            <td width="50%" style="text-align: center; padding: 18px; background-color: #f8fafc; border-radius: 12px;">
              <span style="font-size: 28px; font-weight: 700; color: ${themeColor}; display: block;">${data.totalGuests}</span>
              <span style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Total Guests</span>
            </td>
          </tr>
          <tr>
            <td colspan="2" style="text-align: center; padding: 14px; background-color: #f8fafc; border-radius: 12px;">
              <span style="font-size: 15px; color: #4b5563;">${data.totalAdults} Adults • ${data.totalChildren} Children • ${data.totalInfants} Infants</span>
            </td>
          </tr>
          <tr>
            <td width="50%" style="text-align: center; padding: 14px; background-color: #f8fafc; border-radius: 12px;">
              <span style="font-size: 22px; font-weight: 700; color: #64748b; display: block;">${data.uniqueDrivers}</span>
              <span style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Drivers</span>
            </td>
            <td width="50%" style="text-align: center; padding: 14px; background-color: #f8fafc; border-radius: 12px;">
              <span style="font-size: 22px; font-weight: 700; color: #64748b; display: block;">${data.uniqueBoats}</span>
              <span style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Boats</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    
    <!-- Attachments List -->
    <tr>
      <td style="padding: 0 40px 24px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border-radius: 12px;">
          <tr>
            <td style="padding: 20px 24px;">
              <p style="margin: 0 0 14px 0; font-size: 14px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">📎 Attached Reports (8 files)</p>
              <table width="100%" cellpadding="0" cellspacing="4" border="0">
                <tr><td style="padding: 8px 12px; background-color: #ffffff; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 14px; color: #374151;">📄 Full Report (PDF)</td></tr>
                <tr><td style="padding: 8px 12px; background-color: #ffffff; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 14px; color: #374151;">📊 Full Report (CSV)</td></tr>
                <tr><td style="padding: 8px 12px; background-color: #ffffff; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 14px; color: #374151;">📄 By Program Report (PDF)</td></tr>
                <tr><td style="padding: 8px 12px; background-color: #ffffff; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 14px; color: #374151;">📊 By Program Report (CSV)</td></tr>
                <tr><td style="padding: 8px 12px; background-color: #ffffff; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 14px; color: #374151;">📄 By Driver Report (PDF)</td></tr>
                <tr><td style="padding: 8px 12px; background-color: #ffffff; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 14px; color: #374151;">📊 By Driver Report (CSV)</td></tr>
                <tr><td style="padding: 8px 12px; background-color: #ffffff; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 14px; color: #374151;">📄 By Boat Report (PDF)</td></tr>
                <tr><td style="padding: 8px 12px; background-color: #ffffff; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 14px; color: #374151;">📊 By Boat Report (CSV)</td></tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    
    <!-- Info Box -->
    <tr>
      <td style="padding: 0 40px 28px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0fdf4; border-radius: 12px; border: 1px solid #bbf7d0;">
          <tr>
            <td style="padding: 16px 20px;">
              <p style="margin: 0; font-size: 15px; color: #166534;">✅ This is an automated backup report. Use these files if you cannot access the website.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 20px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="margin: 0; font-size: 14px; color: #6b7280;">This email was sent automatically by ${data.companyName}.</p>
      </td>
    </tr>
  `

  return getEmailWrapper(content, data.companyName)
}
