import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, getInvoiceEmail, getReceiptEmail } from '@/lib/email'

// Format date helper
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function formatDateLong(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile for company_id
    const { data: profile } = await supabase
      .from('users')
      .select('company_id, name')
      .eq('auth_id', authUser.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'User not associated with a company' }, { status: 400 })
    }

    const body = await request.json()
    const { invoiceId, emailAddress, emailType, pdfBase64, pdfFilename } = body

    if (!invoiceId || !emailAddress) {
      return NextResponse.json({ error: 'Invoice ID and email address are required' }, { status: 400 })
    }

    if (!emailType || !['invoice', 'receipt'].includes(emailType)) {
      return NextResponse.json({ error: 'Email type must be "invoice" or "receipt"' }, { status: 400 })
    }

    if (!pdfBase64 || !pdfFilename) {
      return NextResponse.json({ error: 'PDF attachment is required' }, { status: 400 })
    }

    // Get the invoice with related data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        agent:agents(id, name, email, phone, address, tax_id, tax_applied),
        invoice_items(id)
      `)
      .eq('id', invoiceId)
      .eq('company_id', profile.company_id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Get company details
    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('id', profile.company_id)
      .single()

    const agent = invoice.agent as any
    const agentName = agent?.name || 'Agent'
    const bookingCount = (invoice.invoice_items as any[])?.length || 0

    let emailHtml: string
    let subject: string

    if (emailType === 'receipt') {
      // For receipt, invoice must be paid
      if (invoice.status !== 'paid') {
        return NextResponse.json({ error: 'Cannot send receipt for unpaid invoice' }, { status: 400 })
      }

      // Get payment type name
      let paymentMethodName = ''
      if (invoice.payment_type_id) {
        const { data: paymentType } = await supabase
          .from('invoice_payment_types')
          .select('name')
          .eq('id', invoice.payment_type_id)
          .single()
        paymentMethodName = paymentType?.name || ''
      }

      const receiptNumber = `RCP-${invoice.invoice_number.replace('INV-', '')}`
      
      emailHtml = getReceiptEmail({
        agentName,
        invoiceNumber: invoice.invoice_number,
        receiptNumber,
        dateFrom: formatDate(invoice.date_from),
        dateTo: formatDate(invoice.date_to),
        totalAmount: invoice.total_amount,
        paidAt: invoice.paid_at ? formatDate(invoice.paid_at) : formatDate(new Date().toISOString()),
        companyName: company?.name || 'TConnext',
        bookingCount,
        paymentMethod: paymentMethodName
      })
      subject = `Payment Receipt ${receiptNumber} - ${company?.name || 'TConnext'}`
    } else {
      // Invoice email
      emailHtml = getInvoiceEmail({
        agentName,
        invoiceNumber: invoice.invoice_number,
        dateFrom: formatDate(invoice.date_from),
        dateTo: formatDate(invoice.date_to),
        totalAmount: invoice.total_amount,
        companyName: company?.name || 'TConnext',
        bookingCount,
        dueDate: invoice.due_date ? formatDateLong(invoice.due_date) : undefined
      })
      subject = `Invoice ${invoice.invoice_number} - ${company?.name || 'TConnext'}`
    }

    // Convert base64 to Buffer for attachment
    const pdfBuffer = Buffer.from(pdfBase64, 'base64')

    // Send the email with PDF attachment
    const result = await sendEmail({
      to: emailAddress,
      subject,
      html: emailHtml,
      attachments: [{
        filename: pdfFilename,
        content: pdfBuffer
      }]
    })

    // If sending invoice and status is draft, update to sent
    if (emailType === 'invoice' && invoice.status === 'draft') {
      await supabase
        .from('invoices')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          last_modified_by: authUser.id,
          last_modified_by_name: profile.name || authUser.email
        })
        .eq('id', invoiceId)
    }

    return NextResponse.json({ 
      success: true, 
      mock: (result as any).mock || false,
      message: (result as any).mock 
        ? 'Email simulated (no RESEND_API_KEY configured)' 
        : 'Email sent successfully'
    })

  } catch (error) {
    console.error('Error sending invoice email:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    )
  }
}
