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

// Email templates
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
}) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #0EA5E9; }
        .content { padding: 30px 0; }
        .booking-details { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
        .detail-row:last-child { border-bottom: none; }
        .footer { text-align: center; padding: 20px 0; color: #64748b; font-size: 14px; }
        .booking-number { font-size: 24px; font-weight: bold; color: #0EA5E9; text-align: center; padding: 20px; background: #f0f9ff; border-radius: 8px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; color: #0EA5E9;">${data.companyName}</h1>
        </div>
        
        <div class="content">
          <h2>Booking Confirmation</h2>
          <p>Dear ${data.customerName},</p>
          <p>Thank you for your booking! Here are your booking details:</p>
          
          <div class="booking-number">
            Booking Reference: ${data.bookingNumber}
          </div>
          
          <div class="booking-details">
            <div class="detail-row">
              <span>Tour:</span>
              <strong>${data.programName}</strong>
            </div>
            <div class="detail-row">
              <span>Date:</span>
              <strong>${data.bookingDate}</strong>
            </div>
            <div class="detail-row">
              <span>Guests:</span>
              <strong>${data.adults} Adults${data.children > 0 ? `, ${data.children} Children` : ''}${data.infants > 0 ? `, ${data.infants} Infants` : ''}</strong>
            </div>
          </div>
          
          <p><strong>Important:</strong> Your pickup time will be confirmed separately. Please keep your phone available for contact.</p>
        </div>
        
        <div class="footer">
          <p>If you have any questions, please contact us at ${data.companyEmail || 'our office'}.</p>
          <p>&copy; ${new Date().getFullYear()} ${data.companyName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

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
}) {
  // Build guest info
  let guestInfo = `<p><strong>Adult Guest:</strong> ${data.adults}</p>`
  if (data.children > 0) {
    guestInfo += `<p><strong>Child Guest:</strong> ${data.children}</p>`
  }
  if (data.infants > 0) {
    guestInfo += `<p><strong>Infant Guest:</strong> ${data.infants}</p>`
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #0EA5E9; }
        .content { padding: 30px 0; }
        .pickup-time { font-size: 28px; font-weight: bold; color: #0EA5E9; text-align: center; padding: 20px; background: #f0f9ff; border-radius: 8px; margin: 20px 0; }
        .booking-details { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .booking-details p { margin: 8px 0; }
        .location-box { background: #fef3c7; padding: 15px 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
        .remark-box { background: #f1f5f9; padding: 15px 20px; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px 0; color: #64748b; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; color: #0EA5E9;">${data.companyName}</h1>
        </div>
        
        <div class="content">
          <p>Dear ${data.customerName},</p>
          <p>Thank you for your booking with us, here is the details of your booking:</p>
          
          <div class="booking-details">
            <p><strong>Tour Date:</strong> ${data.bookingDate}</p>
            <p><strong>Program:</strong> ${data.programName}</p>
            <p><strong>Name:</strong> ${data.customerName}</p>
            ${guestInfo}
          </div>
          
          <div class="pickup-time">
            Your Pick up time: ${data.pickupTime}
          </div>
          
          <div class="location-box">
            <p style="margin: 0;"><strong>at ${data.hotelName} - LOBBY / ENTRANCE</strong></p>
          </div>
          
          <div class="remark-box">
            <p><strong>Remark:</strong></p>
            <p>For fast meet up with our driver. Please wait in your lobby / in front of your hotel entrance. If you did not meet our driver please try to contact us on:</p>
            ${data.pickupContactInfo ? `<p><strong>Pick Up Operator:</strong> ${data.pickupContactInfo}</p>` : ''}
          </div>
          
          <p style="text-align: center; font-size: 18px; color: #0EA5E9;"><strong>See you soon!</strong></p>
        </div>
        
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${data.companyName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

export function getInvoiceEmail(data: {
  agentName: string
  invoiceNumber: string
  dateFrom: string
  dateTo: string
  totalAmount: number
  companyName: string
  bookingCount?: number
  dueDate?: string
}) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              <!-- Header -->
              <tr>
                <td style="background-color: #ffffff; padding: 40px 40px 25px 40px; text-align: center; border-bottom: 3px solid #B8860B;">
                  <h1 style="margin: 0; color: #B8860B; font-size: 28px; font-weight: 700;">${data.companyName}</h1>
                </td>
              </tr>
              
              <!-- Invoice Badge - Gold theme -->
              <tr>
                <td style="padding: 0; text-align: center;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="background-color: #B8860B; padding: 15px 40px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="color: #ffffff; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">INVOICE</td>
                            <td style="color: #ffffff; font-size: 20px; font-weight: 700; text-align: right;">${data.invoiceNumber}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <p style="margin: 0 0 20px 0; font-size: 16px; color: #334155;">Dear <strong>${data.agentName}</strong>,</p>
                  <p style="margin: 0 0 30px 0; font-size: 16px; color: #64748b; line-height: 1.6;">
                    Please find attached your invoice for services rendered during the period <strong>${data.dateFrom}</strong> to <strong>${data.dateTo}</strong>.
                  </p>
                  
                  <!-- Invoice Summary Card -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; border: 1px solid #bae6fd; margin-bottom: 30px;">
                    <tr>
                      <td style="padding: 25px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding-bottom: 12px; border-bottom: 1px solid #bae6fd;">
                              <span style="color: #64748b; font-size: 13px;">Invoice Number</span><br/>
                              <span style="color: #0c4a6e; font-size: 16px; font-weight: 600;">${data.invoiceNumber}</span>
                            </td>
                            <td style="padding-bottom: 12px; border-bottom: 1px solid #bae6fd; text-align: right;">
                              <span style="color: #64748b; font-size: 13px;">Period</span><br/>
                              <span style="color: #0c4a6e; font-size: 16px; font-weight: 600;">${data.dateFrom} - ${data.dateTo}</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding-top: 15px;">
                              <span style="color: #64748b; font-size: 13px;">Number of Bookings</span><br/>
                              <span style="color: #0c4a6e; font-size: 16px; font-weight: 600;">${data.bookingCount || 0} booking(s)</span>
                            </td>
                            ${data.dueDate ? `
                            <td style="padding-top: 15px; text-align: right;">
                              <span style="color: #64748b; font-size: 13px;">Due Date</span><br/>
                              <span style="color: #dc2626; font-size: 16px; font-weight: 600;">${data.dueDate}</span>
                            </td>
                            ` : ''}
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Total Amount Box - Gold theme -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #B8860B; border-radius: 12px; margin-bottom: 30px;">
                    <tr>
                      <td style="padding: 25px; text-align: center;">
                        <span style="color: rgba(255,255,255,0.8); font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Total Amount Due</span>
                        <div style="color: #ffffff; font-size: 36px; font-weight: 700; margin-top: 8px;">฿${data.totalAmount.toLocaleString()}</div>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Attachment Note -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                    <tr>
                      <td style="padding: 15px 20px;">
                        <span style="font-size: 18px; margin-right: 10px;">📎</span>
                        <span style="color: #92400e; font-size: 14px;">The detailed invoice PDF is attached to this email.</span>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 30px 0 0 0; font-size: 15px; color: #64748b; line-height: 1.6;">
                    Please process the payment at your earliest convenience. If you have any questions regarding this invoice, please don't hesitate to contact us.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; padding: 25px 40px; border-top: 1px solid #e2e8f0;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="text-align: center;">
                        <p style="margin: 0 0 5px 0; color: #64748b; font-size: 13px;">Thank you for your business!</p>
                        <p style="margin: 0; color: #94a3b8; font-size: 12px;">&copy; ${new Date().getFullYear()} ${data.companyName}. All rights reserved.</p>
                      </td>
                    </tr>
                  </table>
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
}) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              <!-- Header -->
              <tr>
                <td style="background-color: #ffffff; padding: 40px 40px 25px 40px; text-align: center; border-bottom: 3px solid #10B981;">
                  <h1 style="margin: 0; color: #10B981; font-size: 28px; font-weight: 700;">${data.companyName}</h1>
                  <p style="margin: 8px 0 0 0; color: #64748b; font-size: 16px;">Payment Receipt</p>
                </td>
              </tr>
              
              <!-- PAID Badge - Green theme -->
              <tr>
                <td style="padding: 0; text-align: center;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="background-color: #10B981; padding: 12px 40px;">
                        <span style="color: #ffffff; font-size: 16px; font-weight: 700; letter-spacing: 3px;">✓ PAID IN FULL</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <p style="margin: 0 0 20px 0; font-size: 16px; color: #334155;">Dear <strong>${data.agentName}</strong>,</p>
                  <p style="margin: 0 0 30px 0; font-size: 16px; color: #64748b; line-height: 1.6;">
                    Thank you for your payment. This receipt confirms that your invoice has been paid in full.
                  </p>
                  
                  <!-- Receipt Details Card -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; border: 1px solid #86efac; margin-bottom: 30px;">
                    <tr>
                      <td style="padding: 25px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td colspan="2" style="padding-bottom: 15px; border-bottom: 1px solid #86efac;">
                              <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                  <td>
                                    <span style="color: #64748b; font-size: 12px; text-transform: uppercase;">Receipt #</span><br/>
                                    <span style="color: #166534; font-size: 18px; font-weight: 700;">${data.receiptNumber}</span>
                                  </td>
                                  <td style="text-align: right;">
                                    <span style="color: #64748b; font-size: 12px; text-transform: uppercase;">Invoice #</span><br/>
                                    <span style="color: #166534; font-size: 16px; font-weight: 600;">${data.invoiceNumber}</span>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding-top: 15px; width: 50%;">
                              <span style="color: #64748b; font-size: 13px;">Period</span><br/>
                              <span style="color: #14532d; font-size: 15px; font-weight: 500;">${data.dateFrom} - ${data.dateTo}</span>
                            </td>
                            <td style="padding-top: 15px; text-align: right;">
                              <span style="color: #64748b; font-size: 13px;">Bookings</span><br/>
                              <span style="color: #14532d; font-size: 15px; font-weight: 500;">${data.bookingCount || 0} booking(s)</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding-top: 15px;">
                              <span style="color: #64748b; font-size: 13px;">Payment Date</span><br/>
                              <span style="color: #14532d; font-size: 15px; font-weight: 500;">${data.paidAt}</span>
                            </td>
                            ${data.paymentMethod ? `
                            <td style="padding-top: 15px; text-align: right;">
                              <span style="color: #64748b; font-size: 13px;">Payment Method</span><br/>
                              <span style="color: #14532d; font-size: 15px; font-weight: 500;">${data.paymentMethod}</span>
                            </td>
                            ` : ''}
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Amount Paid Box -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #10B981; border-radius: 12px; margin-bottom: 30px;">
                    <tr>
                      <td style="padding: 25px; text-align: center;">
                        <span style="color: rgba(255,255,255,0.8); font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Amount Paid</span>
                        <div style="color: #ffffff; font-size: 36px; font-weight: 700; margin-top: 8px;">฿${data.totalAmount.toLocaleString()}</div>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Attachment Note -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-radius: 8px; border-left: 4px solid #10B981;">
                    <tr>
                      <td style="padding: 15px 20px;">
                        <span style="font-size: 18px; margin-right: 10px;">📎</span>
                        <span style="color: #166534; font-size: 14px;">The detailed receipt PDF is attached to this email for your records.</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; padding: 25px 40px; border-top: 1px solid #e2e8f0;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="text-align: center;">
                        <p style="margin: 0 0 5px 0; color: #10B981; font-size: 15px; font-weight: 600;">Thank you for your business! 🙏</p>
                        <p style="margin: 0; color: #94a3b8; font-size: 12px;">&copy; ${new Date().getFullYear()} ${data.companyName}. All rights reserved.</p>
                      </td>
                    </tr>
                  </table>
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

export function getOperationReportEmail(data: {
  reportDate: string
  reportType: 'full-report' | 'by-program' | 'by-driver' | 'by-boat'
  format: 'pdf' | 'csv'
  bookingCount: number
  totalGuests: number
  companyName: string
}) {
  const reportTypeLabels = {
    'full-report': 'Full Operation Report',
    'by-program': 'Report by Program',
    'by-driver': 'Report by Driver',
    'by-boat': 'Report by Boat'
  }
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%); color: white; border-radius: 12px 12px 0 0; }
        .header h1 { margin: 0 0 5px 0; font-size: 24px; }
        .header p { margin: 0; opacity: 0.9; font-size: 14px; }
        .date-banner { background: #f0f9ff; padding: 30px 20px; text-align: center; border-bottom: 3px solid #0EA5E9; }
        .date-label { font-size: 14px; color: #64748b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
        .date-value { font-size: 32px; font-weight: bold; color: #0EA5E9; margin: 0; }
        .content { padding: 30px 20px; background: #ffffff; }
        .report-type-badge { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; margin-bottom: 20px; }
        .stats-grid { display: table; width: 100%; margin: 20px 0; }
        .stat-item { display: table-cell; text-align: center; padding: 15px; background: #f8fafc; border-radius: 8px; }
        .stat-value { font-size: 28px; font-weight: bold; color: #0EA5E9; display: block; }
        .stat-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        .attachment-note { background: #fef3c7; padding: 15px 20px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #f59e0b; }
        .attachment-note p { margin: 0; color: #92400e; }
        .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; background: #f8fafc; border-radius: 0 0 12px 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${data.companyName}</h1>
          <p>Operation Report</p>
        </div>
        
        <div class="date-banner">
          <p class="date-label">Tour Date</p>
          <p class="date-value">${data.reportDate}</p>
        </div>
        
        <div class="content">
          <div style="text-align: center;">
            <span class="report-type-badge">${reportTypeLabels[data.reportType]}</span>
          </div>
          
          <table width="100%" cellpadding="0" cellspacing="10" style="margin: 20px 0;">
            <tr>
              <td width="50%" style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 8px;">
                <span style="font-size: 32px; font-weight: bold; color: #0EA5E9; display: block;">${data.bookingCount}</span>
                <span style="font-size: 12px; color: #64748b; text-transform: uppercase;">Bookings</span>
              </td>
              <td width="50%" style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 8px;">
                <span style="font-size: 32px; font-weight: bold; color: #0EA5E9; display: block;">${data.totalGuests}</span>
                <span style="font-size: 12px; color: #64748b; text-transform: uppercase;">Total Guests</span>
              </td>
            </tr>
          </table>
          
          <div class="attachment-note">
            <p>📎 The <strong>${data.format.toUpperCase()}</strong> report is attached to this email.</p>
          </div>
        </div>
        
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${data.companyName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

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
}) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%); color: white; border-radius: 12px 12px 0 0; }
        .header h1 { margin: 0 0 5px 0; font-size: 24px; }
        .header p { margin: 0; opacity: 0.9; font-size: 14px; }
        .date-banner { background: #f0f9ff; padding: 30px 20px; text-align: center; border-bottom: 3px solid #0EA5E9; }
        .date-label { font-size: 14px; color: #64748b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
        .date-value { font-size: 32px; font-weight: bold; color: #0EA5E9; margin: 0; }
        .content { padding: 30px 20px; background: #ffffff; }
        .stats-grid { margin: 20px 0; }
        .backup-badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 6px 12px; border-radius: 16px; font-size: 12px; font-weight: 600; margin-bottom: 15px; }
        .attachment-list { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .attachment-list h3 { margin: 0 0 15px 0; font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        .attachment-item { padding: 8px 12px; margin: 5px 0; background: white; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 13px; }
        .attachment-item .icon { margin-right: 8px; }
        .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; background: #f8fafc; border-radius: 0 0 12px 12px; }
        .info-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px; margin-top: 20px; }
        .info-box p { margin: 0; color: #166534; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${data.companyName}</h1>
          <p>Daily Operation Report</p>
        </div>
        
        <div class="date-banner">
          <p class="date-label">Tour Date</p>
          <p class="date-value">${data.reportDate}</p>
        </div>
        
        <div class="content">
          <div style="text-align: center;">
            <span class="backup-badge">📧 AUTO BACKUP REPORT</span>
          </div>
          
          <table width="100%" cellpadding="0" cellspacing="8" style="margin: 20px 0;">
            <tr>
              <td width="50%" style="text-align: center; padding: 15px; background: #f8fafc; border-radius: 8px;">
                <span style="font-size: 28px; font-weight: bold; color: #0EA5E9; display: block;">${data.bookingCount}</span>
                <span style="font-size: 11px; color: #64748b; text-transform: uppercase;">Bookings</span>
              </td>
              <td width="50%" style="text-align: center; padding: 15px; background: #f8fafc; border-radius: 8px;">
                <span style="font-size: 28px; font-weight: bold; color: #0EA5E9; display: block;">${data.totalGuests}</span>
                <span style="font-size: 11px; color: #64748b; text-transform: uppercase;">Total Guests</span>
              </td>
            </tr>
            <tr>
              <td colspan="2" style="text-align: center; padding: 10px; background: #f8fafc; border-radius: 8px;">
                <span style="font-size: 14px; color: #64748b;">
                  ${data.totalAdults} Adults • ${data.totalChildren} Children • ${data.totalInfants} Infants
                </span>
              </td>
            </tr>
            <tr>
              <td width="50%" style="text-align: center; padding: 12px; background: #f8fafc; border-radius: 8px;">
                <span style="font-size: 20px; font-weight: bold; color: #64748b; display: block;">${data.uniqueDrivers}</span>
                <span style="font-size: 11px; color: #64748b; text-transform: uppercase;">Drivers</span>
              </td>
              <td width="50%" style="text-align: center; padding: 12px; background: #f8fafc; border-radius: 8px;">
                <span style="font-size: 20px; font-weight: bold; color: #64748b; display: block;">${data.uniqueBoats}</span>
                <span style="font-size: 11px; color: #64748b; text-transform: uppercase;">Boats</span>
              </td>
            </tr>
          </table>
          
          <div class="attachment-list">
            <h3>📎 Attached Reports (8 files)</h3>
            <div class="attachment-item"><span class="icon">📄</span> Full Report (PDF)</div>
            <div class="attachment-item"><span class="icon">📊</span> Full Report (CSV)</div>
            <div class="attachment-item"><span class="icon">📄</span> By Program Report (PDF)</div>
            <div class="attachment-item"><span class="icon">📊</span> By Program Report (CSV)</div>
            <div class="attachment-item"><span class="icon">📄</span> By Driver Report (PDF)</div>
            <div class="attachment-item"><span class="icon">📊</span> By Driver Report (CSV)</div>
            <div class="attachment-item"><span class="icon">📄</span> By Boat Report (PDF)</div>
            <div class="attachment-item"><span class="icon">📊</span> By Boat Report (CSV)</div>
          </div>
          
          <div class="info-box">
            <p>✅ This is an automated backup report. Use these files if you cannot access the website.</p>
          </div>
        </div>
        
        <div class="footer">
          <p>This email was sent automatically by ${data.companyName}.</p>
          <p>&copy; ${new Date().getFullYear()} ${data.companyName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `
}


