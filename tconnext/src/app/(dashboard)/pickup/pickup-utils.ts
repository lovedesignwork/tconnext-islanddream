import { jsPDF } from 'jspdf'
import { formatDate } from '@/lib/utils'
import type { Driver } from '@/types'
import type { PickupBooking } from './customer-card'

interface DriverPickupData {
  driver: Driver
  bookings: PickupBooking[]
}

/**
 * Generate pickup text for a single driver
 */
export function generatePickupText(
  driver: Driver, 
  bookings: PickupBooking[], 
  activityDate: Date
): string {
  const usedSlots = bookings.reduce((sum, b) => 
    sum + (b.adults || 0) + (b.children || 0) + (b.infants || 0), 0
  )
  const capacity = driver.car_capacity || 4

  let text = `📋 PICKUP LIST\n`
  text += `━━━━━━━━━━━━━━━━━━━━━━\n`
  text += `🚗 Driver: ${driver.name}${driver.nickname ? ` (${driver.nickname})` : ''}\n`
  if (driver.vehicle_info) {
    text += `🚙 Vehicle: ${driver.vehicle_info}\n`
  }
  text += `📅 Date: ${formatDate(activityDate)}\n`
  text += `👥 Capacity: ${usedSlots}/${capacity} slots\n`
  text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`

  if (bookings.length === 0) {
    text += `No customers assigned.\n`
    return text
  }

  // Sort bookings by pickup time, then by hotel
  const sortedBookings = [...bookings].sort((a, b) => {
    const timeA = a.pickup_time || '99:99'
    const timeB = b.pickup_time || '99:99'
    if (timeA !== timeB) return timeA.localeCompare(timeB)
    const hotelA = a.hotel?.name || a.custom_pickup_location || ''
    const hotelB = b.hotel?.name || b.custom_pickup_location || ''
    return hotelA.localeCompare(hotelB)
  })

  sortedBookings.forEach((booking, index) => {
    const guests = (booking.adults || 0) + (booking.children || 0) + (booking.infants || 0)
    const hotelName = booking.hotel?.name || booking.custom_pickup_location || 'Unknown'
    
    text += `${index + 1}. ${booking.customer_name}\n`
    text += `   🏨 ${hotelName}`
    if (booking.room_number) {
      text += ` | Room: ${booking.room_number}`
    }
    text += `\n`
    text += `   ⏰ ${booking.pickup_time || 'TBD'} | 👥 ${guests} pax`
    text += ` (${booking.adults || 0}A`
    if (booking.children) text += ` ${booking.children}C`
    if (booking.infants) text += ` ${booking.infants}I`
    text += `)\n`
    if (booking.customer_whatsapp) {
      text += `   📞 ${booking.customer_whatsapp}\n`
    }
    if (booking.program?.name) {
      text += `   🎯 ${booking.program.name}\n`
    }
    if (index < sortedBookings.length - 1) {
      text += `   ───────────────────\n`
    }
  })

  text += `\n━━━━━━━━━━━━━━━━━━━━━━\n`
  text += `Total: ${bookings.length} booking(s), ${usedSlots} guest(s)\n`

  return text
}

/**
 * Generate pickup text for all drivers
 */
export function generateAllPickupText(
  driversData: DriverPickupData[],
  activityDate: Date
): string {
  const validDrivers = driversData.filter(d => d.bookings.length > 0)
  
  if (validDrivers.length === 0) {
    return 'No pickup assignments for this date.'
  }

  let text = `📋 ALL PICKUP LISTS\n`
  text += `📅 Date: ${formatDate(activityDate)}\n`
  text += `🚗 Drivers: ${validDrivers.length}\n`
  text += `════════════════════════════════════════\n\n`

  validDrivers.forEach((data, index) => {
    text += generatePickupText(data.driver, data.bookings, activityDate)
    if (index < validDrivers.length - 1) {
      text += `\n\n`
    }
  })

  return text
}

/**
 * Generate PDF for a single driver
 */
export function generatePickupPdf(
  driver: Driver,
  bookings: PickupBooking[],
  activityDate: Date
): void {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  let y = 20

  // Helper function to add new page if needed
  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage()
      y = 20
    }
  }

  // Title
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('PICKUP LIST', pageWidth / 2, y, { align: 'center' })
  y += 10

  // Driver info
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`Driver: ${driver.name}${driver.nickname ? ` (${driver.nickname})` : ''}`, margin, y)
  y += 6

  if (driver.vehicle_info) {
    doc.text(`Vehicle: ${driver.vehicle_info}`, margin, y)
    y += 6
  }

  doc.text(`Date: ${formatDate(activityDate)}`, margin, y)
  y += 6

  const usedSlots = bookings.reduce((sum, b) => 
    sum + (b.adults || 0) + (b.children || 0) + (b.infants || 0), 0
  )
  const capacity = driver.car_capacity || 4
  doc.text(`Capacity: ${usedSlots}/${capacity} slots`, margin, y)
  y += 10

  // Separator line
  doc.setDrawColor(200)
  doc.line(margin, y, pageWidth - margin, y)
  y += 8

  if (bookings.length === 0) {
    doc.text('No customers assigned.', margin, y)
  } else {
    // Sort bookings by pickup time, then by hotel
    const sortedBookings = [...bookings].sort((a, b) => {
      const timeA = a.pickup_time || '99:99'
      const timeB = b.pickup_time || '99:99'
      if (timeA !== timeB) return timeA.localeCompare(timeB)
      const hotelA = a.hotel?.name || a.custom_pickup_location || ''
      const hotelB = b.hotel?.name || b.custom_pickup_location || ''
      return hotelA.localeCompare(hotelB)
    })

    sortedBookings.forEach((booking, index) => {
      checkPageBreak(35)

      const guests = (booking.adults || 0) + (booking.children || 0) + (booking.infants || 0)
      const hotelName = booking.hotel?.name || booking.custom_pickup_location || 'Unknown'

      // Customer name
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text(`${index + 1}. ${booking.customer_name}`, margin, y)
      y += 5

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)

      // Hotel & Room
      let hotelText = `Hotel: ${hotelName}`
      if (booking.room_number) {
        hotelText += ` | Room: ${booking.room_number}`
      }
      doc.text(hotelText, margin + 5, y)
      y += 4

      // Pickup time & Guests
      let pickupText = `Pickup: ${booking.pickup_time || 'TBD'} | Guests: ${guests} pax`
      pickupText += ` (${booking.adults || 0}A`
      if (booking.children) pickupText += ` ${booking.children}C`
      if (booking.infants) pickupText += ` ${booking.infants}I`
      pickupText += `)`
      doc.text(pickupText, margin + 5, y)
      y += 4

      // Phone
      if (booking.customer_whatsapp) {
        doc.text(`Phone: ${booking.customer_whatsapp}`, margin + 5, y)
        y += 4
      }

      // Program
      if (booking.program?.name) {
        doc.text(`Program: ${booking.program.name}`, margin + 5, y)
        y += 4
      }

      y += 4

      // Separator between customers
      if (index < sortedBookings.length - 1) {
        doc.setDrawColor(230)
        doc.line(margin + 5, y - 2, pageWidth - margin - 5, y - 2)
      }
    })

    // Summary
    y += 5
    checkPageBreak(15)
    doc.setDrawColor(200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 6
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(`Total: ${bookings.length} booking(s), ${usedSlots} guest(s)`, margin, y)
  }

  // Save PDF
  const dateStr = activityDate.toISOString().split('T')[0]
  const driverName = driver.name.replace(/[^a-zA-Z0-9]/g, '_')
  doc.save(`pickup_${driverName}_${dateStr}.pdf`)
}

/**
 * Generate PDF for all drivers
 */
export function generateAllPickupPdf(
  driversData: DriverPickupData[],
  activityDate: Date
): void {
  const validDrivers = driversData.filter(d => d.bookings.length > 0)
  
  if (validDrivers.length === 0) {
    return
  }

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20

  validDrivers.forEach((data, driverIndex) => {
    if (driverIndex > 0) {
      doc.addPage()
    }

    let y = 20

    // Helper function to add new page if needed
    const checkPageBreak = (neededHeight: number) => {
      if (y + neededHeight > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage()
        y = 20
      }
    }

    const { driver, bookings } = data

    // Title
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('PICKUP LIST', pageWidth / 2, y, { align: 'center' })
    y += 10

    // Driver info
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Driver: ${driver.name}${driver.nickname ? ` (${driver.nickname})` : ''}`, margin, y)
    y += 6

    if (driver.vehicle_info) {
      doc.text(`Vehicle: ${driver.vehicle_info}`, margin, y)
      y += 6
    }

    doc.text(`Date: ${formatDate(activityDate)}`, margin, y)
    y += 6

    const usedSlots = bookings.reduce((sum, b) => 
      sum + (b.adults || 0) + (b.children || 0) + (b.infants || 0), 0
    )
    const capacity = driver.car_capacity || 4
    doc.text(`Capacity: ${usedSlots}/${capacity} slots`, margin, y)
    y += 10

    // Separator line
    doc.setDrawColor(200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 8

    // Sort bookings
    const sortedBookings = [...bookings].sort((a, b) => {
      const timeA = a.pickup_time || '99:99'
      const timeB = b.pickup_time || '99:99'
      if (timeA !== timeB) return timeA.localeCompare(timeB)
      const hotelA = a.hotel?.name || a.custom_pickup_location || ''
      const hotelB = b.hotel?.name || b.custom_pickup_location || ''
      return hotelA.localeCompare(hotelB)
    })

    sortedBookings.forEach((booking, index) => {
      checkPageBreak(35)

      const guests = (booking.adults || 0) + (booking.children || 0) + (booking.infants || 0)
      const hotelName = booking.hotel?.name || booking.custom_pickup_location || 'Unknown'

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text(`${index + 1}. ${booking.customer_name}`, margin, y)
      y += 5

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)

      let hotelText = `Hotel: ${hotelName}`
      if (booking.room_number) {
        hotelText += ` | Room: ${booking.room_number}`
      }
      doc.text(hotelText, margin + 5, y)
      y += 4

      let pickupText = `Pickup: ${booking.pickup_time || 'TBD'} | Guests: ${guests} pax`
      pickupText += ` (${booking.adults || 0}A`
      if (booking.children) pickupText += ` ${booking.children}C`
      if (booking.infants) pickupText += ` ${booking.infants}I`
      pickupText += `)`
      doc.text(pickupText, margin + 5, y)
      y += 4

      if (booking.customer_whatsapp) {
        doc.text(`Phone: ${booking.customer_whatsapp}`, margin + 5, y)
        y += 4
      }

      if (booking.program?.name) {
        doc.text(`Program: ${booking.program.name}`, margin + 5, y)
        y += 4
      }

      y += 4

      if (index < sortedBookings.length - 1) {
        doc.setDrawColor(230)
        doc.line(margin + 5, y - 2, pageWidth - margin - 5, y - 2)
      }
    })

    y += 5
    checkPageBreak(15)
    doc.setDrawColor(200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 6
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(`Total: ${bookings.length} booking(s), ${usedSlots} guest(s)`, margin, y)
  })

  // Save PDF
  const dateStr = activityDate.toISOString().split('T')[0]
  doc.save(`all_pickup_lists_${dateStr}.pdf`)
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










