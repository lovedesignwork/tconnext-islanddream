import { jsPDF } from 'jspdf'
import { formatDate } from '@/lib/utils'
import type { Booking, Program, Driver, Boat, Guide, Restaurant, Hotel, Agent, AgentStaff } from '@/types'

export interface OperationBooking extends Booking {
  program?: Program
  hotel?: Hotel
  driver?: Driver
  boat?: Boat
  guide?: Guide
  restaurant?: Restaurant
  agent?: Agent
  agent_staff?: AgentStaff
  // These come from boat_assignment_locks
  boatGuide?: Guide | null
  boatRestaurant?: Restaurant | null
}

/**
 * Format pickup time to HH:MM only
 */
function formatPickupTime(time: string | null): string {
  if (!time) return ''
  const parts = time.split(':')
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`
  }
  return time
}

/**
 * Escape CSV field
 */
function escapeCSV(value: string): string {
  if (!value) return ''
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Truncate text to fit in column
 */
function truncateText(text: string, maxLength: number): string {
  if (!text) return '-'
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 2) + '..'
}

/**
 * Download CSV file
 */
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}

// ============================================
// BY PROGRAM EXPORTS
// Columns: #, Customer, A, C, I, Hotel, Agent, Agent Staff, Boat, Guide, Restaurant, Type, Collect, Notes
// ============================================

export function generateProgramText(
  program: Program | undefined,
  bookings: OperationBooking[],
  activityDate: Date
): string {
  const totalAdults = bookings.reduce((sum, b) => sum + (b.adults || 0), 0)
  const totalChildren = bookings.reduce((sum, b) => sum + (b.children || 0), 0)
  const totalInfants = bookings.reduce((sum, b) => sum + (b.infants || 0), 0)
  const totalCollect = bookings.reduce((sum, b) => sum + (b.collect_money || 0), 0)

  let text = `📋 PROGRAM REPORT\n`
  text += `━━━━━━━━━━━━━━━━━━━━━━\n`
  text += `🎯 Program: ${program?.nickname || program?.name || 'Unknown'}\n`
  text += `📅 Date: ${formatDate(activityDate)}\n`
  text += `👥 ${bookings.length} bookings | ${totalAdults}A ${totalChildren}C ${totalInfants}I\n`
  if (totalCollect > 0) text += `💰 Total Collect: ${totalCollect.toLocaleString()} THB\n`
  text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`

  bookings.forEach((b, i) => {
    const displayGuide = b.boatGuide || b.guide
    const displayRestaurant = b.boatRestaurant || b.restaurant
    text += `${i + 1}. ${b.customer_name}\n`
    text += `   👥 ${b.adults || 0}A ${b.children || 0}C ${b.infants || 0}I\n`
    text += `   🏨 ${b.hotel?.name || b.custom_pickup_location || '-'}\n`
    if (b.agent?.name) text += `   🏢 Agent: ${b.agent.name}\n`
    if (b.agent_staff?.full_name) text += `   👤 Staff: ${b.agent_staff.full_name}\n`
    if (b.boat?.name) text += `   ⛵ Boat: ${b.boat.name}\n`
    if (displayGuide?.name) text += `   🧑‍🏫 Guide: ${displayGuide.nickname || displayGuide.name}\n`
    if (displayRestaurant?.name) text += `   🍽️ Restaurant: ${displayRestaurant.name}\n`
    if (b.collect_money) text += `   💰 Collect: ${b.collect_money.toLocaleString()} THB\n`
    if (b.notes) text += `   📝 ${b.notes}\n`
    text += `\n`
  })

  return text
}

