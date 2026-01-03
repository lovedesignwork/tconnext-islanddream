import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { 
  sendEmail, 
  getBookingConfirmationEmail,
  getPickupTimeEmail,
  getInvoiceEmail,
  getReceiptEmail,
  getOperationReportEmail,
  getAutoOpReportEmail
} from '@/lib/email'
import { jsPDF } from 'jspdf'

// Admin client to bypass RLS
function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ============================================
// MOCK DATA
// ============================================

const MOCK_COMPANY = {
  name: 'TConnext Demo Tours',
  email: 'info@tconnext-demo.com',
}

const MOCK_BOOKINGS = [
  {
    id: '1',
    booking_number: 'BK-2024-001',
    voucher_number: 'VCH-001',
    customer_name: 'John Smith',
    adults: 2,
    children: 1,
    infants: 0,
    room_number: '301',
    pickup_time: '07:30',
    collect_money: 2500,
    notes: 'Vegetarian meal requested',
    payment_type: 'regular',
    is_direct_booking: false,
    custom_pickup_location: null,
    program: { id: 'p1', name: 'Phi Phi Island Premium Tour', nickname: 'Phi Phi', color: '#3B82F6' },
    hotel: { id: 'h1', name: 'Marriott Resort & Spa', area: 'Patong' },
    driver: { id: 'd1', name: 'Somchai Kaewsri', nickname: 'Chai' },
    boat: { id: 'b1', name: 'Ocean Explorer', captain_name: 'Captain Nemo' },
    guide: { id: 'g1', name: 'Nattapong Wiriya', nickname: 'Nat' },
    restaurant: { id: 'r1', name: 'Seafood Paradise', location: 'Phi Phi Don' },
    agent: { id: 'a1', name: 'Amazing Thailand Tours' },
    agent_staff: { id: 's1', full_name: 'Lisa Chen', nickname: 'Lisa' },
  },
  {
    id: '2',
    booking_number: 'BK-2024-002',
    voucher_number: 'VCH-002',
    customer_name: 'Sarah Johnson',
    adults: 4,
    children: 2,
    infants: 1,
    room_number: '502',
    pickup_time: '07:45',
    collect_money: 0,
    notes: null,
    payment_type: 'regular',
    is_direct_booking: false,
    custom_pickup_location: null,
    program: { id: 'p2', name: 'James Bond Island Adventure', nickname: 'James Bond', color: '#10B981' },
    hotel: { id: 'h2', name: 'Hilton Phuket Arcadia', area: 'Karon' },
    driver: { id: 'd2', name: 'Prasert Lertpanyawit', nickname: 'Pete' },
    boat: { id: 'b2', name: 'Speed King', captain_name: 'Captain Jack' },
    guide: { id: 'g2', name: 'Anan Suksawat', nickname: 'Aan' },
    restaurant: { id: 'r2', name: 'Thai Delight', location: 'Phang Nga' },
    agent: { id: 'a2', name: 'Phuket Dream Travel' },
    agent_staff: { id: 's2', full_name: 'Mark Wilson', nickname: 'Mark' },
  },
  {
    id: '3',
    booking_number: 'BK-2024-003',
    voucher_number: null,
    customer_name: 'Michael Brown',
    adults: 2,
    children: 0,
    infants: 0,
    room_number: '108',
    pickup_time: '08:00',
    collect_money: 1800,
    notes: 'Honeymoon couple - special arrangement',
    payment_type: 'regular',
    is_direct_booking: true,
    custom_pickup_location: null,
    program: { id: 'p1', name: 'Phi Phi Island Premium Tour', nickname: 'Phi Phi', color: '#3B82F6' },
    hotel: { id: 'h3', name: 'JW Marriott Resort', area: 'Mai Khao' },
    driver: { id: 'd1', name: 'Somchai Kaewsri', nickname: 'Chai' },
    boat: { id: 'b1', name: 'Ocean Explorer', captain_name: 'Captain Nemo' },
    guide: { id: 'g1', name: 'Nattapong Wiriya', nickname: 'Nat' },
    restaurant: { id: 'r1', name: 'Seafood Paradise', location: 'Phi Phi Don' },
    agent: null,
    agent_staff: null,
  },
  {
    id: '4',
    booking_number: 'BK-2024-004',
    voucher_number: 'VCH-004',
    customer_name: 'Emma Wilson',
    adults: 3,
    children: 1,
    infants: 0,
    room_number: '215',
    pickup_time: '07:15',
    collect_money: 0,
    notes: 'Request English-speaking guide',
    payment_type: 'foc',
    is_direct_booking: false,
    custom_pickup_location: null,
    program: { id: 'p2', name: 'James Bond Island Adventure', nickname: 'James Bond', color: '#10B981' },
    hotel: { id: 'h4', name: 'Kata Beach Resort', area: 'Kata' },
    driver: { id: 'd2', name: 'Prasert Lertpanyawit', nickname: 'Pete' },
    boat: { id: 'b2', name: 'Speed King', captain_name: 'Captain Jack' },
    guide: { id: 'g2', name: 'Anan Suksawat', nickname: 'Aan' },
    restaurant: { id: 'r2', name: 'Thai Delight', location: 'Phang Nga' },
    agent: { id: 'a1', name: 'Amazing Thailand Tours' },
    agent_staff: { id: 's3', full_name: 'Tom Baker', nickname: 'Tom' },
  },
  {
    id: '5',
    booking_number: 'BK-2024-005',
    voucher_number: 'VCH-005',
    customer_name: 'David Lee',
    adults: 2,
    children: 2,
    infants: 0,
    room_number: '410',
    pickup_time: '07:30',
    collect_money: 3200,
    notes: null,
    payment_type: 'regular',
    is_direct_booking: false,
    custom_pickup_location: null,
    program: { id: 'p3', name: 'Similan Islands Diving', nickname: 'Similan', color: '#6366F1' },
    hotel: { id: 'h5', name: 'Banyan Tree Phuket', area: 'Bang Tao' },
    driver: { id: 'd3', name: 'Wichai Thongdee', nickname: 'Win' },
    boat: { id: 'b3', name: 'Dive Master', captain_name: 'Captain Blue' },
    guide: { id: 'g3', name: 'Supachai Keaw', nickname: 'Boy' },
    restaurant: { id: 'r3', name: 'Island Cafe', location: 'Similan' },
    agent: { id: 'a3', name: 'Andaman Explorers' },
    agent_staff: { id: 's4', full_name: 'Jenny Tan', nickname: 'Jen' },
  },
  {
    id: '6',
    booking_number: 'BK-2024-006',
    voucher_number: 'VCH-006',
    customer_name: 'Jennifer Garcia',
    adults: 1,
    children: 0,
    infants: 0,
    room_number: '707',
    pickup_time: '08:15',
    collect_money: 0,
    notes: 'Solo traveler - photography enthusiast',
    payment_type: 'insp',
    is_direct_booking: false,
    custom_pickup_location: null,
    program: { id: 'p1', name: 'Phi Phi Island Premium Tour', nickname: 'Phi Phi', color: '#3B82F6' },
    hotel: { id: 'h6', name: 'The Surin Phuket', area: 'Surin' },
    driver: { id: 'd1', name: 'Somchai Kaewsri', nickname: 'Chai' },
    boat: { id: 'b1', name: 'Ocean Explorer', captain_name: 'Captain Nemo' },
    guide: { id: 'g1', name: 'Nattapong Wiriya', nickname: 'Nat' },
    restaurant: { id: 'r1', name: 'Seafood Paradise', location: 'Phi Phi Don' },
    agent: { id: 'a2', name: 'Phuket Dream Travel' },
    agent_staff: { id: 's5', full_name: 'Alex Kim', nickname: 'Alex' },
  },
  {
    id: '7',
    booking_number: 'BK-2024-007',
    voucher_number: 'VCH-007',
    customer_name: 'Robert Martinez',
    adults: 2,
    children: 3,
    infants: 1,
    room_number: '318',
    pickup_time: '07:00',
    collect_money: 4500,
    notes: 'Large family - need extra seats',
    payment_type: 'regular',
    is_direct_booking: false,
    custom_pickup_location: null,
    program: { id: 'p2', name: 'James Bond Island Adventure', nickname: 'James Bond', color: '#10B981' },
    hotel: { id: 'h7', name: 'Centara Grand Beach Resort', area: 'Karon' },
    driver: { id: 'd2', name: 'Prasert Lertpanyawit', nickname: 'Pete' },
    boat: { id: 'b2', name: 'Speed King', captain_name: 'Captain Jack' },
    guide: { id: 'g2', name: 'Anan Suksawat', nickname: 'Aan' },
    restaurant: { id: 'r2', name: 'Thai Delight', location: 'Phang Nga' },
    agent: { id: 'a1', name: 'Amazing Thailand Tours' },
    agent_staff: { id: 's1', full_name: 'Lisa Chen', nickname: 'Lisa' },
  },
]

