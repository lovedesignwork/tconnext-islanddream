import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, getOperationReportEmail } from '@/lib/email'
import { formatDate } from '@/lib/utils'
import { jsPDF } from 'jspdf'

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
function generateFullReportCsv(bookings: BookingData[], activityDate: string): string {
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
  rows.push(`FULL REPORT,,,Date: ${activityDate}`)
  rows.push(`Total: ${bookings.length} bookings,,,,${totalAdults},${totalChildren},${totalInfants},,,,,,,,,,${totalCollect},`)

  return [headers.join(','), ...rows].join('\n')
}

function generateFullReportPdf(bookings: BookingData[], activityDate: string): Buffer {
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
  doc.text(`Date: ${activityDate}`, pageWidth / 2, y, { align: 'center' })
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

  // Compact column widths with more space for Notes
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
function generateByProgramCsv(bookings: BookingData[], activityDate: string): string {
  // Group by program
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
    csv += `Date: ${activityDate}\n`
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

function generateByProgramPdf(bookings: BookingData[], activityDate: string): Buffer {
  const doc = new jsPDF({ orientation: 'landscape' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 8

  // Group by program
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
    doc.text(`Date: ${activityDate}`, pageWidth / 2, y, { align: 'center' })
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

    // Compact column widths: #, Customer, A, C, I, Hotel, Agent, Staff, Boat, Guide, Restaurant, Type, Collect, Notes
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
function generateByDriverCsv(bookings: BookingData[], activityDate: string): string {
  // Group by driver
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
    csv += `Date: ${activityDate}\n`
    csv += headers.join(',') + '\n'

    // Sort by pickup time
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

function generateByDriverPdf(bookings: BookingData[], activityDate: string): Buffer {
  const doc = new jsPDF({ orientation: 'landscape' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 8

  // Group by driver
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
    doc.text(`Date: ${activityDate}`, pageWidth / 2, y, { align: 'center' })
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

    // Compact column widths: #, Customer, Program, A, C, I, Hotel, Room, Pickup, Type, Collect, Notes
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

    // Sort by pickup time
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
function generateByBoatCsv(bookings: BookingData[], activityDate: string): string {
  // Group by boat
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
    csv += `Date: ${activityDate}\n`
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

function generateByBoatPdf(bookings: BookingData[], activityDate: string): Buffer {
  const doc = new jsPDF({ orientation: 'landscape' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 8

  // Group by boat
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
    doc.text(`Date: ${activityDate}`, pageWidth / 2, y, { align: 'center' })
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

    // Compact column widths: #, Customer, Program, A, C, I, Hotel, Guide, Restaurant, Agent, Type, Collect, Notes
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
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('auth_id', authUser.id)
      .single()

    if (!userData?.company_id) {
      return NextResponse.json({ error: 'User has no company' }, { status: 400 })
    }

    const body = await request.json()
    const { 
      recipientEmail, 
      reportDate, 
      reportType = 'full-report',
      format = 'pdf'
    } = body

    if (!recipientEmail || !reportDate) {
      return NextResponse.json(
        { error: 'Missing required fields: recipientEmail, reportDate' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(recipientEmail)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', userData.company_id)
      .single()

    const { data: bookings, error: bookingsError } = await supabase
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
      .eq('company_id', userData.company_id)
      .eq('activity_date', reportDate)
      .not('status', 'in', '("void","cancelled")')
      .is('deleted_at', null)
      .order('customer_name')

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      return NextResponse.json(
        { error: 'Failed to fetch bookings' },
        { status: 500 }
      )
    }

    const bookingData = (bookings || []) as BookingData[]
    const totalGuests = bookingData.reduce(
      (sum, b) => sum + (b.adults || 0) + (b.children || 0) + (b.infants || 0),
      0
    )

    let attachmentContent: Buffer | string
    let filename: string

    const formattedDate = formatDate(new Date(reportDate))
    const dateStr = reportDate

    // Generate report based on type
    if (format === 'csv') {
      switch (reportType) {
        case 'by-program':
          attachmentContent = '\ufeff' + generateByProgramCsv(bookingData, formattedDate)
          filename = `by_program_report_${dateStr}.csv`
          break
        case 'by-driver':
          attachmentContent = '\ufeff' + generateByDriverCsv(bookingData, formattedDate)
          filename = `by_driver_report_${dateStr}.csv`
          break
        case 'by-boat':
          attachmentContent = '\ufeff' + generateByBoatCsv(bookingData, formattedDate)
          filename = `by_boat_report_${dateStr}.csv`
          break
        default:
          attachmentContent = '\ufeff' + generateFullReportCsv(bookingData, formattedDate)
          filename = `full_report_${dateStr}.csv`
      }
    } else {
      switch (reportType) {
        case 'by-program':
          attachmentContent = generateByProgramPdf(bookingData, formattedDate)
          filename = `by_program_report_${dateStr}.pdf`
          break
        case 'by-driver':
          attachmentContent = generateByDriverPdf(bookingData, formattedDate)
          filename = `by_driver_report_${dateStr}.pdf`
          break
        case 'by-boat':
          attachmentContent = generateByBoatPdf(bookingData, formattedDate)
          filename = `by_boat_report_${dateStr}.pdf`
          break
        default:
          attachmentContent = generateFullReportPdf(bookingData, formattedDate)
          filename = `full_report_${dateStr}.pdf`
      }
    }

    const emailHtml = getOperationReportEmail({
      reportDate: formattedDate,
      reportType: reportType as 'full-report' | 'by-program' | 'by-driver' | 'by-boat',
      format: format as 'pdf' | 'csv',
      bookingCount: bookingData.length,
      totalGuests,
      companyName: company?.name || 'TConnext'
    })

    const reportTypeLabels: Record<string, string> = {
      'full-report': 'Full Report',
      'by-program': 'By Program',
      'by-driver': 'By Driver',
      'by-boat': 'By Boat'
    }

    await sendEmail({
      to: recipientEmail,
      subject: `Operation Report (${reportTypeLabels[reportType] || 'Full Report'}) - ${formattedDate}`,
      html: emailHtml,
      attachments: [{
        filename,
        content: attachmentContent,
      }]
    })

    return NextResponse.json({ 
      success: true,
      message: `Report sent to ${recipientEmail}`
    })
  } catch (error: any) {
    console.error('Send operation report email error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    )
  }
}
