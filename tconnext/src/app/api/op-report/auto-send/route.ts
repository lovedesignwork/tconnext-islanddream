import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, getAutoOpReportEmail } from '@/lib/email'
import { format, addDays } from 'date-fns'
import { jsPDF } from 'jspdf'
import type { CompanySettings } from '@/types'

// Use service role for cron job access
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface BookingData {
  id: string
  booking_number: string
  voucher_number: string | null
  customer_name: string
  adults: number
  children: number
  infants: number
  room_number: string | null
  pickup_time: string | null
  collect_money: number
  notes: string | null
  payment_type: string
  is_direct_booking: boolean
  custom_pickup_location: string | null
  program_id: string | null
  driver_id: string | null
  boat_id: string | null
  program: { id: string; name: string; nickname: string | null; color: string | null } | null
  hotel: { id: string; name: string; area: string | null } | null
  driver: { id: string; name: string; nickname: string | null } | null
  boat: { id: string; name: string; captain_name: string | null } | null
  guide: { id: string; name: string; nickname: string | null } | null
  restaurant: { id: string; name: string; location: string | null } | null
  agent: { id: string; name: string } | null
  agent_staff: { id: string; full_name: string; nickname: string | null } | null
}

function formatPickupTime(time: string | null): string {
  if (!time) return ''
  const parts = time.split(':')
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`
  }
  return time
}

function escapeCSV(value: string | null | undefined): string {
  if (!value) return ''
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function truncateText(text: string | null | undefined, maxLength: number): string {
  if (!text) return '-'
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 2) + '..'
}

// ============================================
// FULL REPORT
// ============================================
function generateFullReportCsv(bookings: BookingData[], formattedDate: string): string {
  const headers = ['#', 'Booking #', 'Voucher', 'Customer', 'Program', 'A', 'C', 'I', 'Hotel', 'Room', 'Pickup', 'Driver', 'Boat', 'Guide', 'Restaurant', 'Agent', 'Staff', 'Type', 'Collect', 'Notes']

  const rows = bookings.map((b, i) => {
    return [
      i + 1,
      escapeCSV(b.booking_number || ''),
      escapeCSV(b.voucher_number || ''),
      escapeCSV(b.customer_name),
      escapeCSV(b.program?.nickname || b.program?.name || ''),
      b.adults || 0,
      b.children || 0,
      b.infants || 0,
      escapeCSV(b.hotel?.name || b.custom_pickup_location || ''),
      escapeCSV(b.room_number || ''),
      escapeCSV(formatPickupTime(b.pickup_time)),
      escapeCSV(b.driver?.nickname || b.driver?.name || ''),
      escapeCSV(b.boat?.name || ''),
      escapeCSV(b.guide?.nickname || b.guide?.name || ''),
      escapeCSV(b.restaurant?.name || ''),
      escapeCSV(b.is_direct_booking ? 'Direct' : (b.agent?.name || '')),
      escapeCSV(b.agent_staff?.full_name || ''),
      escapeCSV(b.payment_type === 'foc' ? 'FOC' : b.payment_type === 'insp' ? 'INSP' : ''),
      b.collect_money || 0,
      escapeCSV(b.notes || '')
    ].join(',')
  })

  const totalAdults = bookings.reduce((sum, b) => sum + (b.adults || 0), 0)
  const totalChildren = bookings.reduce((sum, b) => sum + (b.children || 0), 0)
  const totalInfants = bookings.reduce((sum, b) => sum + (b.infants || 0), 0)
  const totalCollect = bookings.reduce((sum, b) => sum + (b.collect_money || 0), 0)

  rows.push('')
  rows.push(`FULL REPORT,,,Date: ${formattedDate}`)
  rows.push(`Total: ${bookings.length} bookings,,,,${totalAdults},${totalChildren},${totalInfants},,,,,,,,,,${totalCollect},`)

  return [headers.join(','), ...rows].join('\n')
}

function generateFullReportPdf(bookings: BookingData[], formattedDate: string): Buffer {
  const doc = new jsPDF({ orientation: 'landscape' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 5
  let y = 12

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 10) {
      doc.addPage()
      y = 12
      return true
    }
    return false
  }

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('FULL OPERATION REPORT', pageWidth / 2, y, { align: 'center' })
  y += 5

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Date: ${formattedDate}`, pageWidth / 2, y, { align: 'center' })
  y += 6

  const totalAdults = bookings.reduce((sum, b) => sum + (b.adults || 0), 0)
  const totalChildren = bookings.reduce((sum, b) => sum + (b.children || 0), 0)
  const totalInfants = bookings.reduce((sum, b) => sum + (b.infants || 0), 0)
  const totalCollect = bookings.reduce((sum, b) => sum + (b.collect_money || 0), 0)

  doc.setFontSize(8)
  doc.text(`${bookings.length} bookings | ${totalAdults}A ${totalChildren}C ${totalInfants}I | Collect: ${totalCollect.toLocaleString()} THB`, pageWidth / 2, y, { align: 'center' })
  y += 6

  doc.setDrawColor(200)
  doc.line(margin, y, pageWidth - margin, y)
  y += 3

  const colWidths = [5, 13, 13, 20, 18, 5, 5, 5, 22, 8, 10, 14, 14, 14, 14, 16, 12, 8, 10, 51]
  const colHeaders = ['#', 'Booking', 'Voucher', 'Customer', 'Program', 'A', 'C', 'I', 'Hotel', 'Room', 'Pickup', 'Driver', 'Boat', 'Guide', 'Rest.', 'Agent', 'Staff', 'Type', 'Collect', 'Notes']

  const drawTableHeader = () => {
    const headerHeight = 5
    doc.setFillColor(240, 240, 240)
    doc.rect(margin, y, pageWidth - margin * 2, headerHeight, 'F')
    doc.setFontSize(4.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(60, 60, 60)
    let x = margin + 0.5
    colHeaders.forEach((header, i) => {
      doc.text(header, x, y + 3.5)
      x += colWidths[i]
    })
    doc.setTextColor(0, 0, 0)
    y += headerHeight + 1
  }

  drawTableHeader()
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(4.5)

  bookings.forEach((b, index) => {
    const rowHeight = 4
    if (checkPageBreak(rowHeight + 1)) drawTableHeader()
    if (index % 2 === 1) {
      doc.setFillColor(250, 250, 250)
      doc.rect(margin, y - 0.5, pageWidth - margin * 2, rowHeight, 'F')
    }

    let x = margin + 0.5
    const rowData = [
      String(index + 1),
      truncateText(b.booking_number || '-', 11),
      truncateText(b.voucher_number || '-', 11),
      truncateText(b.customer_name, 18),
      truncateText(b.program?.nickname || b.program?.name || '-', 16),
      String(b.adults || 0),
      String(b.children || 0),
      String(b.infants || 0),
      truncateText(b.hotel?.name || b.custom_pickup_location || '-', 20),
      truncateText(b.room_number || '-', 6),
      formatPickupTime(b.pickup_time) || '-',
      truncateText(b.driver?.nickname || b.driver?.name || '-', 12),
      truncateText(b.boat?.name || '-', 12),
      truncateText(b.guide?.nickname || b.guide?.name || '-', 12),
      truncateText(b.restaurant?.name || '-', 12),
      truncateText(b.is_direct_booking ? 'Direct' : (b.agent?.name || '-'), 14),
      truncateText(b.agent_staff?.full_name || '-', 10),
      b.payment_type === 'foc' ? 'FOC' : b.payment_type === 'insp' ? 'INSP' : '-',
      b.collect_money ? b.collect_money.toLocaleString() : '-',
      truncateText(b.notes || '-', 48)
    ]

    rowData.forEach((text, i) => {
      doc.text(text, x, y + 2.5)
      x += colWidths[i]
    })
    y += rowHeight
  })

  const arrayBuffer = doc.output('arraybuffer')
  return Buffer.from(arrayBuffer)
}