// Helper functions
function formatPickupTime(time: string | null): string {
  if (!time) return ''
  const parts = time.split(':')
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`
  }
  return time
}

function truncateText(text: string | null | undefined, maxLength: number): string {
  if (!text) return '-'
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 2) + '..'
}

function escapeCSV(value: string | null | undefined): string {
  if (!value) return ''
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

// ============================================
// PDF GENERATION
// ============================================

function generateMockOperationPdf(bookings: typeof MOCK_BOOKINGS, activityDate: string): Buffer {
  const doc = new jsPDF({ orientation: 'landscape' })
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 15

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('TEST - FULL OPERATION REPORT', pageWidth / 2, y, { align: 'center' })
  y += 6

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Date: ${activityDate}`, pageWidth / 2, y, { align: 'center' })
  y += 5

  doc.setFontSize(8)
  doc.setTextColor(255, 0, 0)
  doc.text('*** THIS IS A TEST EMAIL WITH MOCK DATA ***', pageWidth / 2, y, { align: 'center' })
  doc.setTextColor(0, 0, 0)
  y += 8

  const totalAdults = bookings.reduce((sum, b) => sum + (b.adults || 0), 0)
  const totalChildren = bookings.reduce((sum, b) => sum + (b.children || 0), 0)
  const totalInfants = bookings.reduce((sum, b) => sum + (b.infants || 0), 0)
  const totalCollect = bookings.reduce((sum, b) => sum + (b.collect_money || 0), 0)

  doc.setFontSize(9)
  doc.text(`${bookings.length} bookings | ${totalAdults}A ${totalChildren}C ${totalInfants}I | Collect: ${totalCollect.toLocaleString()} THB`, pageWidth / 2, y, { align: 'center' })
  y += 8

  doc.setDrawColor(200)
  doc.line(10, y, pageWidth - 10, y)
  y += 5

  // Table header
  const headers = ['#', 'Customer', 'Program', 'A', 'C', 'I', 'Hotel', 'Driver', 'Boat', 'Guide', 'Restaurant', 'Agent']
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  let x = 10
  const colWidths = [8, 35, 30, 8, 8, 8, 40, 25, 25, 25, 30, 30]
  
  headers.forEach((h, i) => {
    doc.text(h, x, y)
    x += colWidths[i]
  })
  y += 5

  // Table rows
  doc.setFont('helvetica', 'normal')
  bookings.forEach((b, idx) => {
    x = 10
    const rowData = [
      String(idx + 1),
      truncateText(b.customer_name, 33),
      truncateText(b.program?.nickname || b.program?.name || '-', 28),
      String(b.adults),
      String(b.children),
      String(b.infants),
      truncateText(b.hotel?.name || '-', 38),
      truncateText(b.driver?.nickname || b.driver?.name || '-', 23),
      truncateText(b.boat?.name || '-', 23),
      truncateText(b.guide?.nickname || b.guide?.name || '-', 23),
      truncateText(b.restaurant?.name || '-', 28),
      truncateText(b.is_direct_booking ? 'Direct' : (b.agent?.name || '-'), 28)
    ]
    
    rowData.forEach((text, i) => {
      doc.text(text, x, y)
      x += colWidths[i]
    })
    y += 4
  })

  const arrayBuffer = doc.output('arraybuffer')
  return Buffer.from(arrayBuffer)
}