export function generateProgramCsv(
  program: Program | undefined,
  bookings: OperationBooking[],
  activityDate: Date
): string {
  const headers = ['#', 'Customer', 'A', 'C', 'I', 'Hotel', 'Agent', 'Agent Staff', 'Boat', 'Guide', 'Restaurant', 'Type', 'Collect', 'Notes']

  const rows = bookings.map((b, i) => {
    const displayGuide = b.boatGuide || b.guide
    const displayRestaurant = b.boatRestaurant || b.restaurant
    return [
      i + 1,
      escapeCSV(b.customer_name),
      b.adults || 0,
      b.children || 0,
      b.infants || 0,
      escapeCSV(b.hotel?.name || b.custom_pickup_location || ''),
      escapeCSV(b.is_direct_booking ? 'Direct' : (b.agent?.name || '')),
      escapeCSV(b.agent_staff?.full_name || ''),
      escapeCSV(b.boat?.name || ''),
      escapeCSV(displayGuide?.nickname || displayGuide?.name || ''),
      escapeCSV(displayRestaurant?.name || ''),
      escapeCSV(b.payment_type === 'foc' ? 'FOC' : b.payment_type === 'insp' ? 'INSP' : ''),
      b.collect_money || 0,
      escapeCSV(b.notes || '')
    ].join(',')
  })

  // Summary
  const totalAdults = bookings.reduce((sum, b) => sum + (b.adults || 0), 0)
  const totalChildren = bookings.reduce((sum, b) => sum + (b.children || 0), 0)
  const totalInfants = bookings.reduce((sum, b) => sum + (b.infants || 0), 0)
  const totalCollect = bookings.reduce((sum, b) => sum + (b.collect_money || 0), 0)

  rows.push('')
  rows.push(`Program: ${program?.nickname || program?.name || 'Unknown'},Date: ${formatDate(activityDate)}`)
  rows.push(`Total: ${bookings.length} bookings,${totalAdults},${totalChildren},${totalInfants},,,,,,,,${totalCollect},`)

  return [headers.join(','), ...rows].join('\n')
}

