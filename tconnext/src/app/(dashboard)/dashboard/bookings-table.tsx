"use client"

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { TimeInput } from '@/components/ui/time-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { BookingDetailsDialog } from './booking-details-dialog'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  MoreHorizontal,
  Pencil,
  Ban,
  Mail,
  ArrowUpDown,
  FileText,
  Eye,
  Clock,
  Receipt,
  Copy,
  MapPin,
  ChevronLeft,
  ChevronRight,
  FileStack,
} from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { Spinner } from '@/components/ui/spinner'
import type { BookingWithRelations, CompanySettings, ComeDirectLocation } from '@/types'

// Format date as DD/MM/YY
function formatShortDate(date: string | Date): string {
  const d = new Date(date)
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear().toString().slice(-2)
  return `${day}/${month}/${year}`
}

// Get day name (SUNDAY, MONDAY, etc.)
function getDayName(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
}

// Format date as "Dec 7, 2025"
function formatActivityDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  })
}

// Split name into first and last
function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) {
    return { first: parts[0], last: '' }
  }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

// Format booking number into prefix and number
function splitBookingNumber(bookingNumber: string): { prefix: string; number: string } {
  const match = bookingNumber.match(/^([A-Z]+-?)(\d+)$/)
  if (match) {
    return { prefix: match[1], number: match[2] }
  }
  return { prefix: '', number: bookingNumber }
}

// Format pickup time as HH:MM (remove seconds)
function formatPickupTime(time: string | null): string {
  if (!time) return ''
  // Handle both "08:00:00" and "08:00" formats
  const parts = time.split(':')
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`
  }
  return time
}

// Add 15 minutes to time and return formatted range
function getPickupTimeRange(time: string): string {
  const formatted = formatPickupTime(time)
  const [hours, minutes] = formatted.split(':').map(Number)
  const endMinutes = minutes + 15
  const endHours = hours + Math.floor(endMinutes / 60)
  const endMins = endMinutes % 60
  const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`
  
  // Convert to 12-hour format for display
  const formatTo12Hour = (h: number, m: number) => {
    const period = h >= 12 ? 'PM' : 'AM'
    const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h
    return `${hour12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`
  }
  
  return `${formatTo12Hour(hours, minutes)} - ${formatTo12Hour(endHours, endMins)}`
}