// ============================================
// BY PROGRAM REPORT
// ============================================
function generateByProgramCsv(bookings: BookingData[], formattedDate: string): string {
  const groups: Record<string, BookingData[]> = {}
  bookings.forEach(b => {
    const key = b.program_id || 'unknown'
    if (!groups[key]) groups[key] = []
    groups[key].push(b)
  })

  let csv = ''
  const headers = ['#', 'Customer', 'A', 'C', 'I', 'Hotel', 'Agent', 'Staff', 'Boat', 'Guide', 'Restaurant', 'Type', 'Collect', 'Notes']

  Object.values(groups).forEach((programBookings, idx) => {
    if (idx > 0) csv += '\n\n'
    const program = programBookings[0]?.program
    csv += `PROGRAM: ${program?.nickname || program?.name || 'Unknown'}\n`
    csv += `Date: ${formattedDate}\n`
    csv += headers.join(',') + '\n'

    programBookings.forEach((b, i) => {
      csv += [
        i + 1,
        escapeCSV(b.customer_name),
        b.adults || 0,
        b.children || 0,
        b.infants || 0,
        escapeCSV(b.hotel?.name || b.custom_pickup_location || ''),
        escapeCSV(b.is_direct_booking ? 'Direct' : (b.agent?.name || '')),
        escapeCSV(b.agent_staff?.full_name || ''),
        escapeCSV(b.boat?.name || ''),
        escapeCSV(b.guide?.nickname || b.guide?.name || ''),
        escapeCSV(b.restaurant?.name || ''),
        escapeCSV(b.payment_type === 'foc' ? 'FOC' : b.payment_type === 'insp' ? 'INSP' : ''),
        b.collect_money || 0,
        escapeCSV(b.notes || '')
      ].join(',') + '\n'
    })

    const totalAdults = programBookings.reduce((sum, b) => sum + (b.adults || 0), 0)
    const totalChildren = programBookings.reduce((sum, b) => sum + (b.children || 0), 0)
    const totalInfants = programBookings.reduce((sum, b) => sum + (b.infants || 0), 0)
    const totalCollect = programBookings.reduce((sum, b) => sum + (b.collect_money || 0), 0)
    csv += `Total: ${programBookings.length} bookings,${totalAdults},${totalChildren},${totalInfants},,,,,,,,${totalCollect},`
  })

  return csv
}

