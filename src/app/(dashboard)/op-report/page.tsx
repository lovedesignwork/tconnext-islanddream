"use client"

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { ProtectedPage } from '@/components/providers/page-lock-provider'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format } from 'date-fns'
import { formatDate, formatCurrency, cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  CalendarIcon,
  Users,
  Car,
  Anchor,
  FileSpreadsheet,
  FileDown,
  ChevronDown,
  ClipboardList,
  LayoutList,
  Copy,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Mail,
  Send,
} from 'lucide-react'
import {
  type OperationBooking,
  copyToClipboard,
  downloadCsv,
  generateProgramText,
  generateProgramCsv,
  generateProgramPdf,
  generateAllProgramsCsv,
  generateAllProgramsPdf,
  generateDriverText,
  generateDriverCsv,
  generateDriverPdf,
  generateAllDriversCsv,
  generateAllDriversPdf,
  generateBoatText,
  generateBoatCsv,
  generateBoatPdf,
  generateAllBoatsCsv,
  generateAllBoatsPdf,
  generateFullReportText,
  generateFullReportCsv,
  generateFullReportPdf,
} from './op-report-utils'
import type { Program, Driver, Boat, Guide, Restaurant } from '@/types'

interface BoatAssignment {
  boat_id: string
  guide_id: string | null
  restaurant_id: string | null
  guide?: Guide | null
  restaurant?: Restaurant | null
}

