"use client"

import { useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { ProtectedPage } from '@/components/providers/page-lock-provider'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatDate, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import {
  DollarSign,
  FileText,
  TrendingUp,
  Search,
  X,
  Receipt,
  Users,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { parseDate } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'
import type { BookingWithRelations, Agent, Program } from '@/types'

interface FinanceStats {
  totalUnpaidAmount: number
  amountToInvoice: number
  bookingsToInvoice: number
  invoicedUnpaidAmount: number
  invoicesAwaitingPayment: number
}

interface FinanceBooking extends BookingWithRelations {
  calculated_revenue: number
  is_invoiced: boolean
  invoice_number?: string
  invoice_status?: string
  is_direct_booking?: boolean
}

// Helper function to check if a booking can be invoiced
// Direct website bookings and bookings from "direct" type agents cannot be invoiced
const canBeInvoiced = (booking: FinanceBooking): boolean => {
  // Already invoiced - can't invoice again
  if (booking.is_invoiced) return false
  
  // Direct website/online bookings cannot be invoiced
  if (booking.is_direct_booking) return false
  
  // No agent - cannot invoice
  if (!booking.agent_id) return false
  
  // Agent with type 'direct' cannot be invoiced (these are direct booking sources, not travel partners)
  const agent = booking.agent as { agent_type?: string } | undefined
  if (agent?.agent_type === 'direct') return false
  
  return true
}

type SortField = 'activity_date' | 'booking_number' | 'customer_name' | 'calculated_revenue' | 'created_at' | 'agent'
type SortOrder = 'asc' | 'desc'

export default function FinancePage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<FinanceStats | null>(null)
  const [bookings, setBookings] = useState<FinanceBooking[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBookings, setSelectedBookings] = useState<Set<string>>(new Set())
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
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

  // Filters
  const [search, setSearch] = useState('')
  const [agentFilter, setAgentFilter] = useState<string>('')
  const [programFilter, setProgramFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [invoicedFilter, setInvoicedFilter] = useState<string>('all')
  const [activityDateFrom, setActivityDateFrom] = useState<string>('')
  const [activityDateTo, setActivityDateTo] = useState<string>('')
  const [bookingDateFrom, setBookingDateFrom] = useState<string>('')
  const [bookingDateTo, setBookingDateTo] = useState<string>('')

  // Sorting
  const [sortField, setSortField] = useState<SortField>('activity_date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  // Deduplicated agent options for combobox - dedupe by name to avoid duplicates
  const agentOptions = useMemo<ComboboxOption[]>(() => {
    const seenNames = new Set<string>()
    const options: ComboboxOption[] = [
      { value: 'all', label: 'All Agents' },
      { value: 'direct', label: 'Direct Bookings' },
    ]
    agents.forEach((agent) => {
      if (!seenNames.has(agent.name)) {
        seenNames.add(agent.name)
        options.push({ value: agent.id, label: agent.name })
      }
    })
    return options
  }, [agents])

  // Deduplicated program options for combobox
  const programOptions = useMemo<ComboboxOption[]>(() => {
    const seen = new Set<string>()
    const options: ComboboxOption[] = [
      { value: 'all', label: 'All Programs' },
    ]
    programs.forEach((program) => {
      if (!seen.has(program.id)) {
        seen.add(program.id)
        options.push({ value: program.id, label: program.name })
      }
    })
    return options
  }, [programs])

  // Activity date range - convert to DateValue format
  const activityDateRange = useMemo(() => {
    if (activityDateFrom && activityDateTo) {
      return {
        start: parseDate(activityDateFrom),
        end: parseDate(activityDateTo),
      }
    }
    return null
  }, [activityDateFrom, activityDateTo])

  // Booking date range - convert to DateValue format
  const bookingDateRange = useMemo(() => {
    if (bookingDateFrom && bookingDateTo) {
      return {
        start: parseDate(bookingDateFrom),
        end: parseDate(bookingDateTo),
      }
    }
    return null
  }, [bookingDateFrom, bookingDateTo])

  // Track which date filter is active (mutually exclusive)
  const [activeDateFilter, setActiveDateFilter] = useState<'activity' | 'booking' | null>(() => {
    if (activityDateFrom || activityDateTo) return 'activity'
    if (bookingDateFrom || bookingDateTo) return 'booking'
    return null
  })

  const fetchData = useCallback(async () => {
    if (!user?.company_id) return

    try {
      const response = await fetch('/api/finance/data')
      
      if (!response.ok) {
        if (response.status >= 500) {
          toast.error('Failed to load bookings')
        }
        setLoading(false)
        return
      }

      const { bookings: bookingsData, programs: programsData, agents: agentsData, invoices: invoicesData, invoiceItems: invoiceItemsData, agentPricing: agentPricingData } = await response.json()

      // Create a map of booking_id to invoice info
      const invoiceMap = new Map<string, { invoice_number: string; status: string }>()
      if (invoiceItemsData && invoicesData) {
        const invoicesById = new Map(invoicesData.map((inv: any) => [inv.id, inv]))
        invoiceItemsData.forEach((item: any) => {
          const invoice = invoicesById.get(item.invoice_id)
          if (invoice) {
            invoiceMap.set(item.booking_id, {
              invoice_number: (invoice as any).invoice_number,
              status: (invoice as any).status,
            })
          }
        })
      }

      // Create a map of agent_id+program_id to agent pricing
      const agentPricingMap = new Map<string, { agent_price: number; adult_agent_price: number | null; child_agent_price: number | null }>()
      if (agentPricingData) {
        agentPricingData.forEach((pricing: any) => {
          const key = `${pricing.agent_id}-${pricing.program_id}`
          agentPricingMap.set(key, {
            agent_price: pricing.agent_price || 0,
            adult_agent_price: pricing.adult_agent_price,
            child_agent_price: pricing.child_agent_price,
          })
        })
      }

      // Calculate revenue and add invoice status for each booking
      const bookingsWithRevenue: FinanceBooking[] = (bookingsData || []).map((booking: any) => {
        const program = booking.program as { 
          base_price?: number
          pricing_type?: string
          adult_selling_price?: number
          child_selling_price?: number 
        } | undefined
        
        // Get agent-specific pricing if available
        const agentId = booking.agent_id
        const programId = booking.program_id
        const agentPricing = agentId && programId ? agentPricingMap.get(`${agentId}-${programId}`) : null
        
        let calculated_revenue = 0
        const adults = booking.adults || 0
        const children = booking.children || 0
        
        if (agentPricing) {
          // Use agent pricing
          if (agentPricing.adult_agent_price !== null && agentPricing.child_agent_price !== null) {
            // Adult/child pricing
            calculated_revenue = (agentPricing.adult_agent_price * adults) + (agentPricing.child_agent_price * children)
          } else if (agentPricing.agent_price) {
            // Single price per person
            calculated_revenue = agentPricing.agent_price * (adults + children)
          }
        } else {
          // Fall back to program base price
          const basePrice = program?.base_price || 0
          calculated_revenue = basePrice * (adults + children * 0.5)
        }
        
        const invoiceInfo = invoiceMap.get(booking.id)

        return {
          ...booking,
          calculated_revenue,
          is_invoiced: !!invoiceInfo,
          invoice_number: invoiceInfo?.invoice_number,
          invoice_status: invoiceInfo?.status,
        }
      })

      setBookings(bookingsWithRevenue)
      setAgents(agentsData || [])
      setPrograms(programsData || [])
      setLoading(false)
      return
    } catch (error) {
      console.error('Error fetching finance data:', error)
      toast.error('Failed to load bookings')
      setLoading(false)
      return
    }
  }, [user?.company_id])

  // Calculate stats when bookings change
  useEffect(() => {
    if (bookings.length === 0) {
      setStats({
        totalUnpaidAmount: 0,
        amountToInvoice: 0,
        bookingsToInvoice: 0,
        invoicedUnpaidAmount: 0,
        invoicesAwaitingPayment: 0,
      })
      return
    }

    // Calculate stats for invoicing
    // Only count bookings that can actually be invoiced (excludes direct bookings and direct-type agents)
    const invoiceableBookingsList = bookings.filter(b => canBeInvoiced(b))
    const amountToInvoice = invoiceableBookingsList.reduce((sum, b) => sum + b.calculated_revenue, 0)
    const bookingsToInvoice = invoiceableBookingsList.length

    // Invoiced but unpaid bookings (status is 'draft' or 'sent', not 'paid')
    const invoicedUnpaidBookings = bookings.filter(b => 
      b.is_invoiced && b.invoice_status && b.invoice_status !== 'paid'
    )
    const invoicedUnpaidAmount = invoicedUnpaidBookings.reduce((sum, b) => sum + b.calculated_revenue, 0)

    // Count unique invoices awaiting payment
    const unpaidInvoiceNumbers = new Set(invoicedUnpaidBookings.map(b => b.invoice_number).filter(Boolean))
    const invoicesAwaitingPayment = unpaidInvoiceNumbers.size

    // Total unpaid = uninvoiced amount + invoiced but unpaid amount
    const totalUnpaidAmount = amountToInvoice + invoicedUnpaidAmount

    setStats({
      totalUnpaidAmount,
      amountToInvoice,
      bookingsToInvoice,
      invoicedUnpaidAmount,
      invoicesAwaitingPayment,
    })
  }, [bookings])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filtered and sorted bookings
  const filteredBookings = useMemo(() => {
    let result = [...bookings]

    // Apply search filter
    if (search) {
      const term = search.toLowerCase()
      result = result.filter(b =>
        b.booking_number.toLowerCase().includes(term) ||
        b.customer_name.toLowerCase().includes(term) ||
        (b.program as any)?.name?.toLowerCase().includes(term)
      )
    }

    // Apply agent filter
    if (agentFilter && agentFilter !== 'all') {
      if (agentFilter === 'direct') {
        result = result.filter(b => !b.agent_id)
      } else {
        result = result.filter(b => b.agent_id === agentFilter)
      }
    }

    // Apply program filter
    if (programFilter && programFilter !== 'all') {
      result = result.filter(b => b.program_id === programFilter)
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(b => b.status === statusFilter)
    }

    // Apply invoiced filter
    if (invoicedFilter !== 'all') {
      if (invoicedFilter === 'invoiced') {
        result = result.filter(b => b.is_invoiced)
      } else {
        result = result.filter(b => !b.is_invoiced)
      }
    }

    // Apply activity date filters
    if (activityDateFrom) {
      result = result.filter(b => b.activity_date >= activityDateFrom)
    }
    if (activityDateTo) {
      result = result.filter(b => b.activity_date <= activityDateTo)
    }

    // Apply booking date filters (using created_at)
    if (bookingDateFrom) {
      result = result.filter(b => {
        const createdDate = b.created_at ? b.created_at.split('T')[0] : ''
        return createdDate >= bookingDateFrom
      })
    }
    if (bookingDateTo) {
      result = result.filter(b => {
        const createdDate = b.created_at ? b.created_at.split('T')[0] : ''
        return createdDate <= bookingDateTo
      })
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'activity_date':
          comparison = a.activity_date.localeCompare(b.activity_date)
          break
        case 'booking_number':
          comparison = a.booking_number.localeCompare(b.booking_number)
          break
        case 'customer_name':
          comparison = a.customer_name.localeCompare(b.customer_name)
          break
        case 'calculated_revenue':
          comparison = a.calculated_revenue - b.calculated_revenue
          break
        case 'created_at':
          comparison = (a.created_at || '').localeCompare(b.created_at || '')
          break
        case 'agent':
          const aAgent = a.agent_id ? (a.agent as any)?.name || '' : 'Direct'
          const bAgent = b.agent_id ? (b.agent as any)?.name || '' : 'Direct'
          comparison = aAgent.localeCompare(bAgent)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [bookings, search, agentFilter, programFilter, statusFilter, invoicedFilter, activityDateFrom, activityDateTo, bookingDateFrom, bookingDateTo, sortField, sortOrder])

  // Pagination calculations
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage)
  const paginatedBookings = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredBookings.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredBookings, currentPage, itemsPerPage])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, agentFilter, programFilter, statusFilter, invoicedFilter, activityDateFrom, activityDateTo, bookingDateFrom, bookingDateTo, sortField, sortOrder])

  // Calculate totals for filtered bookings
  const filteredTotals = useMemo(() => {
    return {
      count: filteredBookings.length,
      revenue: filteredBookings.reduce((sum, b) => sum + b.calculated_revenue, 0),
      guests: filteredBookings.reduce((sum, b) => sum + (b.adults || 0) + (b.children || 0) + (b.infants || 0), 0),
    }
  }, [filteredBookings])

  // Selected bookings totals
  const selectedTotals = useMemo(() => {
    const selected = filteredBookings.filter(b => selectedBookings.has(b.id))
    return {
      count: selected.length,
      revenue: selected.reduce((sum, b) => sum + b.calculated_revenue, 0),
    }
  }, [filteredBookings, selectedBookings])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />
    return sortOrder === 'asc'
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Only select bookings that can be invoiced (not direct bookings, not from direct agents)
      const invoiceable = filteredBookings.filter(b => canBeInvoiced(b)).map(b => b.id)
      setSelectedBookings(new Set(invoiceable))
    } else {
      setSelectedBookings(new Set())
    }
  }

  const handleSelectBooking = (bookingId: string, checked: boolean) => {
    const newSelected = new Set(selectedBookings)
    if (checked) {
      newSelected.add(bookingId)
    } else {
      newSelected.delete(bookingId)
    }
    setSelectedBookings(newSelected)
  }

  const clearFilters = () => {
    setSearch('')
    setAgentFilter('')
    setProgramFilter('')
    setStatusFilter('all')
    setInvoicedFilter('all')
    setActivityDateFrom('')
    setActivityDateTo('')
    setBookingDateFrom('')
    setBookingDateTo('')
    setActiveDateFilter(null)
  }

  const hasActiveFilters = search || (agentFilter && agentFilter !== 'all') || (programFilter && programFilter !== 'all') || statusFilter !== 'all' || invoicedFilter !== 'all' || activityDateFrom || activityDateTo || bookingDateFrom || bookingDateTo

  const activeFiltersCount = [
    activityDateFrom || activityDateTo,
    bookingDateFrom || bookingDateTo,
    statusFilter !== 'all',
    programFilter && programFilter !== 'all',
    agentFilter && agentFilter !== 'all',
    invoicedFilter !== 'all',
  ].filter(Boolean).length

  // Activity date change (clears booking date)
  const handleActivityDateChange = (range: { start: DateValue; end: DateValue } | null) => {
    setActiveDateFilter('activity')
    setActivityDateFrom(range ? range.start.toString() : '')
    setActivityDateTo(range ? range.end.toString() : '')
    setBookingDateFrom('')
    setBookingDateTo('')
  }

  // Booking date change (clears activity date)
  const handleBookingDateChange = (range: { start: DateValue; end: DateValue } | null) => {
    setActiveDateFilter('booking')
    setActivityDateFrom('')
    setActivityDateTo('')
    setBookingDateFrom(range ? range.start.toString() : '')
    setBookingDateTo(range ? range.end.toString() : '')
  }

  // Truncate text helper
  const truncateText = (text: string | null | undefined, maxLength: number = 15): string => {
    if (!text) return '-'
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  // Get selected bookings grouped by agent for invoice creation
  const selectedBookingsByAgent = useMemo(() => {
    const selected = filteredBookings.filter(b => selectedBookings.has(b.id) && canBeInvoiced(b))
    const grouped = new Map<string | null, FinanceBooking[]>()

    selected.forEach(booking => {
      const agentId = booking.agent_id
      if (!grouped.has(agentId)) {
        grouped.set(agentId, [])
      }
      grouped.get(agentId)!.push(booking)
    })

    return grouped
  }, [filteredBookings, selectedBookings])

  const handleGenerateInvoices = async () => {
    if (selectedBookingsByAgent.size === 0) {
      toast.error('No uninvoiced bookings selected')
      return
    }

    setGenerating(true)
    const supabase = createClient()

    try {
      for (const [agentId, agentBookings] of selectedBookingsByAgent) {
        if (!agentId) {
          // Skip direct bookings - they can't be invoiced to an agent
          toast.info(`Skipped ${agentBookings.length} direct booking(s) - no agent to invoice`)
          continue
        }

        // Generate invoice number
        const year = new Date().getFullYear()
        const month = (new Date().getMonth() + 1).toString().padStart(2, '0')
        const prefix = `INV-${year}${month}-`

        // Get the highest invoice number for this month to avoid duplicates
        const { data: latestInvoice } = await supabase
          .from('invoices')
          .select('invoice_number')
          .eq('company_id', user!.company_id!)
          .like('invoice_number', `${prefix}%`)
          .order('invoice_number', { ascending: false })
          .limit(1)
          .single()

        let nextNumber = 1
        if (latestInvoice?.invoice_number) {
          const lastNumber = parseInt(latestInvoice.invoice_number.replace(prefix, ''), 10)
          if (!isNaN(lastNumber)) {
            nextNumber = lastNumber + 1
          }
        }

        const invoiceNumber = `${prefix}${nextNumber.toString().padStart(4, '0')}`

        // Calculate date range and total
        const dates = agentBookings.map(b => b.activity_date).sort()
        const totalAmount = agentBookings.reduce((sum, b) => sum + b.calculated_revenue, 0)

        // Calculate due date
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + invoiceDueDays)
        const dueDateStr = dueDate.toISOString().split('T')[0]

        // Create invoice
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            company_id: user!.company_id!,
            agent_id: agentId,
            invoice_number: invoiceNumber,
            date_from: dates[0],
            date_to: dates[dates.length - 1],
            total_amount: totalAmount,
            status: 'draft',
            due_date: dueDateStr,
            due_days: invoiceDueDays,
            last_modified_by: user?.id || null,
            last_modified_by_name: user?.name || null,
          })
          .select()
          .single()

        if (invoiceError) throw invoiceError

        // Create invoice items
        const invoiceItems = agentBookings.map(booking => ({
          invoice_id: invoice.id,
          booking_id: booking.id,
          amount: booking.calculated_revenue,
        }))

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(invoiceItems)

        if (itemsError) throw itemsError

        const agentName = agents.find(a => a.id === agentId)?.name || 'Unknown'
        toast.success(`Invoice ${invoiceNumber} created for ${agentName}`)
      }

      setInvoiceDialogOpen(false)
      setSelectedBookings(new Set())
      fetchData()
    } catch (error: any) {
      console.error('Error creating invoices:', error)
      toast.error(error.message || 'Failed to create invoices')
    } finally {
      setGenerating(false)
    }
  }

  const invoiceableSelectedCount = useMemo(() => {
    return filteredBookings.filter(b => selectedBookings.has(b.id) && canBeInvoiced(b)).length
  }, [filteredBookings, selectedBookings])

  return (
    <ProtectedPage pageKey="finance" pageName="Finance">
    <div className="space-y-6">
      <PageHeader
        title="Finance"
        description="Track revenue and generate invoices"
      >
        <Button
          onClick={() => setInvoiceDialogOpen(true)}
          disabled={invoiceableSelectedCount === 0}
        >
          <Receipt className="w-4 h-4 mr-2" />
          Create Invoice ({invoiceableSelectedCount})
        </Button>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Unpaid</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-red-600">{formatCurrency(stats?.totalUnpaidAmount || 0)}</div>
            )}
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">To Invoice</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(stats?.amountToInvoice || 0)}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {stats?.bookingsToInvoice || 0} bookings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bookings to Invoice</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.bookingsToInvoice || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Not yet invoiced
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoiced Unpaid</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-yellow-600">{formatCurrency(stats?.invoicedUnpaidAmount || 0)}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Awaiting payment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoices Pending</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.invoicesAwaitingPayment || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Awaiting payment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="p-4 border rounded-xl bg-muted/30 space-y-3">
        {/* Row 1: Search, Date Pickers, Status, Program, Invoice Status */}
        <div className="flex flex-wrap items-start gap-3">
          {/* Search */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or booking #..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 w-[200px] rounded-md"
              />
            </div>
          </div>

          <DateRangePicker
            label="Activity Date"
            aria-label="Activity Date"
            shouldCloseOnSelect={false}
            value={activityDateRange}
            onChange={handleActivityDateChange}
            className={activeDateFilter === 'booking' ? 'opacity-40' : ''}
          />
          <DateRangePicker
            label="Booking Date"
            aria-label="Booking Date"
            shouldCloseOnSelect={false}
            value={bookingDateRange}
            onChange={handleBookingDateChange}
            className={activeDateFilter === 'activity' ? 'opacity-40' : ''}
          />
          
          {/* Status */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 w-auto min-w-[180px] text-sm rounded-md">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Program */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Program</label>
            <Select
              value={programFilter || 'all'}
              onValueChange={(val) => setProgramFilter(val === 'all' ? '' : val)}
            >
              <SelectTrigger className="h-10 w-auto min-w-[195px] text-sm rounded-md">
                <SelectValue placeholder="Program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All programs</SelectItem>
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: (program as any).color || '#3B82F6' }}
                      />
                      {program.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Invoice Status - moved next to Program */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Invoice Status</label>
            <Select value={invoicedFilter} onValueChange={setInvoicedFilter}>
              <SelectTrigger className="h-10 w-auto min-w-[130px] text-sm rounded-md">
                <SelectValue placeholder="Invoice Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="uninvoiced">Uninvoiced</SelectItem>
                <SelectItem value="invoiced">Invoiced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 2: Source and Clear */}
        <div className="flex flex-wrap items-start gap-3">
          {/* Source */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Source</label>
            <Combobox
              options={agentOptions}
              value={agentFilter || 'all'}
              onValueChange={(val) => setAgentFilter(val === 'all' ? '' : val)}
              placeholder="All Agents"
              searchPlaceholder="Search..."
              emptyText="No match"
              className="h-10 min-w-[340px] text-sm rounded-md"
            />
          </div>

          {/* Clear */}
          {activeFiltersCount > 0 && (
            <div className="flex items-end gap-2">
              <div className="h-10 w-px bg-border" />
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-10 text-sm px-3 rounded-md text-muted-foreground hover:text-foreground mt-auto"
              >
                <X className="h-4 w-4 mr-1.5" />
                Clear all
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Summary Bar */}
      {filteredBookings.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Badge variant="secondary" className="text-sm py-1 px-3">
            {filteredTotals.count} bookings
          </Badge>
          <Badge variant="secondary" className="text-sm py-1 px-3">
            {filteredTotals.guests} guests
          </Badge>
          <Badge variant="outline" className="text-sm py-1 px-3">
            Revenue: {formatCurrency(filteredTotals.revenue)}
          </Badge>
          {selectedBookings.size > 0 && (
            <Badge variant="default" className="text-sm py-1 px-3">
              Selected: {selectedTotals.count} ({formatCurrency(selectedTotals.revenue)})
            </Badge>
          )}
        </div>
      )}

      {/* Bookings Table */}
      {loading ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filteredBookings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No bookings found</h3>
            <p className="text-muted-foreground text-center">
              {hasActiveFilters ? 'Try adjusting your filters' : 'No confirmed or completed bookings yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedBookings.size > 0 && selectedBookings.size === filteredBookings.filter(b => canBeInvoiced(b)).length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center font-medium hover:text-foreground"
                      onClick={() => handleSort('booking_number')}
                    >
                      Booking #
                      {getSortIcon('booking_number')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center font-medium hover:text-foreground"
                      onClick={() => handleSort('agent')}
                    >
                      Agent
                      {getSortIcon('agent')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center font-medium hover:text-foreground"
                      onClick={() => handleSort('created_at')}
                    >
                      Booking Date
                      {getSortIcon('created_at')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center font-medium hover:text-foreground"
                      onClick={() => handleSort('activity_date')}
                    >
                      Activity Date
                      {getSortIcon('activity_date')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center font-medium hover:text-foreground"
                      onClick={() => handleSort('customer_name')}
                    >
                      Customer
                      {getSortIcon('customer_name')}
                    </button>
                  </TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead className="w-10 text-center px-1">A</TableHead>
                  <TableHead className="w-10 text-center px-1">C</TableHead>
                  <TableHead className="w-10 text-center px-1">I</TableHead>
                  <TableHead>Hotel</TableHead>
                  <TableHead>
                    <button
                      className="flex items-center font-medium hover:text-foreground"
                      onClick={() => handleSort('calculated_revenue')}
                    >
                      Revenue
                      {getSortIcon('calculated_revenue')}
                    </button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Voucher</TableHead>
                  <TableHead>Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedBookings.map((booking) => {
                  const program = booking.program as { name?: string; nickname?: string; color?: string } | undefined
                  const programDisplay = program?.nickname || program?.name || '-'
                  const agentStaff = booking.agent_staff as { nickname?: string; full_name?: string } | undefined
                  const staffName = agentStaff?.nickname || agentStaff?.full_name
                  
                  // Split booking number into prefix and number
                  const bookingNumMatch = booking.booking_number.match(/^([A-Z]+-?)(\d+)$/)
                  const bookingPrefix = bookingNumMatch ? bookingNumMatch[1] : ''
                  const bookingNum = bookingNumMatch ? bookingNumMatch[2] : booking.booking_number
                  
                  // Split customer name
                  const nameParts = booking.customer_name.trim().split(/\s+/)
                  const firstName = nameParts[0] || ''
                  const lastName = nameParts.slice(1).join(' ')
                  
                  // Hotel info
                  const hotel = booking.hotel as { name?: string; area?: string } | undefined
                  const hotelName = hotel?.name || booking.custom_pickup_location || '-'
                  const hotelArea = hotel?.area || ''
                  
                  // Format booking date
                  const bookingDateStr = booking.created_at ? booking.created_at.split('T')[0] : ''
                  const bookingDate = bookingDateStr ? new Date(bookingDateStr) : null
                  const bookingDateFormatted = bookingDate ? `${(bookingDate.getMonth() + 1).toString().padStart(2, '0')}/${bookingDate.getDate().toString().padStart(2, '0')}/${bookingDate.getFullYear().toString().slice(-2)}` : '-'
                  const bookingTime = booking.created_at ? new Date(booking.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''
                  
                  return (
                    <TableRow key={booking.id} className={selectedBookings.has(booking.id) ? 'bg-muted/50' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedBookings.has(booking.id)}
                          onCheckedChange={(checked) => handleSelectBooking(booking.id, !!checked)}
                          disabled={!canBeInvoiced(booking)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">{bookingPrefix}</p>
                          <p className="font-bold">{bookingNum}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-foreground">
                            {booking.agent_id
                              ? (booking.agent as any)?.name || '-'
                              : 'Direct'}
                          </span>
                          {staffName && (
                            <span className="text-xs text-muted-foreground">{staffName}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-muted-foreground text-sm">{bookingDateFormatted}</p>
                          <p className="text-xs text-muted-foreground">{bookingTime}</p>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(booking.activity_date)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{firstName}</p>
                          {lastName && <p className="text-sm text-muted-foreground">{lastName}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: program?.color || '#3B82F6' }}
                          />
                          <span className="text-muted-foreground">{programDisplay}</span>
                        </span>
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
                          <p className="text-sm">{hotelName}</p>
                          {hotelArea && <p className="text-xs text-muted-foreground">{hotelArea}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(booking.calculated_revenue)}
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              {booking.status === 'completed' ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              ) : booking.status === 'confirmed' ? (
                                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                              ) : (
                                <Clock className="h-5 w-5 text-yellow-600" />
                              )}
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="capitalize">{booking.status}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
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
                        {booking.is_invoiced ? (
                          <span className={`inline-flex font-mono text-xs px-2.5 py-1 rounded-md ${
                            booking.invoice_status === 'paid'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          }`}>
                            {booking.invoice_number}
                          </span>
                        ) : booking.is_direct_booking || !booking.agent_id || (booking.agent as any)?.agent_type === 'direct' ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-help">
                                  N/A
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p>Direct bookings cannot be invoiced</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
          
          {/* Pagination */}
          {filteredBookings.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Rows per page:</span>
                <Select value={itemsPerPage.toString()} onValueChange={(value) => { setItemsPerPage(Number(value)); setCurrentPage(1); }}>
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages} ({filteredBookings.length} items)
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Create Invoice Dialog */}
      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
            <DialogDescription>
              Generate invoices for the selected bookings. Bookings will be grouped by agent.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {selectedBookingsByAgent.size === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No uninvoiced bookings selected
              </p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {Array.from(selectedBookingsByAgent.entries()).map(([agentId, agentBookings]) => {
                  const agent = agents.find(a => a.id === agentId)
                  const totalRevenue = agentBookings.reduce((sum, b) => sum + b.calculated_revenue, 0)

                  return (
                    <div key={agentId || 'direct'} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {agentId ? agent?.name || 'Unknown Agent' : 'Direct Bookings'}
                          </span>
                          {!agentId && (
                            <Badge variant="secondary" className="text-xs">Cannot invoice</Badge>
                          )}
                        </div>
                        <Badge variant="outline">
                          {agentBookings.length} booking{agentBookings.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm">
                        {agentBookings.slice(0, 5).map(booking => (
                          <div key={booking.id} className="flex items-center justify-between text-muted-foreground">
                            <span>{booking.booking_number} - {formatDate(booking.activity_date)}</span>
                            <span>{formatCurrency(booking.calculated_revenue)}</span>
                          </div>
                        ))}
                        {agentBookings.length > 5 && (
                          <p className="text-muted-foreground">
                            ... and {agentBookings.length - 5} more
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t font-semibold">
                        <span>Total</span>
                        <span>{formatCurrency(totalRevenue)}</span>
                      </div>
                    </div>
                  )
                })}

                {/* Due Date Selection */}
                <div className="border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Payment Due</p>
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
            <Button variant="outline" onClick={() => setInvoiceDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerateInvoices}
              disabled={generating || Array.from(selectedBookingsByAgent.keys()).every(k => !k)}
            >
              {generating ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Receipt className="h-4 w-4 mr-2" />
                  Generate Invoice{selectedBookingsByAgent.size > 1 ? 's' : ''}
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