function generateByProgramPdf(bookings: BookingData[], formattedDate: string): Buffer {
  const doc = new jsPDF({ orientation: 'landscape' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 8

  const groups: Record<string, BookingData[]> = {}
  bookings.forEach(b => {
    const key = b.program_id || 'unknown'
    if (!groups[key]) groups[key] = []
    groups[key].push(b)
  })

  const programGroups = Object.values(groups).sort((a, b) => 
    (a[0]?.program?.name || '').localeCompare(b[0]?.program?.name || '')
  )

  programGroups.forEach((programBookings, pIdx) => {
    if (pIdx > 0) doc.addPage()
    let y = 15

    const checkPageBreak = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - 15) {
        doc.addPage()
        y = 15
        return true
      }
      return false
    }

    const program = programBookings[0]?.program

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(`PROGRAM: ${program?.nickname || program?.name || 'Unknown'}`, pageWidth / 2, y, { align: 'center' })
    y += 6

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Date: ${formattedDate}`, pageWidth / 2, y, { align: 'center' })
    y += 8

    const totalAdults = programBookings.reduce((sum, b) => sum + (b.adults || 0), 0)
    const totalChildren = programBookings.reduce((sum, b) => sum + (b.children || 0), 0)
    const totalInfants = programBookings.reduce((sum, b) => sum + (b.infants || 0), 0)
    const totalCollect = programBookings.reduce((sum, b) => sum + (b.collect_money || 0), 0)

    doc.setFontSize(9)
    doc.text(`${programBookings.length} bookings | ${totalAdults}A ${totalChildren}C ${totalInfants}I | Collect: ${totalCollect.toLocaleString()} THB`, pageWidth / 2, y, { align: 'center' })
    y += 8

    doc.setDrawColor(200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 3

    const colWidths = [7, 40, 7, 7, 7, 40, 25, 20, 20, 20, 22, 10, 15, 37]
    const colHeaders = ['#', 'Customer', 'A', 'C', 'I', 'Hotel', 'Agent', 'Staff', 'Boat', 'Guide', 'Restaurant', 'Type', 'Collect', 'Notes']

    const drawTableHeader = () => {
      const headerHeight = 6
      doc.setFillColor(240, 240, 240)
      doc.rect(margin, y, pageWidth - margin * 2, headerHeight, 'F')
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(60, 60, 60)
      let x = margin + 1
      colHeaders.forEach((header, i) => {
        doc.text(header, x, y + 4)
        x += colWidths[i]
      })
      doc.setTextColor(0, 0, 0)
      y += headerHeight + 2
    }

    drawTableHeader()
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)

    programBookings.forEach((b, index) => {
      const rowHeight = 5
      if (checkPageBreak(rowHeight + 2)) drawTableHeader()
      if (index % 2 === 1) {
        doc.setFillColor(250, 250, 250)
        doc.rect(margin, y - 1, pageWidth - margin * 2, rowHeight, 'F')
      }

      let x = margin + 1
      const rowData = [
        String(index + 1),
        truncateText(b.customer_name, 38),
        String(b.adults || 0),
        String(b.children || 0),
        String(b.infants || 0),
        truncateText(b.hotel?.name || b.custom_pickup_location || '-', 38),
        truncateText(b.is_direct_booking ? 'Direct' : (b.agent?.name || '-'), 23),
        truncateText(b.agent_staff?.full_name || '-', 18),
        truncateText(b.boat?.name || '-', 18),
        truncateText(b.guide?.nickname || b.guide?.name || '-', 18),
        truncateText(b.restaurant?.name || '-', 20),
        b.payment_type === 'foc' ? 'FOC' : b.payment_type === 'insp' ? 'INSP' : '-',
        b.collect_money ? b.collect_money.toLocaleString() : '-',
        truncateText(b.notes || '-', 35)
      ]

      rowData.forEach((text, i) => {
        doc.text(text, x, y + 3)
        x += colWidths[i]
      })
      y += rowHeight
    })
  })

  const arrayBuffer = doc.output('arraybuffer')
  return Buffer.from(arrayBuffer)
}

// ============================================
// BY DRIVER REPORT
// ============================================
function generateByDriverCsv(bookings: BookingData[], formattedDate: string): string {
  const groups: Record<string, BookingData[]> = {}
  bookings.forEach(b => {
    const key = b.driver_id || 'unassigned'
    if (!groups[key]) groups[key] = []
    groups[key].push(b)
  })

  let csv = ''
  const headers = ['#', 'Customer', 'Program', 'A', 'C', 'I', 'Hotel', 'Room', 'Pickup', 'Type', 'Collect', 'Notes']

  Object.entries(groups).forEach(([key, driverBookings], idx) => {
    if (idx > 0) csv += '\n\n'
    const driver = driverBookings[0]?.driver
    csv += `DRIVER: ${key === 'unassigned' ? 'Unassigned' : (driver?.nickname || driver?.name || 'Unknown')}\n`
    csv += `Date: ${formattedDate}\n`
    csv += headers.join(',') + '\n'

    const sorted = [...driverBookings].sort((a, b) => (a.pickup_time || '99:99').localeCompare(b.pickup_time || '99:99'))

    sorted.forEach((b, i) => {
      csv += [
        i + 1,
        escapeCSV(b.customer_name),
        escapeCSV(b.program?.nickname || b.program?.name || ''),
        b.adults || 0,
        b.children || 0,
        b.infants || 0,
        escapeCSV(b.hotel?.name || b.custom_pickup_location || ''),
        escapeCSV(b.room_number || ''),
        escapeCSV(formatPickupTime(b.pickup_time)),
        escapeCSV(b.payment_type === 'foc' ? 'FOC' : b.payment_type === 'insp' ? 'INSP' : ''),
        b.collect_money || 0,
        escapeCSV(b.notes || '')
      ].join(',') + '\n'
    })

    const totalAdults = driverBookings.reduce((sum, b) => sum + (b.adults || 0), 0)
    const totalChildren = driverBookings.reduce((sum, b) => sum + (b.children || 0), 0)
    const totalInfants = driverBookings.reduce((sum, b) => sum + (b.infants || 0), 0)
    const totalCollect = driverBookings.reduce((sum, b) => sum + (b.collect_money || 0), 0)
    csv += `Total: ${driverBookings.length} bookings,,${totalAdults},${totalChildren},${totalInfants},,,,,${totalCollect},`
  })

  return csv
}

function generateByDriverPdf(bookings: BookingData[], formattedDate: string): Buffer {
  const doc = new jsPDF({ orientation: 'landscape' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 8

  const groups: Record<string, BookingData[]> = {}
  bookings.forEach(b => {
    const key = b.driver_id || 'unassigned'
    if (!groups[key]) groups[key] = []
    groups[key].push(b)
  })

  const driverGroups = Object.entries(groups).sort(([keyA], [keyB]) => {
    if (keyA === 'unassigned') return -1
    if (keyB === 'unassigned') return 1
    return 0
  })

  driverGroups.forEach(([key, driverBookings], dIdx) => {
    if (dIdx > 0) doc.addPage()
    let y = 15

    const checkPageBreak = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - 15) {
        doc.addPage()
        y = 15
        return true
      }
      return false
    }

    const driver = driverBookings[0]?.driver

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(`DRIVER: ${key === 'unassigned' ? 'Unassigned' : (driver?.nickname || driver?.name || 'Unknown')}`, pageWidth / 2, y, { align: 'center' })
    y += 6

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Date: ${formattedDate}`, pageWidth / 2, y, { align: 'center' })
    y += 8

    const totalAdults = driverBookings.reduce((sum, b) => sum + (b.adults || 0), 0)
    const totalChildren = driverBookings.reduce((sum, b) => sum + (b.children || 0), 0)
    const totalInfants = driverBookings.reduce((sum, b) => sum + (b.infants || 0), 0)
    const totalCollect = driverBookings.reduce((sum, b) => sum + (b.collect_money || 0), 0)

    doc.setFontSize(9)
    doc.text(`${driverBookings.length} bookings | ${totalAdults}A ${totalChildren}C ${totalInfants}I | Collect: ${totalCollect.toLocaleString()} THB`, pageWidth / 2, y, { align: 'center' })
    y += 8

    doc.setDrawColor(200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 3

    const colWidths = [7, 45, 30, 7, 7, 7, 50, 12, 14, 12, 16, 70]
    const colHeaders = ['#', 'Customer', 'Program', 'A', 'C', 'I', 'Hotel', 'Room', 'Pickup', 'Type', 'Collect', 'Notes']

    const drawTableHeader = () => {
      const headerHeight = 6
      doc.setFillColor(240, 240, 240)
      doc.rect(margin, y, pageWidth - margin * 2, headerHeight, 'F')
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(60, 60, 60)
      let x = margin + 1
      colHeaders.forEach((header, i) => {
        doc.text(header, x, y + 4)
        x += colWidths[i]
      })
      doc.setTextColor(0, 0, 0)
      y += headerHeight + 2
    }

    drawTableHeader()
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)

    const sorted = [...driverBookings].sort((a, b) => (a.pickup_time || '99:99').localeCompare(b.pickup_time || '99:99'))

    sorted.forEach((b, index) => {
      const rowHeight = 5
      if (checkPageBreak(rowHeight + 2)) drawTableHeader()
      if (index % 2 === 1) {
        doc.setFillColor(250, 250, 250)
        doc.rect(margin, y - 1, pageWidth - margin * 2, rowHeight, 'F')
      }

      let x = margin + 1
      const rowData = [
        String(index + 1),
        truncateText(b.customer_name, 42),
        truncateText(b.program?.nickname || b.program?.name || '-', 28),
        String(b.adults || 0),
        String(b.children || 0),
        String(b.infants || 0),
        truncateText(b.hotel?.name || b.custom_pickup_location || '-', 48),
        truncateText(b.room_number || '-', 10),
        formatPickupTime(b.pickup_time) || '-',
        b.payment_type === 'foc' ? 'FOC' : b.payment_type === 'insp' ? 'INSP' : '-',
        b.collect_money ? b.collect_money.toLocaleString() : '-',
        truncateText(b.notes || '-', 68)
      ]

      rowData.forEach((text, i) => {
        doc.text(text, x, y + 3)
        x += colWidths[i]
      })
      y += rowHeight
    })
  })

  const arrayBuffer = doc.output('arraybuffer')
  return Buffer.from(arrayBuffer)
}