export default function OpReportPage() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [bookings, setBookings] = useState<OperationBooking[]>([])
  const [boatAssignmentsMap, setBoatAssignmentsMap] = useState<Record<string, BoatAssignment>>({})
  const [loading, setLoading] = useState(true)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('full-report')
  
  // Email dialog state
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [emailRecipient, setEmailRecipient] = useState('')
  const [emailFormat, setEmailFormat] = useState<'pdf' | 'csv'>('pdf')
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  
  // Initialize sort state from URL params
  const [fullReportSort, setFullReportSort] = useState<{ column: string; order: 'asc' | 'desc' } | null>(() => {
    const sortColumn = searchParams.get('sort')
    const sortOrder = searchParams.get('order') as 'asc' | 'desc' | null
    if (sortColumn && sortOrder) {
      return { column: sortColumn, order: sortOrder }
    }
    return null
  })

  // Update URL when sort changes
  const updateSortInUrl = useCallback((sort: { column: string; order: 'asc' | 'desc' } | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (sort) {
      params.set('sort', sort.column)
      params.set('order', sort.order)
    } else {
      params.delete('sort')
      params.delete('order')
    }
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [searchParams, router])

  useEffect(() => {
    async function fetchData() {
      if (!user?.company_id) return

      setLoading(true)
      const dateStr = format(selectedDate, 'yyyy-MM-dd')

      try {
        const response = await fetch(`/api/op-report/data?date=${dateStr}`)
        
        if (!response.ok) {
          // Only show error for actual server errors, not for empty data
          if (response.status >= 500) {
            console.error('Error fetching OP report data:', response.status)
            toast.error('Failed to load operation data')
          }
          setBookings([])
          setBoatAssignmentsMap({})
        } else {
          const data = await response.json()
          setBookings(data.bookings || [])
          setBoatAssignmentsMap(data.boatAssignmentsMap || {})
        }
      } catch (error) {
        console.error('Error fetching OP report data:', error)
        toast.error('Failed to load operation data')
        setBookings([])
        setBoatAssignmentsMap({})
      }

      setLoading(false)
    }

    fetchData()
  }, [user, selectedDate])

  // Calculate stats
  const stats = useMemo(() => {
    const totalBookings = bookings.length
    const totalGuests = bookings.reduce((sum, b) => 
      sum + (b.adults || 0) + (b.children || 0) + (b.infants || 0), 0
    )
    const uniqueDrivers = new Set(bookings.filter(b => b.driver_id).map(b => b.driver_id)).size
    const uniqueBoats = new Set(bookings.filter(b => b.boat_id).map(b => b.boat_id)).size
    const totalCollect = bookings.reduce((sum, b) => sum + (b.collect_money || 0), 0)

    return { totalBookings, totalGuests, uniqueDrivers, uniqueBoats, totalCollect }
  }, [bookings])

  // Group bookings by program
  const bookingsByProgram = useMemo(() => {
    const groups: Record<string, { program: Program | undefined; bookings: OperationBooking[] }> = {}
    
    bookings.forEach(booking => {
      const programId = booking.program_id || 'unknown'
      if (!groups[programId]) {
        groups[programId] = {
          program: booking.program,
          bookings: []
        }
      }
      groups[programId].bookings.push(booking)
    })

    return Object.values(groups).sort((a, b) => 
      (a.program?.name || 'Unknown').localeCompare(b.program?.name || 'Unknown')
    )
  }, [bookings])

  // Sorted bookings for full report (supports multiple columns)
  const sortedFullReportBookings = useMemo(() => {
    if (!fullReportSort) return bookings
    
    return [...bookings].sort((a, b) => {
      let comparison = 0
      
      switch (fullReportSort.column) {
        case 'booking':
          comparison = (a.booking_number || '').localeCompare(b.booking_number || '')
          break
        case 'customer':
          comparison = (a.customer_name || '').localeCompare(b.customer_name || '')
          break
        case 'program':
          const programA = a.program?.nickname || a.program?.name || ''
          const programB = b.program?.nickname || b.program?.name || ''
          comparison = programA.localeCompare(programB)
          break
        case 'boat':
          const boatA = a.boat?.name || ''
          const boatB = b.boat?.name || ''
          comparison = boatA.localeCompare(boatB)
          break
        case 'agent':
          const agentA = a.is_direct_booking ? 'Direct' : (a.agent?.name || '')
          const agentB = b.is_direct_booking ? 'Direct' : (b.agent?.name || '')
          comparison = agentA.localeCompare(agentB)
          break
      }
      
      return fullReportSort.order === 'asc' ? comparison : -comparison
    })
  }, [bookings, fullReportSort])

  // Group bookings by driver
  const bookingsByDriver = useMemo(() => {
    const groups: Record<string, { driver: Driver | undefined; bookings: OperationBooking[] }> = {}
    
    const unassigned = bookings.filter(b => !b.driver_id)
    if (unassigned.length > 0) {
      groups['unassigned'] = { driver: undefined, bookings: unassigned }
    }

    bookings.filter(b => b.driver_id).forEach(booking => {
      const driverId = booking.driver_id!
      if (!groups[driverId]) {
        groups[driverId] = {
          driver: booking.driver,
          bookings: []
        }
      }
      groups[driverId].bookings.push(booking)
    })

    return Object.entries(groups)
      .sort(([keyA, a], [keyB, b]) => {
        if (keyA === 'unassigned') return -1
        if (keyB === 'unassigned') return 1
        return (a.driver?.name || '').localeCompare(b.driver?.name || '')
      })
      .map(([, value]) => value)
  }, [bookings])

  // Group bookings by boat
  const bookingsByBoat = useMemo(() => {
    const groups: Record<string, { boat: Boat | undefined; bookings: OperationBooking[]; guide?: Guide | null; restaurant?: Restaurant | null }> = {}
    
    const unassigned = bookings.filter(b => !b.boat_id)
    if (unassigned.length > 0) {
      groups['unassigned'] = { boat: undefined, bookings: unassigned }
    }

    bookings.filter(b => b.boat_id).forEach(booking => {
      const boatId = booking.boat_id!
      if (!groups[boatId]) {
        const assignment = boatAssignmentsMap[boatId]
        groups[boatId] = {
          boat: booking.boat,
          bookings: [],
          guide: assignment?.guide,
          restaurant: assignment?.restaurant,
        }
      }
      groups[boatId].bookings.push(booking)
    })

    return Object.entries(groups)
      .sort(([keyA, a], [keyB, b]) => {
        if (keyA === 'unassigned') return -1
        if (keyB === 'unassigned') return 1
        return (a.boat?.name || '').localeCompare(b.boat?.name || '')
      })
      .map(([, value]) => value)
  }, [bookings, boatAssignmentsMap])

  // Export handlers for global exports
  const handleExportAllCsv = () => {
    let csv = ''
    let filename = ''
    const dateStr = format(selectedDate, 'yyyy-MM-dd')

    if (activeTab === 'full-report') {
      // Use sorted bookings for export
      csv = generateFullReportCsv(sortedFullReportBookings, selectedDate)
      filename = `full_report_${dateStr}.csv`
    } else if (activeTab === 'by-program') {
      csv = generateAllProgramsCsv(bookingsByProgram, selectedDate)
      filename = `all_programs_${dateStr}.csv`
    } else if (activeTab === 'by-driver') {
      csv = generateAllDriversCsv(bookingsByDriver, selectedDate)
      filename = `all_drivers_${dateStr}.csv`
    } else {
      csv = generateAllBoatsCsv(bookingsByBoat, selectedDate)
      filename = `all_boats_${dateStr}.csv`
    }

    downloadCsv(csv, filename)
    toast.success('CSV exported successfully')
  }

  const handleExportAllPdf = () => {
    if (activeTab === 'full-report') {
      // Use sorted bookings for export
      generateFullReportPdf(sortedFullReportBookings, selectedDate)
    } else if (activeTab === 'by-program') {
      generateAllProgramsPdf(bookingsByProgram, selectedDate)
    } else if (activeTab === 'by-driver') {
      generateAllDriversPdf(bookingsByDriver, selectedDate)
    } else {
      generateAllBoatsPdf(bookingsByBoat, selectedDate)
    }
    toast.success('PDF exported successfully')
  }

  const handleSendEmail = async () => {
    if (!emailRecipient.trim()) {
      toast.error('Please enter an email address')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailRecipient.trim())) {
      toast.error('Please enter a valid email address')
      return
    }

    setIsSendingEmail(true)
    try {
      const response = await fetch('/api/op-report/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: emailRecipient.trim(),
          reportDate: format(selectedDate, 'yyyy-MM-dd'),
          reportType: activeTab,
          format: emailFormat
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email')
      }

      toast.success(`Report sent to ${emailRecipient}`)
      setShowEmailDialog(false)
      setEmailRecipient('')
    } catch (error: any) {
      toast.error(error.message || 'Failed to send email')
    } finally {
      setIsSendingEmail(false)
    }
  }

  // Full report handlers - use sorted bookings
  const handleCopyFullReport = async () => {
    const text = generateFullReportText(sortedFullReportBookings, selectedDate)
    const success = await copyToClipboard(text)
    if (success) {
      toast.success('Copied to clipboard')
    } else {
      toast.error('Failed to copy')
    }
  }

  const handleDownloadFullReportCsv = () => {
    const csv = generateFullReportCsv(sortedFullReportBookings, selectedDate)
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    downloadCsv(csv, `full_report_${dateStr}.csv`)
    toast.success('CSV exported')
  }

  const handleDownloadFullReportPdf = () => {
    generateFullReportPdf(sortedFullReportBookings, selectedDate)
    toast.success('PDF exported')
  }

  const getPaymentTypeBadge = (paymentType: string) => {
    switch (paymentType) {
      case 'foc':
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-500 text-purple-600">FOC</Badge>
      case 'insp':
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-500 text-orange-600">INSP</Badge>
      default:
        return null
    }
  }

  const formatPickupTime = (time: string | null) => {
    if (!time) return '-'
    const parts = time.split(':')
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`
    }
    return time
  }

  // ============================================
  // BY PROGRAM TABLE
  // Columns: #, Customer, A, C, I, Hotel, Agent, Agent Staff, Boat, Guide, Restaurant, Type, Collect, Notes
  // ============================================
  const ProgramTableHeader = () => (
    <thead className="bg-gradient-to-b from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 sticky top-0 z-10">
      <tr className="text-xs font-semibold text-slate-700 dark:text-slate-300">
        <th className="px-2 py-2 text-center w-8">#</th>
        <th className="px-2 py-2 text-left">Customer</th>
        <th className="px-2 py-2 text-center w-8">A</th>
        <th className="px-2 py-2 text-center w-8">C</th>
        <th className="px-2 py-2 text-center w-8">I</th>
        <th className="px-2 py-2 text-left">Hotel</th>
        <th className="px-2 py-2 text-left">Agent</th>
        <th className="px-2 py-2 text-left">Staff</th>
        <th className="px-2 py-2 text-left">Boat</th>
        <th className="px-2 py-2 text-left">Guide</th>
        <th className="px-2 py-2 text-left">Restaurant</th>
        <th className="px-2 py-2 text-center">Type</th>
        <th className="px-2 py-2 text-right">Collect</th>
        <th className="px-2 py-2 text-left">Notes</th>
      </tr>
    </thead>
  )

  const renderProgramRow = (booking: OperationBooking, index: number) => {
    const displayGuide = booking.boatGuide || booking.guide
    const displayRestaurant = booking.boatRestaurant || booking.restaurant

    return (
      <tr 
        key={booking.id} 
        className={cn(
          "border-b border-border/50 text-xs",
          index % 2 === 0 ? "bg-background" : "bg-muted/30"
        )}
      >
        <td className="px-2 py-1.5 text-center font-medium text-muted-foreground">{index + 1}</td>
        <td className="px-2 py-1.5 font-medium whitespace-nowrap">{booking.customer_name}</td>
        <td className="px-2 py-1.5 text-center">{booking.adults || 0}</td>
        <td className="px-2 py-1.5 text-center">{booking.children || 0}</td>
        <td className="px-2 py-1.5 text-center">{booking.infants || 0}</td>
        <td className="px-2 py-1.5 whitespace-nowrap truncate max-w-[150px]">
          {booking.hotel?.name || booking.custom_pickup_location || '-'}
        </td>
        <td className="px-2 py-1.5 whitespace-nowrap truncate max-w-[100px]">
          {booking.is_direct_booking ? (
            <span className="text-blue-600">Direct</span>
          ) : (
            booking.agent?.name || '-'
          )}
        </td>
        <td className="px-2 py-1.5 whitespace-nowrap truncate max-w-[100px]">
          {booking.agent_staff?.full_name || '-'}
        </td>
        <td className="px-2 py-1.5 whitespace-nowrap">
          {booking.boat?.name || <span className="text-muted-foreground italic">-</span>}
        </td>
        <td className="px-2 py-1.5 whitespace-nowrap">
          {displayGuide?.nickname || displayGuide?.name || '-'}
        </td>
        <td className="px-2 py-1.5 whitespace-nowrap truncate max-w-[100px]">
          {displayRestaurant?.name || '-'}
        </td>
        <td className="px-2 py-1.5 text-center">
          {getPaymentTypeBadge(booking.payment_type)}
        </td>
        <td className="px-2 py-1.5 text-right font-mono whitespace-nowrap">
          {booking.collect_money ? (
            <span className="text-amber-600 font-medium">
              {booking.collect_money.toLocaleString()}
            </span>
          ) : '-'}
        </td>
        <td className="px-2 py-1.5 truncate max-w-[150px] text-muted-foreground">
          {booking.notes || '-'}
        </td>
      </tr>
    )
  }

  // ============================================
  // BY DRIVER TABLE
  // Columns: #, Customer, Program, A, C, I, Hotel, Room, Pickup, Type, Collect, Notes
  // ============================================
  const DriverTableHeader = () => (
    <thead className="bg-gradient-to-b from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 sticky top-0 z-10">
      <tr className="text-xs font-semibold text-slate-700 dark:text-slate-300">
        <th className="px-2 py-2 text-center w-8">#</th>
        <th className="px-2 py-2 text-left">Customer</th>
        <th className="px-2 py-2 text-left">Program</th>
        <th className="px-2 py-2 text-center w-8">A</th>
        <th className="px-2 py-2 text-center w-8">C</th>
        <th className="px-2 py-2 text-center w-8">I</th>
        <th className="px-2 py-2 text-left">Hotel</th>
        <th className="px-2 py-2 text-center">Room</th>
        <th className="px-2 py-2 text-center">Pickup</th>
        <th className="px-2 py-2 text-center">Type</th>
        <th className="px-2 py-2 text-right">Collect</th>
        <th className="px-2 py-2 text-left">Notes</th>
      </tr>
    </thead>
  )

  const renderDriverRow = (booking: OperationBooking, index: number) => {
    return (
      <tr 
        key={booking.id} 
        className={cn(
          "border-b border-border/50 text-xs",
          index % 2 === 0 ? "bg-background" : "bg-muted/30"
        )}
      >
        <td className="px-2 py-1.5 text-center font-medium text-muted-foreground">{index + 1}</td>
        <td className="px-2 py-1.5 font-medium whitespace-nowrap">{booking.customer_name}</td>
        <td className="px-2 py-1.5 whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            {booking.program?.color && (
              <div 
                className="w-2 h-2 rounded-full shrink-0" 
                style={{ backgroundColor: booking.program.color }}
              />
            )}
            <span className="truncate max-w-[120px]">
              {booking.program?.nickname || booking.program?.name || '-'}
            </span>
          </div>
        </td>
        <td className="px-2 py-1.5 text-center">{booking.adults || 0}</td>
        <td className="px-2 py-1.5 text-center">{booking.children || 0}</td>
        <td className="px-2 py-1.5 text-center">{booking.infants || 0}</td>
        <td className="px-2 py-1.5 whitespace-nowrap truncate max-w-[180px]">
          {booking.hotel?.name || booking.custom_pickup_location || '-'}
        </td>
        <td className="px-2 py-1.5 text-center">{booking.room_number || '-'}</td>
        <td className="px-2 py-1.5 text-center font-mono">{formatPickupTime(booking.pickup_time)}</td>
        <td className="px-2 py-1.5 text-center">
          {getPaymentTypeBadge(booking.payment_type)}
        </td>
        <td className="px-2 py-1.5 text-right font-mono whitespace-nowrap">
          {booking.collect_money ? (
            <span className="text-amber-600 font-medium">
              {booking.collect_money.toLocaleString()}
            </span>
          ) : '-'}
        </td>
        <td className="px-2 py-1.5 truncate max-w-[180px] text-muted-foreground">
          {booking.notes || '-'}
        </td>
      </tr>
    )
  }

  // ============================================
  // BY BOAT TABLE
  // Columns: #, Customer, Program, A, C, I, Hotel, Guide, Restaurant, Agent, Type, Collect, Notes
  // ============================================
  const BoatTableHeader = () => (
    <thead className="bg-gradient-to-b from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 sticky top-0 z-10">
      <tr className="text-xs font-semibold text-slate-700 dark:text-slate-300">
        <th className="px-2 py-2 text-center w-8">#</th>
        <th className="px-2 py-2 text-left">Customer</th>
        <th className="px-2 py-2 text-left">Program</th>
        <th className="px-2 py-2 text-center w-8">A</th>
        <th className="px-2 py-2 text-center w-8">C</th>
        <th className="px-2 py-2 text-center w-8">I</th>
        <th className="px-2 py-2 text-left">Hotel</th>
        <th className="px-2 py-2 text-left">Guide</th>
        <th className="px-2 py-2 text-left">Restaurant</th>
        <th className="px-2 py-2 text-left">Agent</th>
        <th className="px-2 py-2 text-center">Type</th>
        <th className="px-2 py-2 text-right">Collect</th>
        <th className="px-2 py-2 text-left">Notes</th>
      </tr>
    </thead>
  )

  const renderBoatRow = (booking: OperationBooking, index: number, boatGuide?: Guide | null, boatRestaurant?: Restaurant | null) => {
    return (
      <tr 
        key={booking.id} 
        className={cn(
          "border-b border-border/50 text-xs",
          index % 2 === 0 ? "bg-background" : "bg-muted/30"
        )}
      >
        <td className="px-2 py-1.5 text-center font-medium text-muted-foreground">{index + 1}</td>
        <td className="px-2 py-1.5 font-medium whitespace-nowrap">{booking.customer_name}</td>
        <td className="px-2 py-1.5 whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            {booking.program?.color && (
              <div 
                className="w-2 h-2 rounded-full shrink-0" 
                style={{ backgroundColor: booking.program.color }}
              />
            )}
            <span className="truncate max-w-[120px]">
              {booking.program?.nickname || booking.program?.name || '-'}
            </span>
          </div>
        </td>
        <td className="px-2 py-1.5 text-center">{booking.adults || 0}</td>
        <td className="px-2 py-1.5 text-center">{booking.children || 0}</td>
        <td className="px-2 py-1.5 text-center">{booking.infants || 0}</td>
        <td className="px-2 py-1.5 whitespace-nowrap truncate max-w-[150px]">
          {booking.hotel?.name || booking.custom_pickup_location || '-'}
        </td>
        <td className="px-2 py-1.5 whitespace-nowrap">
          {boatGuide?.nickname || boatGuide?.name || '-'}
        </td>
        <td className="px-2 py-1.5 whitespace-nowrap truncate max-w-[100px]">
          {boatRestaurant?.name || '-'}
        </td>
        <td className="px-2 py-1.5 whitespace-nowrap truncate max-w-[100px]">
          {booking.is_direct_booking ? (
            <span className="text-blue-600">Direct</span>
          ) : (
            booking.agent?.name || '-'
          )}
        </td>
        <td className="px-2 py-1.5 text-center">
          {getPaymentTypeBadge(booking.payment_type)}
        </td>
        <td className="px-2 py-1.5 text-right font-mono whitespace-nowrap">
          {booking.collect_money ? (
            <span className="text-amber-600 font-medium">
              {booking.collect_money.toLocaleString()}
            </span>
          ) : '-'}
        </td>
        <td className="px-2 py-1.5 truncate max-w-[150px] text-muted-foreground">
          {booking.notes || '-'}
        </td>
      </tr>
    )
  }

  // ============================================
  // FULL REPORT TABLE
  // All columns: #, Booking #, Voucher, Customer, Program, A, C, I, Hotel, Room, Pickup, Driver, Boat, Guide, Restaurant, Agent, Staff, Type, Collect, Notes
  // ============================================
  const toggleSort = (column: string) => {
    setFullReportSort(prev => {
      let newSort: { column: string; order: 'asc' | 'desc' } | null
      if (prev?.column !== column) {
        newSort = { column, order: 'asc' }
      } else if (prev.order === 'asc') {
        newSort = { column, order: 'desc' }
      } else {
        newSort = null
      }
      // Update URL params
      updateSortInUrl(newSort)
      return newSort
    })
  }

  const getSortIcon = (column: string) => {
    if (fullReportSort?.column !== column) {
      return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
    }
    if (fullReportSort.order === 'asc') {
      return <ArrowUp className="h-3 w-3 text-primary" />
    }
    return <ArrowDown className="h-3 w-3 text-primary" />
  }

  const SortableHeader = ({ column, children, className = '' }: { column: string; children: React.ReactNode; className?: string }) => (
    <th 
      className={cn(
        "px-1.5 py-2 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors select-none",
        className
      )}
      onClick={() => toggleSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        {getSortIcon(column)}
      </div>
    </th>
  )

  const FullReportTableHeader = () => (
    <thead className="bg-gradient-to-b from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 sticky top-0 z-10">
      <tr className="text-xs font-semibold text-slate-700 dark:text-slate-300">
        <th className="px-1.5 py-2 text-center w-6">#</th>
        <SortableHeader column="booking" className="text-left">Booking #</SortableHeader>
        <th className="px-1.5 py-2 text-left">Voucher</th>
        <SortableHeader column="customer" className="text-left">Customer</SortableHeader>
        <SortableHeader column="program" className="text-left">Program</SortableHeader>
        <th className="px-1.5 py-2 text-center w-6">A</th>
        <th className="px-1.5 py-2 text-center w-6">C</th>
        <th className="px-1.5 py-2 text-center w-6">I</th>
        <th className="px-1.5 py-2 text-left">Hotel</th>
        <th className="px-1.5 py-2 text-center">Room</th>
        <th className="px-1.5 py-2 text-center">Pickup</th>
        <th className="px-1.5 py-2 text-left">Driver</th>
        <SortableHeader column="boat" className="text-left">Boat</SortableHeader>
        <th className="px-1.5 py-2 text-left">Guide</th>
        <th className="px-1.5 py-2 text-left">Restaurant</th>
        <SortableHeader column="agent" className="text-left">Agent</SortableHeader>
        <th className="px-1.5 py-2 text-left">Staff</th>
        <th className="px-1.5 py-2 text-center">Type</th>
        <th className="px-1.5 py-2 text-right">Collect</th>
        <th className="px-1.5 py-2 text-left">Notes</th>
      </tr>
    </thead>
  )

  const renderFullReportRow = (booking: OperationBooking, index: number) => {
    const displayGuide = booking.boatGuide || booking.guide
    const displayRestaurant = booking.boatRestaurant || booking.restaurant

    return (
      <tr 
        key={booking.id} 
        className={cn(
          "border-b border-border/50 text-xs",
          index % 2 === 0 ? "bg-background" : "bg-muted/30"
        )}
      >
        <td className="px-1.5 py-1.5 text-center font-medium text-muted-foreground">{index + 1}</td>
        <td className="px-1.5 py-1.5 font-mono text-xs whitespace-nowrap">{booking.booking_number || '-'}</td>
        <td className="px-1.5 py-1.5 font-mono text-xs whitespace-nowrap">{booking.voucher_number || '-'}</td>
        <td className="px-1.5 py-1.5 font-medium whitespace-nowrap">{booking.customer_name}</td>
        <td className="px-1.5 py-1.5 whitespace-nowrap">
          <div className="flex items-center gap-1">
            {booking.program?.color && (
              <div 
                className="w-2 h-2 rounded-full shrink-0" 
                style={{ backgroundColor: booking.program.color }}
              />
            )}
            <span className="truncate max-w-[100px]">
              {booking.program?.nickname || booking.program?.name || '-'}
            </span>
          </div>
        </td>
        <td className="px-1.5 py-1.5 text-center">{booking.adults || 0}</td>
        <td className="px-1.5 py-1.5 text-center">{booking.children || 0}</td>
        <td className="px-1.5 py-1.5 text-center">{booking.infants || 0}</td>
        <td className="px-1.5 py-1.5 whitespace-nowrap truncate max-w-[120px]">
          {booking.hotel?.name || booking.custom_pickup_location || '-'}
        </td>
        <td className="px-1.5 py-1.5 text-center">{booking.room_number || '-'}</td>
        <td className="px-1.5 py-1.5 text-center font-mono">{formatPickupTime(booking.pickup_time)}</td>
        <td className="px-1.5 py-1.5 whitespace-nowrap truncate max-w-[80px]">
          {booking.driver?.nickname || booking.driver?.name || (
            <span className="text-muted-foreground italic">-</span>
          )}
        </td>
        <td className="px-1.5 py-1.5 whitespace-nowrap truncate max-w-[80px]">
          {booking.boat?.name || <span className="text-muted-foreground italic">-</span>}
        </td>
        <td className="px-1.5 py-1.5 whitespace-nowrap truncate max-w-[80px]">
          {displayGuide?.nickname || displayGuide?.name || '-'}
        </td>
        <td className="px-1.5 py-1.5 whitespace-nowrap truncate max-w-[80px]">
          {displayRestaurant?.name || '-'}
        </td>
        <td className="px-1.5 py-1.5 whitespace-nowrap truncate max-w-[80px]">
          {booking.is_direct_booking ? (
            <span className="text-blue-600">Direct</span>
          ) : (
            booking.agent?.name || '-'
          )}
        </td>
        <td className="px-1.5 py-1.5 whitespace-nowrap truncate max-w-[80px]">
          {booking.agent_staff?.full_name || '-'}
        </td>
        <td className="px-1.5 py-1.5 text-center">
          {getPaymentTypeBadge(booking.payment_type)}
        </td>
        <td className="px-1.5 py-1.5 text-right font-mono whitespace-nowrap">
          {booking.collect_money ? (
            <span className="text-amber-600 font-medium">
              {booking.collect_money.toLocaleString()}
            </span>
          ) : '-'}
        </td>
        <td className="px-1.5 py-1.5 truncate max-w-[120px] text-muted-foreground">
          {booking.notes || '-'}
        </td>
      </tr>
    )
  }

  const EmptyState = () => (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No operations for this date</h3>
        <p className="text-muted-foreground text-center">
          Select a different date to view operation data.
        </p>
      </CardContent>
    </Card>
  )

  // Group action handlers
  const handleCopyProgram = async (program: Program | undefined, programBookings: OperationBooking[]) => {
    const text = generateProgramText(program, programBookings, selectedDate)
    const success = await copyToClipboard(text)
    if (success) {
      toast.success('Copied to clipboard')
    } else {
      toast.error('Failed to copy')
    }
  }

  const handleDownloadProgramCsv = (program: Program | undefined, programBookings: OperationBooking[]) => {
    const csv = generateProgramCsv(program, programBookings, selectedDate)
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const programName = (program?.nickname || program?.name || 'unknown').replace(/[^a-zA-Z0-9]/g, '_')
    downloadCsv(csv, `program_${programName}_${dateStr}.csv`)
    toast.success('CSV exported')
  }

  const handleDownloadProgramPdf = (program: Program | undefined, programBookings: OperationBooking[]) => {
    generateProgramPdf(program, programBookings, selectedDate)
    toast.success('PDF exported')
  }

  const handleCopyDriver = async (driver: Driver | undefined, driverBookings: OperationBooking[]) => {
    const text = generateDriverText(driver, driverBookings, selectedDate)
    const success = await copyToClipboard(text)
    if (success) {
      toast.success('Copied to clipboard')
    } else {
      toast.error('Failed to copy')
    }
  }

  const handleDownloadDriverCsv = (driver: Driver | undefined, driverBookings: OperationBooking[]) => {
    const csv = generateDriverCsv(driver, driverBookings, selectedDate)
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const driverName = (driver?.nickname || driver?.name || 'unassigned').replace(/[^a-zA-Z0-9]/g, '_')
    downloadCsv(csv, `driver_${driverName}_${dateStr}.csv`)
    toast.success('CSV exported')
  }

  const handleDownloadDriverPdf = (driver: Driver | undefined, driverBookings: OperationBooking[]) => {
    generateDriverPdf(driver, driverBookings, selectedDate)
    toast.success('PDF exported')
  }

  const handleCopyBoat = async (boat: Boat | undefined, boatBookings: OperationBooking[], guide?: Guide | null, restaurant?: Restaurant | null) => {
    const text = generateBoatText(boat, boatBookings, selectedDate, guide, restaurant)
    const success = await copyToClipboard(text)
    if (success) {
      toast.success('Copied to clipboard')
    } else {
      toast.error('Failed to copy')
    }
  }

  const handleDownloadBoatCsv = (boat: Boat | undefined, boatBookings: OperationBooking[], guide?: Guide | null, restaurant?: Restaurant | null) => {
    const csv = generateBoatCsv(boat, boatBookings, selectedDate, guide, restaurant)
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const boatName = (boat?.name || 'unassigned').replace(/[^a-zA-Z0-9]/g, '_')
    downloadCsv(csv, `boat_${boatName}_${dateStr}.csv`)
    toast.success('CSV exported')
  }

  const handleDownloadBoatPdf = (boat: Boat | undefined, boatBookings: OperationBooking[], guide?: Guide | null, restaurant?: Restaurant | null) => {
    generateBoatPdf(boat, boatBookings, selectedDate, guide, restaurant)
    toast.success('PDF exported')
  }

  return (
    <ProtectedPage pageKey="op_report" pageName="Operation Report">
    <div className="space-y-4 p-6">
      <PageHeader
        title="Operation Report"
        description="View operation data for any date (read-only)"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Tour Date:</span>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formatDate(selectedDate)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date)
                    setCalendarOpen(false)
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={bookings.length === 0}>
                <FileDown className="h-4 w-4 mr-2" />
                Export All
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportAllCsv}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Download All CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportAllPdf}>
                <FileDown className="h-4 w-4 mr-2" />
                Download All PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowEmailDialog(true)}>
                <Mail className="h-4 w-4 mr-2" />
                Send via Email
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </PageHeader>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 px-4 py-3 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-2">
          <LayoutList className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">{stats.totalBookings}</span>
          <span className="text-muted-foreground text-sm">bookings</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">{stats.totalGuests}</span>
          <span className="text-muted-foreground text-sm">guests</span>
        </div>
        <div className="flex items-center gap-2">
          <Car className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">{stats.uniqueDrivers}</span>
          <span className="text-muted-foreground text-sm">drivers</span>
        </div>
        <div className="flex items-center gap-2">
          <Anchor className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">{stats.uniqueBoats}</span>
          <span className="text-muted-foreground text-sm">boats</span>
        </div>
        {stats.totalCollect > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-muted-foreground text-sm">Total Collect:</span>
            <span className="font-semibold text-amber-600">
              {formatCurrency(stats.totalCollect)}
            </span>
          </div>
        )}
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="full-report">Full Report</TabsTrigger>
            <TabsTrigger value="by-program">By Program</TabsTrigger>
            <TabsTrigger value="by-driver">By Driver</TabsTrigger>
            <TabsTrigger value="by-boat">By Boat</TabsTrigger>
          </TabsList>

          {/* Full Report Tab */}
          <TabsContent value="full-report" className="mt-4">
            <Card className="overflow-hidden">
              <div className="px-4 py-2 border-b flex items-center justify-between bg-gradient-to-r from-indigo-50 to-transparent dark:from-indigo-950">
                <div className="flex items-center gap-3">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">Full Operation Report</h3>
                  <Badge variant="secondary" className="text-xs">
                    {bookings.length} bookings
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {bookings.reduce((sum, b) => sum + (b.adults || 0), 0)}A{' '}
                    {bookings.reduce((sum, b) => sum + (b.children || 0), 0)}C{' '}
                    {bookings.reduce((sum, b) => sum + (b.infants || 0), 0)}I
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleCopyFullReport}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <FileDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleDownloadFullReportCsv}>
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Download CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDownloadFullReportPdf}>
                        <FileDown className="h-4 w-4 mr-2" />
                        Download PDF
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <ScrollArea className="w-full">
                <div className="min-w-[1500px]">
                  <table className="w-full border-collapse">
                    <FullReportTableHeader />
                    <tbody>
                      {sortedFullReportBookings.map((booking, index) => 
                        renderFullReportRow(booking, index)
                      )}
                    </tbody>
                  </table>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </Card>
          </TabsContent>

          {/* By Program Tab */}
          <TabsContent value="by-program" className="mt-4">
            <div className="space-y-6">
              {bookingsByProgram.map(({ program, bookings: programBookings }) => {
                const totalAdults = programBookings.reduce((sum, b) => sum + (b.adults || 0), 0)
                const totalChildren = programBookings.reduce((sum, b) => sum + (b.children || 0), 0)
                const totalInfants = programBookings.reduce((sum, b) => sum + (b.infants || 0), 0)
                return (
                  <Card key={program?.id || 'unknown'} className="overflow-hidden">
                    <div 
                      className="px-4 py-2 border-b flex items-center justify-between"
                      style={{ 
                        backgroundColor: program?.color ? `${program.color}15` : undefined,
                        borderLeftWidth: '4px',
                        borderLeftColor: program?.color || '#888'
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">
                          {program?.nickname || program?.name || 'Unknown Program'}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {programBookings.length} bookings
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {totalAdults}A {totalChildren}C {totalInfants}I
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleCopyProgram(program, programBookings)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <FileDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDownloadProgramCsv(program, programBookings)}>
                              <FileSpreadsheet className="h-4 w-4 mr-2" />
                              Download CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownloadProgramPdf(program, programBookings)}>
                              <FileDown className="h-4 w-4 mr-2" />
                              Download PDF
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <ScrollArea className="w-full">
                      <div className="min-w-[1100px]">
                        <table className="w-full border-collapse">
                          <ProgramTableHeader />
                          <tbody>
                            {programBookings.map((booking, index) => 
                              renderProgramRow(booking, index)
                            )}
                          </tbody>
                        </table>
                      </div>
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          {/* By Driver Tab */}
          <TabsContent value="by-driver" className="mt-4">
            <div className="space-y-6">
              {bookingsByDriver.map(({ driver, bookings: driverBookings }) => {
                const totalAdults = driverBookings.reduce((sum, b) => sum + (b.adults || 0), 0)
                const totalChildren = driverBookings.reduce((sum, b) => sum + (b.children || 0), 0)
                const totalInfants = driverBookings.reduce((sum, b) => sum + (b.infants || 0), 0)
                return (
                  <Card key={driver?.id || 'unassigned'} className="overflow-hidden">
                    <div className="px-4 py-2 border-b flex items-center justify-between bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-900">
                      <div className="flex items-center gap-3">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-semibold">
                          {driver ? (driver.nickname || driver.name) : (
                            <span className="text-amber-600">Unassigned</span>
                          )}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {driverBookings.length} bookings
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {totalAdults}A {totalChildren}C {totalInfants}I
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleCopyDriver(driver, driverBookings)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <FileDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDownloadDriverCsv(driver, driverBookings)}>
                              <FileSpreadsheet className="h-4 w-4 mr-2" />
                              Download CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownloadDriverPdf(driver, driverBookings)}>
                              <FileDown className="h-4 w-4 mr-2" />
                              Download PDF
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <ScrollArea className="w-full">
                      <div className="min-w-[1000px]">
                        <table className="w-full border-collapse">
                          <DriverTableHeader />
                          <tbody>
                            {driverBookings.map((booking, index) => 
                              renderDriverRow(booking, index)
                            )}
                          </tbody>
                        </table>
                      </div>
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          {/* By Boat Tab */}
          <TabsContent value="by-boat" className="mt-4">
            <div className="space-y-6">
              {bookingsByBoat.map(({ boat, bookings: boatBookings, guide, restaurant }) => {
                const totalAdults = boatBookings.reduce((sum, b) => sum + (b.adults || 0), 0)
                const totalChildren = boatBookings.reduce((sum, b) => sum + (b.children || 0), 0)
                const totalInfants = boatBookings.reduce((sum, b) => sum + (b.infants || 0), 0)
                return (
                  <Card key={boat?.id || 'unassigned'} className="overflow-hidden">
                    <div className="px-4 py-2 border-b flex items-center justify-between bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-950">
                      <div className="flex items-center gap-3">
                        <Anchor className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-semibold">
                          {boat ? boat.name : (
                            <span className="text-amber-600">Unassigned</span>
                          )}
                        </h3>
                        {boat?.captain_name && (
                          <span className="text-sm text-muted-foreground">
                            Captain: {boat.captain_name}
                          </span>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {boatBookings.length} bookings
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {totalAdults}A {totalChildren}C {totalInfants}I
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleCopyBoat(boat, boatBookings, guide, restaurant)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <FileDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDownloadBoatCsv(boat, boatBookings, guide, restaurant)}>
                              <FileSpreadsheet className="h-4 w-4 mr-2" />
                              Download CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownloadBoatPdf(boat, boatBookings, guide, restaurant)}>
                              <FileDown className="h-4 w-4 mr-2" />
                              Download PDF
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <ScrollArea className="w-full">
                      <div className="min-w-[1100px]">
                        <table className="w-full border-collapse">
                          <BoatTableHeader />
                          <tbody>
                            {boatBookings.map((booking, index) => 
                              renderBoatRow(booking, index, guide, restaurant)
                            )}
                          </tbody>
                        </table>
                      </div>
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                  </Card>
                )
              })}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Send Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Send Report via Email</DialogTitle>
            <DialogDescription>
              Send the operation report for {formatDate(selectedDate)} to an email address.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Recipient Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={emailRecipient}
                onChange={(e) => setEmailRecipient(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="format">File Format</Label>
              <Select value={emailFormat} onValueChange={(value: 'pdf' | 'csv') => setEmailFormat(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Report: {activeTab === 'full-report' ? 'Full Report' : activeTab === 'by-program' ? 'By Program' : activeTab === 'by-driver' ? 'By Driver' : 'By Boat'}</p>
              <p>Date: {formatDate(selectedDate)}</p>
              <p>Bookings: {bookings.length}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendEmail} disabled={isSendingEmail || !emailRecipient.trim()}>
              {isSendingEmail ? (
                <>Sending...</>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </ProtectedPage>
  )
}