function generateMockOperationCsv(bookings: typeof MOCK_BOOKINGS, activityDate: string): string {
  const headers = ['#', 'Booking #', 'Customer', 'Program', 'A', 'C', 'I', 'Hotel', 'Driver', 'Boat', 'Guide', 'Restaurant', 'Agent', 'Collect', 'Notes']
  
  const rows = bookings.map((b, i) => [
    i + 1,
    escapeCSV(b.booking_number),
    escapeCSV(b.customer_name),
    escapeCSV(b.program?.nickname || b.program?.name || ''),
    b.adults,
    b.children,
    b.infants,
    escapeCSV(b.hotel?.name || ''),
    escapeCSV(b.driver?.nickname || b.driver?.name || ''),
    escapeCSV(b.boat?.name || ''),
    escapeCSV(b.guide?.nickname || b.guide?.name || ''),
    escapeCSV(b.restaurant?.name || ''),
    escapeCSV(b.is_direct_booking ? 'Direct' : (b.agent?.name || '')),
    b.collect_money,
    escapeCSV(b.notes || '')
  ].join(','))

  return [
    '*** TEST EMAIL - MOCK DATA ***',
    `Date: ${activityDate}`,
    '',
    headers.join(','),
    ...rows
  ].join('\n')
}

function generateMockInvoicePdf(): Buffer {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 20

  // Header
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(MOCK_COMPANY.name, pageWidth / 2, y, { align: 'center' })
  y += 10

  doc.setFontSize(8)
  doc.setTextColor(255, 0, 0)
  doc.text('*** TEST EMAIL - MOCK DATA ***', pageWidth / 2, y, { align: 'center' })
  doc.setTextColor(0, 0, 0)
  y += 10

  doc.setFontSize(16)
  doc.text('INVOICE', pageWidth / 2, y, { align: 'center' })
  y += 15

  // Invoice details
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Invoice Number: INV-TEST-001', 20, y)
  doc.text('Date: ' + new Date().toLocaleDateString(), pageWidth - 60, y)
  y += 8
  doc.text('Bill To: Amazing Thailand Tours', 20, y)
  doc.text('Period: 01 Dec 2024 - 31 Dec 2024', pageWidth - 80, y)
  y += 15

  // Table header
  doc.setFillColor(240, 240, 240)
  doc.rect(20, y - 5, pageWidth - 40, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.text('#', 22, y)
  doc.text('Date', 30, y)
  doc.text('Customer', 55, y)
  doc.text('Program', 100, y)
  doc.text('Guests', 145, y)
  doc.text('Amount', 170, y)
  y += 8

  // Table rows
  doc.setFont('helvetica', 'normal')
  const mockInvoiceItems = MOCK_BOOKINGS.slice(0, 7)
  let total = 0
  mockInvoiceItems.forEach((b, idx) => {
    const amount = (b.adults * 1500) + (b.children * 750)
    total += amount
    doc.text(String(idx + 1), 22, y)
    doc.text('15 Dec 2024', 30, y)
    doc.text(truncateText(b.customer_name, 25), 55, y)
    doc.text(truncateText(b.program?.nickname || '', 20), 100, y)
    doc.text(`${b.adults}A ${b.children}C`, 145, y)
    doc.text(`฿${amount.toLocaleString()}`, 170, y)
    y += 6
  })

  // Total
  y += 5
  doc.setDrawColor(200)
  doc.line(140, y, pageWidth - 20, y)
  y += 8
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL:', 145, y)
  doc.text(`฿${total.toLocaleString()}`, 170, y)

  const arrayBuffer = doc.output('arraybuffer')
  return Buffer.from(arrayBuffer)
}

function generateMockReceiptPdf(): Buffer {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 20

  // Header
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(MOCK_COMPANY.name, pageWidth / 2, y, { align: 'center' })
  y += 10

  doc.setFontSize(8)
  doc.setTextColor(255, 0, 0)
  doc.text('*** TEST EMAIL - MOCK DATA ***', pageWidth / 2, y, { align: 'center' })
  doc.setTextColor(0, 0, 0)
  y += 10

  doc.setFontSize(16)
  doc.setTextColor(16, 185, 129)
  doc.text('PAYMENT RECEIPT', pageWidth / 2, y, { align: 'center' })
  doc.setTextColor(0, 0, 0)
  y += 8

  doc.setFontSize(12)
  doc.text('✓ PAID IN FULL', pageWidth / 2, y, { align: 'center' })
  y += 15

  // Receipt details
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Receipt Number: RCP-TEST-001', 20, y)
  y += 6
  doc.text('Invoice Number: INV-TEST-001', 20, y)
  y += 6
  doc.text('Agent: Amazing Thailand Tours', 20, y)
  y += 6
  doc.text('Period: 01 Dec 2024 - 31 Dec 2024', 20, y)
  y += 6
  doc.text('Payment Date: ' + new Date().toLocaleDateString(), 20, y)
  y += 6
  doc.text('Payment Method: Bank Transfer', 20, y)
  y += 15

  // Amount
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Amount Paid: ฿45,750', pageWidth / 2, y, { align: 'center' })
  y += 15

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Thank you for your business!', pageWidth / 2, y, { align: 'center' })

  const arrayBuffer = doc.output('arraybuffer')
  return Buffer.from(arrayBuffer)
}

// ============================================
// MAIN API HANDLER
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Use regular client for auth check
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use admin client to bypass RLS for user/company lookup
    const supabaseAdmin = getAdminClient()
    
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('company_id')
      .eq('auth_id', authUser.id)
      .single()

    if (!userData?.company_id) {
      return NextResponse.json({ error: 'User has no company' }, { status: 400 })
    }

    const body = await request.json()
    const { recipientEmail, templateType } = body

    if (!recipientEmail) {
      return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(recipientEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // Get company name using admin client
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('name')
      .eq('id', userData.company_id)
      .single()

    const companyName = company?.name || MOCK_COMPANY.name
    const testDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    const testDateISO = new Date().toISOString().split('T')[0]

    let emailHtml: string
    let subject: string
    let attachments: { filename: string; content: Buffer | string }[] = []

    switch (templateType) {
      case 'booking-confirmation':
        emailHtml = getBookingConfirmationEmail({
          customerName: 'John Smith',
          bookingNumber: 'BK-TEST-001',
          programName: 'Phi Phi Island Premium Tour',
          bookingDate: testDate,
          adults: 2,
          children: 1,
          infants: 0,
          companyName,
          companyEmail: MOCK_COMPANY.email,
        })
        subject = `[TEST] Booking Confirmation - BK-TEST-001`
        break

      case 'pickup-time':
        emailHtml = getPickupTimeEmail({
          customerName: 'John Smith',
          bookingNumber: 'BK-TEST-001',
          programName: 'Phi Phi Island Premium Tour',
          bookingDate: testDate,
          pickupTime: '07:30',
          hotelName: 'Marriott Resort & Spa',
          adults: 2,
          children: 1,
          infants: 0,
          pickupContactInfo: '+66 76 123 4567',
          companyName,
          companyEmail: MOCK_COMPANY.email,
        })
        subject = `[TEST] Your Pickup Time - ${testDate}`
        break

      case 'invoice':
        emailHtml = getInvoiceEmail({
          agentName: 'Amazing Thailand Tours',
          invoiceNumber: 'INV-TEST-001',
          dateFrom: '01 Dec 2024',
          dateTo: '31 Dec 2024',
          totalAmount: 45750,
          companyName,
          bookingCount: 7,
          dueDate: '15 Jan 2025',
        })
        subject = `[TEST] Invoice INV-TEST-001 - ${companyName}`
        attachments = [{
          filename: 'Invoice-TEST-001.pdf',
          content: generateMockInvoicePdf(),
        }]
        break

      case 'receipt':
        emailHtml = getReceiptEmail({
          agentName: 'Amazing Thailand Tours',
          invoiceNumber: 'INV-TEST-001',
          receiptNumber: 'RCP-TEST-001',
          dateFrom: '01 Dec 2024',
          dateTo: '31 Dec 2024',
          totalAmount: 45750,
          paidAt: testDate,
          companyName,
          bookingCount: 7,
          paymentMethod: 'Bank Transfer',
        })
        subject = `[TEST] Payment Receipt RCP-TEST-001 - ${companyName}`
        attachments = [{
          filename: 'Receipt-TEST-001.pdf',
          content: generateMockReceiptPdf(),
        }]
        break

      case 'operation-report':
        const totalGuests = MOCK_BOOKINGS.reduce((sum, b) => sum + b.adults + b.children + b.infants, 0)
        emailHtml = getOperationReportEmail({
          reportDate: testDate,
          reportType: 'full-report',
          format: 'pdf',
          bookingCount: MOCK_BOOKINGS.length,
          totalGuests,
          companyName,
        })
        subject = `[TEST] Operation Report - ${testDate}`
        attachments = [
          { filename: `test_full_report_${testDateISO}.pdf`, content: generateMockOperationPdf(MOCK_BOOKINGS, testDate) },
          { filename: `test_full_report_${testDateISO}.csv`, content: '\ufeff' + generateMockOperationCsv(MOCK_BOOKINGS, testDate) },
        ]
        break

      case 'auto-daily-report':
        const autoTotalGuests = MOCK_BOOKINGS.reduce((sum, b) => sum + b.adults + b.children + b.infants, 0)
        const autoTotalAdults = MOCK_BOOKINGS.reduce((sum, b) => sum + b.adults, 0)
        const autoTotalChildren = MOCK_BOOKINGS.reduce((sum, b) => sum + b.children, 0)
        const autoTotalInfants = MOCK_BOOKINGS.reduce((sum, b) => sum + b.infants, 0)
        const uniqueDrivers = new Set(MOCK_BOOKINGS.map(b => b.driver?.id)).size
        const uniqueBoats = new Set(MOCK_BOOKINGS.map(b => b.boat?.id)).size

        emailHtml = getAutoOpReportEmail({
          reportDate: testDate,
          bookingCount: MOCK_BOOKINGS.length,
          totalGuests: autoTotalGuests,
          totalAdults: autoTotalAdults,
          totalChildren: autoTotalChildren,
          totalInfants: autoTotalInfants,
          uniqueDrivers,
          uniqueBoats,
          companyName,
        })
        subject = `[TEST] Daily Operation Report - ${testDate}`
        
        // Generate 8 attachments (4 PDF + 4 CSV)
        const pdfContent = generateMockOperationPdf(MOCK_BOOKINGS, testDate)
        const csvContent = '\ufeff' + generateMockOperationCsv(MOCK_BOOKINGS, testDate)
        attachments = [
          { filename: `test_full_report_${testDateISO}.pdf`, content: pdfContent },
          { filename: `test_full_report_${testDateISO}.csv`, content: csvContent },
          { filename: `test_by_program_${testDateISO}.pdf`, content: pdfContent },
          { filename: `test_by_program_${testDateISO}.csv`, content: csvContent },
          { filename: `test_by_driver_${testDateISO}.pdf`, content: pdfContent },
          { filename: `test_by_driver_${testDateISO}.csv`, content: csvContent },
          { filename: `test_by_boat_${testDateISO}.pdf`, content: pdfContent },
          { filename: `test_by_boat_${testDateISO}.csv`, content: csvContent },
        ]
        break

      default:
        return NextResponse.json({ error: 'Invalid template type' }, { status: 400 })
    }

    // Add test banner to email
    const testBanner = `
      <div style="background-color: #fef3c7; border: 2px solid #f59e0b; padding: 15px; margin-bottom: 20px; text-align: center; border-radius: 8px;">
        <strong style="color: #92400e; font-size: 16px;">⚠️ TEST EMAIL - MOCK DATA</strong>
        <p style="color: #92400e; margin: 5px 0 0 0; font-size: 14px;">This is a test email sent from Settings > Email Test</p>
      </div>
    `
    // Insert test banner after <body> tag
    emailHtml = emailHtml.replace(/<body[^>]*>/, (match) => match + testBanner)

    await sendEmail({
      to: recipientEmail,
      subject,
      html: emailHtml,
      attachments: attachments.length > 0 ? attachments : undefined,
    })

    return NextResponse.json({ 
      success: true,
      message: `Test email sent to ${recipientEmail}`,
      template: templateType,
      attachmentCount: attachments.length,
    })
  } catch (error: any) {
    console.error('Send test email error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send test email' },
      { status: 500 }
    )
  }
}