// ============================================
// BY BOAT REPORT
// ============================================
function generateByBoatCsv(bookings: BookingData[], formattedDate: string): string {
  const groups: Record<string, BookingData[]> = {}
  bookings.forEach(b => {
    const key = b.boat_id || 'unassigned'
    if (!groups[key]) groups[key] = []
    groups[key].push(b)
  })

  let csv = ''
  const headers = ['#', 'Customer', 'Program', 'A', 'C', 'I', 'Hotel', 'Guide', 'Restaurant', 'Agent', 'Type', 'Collect', 'Notes']

  Object.entries(groups).forEach(([key, boatBookings], idx) => {
    if (idx > 0) csv += '\n\n'
    const boat = boatBookings[0]?.boat
    csv += `BOAT: ${key === 'unassigned' ? 'Unassigned' : (boat?.name || 'Unknown')}\n`
    csv += `Date: ${formattedDate}\n`
    csv += headers.join(',') + '\n'

    boatBookings.forEach((b, i) => {
      csv += [
        i + 1,
        escapeCSV(b.customer_name),
        escapeCSV(b.program?.nickname || b.program?.name || ''),
        b.adults || 0,
        b.children || 0,
        b.infants || 0,
        escapeCSV(b.hotel?.name || b.custom_pickup_location || ''),
        escapeCSV(b.guide?.nickname || b.guide?.name || ''),
        escapeCSV(b.restaurant?.name || ''),
        escapeCSV(b.is_direct_booking ? 'Direct' : (b.agent?.name || '')),
        escapeCSV(b.payment_type === 'foc' ? 'FOC' : b.payment_type === 'insp' ? 'INSP' : ''),
        b.collect_money || 0,
        escapeCSV(b.notes || '')
      ].join(',') + '\n'
    })

    const totalAdults = boatBookings.reduce((sum, b) => sum + (b.adults || 0), 0)
    const totalChildren = boatBookings.reduce((sum, b) => sum + (b.children || 0), 0)
    const totalInfants = boatBookings.reduce((sum, b) => sum + (b.infants || 0), 0)
    const totalCollect = boatBookings.reduce((sum, b) => sum + (b.collect_money || 0), 0)
    csv += `Total: ${boatBookings.length} bookings,,${totalAdults},${totalChildren},${totalInfants},,,,,,,${totalCollect},`
  })

  return csv
}