export function generateProgramPdf(
  program: Program | undefined,
  bookings: OperationBooking[],
  activityDate: Date,
  filename?: string
): void {
  const doc = new jsPDF({ orientation: 'landscape' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 8
  let y = 15

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 15) {
      doc.addPage()
      y = 15
      return true
    }
    return false
  }

  // Title
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(`PROGRAM: ${program?.nickname || program?.name || 'Unknown'}`, pageWidth / 2, y, { align: 'center' })
  y += 6

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Date: ${formatDate(activityDate)}`, pageWidth / 2, y, { align: 'center' })
  y += 8

  const totalAdults = bookings.reduce((sum, b) => sum + (b.adults || 0), 0)
  const totalChildren = bookings.reduce((sum, b) => sum + (b.children || 0), 0)
  const totalInfants = bookings.reduce((sum, b) => sum + (b.infants || 0), 0)
  const totalCollect = bookings.reduce((sum, b) => sum + (b.collect_money || 0), 0)

  doc.setFontSize(9)
  doc.text(`${bookings.length} bookings | ${totalAdults}A ${totalChildren}C ${totalInfants}I | Collect: ${totalCollect.toLocaleString()} THB`, pageWidth / 2, y, { align: 'center' })
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

  bookings.forEach((b, index) => {
    const rowHeight = 5
    if (checkPageBreak(rowHeight + 2)) drawTableHeader()
    if (index % 2 === 1) {
      doc.setFillColor(250, 250, 250)
      doc.rect(margin, y - 1, pageWidth - margin * 2, rowHeight, 'F')
    }

    const displayGuide = b.boatGuide || b.guide
    const displayRestaurant = b.boatRestaurant || b.restaurant

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
      truncateText(displayGuide?.nickname || displayGuide?.name || '-', 18),
      truncateText(displayRestaurant?.name || '-', 20),
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

  const dateStr = activityDate.toISOString().split('T')[0]
  const programName = (program?.nickname || program?.name || 'unknown').replace(/[^a-zA-Z0-9]/g, '_')
  doc.save(filename || `program_${programName}_${dateStr}.pdf`)
}

export function generateAllProgramsCsv(
  programsData: { program: Program | undefined; bookings: OperationBooking[] }[],
  activityDate: Date
): string {
  let csv = ''
  programsData.forEach(({ program, bookings }, idx) => {
    if (idx > 0) csv += '\n\n'
    csv += generateProgramCsv(program, bookings, activityDate)
  })
  return csv
}

export function generateAllProgramsPdf(
  programsData: { program: Program | undefined; bookings: OperationBooking[] }[],
  activityDate: Date
): void {
  const doc = new jsPDF({ orientation: 'landscape' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 8

  programsData.forEach(({ program, bookings }, pIdx) => {
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

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(`PROGRAM: ${program?.nickname || program?.name || 'Unknown'}`, pageWidth / 2, y, { align: 'center' })
    y += 6

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Date: ${formatDate(activityDate)}`, pageWidth / 2, y, { align: 'center' })
    y += 8

    const totalAdults = bookings.reduce((sum, b) => sum + (b.adults || 0), 0)
    const totalChildren = bookings.reduce((sum, b) => sum + (b.children || 0), 0)
    const totalInfants = bookings.reduce((sum, b) => sum + (b.infants || 0), 0)
    const totalCollect = bookings.reduce((sum, b) => sum + (b.collect_money || 0), 0)

    doc.setFontSize(9)
    doc.text(`${bookings.length} bookings | ${totalAdults}A ${totalChildren}C ${totalInfants}I | Collect: ${totalCollect.toLocaleString()} THB`, pageWidth / 2, y, { align: 'center' })
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

    bookings.forEach((b, index) => {
      const rowHeight = 5
      if (checkPageBreak(rowHeight + 2)) drawTableHeader()
      if (index % 2 === 1) {
        doc.setFillColor(250, 250, 250)
        doc.rect(margin, y - 1, pageWidth - margin * 2, rowHeight, 'F')
      }

      const displayGuide = b.boatGuide || b.guide
      const displayRestaurant = b.boatRestaurant || b.restaurant

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
        truncateText(displayGuide?.nickname || displayGuide?.name || '-', 18),
        truncateText(displayRestaurant?.name || '-', 20),
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

  const dateStr = activityDate.toISOString().split('T')[0]
  doc.save(`all_programs_${dateStr}.pdf`)
}

// ============================================
// BY DRIVER EXPORTS
// Columns: #, Customer, Program, A, C, I, Hotel, Room, Pickup, Type, Collect, Notes
// ============================================

export function generateDriverText(
  driver: Driver | undefined,
  bookings: OperationBooking[],
  activityDate: Date
): string {
  const totalAdults = bookings.reduce((sum, b) => sum + (b.adults || 0), 0)
  const totalChildren = bookings.reduce((sum, b) => sum + (b.children || 0), 0)
  const totalInfants = bookings.reduce((sum, b) => sum + (b.infants || 0), 0)
  const totalCollect = bookings.reduce((sum, b) => sum + (b.collect_money || 0), 0)

  let text = `📋 DRIVER PICKUP LIST\n`
  text += `━━━━━━━━━━━━━━━━━━━━━━\n`
  text += `🚗 Driver: ${driver?.nickname || driver?.name || 'Unassigned'}\n`
  text += `📅 Date: ${formatDate(activityDate)}\n`
  text += `👥 ${bookings.length} bookings | ${totalAdults}A ${totalChildren}C ${totalInfants}I\n`
  if (totalCollect > 0) text += `💰 Total Collect: ${totalCollect.toLocaleString()} THB\n`
  text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`

  // Sort by pickup time
  const sorted = [...bookings].sort((a, b) => (a.pickup_time || '99:99').localeCompare(b.pickup_time || '99:99'))

  sorted.forEach((b, i) => {
    text += `${i + 1}. ${b.customer_name}\n`
    text += `   🎯 ${b.program?.nickname || b.program?.name || '-'}\n`
    text += `   👥 ${b.adults || 0}A ${b.children || 0}C ${b.infants || 0}I\n`
    text += `   🏨 ${b.hotel?.name || b.custom_pickup_location || '-'}`
    if (b.room_number) text += ` | Room: ${b.room_number}`
    text += `\n`
    text += `   ⏰ Pickup: ${formatPickupTime(b.pickup_time) || 'TBD'}\n`
    if (b.collect_money) text += `   💰 Collect: ${b.collect_money.toLocaleString()} THB\n`
    if (b.notes) text += `   📝 ${b.notes}\n`
    text += `\n`
  })

  return text
}

export function generateDriverCsv(
  driver: Driver | undefined,
  bookings: OperationBooking[],
  activityDate: Date
): string {
  const headers = ['#', 'Customer', 'Program', 'A', 'C', 'I', 'Hotel', 'Room', 'Pickup', 'Type', 'Collect', 'Notes']

  const sorted = [...bookings].sort((a, b) => (a.pickup_time || '99:99').localeCompare(b.pickup_time || '99:99'))

  const rows = sorted.map((b, i) => [
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
  ].join(','))

  const totalAdults = bookings.reduce((sum, b) => sum + (b.adults || 0), 0)
  const totalChildren = bookings.reduce((sum, b) => sum + (b.children || 0), 0)
  const totalInfants = bookings.reduce((sum, b) => sum + (b.infants || 0), 0)
  const totalCollect = bookings.reduce((sum, b) => sum + (b.collect_money || 0), 0)

  rows.push('')
  rows.push(`Driver: ${driver?.nickname || driver?.name || 'Unassigned'},Date: ${formatDate(activityDate)}`)
  rows.push(`Total: ${bookings.length} bookings,,${totalAdults},${totalChildren},${totalInfants},,,,,${totalCollect},`)

  return [headers.join(','), ...rows].join('\n')
}

export function generateDriverPdf(
  driver: Driver | undefined,
  bookings: OperationBooking[],
  activityDate: Date,
  filename?: string
): void {
  const doc = new jsPDF({ orientation: 'landscape' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 8
  let y = 15

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 15) {
      doc.addPage()
      y = 15
      return true
    }
    return false
  }

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(`DRIVER: ${driver?.nickname || driver?.name || 'Unassigned'}`, pageWidth / 2, y, { align: 'center' })
  y += 6

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Date: ${formatDate(activityDate)}`, pageWidth / 2, y, { align: 'center' })
  y += 8

  const totalAdults = bookings.reduce((sum, b) => sum + (b.adults || 0), 0)
  const totalChildren = bookings.reduce((sum, b) => sum + (b.children || 0), 0)
  const totalInfants = bookings.reduce((sum, b) => sum + (b.infants || 0), 0)
  const totalCollect = bookings.reduce((sum, b) => sum + (b.collect_money || 0), 0)

  doc.setFontSize(9)
  doc.text(`${bookings.length} bookings | ${totalAdults}A ${totalChildren}C ${totalInfants}I | Collect: ${totalCollect.toLocaleString()} THB`, pageWidth / 2, y, { align: 'center' })
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

  const sorted = [...bookings].sort((a, b) => (a.pickup_time || '99:99').localeCompare(b.pickup_time || '99:99'))

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

  const dateStr = activityDate.toISOString().split('T')[0]
  const driverName = (driver?.nickname || driver?.name || 'unassigned').replace(/[^a-zA-Z0-9]/g, '_')
  doc.save(filename || `driver_${driverName}_${dateStr}.pdf`)
}