// Generate pickup email template
function generatePickupEmailTemplate(
  booking: BookingWithRelations,
  companyName: string,
  pickupContactInfo: string
): string {
  const { first: firstName, last: lastName } = splitName(booking.customer_name)
  const activityDate = new Date(booking.activity_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  const programName = (booking.program as any)?.name || 'Tour'
  const hotelName = (booking.hotel as any)?.name || booking.custom_pickup_location || 'Your Hotel'
  const pickupTimeRange = booking.pickup_time ? getPickupTimeRange(booking.pickup_time) : ''
  
  let guestInfo = `Adult Guest: ${booking.adults}`
  if (booking.children > 0) {
    guestInfo += `\nChild Guest: ${booking.children}`
  }
  if (booking.infants > 0) {
    guestInfo += `\nInfant Guest: ${booking.infants}`
  }

  return `Dear ${firstName}${lastName ? ' ' + lastName : ''},

Thank you for your booking with us, here is the details of your booking:

Tour Date: ${activityDate}

Program: ${programName}

Name: ${booking.customer_name}

${guestInfo}

Your Pick up time: ${pickupTimeRange}

at ${hotelName} - LOBBY / ENTRANCE

Remark:

For fast meet up with our driver. Please wait in your lobby / in front of your hotel entrance. If you did not meet our driver please try to contact us on:

${pickupContactInfo}

See you soon!

${companyName}`
}

// Generate come direct email template
function generateComeDirectEmailTemplate(
  booking: BookingWithRelations,
  companyName: string,
  comeDirectLocation: ComeDirectLocation | null
): string {
  const { first: firstName, last: lastName } = splitName(booking.customer_name)
  const activityDate = new Date(booking.activity_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  const programName = (booking.program as any)?.name || 'Tour'
  const pickupTimeRange = booking.pickup_time ? getPickupTimeRange(booking.pickup_time) : ''
  
  let guestInfo = `Adult Guest: ${booking.adults}`
  if (booking.children > 0) {
    guestInfo += `\nChild Guest: ${booking.children}`
  }
  if (booking.infants > 0) {
    guestInfo += `\nInfant Guest: ${booking.infants}`
  }

  const locationName = comeDirectLocation?.name || 'Meeting Point'
  const locationAddress = comeDirectLocation?.address || ''
  const mapsUrl = comeDirectLocation?.google_maps_url || ''
  const contactInfo = comeDirectLocation?.contact_info || ''

  return `Dear ${firstName}${lastName ? ' ' + lastName : ''},

Thank you for your booking with us, here is the details of your booking:

Tour Date: ${activityDate}

Program: ${programName}

Name: ${booking.customer_name}

${guestInfo}

Please come directly to: ${locationName}
${locationAddress ? `Address: ${locationAddress}` : ''}
${mapsUrl ? `Google Maps: ${mapsUrl}` : ''}

Arrival Time: ${pickupTimeRange}

${contactInfo ? `Contact: ${contactInfo}` : ''}

See you soon!

${companyName}`
}

interface BookingsTableProps {
  bookings: BookingWithRelations[]
  onRefresh: () => void
  companyName?: string
  companySettings?: CompanySettings
}

const statusColors = {
  confirmed: 'default',
  pending: 'secondary',
  cancelled: 'destructive',
  completed: 'outline',
  void: 'destructive',
} as const

const statusLabels = {
  confirmed: 'Confirmed',
  pending: 'Pending',
  cancelled: 'Cancelled',
  completed: 'Completed',
  void: 'Void',
} as const

export function BookingsTable({ bookings, onRefresh, companyName = '', companySettings }: BookingsTableProps) {
  const { user } = useAuth()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [voidBooking, setVoidBooking] = useState<BookingWithRelations | null>(null)
  const [voidReason, setVoidReason] = useState('')
  const [isVoiding, setIsVoiding] = useState(false)
  const [sortField, setSortField] = useState<string>('activity_date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [detailsBooking, setDetailsBooking] = useState<BookingWithRelations | null>(null)
  const [pickupEditBooking, setPickupEditBooking] = useState<BookingWithRelations | null>(null)
  const [pickupTime, setPickupTime] = useState('08:00')
  const [isComeDirect, setIsComeDirect] = useState(false)
  const [isSavingPickup, setIsSavingPickup] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(30)

  // Bulk invoice state
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false)
  const [isCreatingInvoices, setIsCreatingInvoices] = useState(false)
  const [invoicePreview, setInvoicePreview] = useState<{
    agentId: string
    agentName: string
    bookings: BookingWithRelations[]
    totalAmount: number
  }[]>([])
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [invoiceDueDays, setInvoiceDueDays] = useState<number>(30)

  // Due date options for invoice creation
  const dueDateOptions = [
    { value: 1, label: '1 Day' },
    { value: 3, label: '3 Days' },
    { value: 7, label: '7 Days' },
    { value: 14, label: '14 Days' },
    { value: 21, label: '21 Days' },
    { value: 30, label: '30 Days' },
    { value: 45, label: '45 Days' },
    { value: 60, label: '60 Days' },
  ]

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(bookings.map(b => b.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id])
    } else {
      setSelectedIds(selectedIds.filter(i => i !== id))
    }
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleVoid = async () => {
    if (!voidBooking || !voidReason.trim()) {
      toast.error('Please provide a reason for voiding this booking')
      return
    }

    setIsVoiding(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('bookings')
      .update({ 
        status: 'void',
        void_reason: voidReason.trim(),
        deleted_at: new Date().toISOString(),
        last_modified_by: user?.id || null,
        last_modified_by_name: user?.name || null,
      })
      .eq('id', voidBooking.id)

    if (error) {
      toast.error('Failed to void booking')
    } else {
      toast.success('Booking voided successfully')
      onRefresh()
    }
    setIsVoiding(false)
    setVoidBooking(null)
    setVoidReason('')
  }

  const handleSavePickupTime = async () => {
    if (!pickupEditBooking) return

    setIsSavingPickup(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('bookings')
      .update({ 
        pickup_time: pickupTime,
        is_come_direct: isComeDirect,
        last_modified_by: user?.id || null,
        last_modified_by_name: user?.name || null,
      })
      .eq('id', pickupEditBooking.id)

    if (error) {
      toast.error('Failed to save pickup time')
    } else {
      toast.success('Pickup time saved')
      onRefresh()
    }
    setIsSavingPickup(false)
    setPickupEditBooking(null)
  }

  const openPickupEdit = (booking: BookingWithRelations) => {
    setPickupTime(formatPickupTime(booking.pickup_time) || '08:00')
    setIsComeDirect((booking as any).is_come_direct || false)
    setPickupEditBooking(booking)
  }

  const handleCopyTemplate = (booking: BookingWithRelations) => {
    const pickupContactInfo = companySettings?.pickup?.contact_info || 'Contact our office'
    const comeDirectLocation = (booking.program as any)?.come_direct_location as ComeDirectLocation | null
    
    let template: string
    if ((booking as any).is_come_direct) {
      template = generateComeDirectEmailTemplate(booking, companyName, comeDirectLocation)
    } else {
      template = generatePickupEmailTemplate(booking, companyName, pickupContactInfo)
    }
    
    navigator.clipboard.writeText(template)
    toast.success('Email template copied to clipboard')
  }

  // Get selected bookings that can be invoiced (has agent, not already invoiced, not void/cancelled)
  const getInvoiceableBookings = () => {
    return bookings.filter(b => 
      selectedIds.includes(b.id) && 
      b.agent_id && 
      !b.is_direct_booking &&
      !(b as any).invoice_id &&
      b.status !== 'void' && 
      b.status !== 'cancelled'
    )
  }

  // Prepare invoice preview grouped by agent
  const prepareInvoicePreview = async () => {
    const invoiceableBookings = getInvoiceableBookings()
    if (invoiceableBookings.length === 0) {
      toast.error('No bookings available for invoicing. Bookings must have an agent, not be voided/cancelled, and not already invoiced.')
      return
    }

    setLoadingPreview(true)
    setShowInvoiceDialog(true)

    const supabase = createClient()

    // Group bookings by agent
    const groupedByAgent = invoiceableBookings.reduce((acc, booking) => {
      const agentId = booking.agent_id!
      if (!acc[agentId]) {
        acc[agentId] = {
          agentId,
          agentName: (booking.agent as any)?.name || 'Unknown Agent',
          bookings: [],
          totalAmount: 0
        }
      }
      acc[agentId].bookings.push(booking)
      return acc
    }, {} as Record<string, { agentId: string; agentName: string; bookings: BookingWithRelations[]; totalAmount: number }>)

    // Fetch agent pricing for all unique agent-program combinations
    const agentIds = Object.keys(groupedByAgent)
    const programIds = [...new Set(invoiceableBookings.map(b => b.program_id))]

    const { data: pricingData } = await supabase
      .from('agent_pricing')
      .select('*')
      .in('agent_id', agentIds)
      .in('program_id', programIds)

    // Create pricing lookup map
    const pricingMap = new Map<string, number>()
    pricingData?.forEach(p => {
      pricingMap.set(`${p.agent_id}-${p.program_id}`, p.agent_price)
    })

    // Calculate totals for each agent group
    Object.values(groupedByAgent).forEach(group => {
      group.totalAmount = group.bookings.reduce((sum, booking) => {
        const key = `${booking.agent_id}-${booking.program_id}`
        const agentPrice = pricingMap.get(key) || 0
        const pax = (booking.adults || 0) + (booking.children || 0) * 0.5
        return sum + (agentPrice * pax)
      }, 0)
    })

    setInvoicePreview(Object.values(groupedByAgent))
    setLoadingPreview(false)
  }

  // Create invoices for all grouped bookings
  const handleCreateBulkInvoices = async () => {
    if (!user?.company_id || invoicePreview.length === 0) return

    setIsCreatingInvoices(true)
    const supabase = createClient()

    try {
      // Get current month for invoice numbering
      const year = new Date().getFullYear()
      const month = (new Date().getMonth() + 1).toString().padStart(2, '0')
      const prefix = `INV-${year}${month}-`

      // Get the highest invoice number for this month to avoid duplicates
      const { data: latestInvoice } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('company_id', user.company_id)
        .like('invoice_number', `${prefix}%`)
        .order('invoice_number', { ascending: false })
        .limit(1)
        .single()

      let invoiceCounter = 1
      if (latestInvoice?.invoice_number) {
        const lastNumber = parseInt(latestInvoice.invoice_number.replace(prefix, ''), 10)
        if (!isNaN(lastNumber)) {
          invoiceCounter = lastNumber + 1
        }
      }

      let createdCount = 0

      for (const group of invoicePreview) {
        // Generate invoice number
        const invoiceNumber = `${prefix}${invoiceCounter.toString().padStart(4, '0')}`
        
        // Get date range from bookings
        const activityDates = group.bookings.map(b => b.activity_date).sort()
        const dateFrom = activityDates[0]
        const dateTo = activityDates[activityDates.length - 1]

        // Calculate due date
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + invoiceDueDays)
        const dueDateStr = dueDate.toISOString().split('T')[0]

        // Create invoice
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            company_id: user.company_id,
            agent_id: group.agentId,
            invoice_number: invoiceNumber,
            date_from: dateFrom,
            date_to: dateTo,
            total_amount: group.totalAmount,
            status: 'draft',
            due_date: dueDateStr,
            due_days: invoiceDueDays,
            last_modified_by: user.id,
            last_modified_by_name: user.name,
          })
          .select()
          .single()

        if (invoiceError) {
          console.error('Error creating invoice:', invoiceError)
          continue
        }

        // Fetch agent pricing for this agent's bookings
        const programIds = [...new Set(group.bookings.map(b => b.program_id))]
        const { data: pricingData } = await supabase
          .from('agent_pricing')
          .select('*')
          .eq('agent_id', group.agentId)
          .in('program_id', programIds)

        const pricingMap = new Map<string, number>()
        pricingData?.forEach(p => {
          pricingMap.set(p.program_id, p.agent_price)
        })

        // Create invoice items
        const invoiceItems = group.bookings.map(booking => {
          const agentPrice = pricingMap.get(booking.program_id) || 0
          const pax = (booking.adults || 0) + (booking.children || 0) * 0.5
          return {
            invoice_id: invoice.id,
            booking_id: booking.id,
            amount: agentPrice * pax
          }
        })

        await supabase.from('invoice_items').insert(invoiceItems)

        // Update bookings with invoice_id
        const bookingIds = group.bookings.map(b => b.id)
        await supabase
          .from('bookings')
          .update({ 
            invoice_id: invoice.id,
            last_modified_by: user.id,
            last_modified_by_name: user.name,
          })
          .in('id', bookingIds)

        invoiceCounter++
        createdCount++
      }

      toast.success(`Created ${createdCount} invoice(s) successfully!`)
      setShowInvoiceDialog(false)
      setSelectedIds([])
      setInvoicePreview([])
      onRefresh()
    } catch (error: any) {
      console.error('Error creating invoices:', error)
      toast.error(error.message || 'Failed to create invoices')
    } finally {
      setIsCreatingInvoices(false)
    }
  }

  const handleSendPickupEmail = async (booking: BookingWithRelations) => {
    if (!booking.customer_email) {
      toast.error('No customer email available')
      return
    }

    if (!booking.pickup_time) {
      toast.error('Pickup time not set')
      return
    }

    try {
      const response = await fetch(`/api/bookings/${booking.id}/send-pickup-email`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email')
      }

      toast.success('Pickup time email sent!')
      onRefresh()
    } catch (error: any) {
      console.error('Send pickup email error:', error)
      toast.error(error.message || 'Failed to send email')
    }
  }

  const sortedBookings = [...bookings].sort((a, b) => {
    let aValue: string | number | Date
    let bValue: string | number | Date

    // Handle nested/computed fields
    switch (sortField) {
      case 'source':
        aValue = a.is_direct_booking ? 'Direct Website' : ((a.agent as any)?.name || '')
        bValue = b.is_direct_booking ? 'Direct Website' : ((b.agent as any)?.name || '')
        break
      case 'program':
        aValue = (a.program as any)?.name || ''
        bValue = (b.program as any)?.name || ''
        break
      case 'hotel':
        aValue = (a.hotel as any)?.name || a.custom_pickup_location || ''
        bValue = (b.hotel as any)?.name || b.custom_pickup_location || ''
        break
      case 'activity_date':
      case 'created_at':
        aValue = new Date(a[sortField] as string).getTime()
        bValue = new Date(b[sortField] as string).getTime()
        break
      case 'adults':
      case 'children':
      case 'infants':
      case 'collect_money':
        aValue = (a[sortField as keyof BookingWithRelations] as number) || 0
        bValue = (b[sortField as keyof BookingWithRelations] as number) || 0
        break
      case 'pickup_time':
        aValue = a.pickup_time || ''
        bValue = b.pickup_time || ''
        break
      default:
        aValue = (a[sortField as keyof BookingWithRelations] as string) || ''
        bValue = (b[sortField as keyof BookingWithRelations] as string) || ''
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  // Pagination calculations
  const totalItems = sortedBookings.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedBookings = sortedBookings.slice(startIndex, endIndex)

  // Reset to page 1 when items per page changes or bookings change
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value))
    setCurrentPage(1)
  }

  // Truncate text helper
  const truncateText = (text: string | null | undefined, maxLength: number = 34): string => {
    if (!text) return '-'
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No bookings found</p>
        <p className="text-sm mt-1">Try adjusting your filters or create a new booking</p>
      </div>
    )
  }

  // Count invoiceable bookings
  const invoiceableCount = getInvoiceableBookings().length

  return (
    <>
      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border mb-4">
          <span className="text-sm font-medium">
            {selectedIds.length} booking(s) selected
            {invoiceableCount > 0 && invoiceableCount !== selectedIds.length && (
              <span className="text-muted-foreground ml-2">
                ({invoiceableCount} can be invoiced)
              </span>
            )}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds([])}
            >
              Clear Selection
            </Button>
            <Button
              size="sm"
              onClick={prepareInvoicePreview}
              disabled={invoiceableCount === 0}
            >
              <FileStack className="w-4 h-4 mr-2" />
              Create Invoice ({invoiceableCount})
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={selectedIds.length === bookings.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="min-w-[70px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => handleSort('booking_number')}
                >
                  No #
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="min-w-[100px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => handleSort('created_at')}
                >
                  Booking
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="min-w-[100px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => handleSort('activity_date')}
                >
                  Activity Date
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="min-w-[120px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => handleSort('source')}
                >
                  Source
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="min-w-[140px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => handleSort('program')}
                >
                  Program
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="min-w-[140px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => handleSort('customer_name')}
                >
                  Customer
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-10 text-center px-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-1"
                  onClick={() => handleSort('adults')}
                >
                  A
                </Button>
              </TableHead>
              <TableHead className="w-10 text-center px-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-1"
                  onClick={() => handleSort('children')}
                >
                  C
                </Button>
              </TableHead>
              <TableHead className="w-10 text-center px-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-1"
                  onClick={() => handleSort('infants')}
                >
                  I
                </Button>
              </TableHead>
              <TableHead className="min-w-[140px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => handleSort('hotel')}
                >
                  Hotel
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="min-w-[80px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => handleSort('pickup_time')}
                >
                  Pickup
                </Button>
              </TableHead>
              <TableHead className="min-w-[90px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => handleSort('collect_money')}
                >
                  Collect
                </Button>
              </TableHead>
              <TableHead className="min-w-[120px] max-w-[150px]">Remark</TableHead>
              <TableHead className="min-w-[100px]">Voucher</TableHead>
              <TableHead className="min-w-[90px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => handleSort('status')}
                >
                  Status
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="min-w-[100px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => handleSort('updated_at')}
                >
                  Modified
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedBookings.map((booking) => {
              const isVoid = booking.status === 'void'
              const isCancelled = booking.status === 'cancelled'
              const hasPickup = booking.pickup_time && booking.pickup_time.length > 0
              const isConfirmed = booking.status === 'confirmed'
              const isConfirmedWithPickup = isConfirmed && hasPickup
              
              // Determine row background color based on status
              // Using CSS classes for dark mode support
              let rowBgClass = ''
              if (isVoid) {
                rowBgClass = 'bg-[#fef2f2] dark:bg-[#3b0000] opacity-60'
              } else if (isCancelled) {
                rowBgClass = 'bg-[#fef2f2] dark:bg-[#3b0000]'
              } else if (isConfirmedWithPickup) {
                rowBgClass = 'bg-[#f0fdf4] dark:bg-[#022c0d]'
              }
              
              const nameParts = splitName(booking.customer_name || '')
              const bookingNumParts = splitBookingNumber(booking.booking_number || '')
              
              return (
                <TableRow key={booking.id} className={rowBgClass}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(booking.id)}
                      onCheckedChange={(checked) => handleSelectOne(booking.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    <button
                      onClick={() => setDetailsBooking(booking)}
                      className="hover:underline text-primary cursor-pointer"
                    >
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">{bookingNumParts.prefix}</p>
                        <p className={`font-bold ${
                          (booking as any).payment_type === 'foc' 
                            ? 'text-purple-600' 
                            : (booking as any).payment_type === 'insp' 
                            ? 'text-orange-600' 
                            : ''
                        }`}>{bookingNumParts.number}</p>
                      </div>
                    </button>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-gray-400 text-sm">
                        {formatShortDate(booking.created_at)}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {new Date(booking.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">{getDayName(booking.activity_date)}</p>
                      <p className="font-bold text-base">{formatActivityDate(booking.activity_date)}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {booking.is_direct_booking
                          ? 'Direct Website'
                          : (booking.agent as { name: string } | undefined)?.name || '-'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {booking.is_direct_booking
                          ? 'Online'
                          : (booking.agent_staff as { nickname: string } | undefined)?.nickname || 'Company'}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span 
                      className="flex items-center gap-1.5"
                      title={(booking.program as { name: string } | undefined)?.name || ''}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: (booking.program as { color?: string } | undefined)?.color || '#3B82F6' }}
                      />
                      {(booking.program as { nickname?: string | null; name: string } | undefined)?.nickname || (booking.program as { name: string } | undefined)?.name || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{nameParts.first}</p>
                      {nameParts.last && (
                        <p className="text-sm text-muted-foreground">{nameParts.last}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center px-1">
                    <span className="text-lg font-bold">{booking.adults || 0}</span>
                  </TableCell>
                  <TableCell className="text-center px-1">
                    <span className="text-lg font-bold">{booking.children || 0}</span>
                  </TableCell>
                  <TableCell className="text-center px-1">
                    <span className="text-lg font-bold">{booking.infants || 0}</span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p>{(booking.hotel as { name: string } | undefined)?.name || booking.custom_pickup_location || '-'}</p>
                      <p className="text-xs text-muted-foreground">
                        {(booking.hotel as { area: string } | undefined)?.area}
                        {(booking.hotel as { area: string } | undefined)?.area && booking.room_number && ' • '}
                        {booking.room_number && `Room ${booking.room_number}`}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {booking.pickup_time ? (
                      <div className="flex flex-col gap-1">
                        {(booking as any).is_come_direct && (
                          <span className="text-xs font-bold text-blue-600">Come Direct</span>
                        )}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openPickupEdit(booking)}
                            className="font-medium hover:text-primary hover:underline cursor-pointer"
                            title="Click to edit pickup time"
                          >
                            {formatPickupTime(booking.pickup_time)}
                          </button>
                          {booking.customer_email && !isVoid && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-6 w-6 ${booking.pickup_email_sent ? 'text-green-600' : ''}`}
                              onClick={() => handleSendPickupEmail(booking)}
                              title={booking.pickup_email_sent ? "Re-send pickup time email" : "Send pickup time email"}
                            >
                              <Mail className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <button
                          onClick={() => handleCopyTemplate(booking)}
                          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 cursor-pointer"
                          title="Copy email template"
                        >
                          <Copy className="h-3 w-3" />
                          Copy
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => openPickupEdit(booking)}
                        className="text-muted-foreground hover:text-primary flex items-center gap-1 cursor-pointer"
                        title="Set pickup time"
                      >
                        <Clock className="h-3 w-3" />
                        <span className="text-xs">Set time</span>
                      </button>
                    )}
                  </TableCell>
                  <TableCell>
                    {booking.collect_money > 0 ? (
                      <div className="text-orange-600">
                        <p className="font-bold">{booking.collect_money.toLocaleString()}</p>
                        <p className="text-xs">THB</p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[150px]">
                    {(() => {
                      // Build display notes with payment type prefix
                      const paymentType = (booking as any).payment_type as 'regular' | 'foc' | 'insp' | undefined
                      let displayNotes = ''
                      let paymentPrefix = ''
                      
                      if (paymentType === 'foc') {
                        paymentPrefix = 'FOC'
                      } else if (paymentType === 'insp') {
                        paymentPrefix = 'INSP'
                      }
                      
                      if (paymentPrefix && booking.notes) {
                        displayNotes = `${paymentPrefix} - ${booking.notes}`
                      } else if (paymentPrefix) {
                        displayNotes = paymentPrefix
                      } else if (booking.notes) {
                        displayNotes = booking.notes
                      }
                      
                      if (displayNotes) {
                        return (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className={`text-sm cursor-help truncate block ${
                                  paymentPrefix === 'FOC' 
                                    ? 'text-purple-600 font-medium' 
                                    : paymentPrefix === 'INSP' 
                                    ? 'text-orange-600 font-medium' 
                                    : 'text-muted-foreground'
                                }`}>
                                  {truncateText(displayNotes, 34)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[300px]">
                                <p className="whitespace-pre-wrap">{displayNotes}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )
                      }
                      return <span className="text-muted-foreground">-</span>
                    })()}
                  </TableCell>
                  <TableCell>
                    {booking.voucher_number ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm cursor-help truncate block text-muted-foreground">
                              {truncateText(booking.voucher_number, 15)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p>{booking.voucher_number}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[booking.status] || 'default'}>
                      {statusLabels[booking.status] || booking.status}
                    </Badge>
                    {isVoid && booking.void_reason && (
                      <p className="text-[10px] text-muted-foreground mt-1 truncate max-w-[80px]" title={booking.void_reason}>
                        {booking.void_reason}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-muted-foreground text-sm">
                        {formatActivityDate(booking.updated_at)}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {new Date(booking.updated_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        {(booking as any).last_modified_by_name && (
                          <span> / {(booking as any).last_modified_by_name}</span>
                        )}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setDetailsBooking(booking)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/${booking.id}/edit`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openPickupEdit(booking)}>
                          <Clock className="mr-2 h-4 w-4" />
                          Set Pickup Time
                        </DropdownMenuItem>
                        {booking.pickup_time && booking.customer_email && !isVoid && (
                          <DropdownMenuItem onClick={() => handleSendPickupEmail(booking)}>
                            <Mail className="mr-2 h-4 w-4" />
                            {booking.pickup_email_sent ? 'Re-send Pickup Email' : 'Send Pickup Email'}
                          </DropdownMenuItem>
                        )}
                        {!isVoid && booking.agent_id && (
                          <DropdownMenuItem asChild>
                            <Link href={`/invoices?booking=${booking.id}`}>
                              <Receipt className="mr-2 h-4 w-4" />
                              Create Invoice
                            </Link>
                          </DropdownMenuItem>
                        )}
                        {!isVoid && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setVoidBooking(booking)}
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              Void Booking
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Showing</span>
          <Select value={String(itemsPerPage)} onValueChange={handleItemsPerPageChange}>
            <SelectTrigger className="w-[80px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30</SelectItem>
              <SelectItem value="60">60</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
            </SelectContent>
          </Select>
          <span>of {totalItems} bookings</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages || 1}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Void Booking Dialog */}
      <Dialog open={!!voidBooking} onOpenChange={() => { setVoidBooking(null); setVoidReason('') }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to void booking <strong>{voidBooking?.booking_number}</strong>?
              This action will mark the booking as void but keep it in the system for records.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="void-reason">Reason for voiding *</Label>
              <Textarea
                id="void-reason"
                placeholder="e.g., Customer cancelled, Duplicate entry, Weather conditions..."
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setVoidBooking(null); setVoidReason('') }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleVoid}
              disabled={isVoiding || !voidReason.trim()}
            >
              {isVoiding ? 'Voiding...' : 'Void Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Booking Details Dialog */}
      <BookingDetailsDialog
        booking={detailsBooking}
        open={!!detailsBooking}
        onOpenChange={(open) => !open && setDetailsBooking(null)}
      />

      {/* Pickup Time Edit Dialog */}
      <Dialog open={!!pickupEditBooking} onOpenChange={() => setPickupEditBooking(null)}>
        <DialogContent className="sm:max-w-[350px]">
          <DialogHeader>
            <DialogTitle>Set Pickup Time</DialogTitle>
            <DialogDescription>
              Set the pickup time for booking {pickupEditBooking?.booking_number}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="pickup-time">Pickup Time</Label>
              <TimeInput
                id="pickup-time"
                value={pickupTime}
                onChange={(value) => setPickupTime(value)}
                className="mt-2"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="come-direct"
                checked={isComeDirect}
                onCheckedChange={(checked) => setIsComeDirect(!!checked)}
              />
              <Label 
                htmlFor="come-direct" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  Come Direct (no pickup needed)
                </span>
              </Label>
            </div>
            {isComeDirect && (
              <p className="text-xs text-muted-foreground">
                Customer will come directly to the meeting point. Make sure the program has a "Come Direct" location configured.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPickupEditBooking(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePickupTime}
              disabled={isSavingPickup}
            >
              {isSavingPickup ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Invoice Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={(open) => {
        if (!open) {
          setShowInvoiceDialog(false)
          setInvoicePreview([])
        }
      }}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Create Invoices</DialogTitle>
            <DialogDescription>
              {invoicePreview.length > 1 
                ? `${invoicePreview.length} invoices will be created (one per agent)`
                : 'Review the invoice details before creating'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            {loadingPreview ? (
              <div className="flex items-center justify-center py-8">
                <Spinner size="lg" />
                <span className="ml-2 text-muted-foreground">Calculating invoice amounts...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {invoicePreview.map((group, index) => (
                  <div key={group.agentId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">{group.agentName}</h4>
                        <p className="text-sm text-muted-foreground">
                          {group.bookings.length} booking(s)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          ฿{group.totalAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="max-h-40 overflow-y-auto border-t pt-2">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-muted-foreground">
                            <th className="text-left py-1">Booking #</th>
                            <th className="text-left py-1">Date</th>
                            <th className="text-left py-1">Customer</th>
                            <th className="text-center py-1">Pax</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.bookings.map(booking => (
                            <tr key={booking.id} className="border-t">
                              <td className="py-1 font-mono text-xs">{booking.booking_number}</td>
                              <td className="py-1">{new Date(booking.activity_date).toLocaleDateString()}</td>
                              <td className="py-1">{booking.customer_name}</td>
                              <td className="py-1 text-center">{booking.adults}A {booking.children}C</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}

                {invoicePreview.length > 1 && (
                  <div className="border-t pt-4 flex justify-between items-center">
                    <span className="font-semibold">Grand Total</span>
                    <span className="text-2xl font-bold">
                      ฿{invoicePreview.reduce((sum, g) => sum + g.totalAmount, 0).toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Due Date Selection */}
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Payment Due</Label>
                      <p className="text-xs text-muted-foreground">Select when payment is due</p>
                    </div>
                    <Select
                      value={String(invoiceDueDays)}
                      onValueChange={(value) => setInvoiceDueDays(Number(value))}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {dueDateOptions.map((option) => (
                          <SelectItem key={option.value} value={String(option.value)}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Due date: {new Date(Date.now() + invoiceDueDays * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowInvoiceDialog(false)
                setInvoicePreview([])
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateBulkInvoices}
              disabled={isCreatingInvoices || loadingPreview || invoicePreview.length === 0}
            >
              {isCreatingInvoices ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Receipt className="w-4 h-4 mr-2" />
                  Create {invoicePreview.length} Invoice(s)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
