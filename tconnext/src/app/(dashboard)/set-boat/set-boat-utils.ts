import { jsPDF } from 'jspdf'
import { formatDate } from '@/lib/utils'
import type { Boat, Guide, Restaurant } from '@/types'
import type { BoatBooking } from './customer-card'

interface BoatAssignmentData {
  boat: Boat
  bookings: BoatBooking[]
  guide: Guide | null | undefined
  restaurant: Restaurant | null | undefined
}

/**
 * Generate boat assignment text for a single boat
 */
export function generateBoatText(
  boat: Boat,
  bookings: BoatBooking[],
  guide: Guide | null | undefined,
  restaurant: Restaurant | null | undefined,
  activityDate: Date
): string {
  const totalGuests = bookings.reduce((sum, b) => 
    sum + (b.adults || 0) + (b.children || 0) + (b.infants || 0), 0
  )

  let text = `⛵ BOAT ASSIGNMENT\n`
  text += `━━━━━━━━━━━━━━━━━━━━━━\n`
  text += `🚤 Boat: ${boat.name}\n`
  if (boat.captain_name) {
    text += `👨‍✈️ Captain: ${boat.captain_name}\n`
  }
  text += `📅 Date: ${formatDate(activityDate)}\n`
  text += `👥 Capacity: ${totalGuests}/${boat.capacity} passengers\n`
  text += `━━━━━━━━━━━━━━━━━━━━━━\n`
  
  if (guide) {
    text += `🧑‍🏫 Guide: ${guide.name}`
    if (guide.nickname) text += ` (${guide.nickname})`
    if (guide.languages && guide.languages.length > 0) {
      text += ` - ${guide.languages.join(', ')}`
    }
    text += `\n`
    if (guide.phone) text += `   📞 ${guide.phone}\n`
  } else {
    text += `🧑‍🏫 Guide: Not assigned\n`
  }

  if (restaurant) {
    text += `🍽️ Restaurant: ${restaurant.name}`
    if (restaurant.location) text += ` - ${restaurant.location}`
    text += `\n`
  } else {
    text += `🍽️ Restaurant: Not assigned\n`
  }
  
  text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`

  if (bookings.length === 0) {
    text += `No passengers assigned.\n`
    return text
  }

  // Group bookings by program
  const bookingsByProgram: Record<string, { programName: string; bookings: BoatBooking[] }> = {}
  bookings.forEach(booking => {
    const programId = booking.program_id
    const programName = booking.program?.nickname || booking.program?.name || 'Unknown Program'
    if (!bookingsByProgram[programId]) {
      bookingsByProgram[programId] = { programName, bookings: [] }
    }
    bookingsByProgram[programId].bookings.push(booking)
  })

  Object.values(bookingsByProgram).forEach(({ programName, bookings: programBookings }) => {
    const programGuests = programBookings.reduce((sum, b) => 
      sum + (b.adults || 0) + (b.children || 0) + (b.infants || 0), 0
    )
    text += `🎯 ${programName} (${programGuests} pax)\n`
    text += `───────────────────\n`
    
    programBookings.forEach((booking, index) => {
      const guests = (booking.adults || 0) + (booking.children || 0) + (booking.infants || 0)
      
      text += `${index + 1}. ${booking.customer_name}\n`
      text += `   👥 ${guests} pax`
      text += ` (${booking.adults || 0}A`
      if (booking.children) text += ` ${booking.children}C`
      if (booking.infants) text += ` ${booking.infants}I`
      text += `)\n`
      if (booking.hotel?.name) {
        text += `   🏨 ${booking.hotel.name}\n`
      }
      if (booking.collect_money && booking.collect_money > 0) {
        text += `   💰 Collect: ${booking.collect_money.toLocaleString()} THB\n`
      }
      if (booking.notes) {
        text += `   📝 ${booking.notes}\n`
      }
    })
    text += `\n`
  })

  text += `━━━━━━━━━━━━━━━━━━━━━━\n`
  text += `Total: ${bookings.length} booking(s), ${totalGuests} passenger(s)\n`

  return text
}

/**
 * Generate boat assignment text for all boats
 */
export function generateAllBoatText(
  boatsData: BoatAssignmentData[],
  activityDate: Date
): string {
  const validBoats = boatsData.filter(d => d.bookings.length > 0)
  
  if (validBoats.length === 0) {
    return 'No boat assignments for this date.'
  }

  let text = `⛵ ALL BOAT ASSIGNMENTS\n`
  text += `📅 Date: ${formatDate(activityDate)}\n`
  text += `🚤 Boats: ${validBoats.length}\n`
  text += `════════════════════════════════════════\n\n`

  validBoats.forEach((data, index) => {
    text += generateBoatText(data.boat, data.bookings, data.guide, data.restaurant, activityDate)
    if (index < validBoats.length - 1) {
      text += `\n\n`
    }
  })

  return text
}

/**
 * Generate PDF for a single boat
 */
export function generateBoatPdf(
  boat: Boat,
  bookings: BoatBooking[],
  guide: Guide | null | undefined,
  restaurant: Restaurant | null | undefined,
  activityDate: Date
): void {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  let y = 20

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage()
      y = 20
    }
  }

  // Title
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('BOAT ASSIGNMENT', pageWidth / 2, y, { align: 'center' })
  y += 10

  // Boat info
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`Boat: ${boat.name}`, margin, y)
  y += 6

  if (boat.captain_name) {
    doc.text(`Captain: ${boat.captain_name}`, margin, y)
    y += 6
  }

  doc.text(`Date: ${formatDate(activityDate)}`, margin, y)
  y += 6

  const totalGuests = bookings.reduce((sum, b) => 
    sum + (b.adults || 0) + (b.children || 0) + (b.infants || 0), 0
  )
  doc.text(`Passengers: ${totalGuests}/${boat.capacity}`, margin, y)
  y += 8

  // Guide info
  doc.setDrawColor(200)
  doc.line(margin, y, pageWidth - margin, y)
  y += 6

  if (guide) {
    let guideText = `Guide: ${guide.name}`
    if (guide.nickname) guideText += ` (${guide.nickname})`
    doc.text(guideText, margin, y)
    y += 5
    if (guide.languages && guide.languages.length > 0) {
      doc.setFontSize(10)
      doc.text(`Languages: ${guide.languages.join(', ')}`, margin + 5, y)
      doc.setFontSize(12)
      y += 5
    }
    if (guide.phone) {
      doc.setFontSize(10)
      doc.text(`Phone: ${guide.phone}`, margin + 5, y)
      doc.setFontSize(12)
      y += 5
    }
  } else {
    doc.text('Guide: Not assigned', margin, y)
    y += 5
  }

  y += 3

  // Restaurant info
  if (restaurant) {
    let restText = `Restaurant: ${restaurant.name}`
    if (restaurant.location) restText += ` - ${restaurant.location}`
    doc.text(restText, margin, y)
  } else {
    doc.text('Restaurant: Not assigned', margin, y)
  }
  y += 8

  doc.line(margin, y, pageWidth - margin, y)
  y += 8

  if (bookings.length === 0) {
    doc.text('No passengers assigned.', margin, y)
  } else {
    // Group bookings by program
    const bookingsByProgram: Record<string, { programName: string; bookings: BoatBooking[] }> = {}
    bookings.forEach(booking => {
      const programId = booking.program_id
      const programName = booking.program?.nickname || booking.program?.name || 'Unknown Program'
      if (!bookingsByProgram[programId]) {
        bookingsByProgram[programId] = { programName, bookings: [] }
      }
      bookingsByProgram[programId].bookings.push(booking)
    })

    Object.values(bookingsByProgram).forEach(({ programName, bookings: programBookings }) => {
      checkPageBreak(20)
      
      const programGuests = programBookings.reduce((sum, b) => 
        sum + (b.adults || 0) + (b.children || 0) + (b.infants || 0), 0
      )

      // Program header
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text(`${programName} (${programGuests} pax)`, margin, y)
      y += 6

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)

      programBookings.forEach((booking, index) => {
        checkPageBreak(25)

        const guests = (booking.adults || 0) + (booking.children || 0) + (booking.infants || 0)

        // Customer name
        doc.setFont('helvetica', 'bold')
        doc.text(`${index + 1}. ${booking.customer_name}`, margin + 5, y)
        y += 4

        doc.setFont('helvetica', 'normal')

        // Guests
        let guestText = `${guests} pax (${booking.adults || 0}A`
        if (booking.children) guestText += ` ${booking.children}C`
        if (booking.infants) guestText += ` ${booking.infants}I`
        guestText += `)`
        doc.text(guestText, margin + 10, y)
        y += 4

        // Hotel
        if (booking.hotel?.name) {
          doc.text(`Hotel: ${booking.hotel.name}`, margin + 10, y)
          y += 4
        }

        // Collect money
        if (booking.collect_money && booking.collect_money > 0) {
          doc.text(`Collect: ${booking.collect_money.toLocaleString()} THB`, margin + 10, y)
          y += 4
        }

        // Remark/Notes
        if (booking.notes) {
          doc.text(`Remark: ${booking.notes}`, margin + 10, y)
          y += 4
        }

        y += 2
      })

      y += 4
    })

    // Summary
    y += 5
    checkPageBreak(15)
    doc.setDrawColor(200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 6
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(`Total: ${bookings.length} booking(s), ${totalGuests} passenger(s)`, margin, y)
  }

  // Save PDF
  const dateStr = activityDate.toISOString().split('T')[0]
  const boatName = boat.name.replace(/[^a-zA-Z0-9]/g, '_')
  doc.save(`boat_${boatName}_${dateStr}.pdf`)
}

/**
 * Generate PDF for all boats
 */
export function generateAllBoatPdf(
  boatsData: BoatAssignmentData[],
  activityDate: Date
): void {
  const validBoats = boatsData.filter(d => d.bookings.length > 0)
  
  if (validBoats.length === 0) {
    return
  }

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20

  validBoats.forEach((data, boatIndex) => {
    if (boatIndex > 0) {
      doc.addPage()
    }

    let y = 20

    const checkPageBreak = (neededHeight: number) => {
      if (y + neededHeight > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage()
        y = 20
      }
    }

    const { boat, bookings, guide, restaurant } = data

    // Title
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('BOAT ASSIGNMENT', pageWidth / 2, y, { align: 'center' })
    y += 10

    // Boat info
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Boat: ${boat.name}`, margin, y)
    y += 6

    if (boat.captain_name) {
      doc.text(`Captain: ${boat.captain_name}`, margin, y)
      y += 6
    }

    doc.text(`Date: ${formatDate(activityDate)}`, margin, y)
    y += 6

    const totalGuests = bookings.reduce((sum, b) => 
      sum + (b.adults || 0) + (b.children || 0) + (b.infants || 0), 0
    )
    doc.text(`Passengers: ${totalGuests}/${boat.capacity}`, margin, y)
    y += 8

    // Guide info
    doc.setDrawColor(200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 6

    if (guide) {
      let guideText = `Guide: ${guide.name}`
      if (guide.nickname) guideText += ` (${guide.nickname})`
      doc.text(guideText, margin, y)
      y += 5
      if (guide.languages && guide.languages.length > 0) {
        doc.setFontSize(10)
        doc.text(`Languages: ${guide.languages.join(', ')}`, margin + 5, y)
        doc.setFontSize(12)
        y += 5
      }
    } else {
      doc.text('Guide: Not assigned', margin, y)
      y += 5
    }

    y += 3

    // Restaurant info
    if (restaurant) {
      let restText = `Restaurant: ${restaurant.name}`
      if (restaurant.location) restText += ` - ${restaurant.location}`
      doc.text(restText, margin, y)
    } else {
      doc.text('Restaurant: Not assigned', margin, y)
    }
    y += 8

    doc.line(margin, y, pageWidth - margin, y)
    y += 8

    // Group bookings by program
    const bookingsByProgram: Record<string, { programName: string; bookings: BoatBooking[] }> = {}
    bookings.forEach(booking => {
      const programId = booking.program_id
      const programName = booking.program?.nickname || booking.program?.name || 'Unknown Program'
      if (!bookingsByProgram[programId]) {
        bookingsByProgram[programId] = { programName, bookings: [] }
      }
      bookingsByProgram[programId].bookings.push(booking)
    })

    Object.values(bookingsByProgram).forEach(({ programName, bookings: programBookings }) => {
      checkPageBreak(20)
      
      const programGuests = programBookings.reduce((sum, b) => 
        sum + (b.adults || 0) + (b.children || 0) + (b.infants || 0), 0
      )

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text(`${programName} (${programGuests} pax)`, margin, y)
      y += 6

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)

      programBookings.forEach((booking, index) => {
        checkPageBreak(25)

        const guests = (booking.adults || 0) + (booking.children || 0) + (booking.infants || 0)

        doc.setFont('helvetica', 'bold')
        doc.text(`${index + 1}. ${booking.customer_name}`, margin + 5, y)
        y += 4

        doc.setFont('helvetica', 'normal')

        let guestText = `${guests} pax (${booking.adults || 0}A`
        if (booking.children) guestText += ` ${booking.children}C`
        if (booking.infants) guestText += ` ${booking.infants}I`
        guestText += `)`
        doc.text(guestText, margin + 10, y)
        y += 4

        if (booking.hotel?.name) {
          doc.text(`Hotel: ${booking.hotel.name}`, margin + 10, y)
          y += 4
        }

        // Collect money
        if (booking.collect_money && booking.collect_money > 0) {
          doc.text(`Collect: ${booking.collect_money.toLocaleString()} THB`, margin + 10, y)
          y += 4
        }

        // Remark/Notes
        if (booking.notes) {
          doc.text(`Remark: ${booking.notes}`, margin + 10, y)
          y += 4
        }

        y += 2
      })

      y += 4
    })

    y += 5
    checkPageBreak(15)
    doc.setDrawColor(200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 6
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(`Total: ${bookings.length} booking(s), ${totalGuests} passenger(s)`, margin, y)
  })

  // Save PDF
  const dateStr = activityDate.toISOString().split('T')[0]
  doc.save(`all_boat_assignments_${dateStr}.pdf`)
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