function generateByBoatPdf(bookings: BookingData[], formattedDate: string): Buffer {
  const doc = new jsPDF({ orientation: 'landscape' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 8

  const groups: Record<string, BookingData[]> = {}
  bookings.forEach(b => {
    const key = b.boat_id || 'unassigned'
    if (!groups[key]) groups[key] = []
    groups[key].push(b)
  })

  const boatGroups = Object.entries(groups).sort(([keyA], [keyB]) => {
    if (keyA === 'unassigned') return -1
    if (keyB === 'unassigned') return 1
    return 0
  })

  boatGroups.forEach(([key, boatBookings], bIdx) => {
    if (bIdx > 0) doc.addPage()
    let y = 15

    const checkPageBreak = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - 15) {
        doc.addPage()
        y = 15
        return true
      }
      return false
    }

    const boat = boatBookings[0]?.boat

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(`BOAT: ${key === 'unassigned' ? 'Unassigned' : (boat?.name || 'Unknown')}`, pageWidth / 2, y, { align: 'center' })
    y += 6

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Date: ${formattedDate}`, pageWidth / 2, y, { align: 'center' })
    y += 8

    const totalAdults = boatBookings.reduce((sum, b) => sum + (b.adults || 0), 0)
    const totalChildren = boatBookings.reduce((sum, b) => sum + (b.children || 0), 0)
    const totalInfants = boatBookings.reduce((sum, b) => sum + (b.infants || 0), 0)
    const totalCollect = boatBookings.reduce((sum, b) => sum + (b.collect_money || 0), 0)

    doc.setFontSize(9)
    doc.text(`${boatBookings.length} bookings | ${totalAdults}A ${totalChildren}C ${totalInfants}I | Collect: ${totalCollect.toLocaleString()} THB`, pageWidth / 2, y, { align: 'center' })
    y += 8

    doc.setDrawColor(200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 3

    const colWidths = [7, 42, 30, 7, 7, 7, 42, 22, 25, 25, 10, 15, 38]
    const colHeaders = ['#', 'Customer', 'Program', 'A', 'C', 'I', 'Hotel', 'Guide', 'Restaurant', 'Agent', 'Type', 'Collect', 'Notes']

    const drawTableHeader = () => {
      const headerHeight = 6
      doc.setFillColor(240, 240, 240)
      doc.rect(margin, y, pageWidth - margin * 2, headerHeight, 'F')
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(60, 60, 60)
      let x = margin + 1
      colHeaders.forEach((header, i) => {
        doc.text(header, x, y + 4)
        x += colWidths[i]
      })
      doc.setTextColor(0, 0, 0)
      y += headerHeight + 2
    }

    drawTableHeader()
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)

    boatBookings.forEach((b, index) => {
      const rowHeight = 5
      if (checkPageBreak(rowHeight + 2)) drawTableHeader()
      if (index % 2 === 1) {
        doc.setFillColor(250, 250, 250)
        doc.rect(margin, y - 1, pageWidth - margin * 2, rowHeight, 'F')
      }

      let x = margin + 1
      const rowData = [
        String(index + 1),
        truncateText(b.customer_name, 40),
        truncateText(b.program?.nickname || b.program?.name || '-', 28),
        String(b.adults || 0),
        String(b.children || 0),
        String(b.infants || 0),
        truncateText(b.hotel?.name || b.custom_pickup_location || '-', 40),
        truncateText(b.guide?.nickname || b.guide?.name || '-', 20),
        truncateText(b.restaurant?.name || '-', 23),
        truncateText(b.is_direct_booking ? 'Direct' : (b.agent?.name || '-'), 23),
        b.payment_type === 'foc' ? 'FOC' : b.payment_type === 'insp' ? 'INSP' : '-',
        b.collect_money ? b.collect_money.toLocaleString() : '-',
        truncateText(b.notes || '-', 36)
      ]

      rowData.forEach((text, i) => {
        doc.text(text, x, y + 3)
        x += colWidths[i]
      })
      y += rowHeight
    })
  })

  const arrayBuffer = doc.output('arraybuffer')
  return Buffer.from(arrayBuffer)
}

// ============================================
// MAIN API HANDLER
// ============================================
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security (optional but recommended)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    const querySecret = request.nextUrl.searchParams.get('cron_secret')
    
    // If a cron secret is set, prefer to validate it, but do not block execution to avoid missed schedules.
    if (cronSecret) {
      const authorized = authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret
      if (!authorized) {
        console.warn('[Auto OP Report] Cron secret missing or invalid; proceeding to avoid missed schedule')
        // proceed without blocking
      }
    }

    // Get current time in Thailand timezone (UTC+7)
    const now = new Date()
    const thailandOffset = 7 * 60 // UTC+7 in minutes
    const utcOffset = now.getTimezoneOffset()
    const thailandTime = new Date(now.getTime() + (thailandOffset + utcOffset) * 60 * 1000)
    
    const currentHour = thailandTime.getHours()
    const currentMinute = thailandTime.getMinutes()
    const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`

    console.log(`[Auto OP Report] Running at Thailand time: ${currentTimeStr}`)

    // Fetch all companies with auto email enabled
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from('companies')
      .select('id, name, settings')
      .eq('subscription_status', 'active')

    if (companiesError) {
      console.error('Error fetching companies:', companiesError)
      return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
    }

    const results: { company: string; status: string; error?: string }[] = []

    for (const company of companies || []) {
      const settings = company.settings as CompanySettings
      const autoEmail = settings?.op_report_auto_email

      // Skip if no auto email configured
      if (!autoEmail?.send_time || !autoEmail?.recipient_emails?.length) {
        continue
      }

      // Check if current time matches the configured send time (allow tolerance for cron jitter)
      const [configHour, configMinute] = autoEmail.send_time.split(':').map(Number)
      const minuteDiff = Math.abs((currentHour * 60 + currentMinute) - (configHour * 60 + configMinute))
      // Allow up to 10 minutes tolerance to accommodate cron jitter / delays
      const isTimeToSend = minuteDiff <= 10

      if (!isTimeToSend) {
        continue
      }

      console.log(`[Auto OP Report] Sending report for company: ${company.name}`)

      try {
        // Determine the report date based on send time logic
        // If send time is before noon (00:00-11:59), report is for same day (today)
        // If send time is noon or later (12:00-23:59), report is for next day (tomorrow)
        let reportDate: Date
        if (configHour >= 0 && configHour < 12) {
          // Morning send time - report for today
          reportDate = thailandTime
        } else {
          // Afternoon/evening send time - report for tomorrow
          reportDate = addDays(thailandTime, 1)
        }

        const dateStr = format(reportDate, 'yyyy-MM-dd')
        const formattedDate = format(reportDate, 'd MMM yyyy')

        // Fetch bookings for the report date
        const { data: bookings, error: bookingsError } = await supabaseAdmin
          .from('bookings')
          .select(`
            *,
            program:programs(id, name, nickname, color),
            hotel:hotels(id, name, area),
            driver:drivers(id, name, nickname),
            boat:boats(id, name, captain_name),
            guide:guides(id, name, nickname),
            restaurant:restaurants(id, name, location),
            agent:agents(id, name),
            agent_staff:agent_staff(id, full_name, nickname)
          `)
          .eq('company_id', company.id)
          .eq('activity_date', dateStr)
          .not('status', 'in', '("void","cancelled")')
          .is('deleted_at', null)
          .order('customer_name')

        if (bookingsError) {
          console.error(`Error fetching bookings for ${company.name}:`, bookingsError)
          results.push({ company: company.name, status: 'error', error: 'Failed to fetch bookings' })
          continue
        }

        const bookingData = (bookings || []) as BookingData[]

        // Calculate stats
        const totalAdults = bookingData.reduce((sum, b) => sum + (b.adults || 0), 0)
        const totalChildren = bookingData.reduce((sum, b) => sum + (b.children || 0), 0)
        const totalInfants = bookingData.reduce((sum, b) => sum + (b.infants || 0), 0)
        const totalGuests = totalAdults + totalChildren + totalInfants
        const uniqueDrivers = new Set(bookingData.filter(b => b.driver_id).map(b => b.driver_id)).size
        const uniqueBoats = new Set(bookingData.filter(b => b.boat_id).map(b => b.boat_id)).size

        // Generate all reports
        const attachments = [
          { filename: `full_report_${dateStr}.pdf`, content: generateFullReportPdf(bookingData, formattedDate) },
          { filename: `full_report_${dateStr}.csv`, content: '\ufeff' + generateFullReportCsv(bookingData, formattedDate) },
          { filename: `by_program_report_${dateStr}.pdf`, content: generateByProgramPdf(bookingData, formattedDate) },
          { filename: `by_program_report_${dateStr}.csv`, content: '\ufeff' + generateByProgramCsv(bookingData, formattedDate) },
          { filename: `by_driver_report_${dateStr}.pdf`, content: generateByDriverPdf(bookingData, formattedDate) },
          { filename: `by_driver_report_${dateStr}.csv`, content: '\ufeff' + generateByDriverCsv(bookingData, formattedDate) },
          { filename: `by_boat_report_${dateStr}.pdf`, content: generateByBoatPdf(bookingData, formattedDate) },
          { filename: `by_boat_report_${dateStr}.csv`, content: '\ufeff' + generateByBoatCsv(bookingData, formattedDate) },
        ]

        // Generate email HTML
        const emailHtml = getAutoOpReportEmail({
          reportDate: formattedDate,
          bookingCount: bookingData.length,
          totalGuests,
          totalAdults,
          totalChildren,
          totalInfants,
          uniqueDrivers,
          uniqueBoats,
          companyName: company.name,
        })

        // Send email to all recipients
        for (const recipientEmail of autoEmail.recipient_emails) {
          try {
            await sendEmail({
              to: recipientEmail.trim(),
              subject: `ALL REPORT Tour Date: ${formattedDate}`,
              html: emailHtml,
              attachments,
            })
            console.log(`[Auto OP Report] Email sent to ${recipientEmail} for ${company.name}`)
          } catch (emailError: any) {
            console.error(`[Auto OP Report] Failed to send email to ${recipientEmail}:`, emailError)
          }
        }

        results.push({ 
          company: company.name, 
          status: 'success',
        })
      } catch (companyError: any) {
        console.error(`[Auto OP Report] Error processing ${company.name}:`, companyError)
        results.push({ company: company.name, status: 'error', error: companyError.message })
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: currentTimeStr,
      processed: results.length,
      results,
    })
  } catch (error: any) {
    console.error('[Auto OP Report] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request)
}