export function generateAllDriversCsv(
  driversData: { driver: Driver | undefined; bookings: OperationBooking[] }[],
  activityDate: Date
): string {
  let csv = ''
  driversData.forEach(({ driver, bookings }, idx) => {
    if (idx > 0) csv += '\n\n'
    csv += generateDriverCsv(driver, bookings, activityDate)
  })
  return csv
}

export function generateAllDriversPdf(
  driversData: { driver: Driver | undefined; bookings: OperationBooking[] }[],
  activityDate: Date
): void {
  const doc = new jsPDF({ orientation: 'landscape' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 8

  driversData.forEach(({ driver, bookings }, dIdx) => {
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

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(`DRIVER: ${driver?.nickname || driver?.name || 'Unassigned'}`, pageWidth / 2, y, { align: 'center' })
    y += 6

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Date: ${formatDate(activityDate)}`, pageWidth / 2, y, { align: 'center' })
    y += 8

    const totalAdults = bookings.reduce((sum, b) => sum + (b.adults || 0), 0)
    const totalChildren = bookings.reduce((sum, b) => sum + (b.children || 0), 0)
    const totalInfants = bookings.reduce((sum, b) => sum + (b.infants || 0), 0)
    const totalCollect = bookings.reduce((sum, b) => sum + (b.collect_money || 0), 0)

    doc.setFontSize(9)
    doc.text(`${bookings.length} bookings | ${totalAdults}A ${totalChildren}C ${totalInfants}I | Collect: ${totalCollect.toLocaleString()} THB`, pageWidth / 2, y, { align: 'center' })
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

    const sorted = [...bookings].sort((a, b) => (a.pickup_time || '99:99').localeCompare(b.pickup_time || '99:99'))

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

  const dateStr = activityDate.toISOString().split('T')[0]
  doc.save(`all_drivers_${dateStr}.pdf`)
}

// ============================================
// BY BOAT EXPORTS
// Columns: #, Customer, Program, A, C, I, Hotel, Guide, Restaurant, Agent, Type, Collect, Notes
// ============================================

export function generateBoatText(
  boat: Boat | undefined,
  bookings: OperationBooking[],
  activityDate: Date,
  boatGuide?: Guide | null,
  boatRestaurant?: Restaurant | null
): string {
  const totalAdults = bookings.reduce((sum, b) => sum + (b.adults || 0), 0)
  const totalChildren = bookings.reduce((sum, b) => sum + (b.children || 0), 0)
  const totalInfants = bookings.reduce((sum, b) => sum + (b.infants || 0), 0)
  const totalCollect = bookings.reduce((sum, b) => sum + (b.collect_money || 0), 0)

  let text = `⛵ BOAT ASSIGNMENT\n`
  text += `━━━━━━━━━━━━━━━━━━━━━━\n`
  text += `🚤 Boat: ${boat?.name || 'Unassigned'}\n`
  if (boat?.captain_name) text += `👨‍✈️ Captain: ${boat.captain_name}\n`
  text += `📅 Date: ${formatDate(activityDate)}\n`
  text += `👥 ${bookings.length} bookings | ${totalAdults}A ${totalChildren}C ${totalInfants}I\n`
  if (boatGuide) text += `🧑‍🏫 Guide: ${boatGuide.nickname || boatGuide.name}\n`
  if (boatRestaurant) text += `🍽️ Restaurant: ${boatRestaurant.name}\n`
  if (totalCollect > 0) text += `💰 Total Collect: ${totalCollect.toLocaleString()} THB\n`
  text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`

  bookings.forEach((b, i) => {
    text += `${i + 1}. ${b.customer_name}\n`
    text += `   🎯 ${b.program?.nickname || b.program?.name || '-'}\n`
    text += `   👥 ${b.adults || 0}A ${b.children || 0}C ${b.infants || 0}I\n`
    text += `   🏨 ${b.hotel?.name || b.custom_pickup_location || '-'}\n`
    if (b.agent?.name) text += `   🏢 Agent: ${b.is_direct_booking ? 'Direct' : b.agent.name}\n`
    if (b.collect_money) text += `   💰 Collect: ${b.collect_money.toLocaleString()} THB\n`
    if (b.notes) text += `   📝 ${b.notes}\n`
    text += `\n`
  })

  return text
}

export function generateBoatCsv(
  boat: Boat | undefined,
  bookings: OperationBooking[],
  activityDate: Date,
  boatGuide?: Guide | null,
  boatRestaurant?: Restaurant | null
): string {
  const headers = ['#', 'Customer', 'Program', 'A', 'C', 'I', 'Hotel', 'Guide', 'Restaurant', 'Agent', 'Type', 'Collect', 'Notes']

  const rows = bookings.map((b, i) => [
    i + 1,
    escapeCSV(b.customer_name),
    escapeCSV(b.program?.nickname || b.program?.name || ''),
    b.adults || 0,
    b.children || 0,
    b.infants || 0,
    escapeCSV(b.hotel?.name || b.custom_pickup_location || ''),
    escapeCSV(boatGuide?.nickname || boatGuide?.name || ''),
    escapeCSV(boatRestaurant?.name || ''),
    escapeCSV(b.is_direct_booking ? 'Direct' : (b.agent?.name || '')),
    escapeCSV(b.payment_type === 'foc' ? 'FOC' : b.payment_type === 'insp' ? 'INSP' : ''),
    b.collect_money || 0,
    escapeCSV(b.notes || '')
  ].join(','))

  const totalAdults = bookings.reduce((sum, b) => sum + (b.adults || 0), 0)
  const totalChildren = bookings.reduce((sum, b) => sum + (b.children || 0), 0)
  const totalInfants = bookings.reduce((sum, b) => sum + (b.infants || 0), 0)
  const totalCollect = bookings.reduce((sum, b) => sum + (b.collect_money || 0), 0)

  rows.push('')
  rows.push(`Boat: ${boat?.name || 'Unassigned'}${boat?.captain_name ? ` (Captain: ${boat.captain_name})` : ''},Date: ${formatDate(activityDate)}`)
  rows.push(`Total: ${bookings.length} bookings,,${totalAdults},${totalChildren},${totalInfants},,,,,,${totalCollect},`)

  return [headers.join(','), ...rows].join('\n')
}

export function generateBoatPdf(
  boat: Boat | undefined,
  bookings: OperationBooking[],
  activityDate: Date,
  boatGuide?: Guide | null,
  boatRestaurant?: Restaurant | null,
  filename?: string
): void {
  const doc = new jsPDF({ orientation: 'landscape' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 8
  let y = 15

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 15) {
      doc.addPage()
      y = 15
      return true
    }
    return false
  }

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(`BOAT: ${boat?.name || 'Unassigned'}${boat?.captain_name ? ` (Captain: ${boat.captain_name})` : ''}`, pageWidth / 2, y, { align: 'center' })
  y += 6

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Date: ${formatDate(activityDate)}`, pageWidth / 2, y, { align: 'center' })
  y += 6

  if (boatGuide || boatRestaurant) {
    const info = []
    if (boatGuide) info.push(`Guide: ${boatGuide.nickname || boatGuide.name}`)
    if (boatRestaurant) info.push(`Restaurant: ${boatRestaurant.name}`)
    doc.text(info.join(' | '), pageWidth / 2, y, { align: 'center' })
    y += 6
  }

  const totalAdults = bookings.reduce((sum, b) => sum + (b.adults || 0), 0)
  const totalChildren = bookings.reduce((sum, b) => sum + (b.children || 0), 0)
  const totalInfants = bookings.reduce((sum, b) => sum + (b.infants || 0), 0)
  const totalCollect = bookings.reduce((sum, b) => sum + (b.collect_money || 0), 0)

  doc.setFontSize(9)
  doc.text(`${bookings.length} bookings | ${totalAdults}A ${totalChildren}C ${totalInfants}I | Collect: ${totalCollect.toLocaleString()} THB`, pageWidth / 2, y, { align: 'center' })
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

  bookings.forEach((b, index) => {
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
      truncateText(boatGuide?.nickname || boatGuide?.name || '-', 20),
      truncateText(boatRestaurant?.name || '-', 23),
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

  const dateStr = activityDate.toISOString().split('T')[0]
  const boatName = (boat?.name || 'unassigned').replace(/[^a-zA-Z0-9]/g, '_')
  doc.save(filename || `boat_${boatName}_${dateStr}.pdf`)
}

export function generateAllBoatsCsv(
  boatsData: { boat: Boat | undefined; bookings: OperationBooking[]; guide?: Guide | null; restaurant?: Restaurant | null }[],
  activityDate: Date
): string {
  let csv = ''
  boatsData.forEach(({ boat, bookings, guide, restaurant }, idx) => {
    if (idx > 0) csv += '\n\n'
    csv += generateBoatCsv(boat, bookings, activityDate, guide, restaurant)
  })
  return csv
}

export function generateAllBoatsPdf(
  boatsData: { boat: Boat | undefined; bookings: OperationBooking[]; guide?: Guide | null; restaurant?: Restaurant | null }[],
  activityDate: Date
): void {
  const doc = new jsPDF({ orientation: 'landscape' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 8

  boatsData.forEach(({ boat, bookings, guide: boatGuide, restaurant: boatRestaurant }, bIdx) => {
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

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(`BOAT: ${boat?.name || 'Unassigned'}${boat?.captain_name ? ` (Captain: ${boat.captain_name})` : ''}`, pageWidth / 2, y, { align: 'center' })
    y += 6

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Date: ${formatDate(activityDate)}`, pageWidth / 2, y, { align: 'center' })
    y += 6

    if (boatGuide || boatRestaurant) {
      const info = []
      if (boatGuide) info.push(`Guide: ${boatGuide.nickname || boatGuide.name}`)
      if (boatRestaurant) info.push(`Restaurant: ${boatRestaurant.name}`)
      doc.text(info.join(' | '), pageWidth / 2, y, { align: 'center' })
      y += 6
    }

    const totalAdults = bookings.reduce((sum, b) => sum + (b.adults || 0), 0)
    const totalChildren = bookings.reduce((sum, b) => sum + (b.children || 0), 0)
    const totalInfants = bookings.reduce((sum, b) => sum + (b.infants || 0), 0)
    const totalCollect = bookings.reduce((sum, b) => sum + (b.collect_money || 0), 0)

    doc.setFontSize(9)
    doc.text(`${bookings.length} bookings | ${totalAdults}A ${totalChildren}C ${totalInfants}I | Collect: ${totalCollect.toLocaleString()} THB`, pageWidth / 2, y, { align: 'center' })
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

    bookings.forEach((b, index) => {
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
        truncateText(boatGuide?.nickname || boatGuide?.name || '-', 20),
        truncateText(boatRestaurant?.name || '-', 23),
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

  const dateStr = activityDate.toISOString().split('T')[0]
  doc.save(`all_boats_${dateStr}.pdf`)
}

// ============================================
// FULL REPORT EXPORTS
// All columns: #, Booking #, Voucher, Customer, Program, A, C, I, Hotel, Room, Pickup, Driver, Boat, Guide, Restaurant, Agent, Staff, Type, Collect, Notes
// ============================================

export function generateFullReportText(
  bookings: OperationBooking[],
  activityDate: Date
): string {
  const totalAdults = bookings.reduce((sum, b) => sum + (b.adults || 0), 0)
  const totalChildren = bookings.reduce((sum, b) => sum + (b.children || 0), 0)
  const totalInfants = bookings.reduce((sum, b) => sum + (b.infants || 0), 0)
  const totalCollect = bookings.reduce((sum, b) => sum + (b.collect_money || 0), 0)

  let text = `📋 FULL OPERATION REPORT\n`
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
  text += `📅 Date: ${formatDate(activityDate)}\n`
  text += `👥 ${bookings.length} bookings | ${totalAdults}A ${totalChildren}C ${totalInfants}I\n`
  if (totalCollect > 0) text += `💰 Total Collect: ${totalCollect.toLocaleString()} THB\n`
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`

  bookings.forEach((b, i) => {
    const displayGuide = b.boatGuide || b.guide
    const displayRestaurant = b.boatRestaurant || b.restaurant
    
    text += `${i + 1}. ${b.customer_name}`
    if (b.booking_number) text += ` (${b.booking_number})`
    if (b.voucher_number) text += ` [${b.voucher_number}]`
    text += `\n`
    text += `   🎯 Program: ${b.program?.nickname || b.program?.name || '-'}\n`
    text += `   👥 ${b.adults || 0}A ${b.children || 0}C ${b.infants || 0}I\n`
    text += `   🏨 Hotel: ${b.hotel?.name || b.custom_pickup_location || '-'}`
    if (b.room_number) text += ` | Room: ${b.room_number}`
    text += `\n`
    text += `   ⏰ Pickup: ${formatPickupTime(b.pickup_time) || 'TBD'}\n`
    if (b.driver?.name) text += `   🚗 Driver: ${b.driver.nickname || b.driver.name}\n`
    if (b.boat?.name) text += `   ⛵ Boat: ${b.boat.name}\n`
    if (displayGuide?.name) text += `   🧑‍🏫 Guide: ${displayGuide.nickname || displayGuide.name}\n`
    if (displayRestaurant?.name) text += `   🍽️ Restaurant: ${displayRestaurant.name}\n`
    text += `   🏢 Agent: ${b.is_direct_booking ? 'Direct' : (b.agent?.name || '-')}`
    if (b.agent_staff?.full_name) text += ` | Staff: ${b.agent_staff.full_name}`
    text += `\n`
    if (b.payment_type !== 'regular') text += `   📌 Type: ${b.payment_type.toUpperCase()}\n`
    if (b.collect_money) text += `   💰 Collect: ${b.collect_money.toLocaleString()} THB\n`
    if (b.notes) text += `   📝 Notes: ${b.notes}\n`
    text += `\n`
  })

  return text
}

export function generateFullReportCsv(
  bookings: OperationBooking[],
  activityDate: Date
): string {
  const headers = ['#', 'Booking #', 'Voucher', 'Customer', 'Program', 'A', 'C', 'I', 'Hotel', 'Room', 'Pickup', 'Driver', 'Boat', 'Guide', 'Restaurant', 'Agent', 'Staff', 'Type', 'Collect', 'Notes']

  const rows = bookings.map((b, i) => {
    const displayGuide = b.boatGuide || b.guide
    const displayRestaurant = b.boatRestaurant || b.restaurant
    
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
      escapeCSV(displayGuide?.nickname || displayGuide?.name || ''),
      escapeCSV(displayRestaurant?.name || ''),
      escapeCSV(b.is_direct_booking ? 'Direct' : (b.agent?.name || '')),
      escapeCSV(b.agent_staff?.full_name || ''),
      escapeCSV(b.payment_type === 'foc' ? 'FOC' : b.payment_type === 'insp' ? 'INSP' : ''),
      b.collect_money || 0,
      escapeCSV(b.notes || '')
    ].join(',')
  })

  // Summary
  const totalAdults = bookings.reduce((sum, b) => sum + (b.adults || 0), 0)
  const totalChildren = bookings.reduce((sum, b) => sum + (b.children || 0), 0)
  const totalInfants = bookings.reduce((sum, b) => sum + (b.infants || 0), 0)
  const totalCollect = bookings.reduce((sum, b) => sum + (b.collect_money || 0), 0)

  rows.push('')
  rows.push(`FULL REPORT,,,Date: ${formatDate(activityDate)}`)
  rows.push(`Total: ${bookings.length} bookings,,,,${totalAdults},${totalChildren},${totalInfants},,,,,,,,,,${totalCollect},`)

  return [headers.join(','), ...rows].join('\n')
}

/**
 * Wrap text to fit within a given width, returning array of lines
 */
function wrapText(text: string, maxChars: number): string[] {
  if (!text || text.length <= maxChars) return [text || '-']
  
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''
  
  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxChars) {
      currentLine = currentLine ? `${currentLine} ${word}` : word
    } else {
      if (currentLine) lines.push(currentLine)
      currentLine = word.length > maxChars ? word.substring(0, maxChars - 2) + '..' : word
    }
  }
  if (currentLine) lines.push(currentLine)
  
  // Limit to 2 lines max
  if (lines.length > 2) {
    lines[1] = lines[1].substring(0, maxChars - 2) + '..'
    return lines.slice(0, 2)
  }
  return lines
}

export function generateFullReportPdf(
  bookings: OperationBooking[],
  activityDate: Date
): void {
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

  // Title
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('FULL OPERATION REPORT', pageWidth / 2, y, { align: 'center' })
  y += 5

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Date: ${formatDate(activityDate)}`, pageWidth / 2, y, { align: 'center' })
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

  // Table - compact columns for full report (20 columns with Booking #)
  // Total width available: ~277mm (A4 landscape - margins)
  // Optimized column widths to fit A4 landscape with more space for Notes
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
    // Check if we need 2 lines for this row (for long text fields)
    const customerLines = wrapText(b.customer_name, 18)
    const hotelLines = wrapText(b.hotel?.name || b.custom_pickup_location || '-', 20)
    const notesLines = wrapText(b.notes || '-', 48)
    const needsTwoLines = customerLines.length > 1 || hotelLines.length > 1 || notesLines.length > 1
    const rowHeight = needsTwoLines ? 7 : 4

    if (checkPageBreak(rowHeight + 1)) drawTableHeader()
    if (index % 2 === 1) {
      doc.setFillColor(250, 250, 250)
      doc.rect(margin, y - 0.5, pageWidth - margin * 2, rowHeight, 'F')
    }

    const displayGuide = b.boatGuide || b.guide
    const displayRestaurant = b.boatRestaurant || b.restaurant

    let x = margin + 0.5
    
    // Row data - first line
    const rowData = [
      String(index + 1),
      truncateText(b.booking_number || '-', 11),
      truncateText(b.voucher_number || '-', 11),
      customerLines[0],
      truncateText(b.program?.nickname || b.program?.name || '-', 16),
      String(b.adults || 0),
      String(b.children || 0),
      String(b.infants || 0),
      hotelLines[0],
      truncateText(b.room_number || '-', 6),
      formatPickupTime(b.pickup_time) || '-',
      truncateText(b.driver?.nickname || b.driver?.name || '-', 12),
      truncateText(b.boat?.name || '-', 12),
      truncateText(displayGuide?.nickname || displayGuide?.name || '-', 12),
      truncateText(displayRestaurant?.name || '-', 12),
      truncateText(b.is_direct_booking ? 'Direct' : (b.agent?.name || '-'), 14),
      truncateText(b.agent_staff?.full_name || '-', 10),
      b.payment_type === 'foc' ? 'FOC' : b.payment_type === 'insp' ? 'INSP' : '-',
      b.collect_money ? b.collect_money.toLocaleString() : '-',
      notesLines[0]
    ]

    rowData.forEach((text, i) => {
      doc.text(text, x, y + 2.5)
      x += colWidths[i]
    })

    // Second line if needed
    if (needsTwoLines) {
      y += 3
      x = margin + 0.5
      const secondLineData = [
        '',
        '',
        '',
        customerLines[1] || '',
        '',
        '',
        '',
        '',
        hotelLines[1] || '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        notesLines[1] || ''
      ]
      secondLineData.forEach((text, i) => {
        if (text) doc.text(text, x, y + 2.5)
        x += colWidths[i]
      })
    }

    y += needsTwoLines ? 4 : 4
  })

  // Summary footer
  y += 2
  checkPageBreak(8)
  doc.setDrawColor(200)
  doc.line(margin, y, pageWidth - margin, y)
  y += 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.text(`Total: ${bookings.length} bookings | ${totalAdults}A ${totalChildren}C ${totalInfants}I | Collect: ${totalCollect.toLocaleString()} THB`, margin, y)

  const dateStr = activityDate.toISOString().split('T')[0]
  doc.save(`full_report_${dateStr}.pdf`)
}
