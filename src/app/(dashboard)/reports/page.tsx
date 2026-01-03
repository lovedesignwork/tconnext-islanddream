"use client"

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { ProtectedPage } from '@/components/providers/page-lock-provider'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
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
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Download,
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  CreditCard,
  PieChart,
  BarChart3,
  DollarSign,
  Building2,
  UserCheck,
  Clock,
  MapPin,
  Ship,
  Car,
  CalendarDays,
  Target,
  Activity,
  Wallet,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
} from 'recharts'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface BookingData {
  id: string
  booking_number: string
  activity_date: string
  created_at: string
  adults: number
  children: number
  infants: number
  collect_money: number
  status: string
  payment_type: string
  is_direct_booking: boolean
  is_come_direct: boolean
  program_id: string
  agent_id: string | null
  hotel_id: string | null
  invoice_id: string | null
  program?: { id: string; name: string; nickname?: string; color?: string; base_price: number }
  agent?: { id: string; name: string }
  hotel?: { id: string; name: string; area: string }
}

interface ProgramStats {
  id: string
  name: string
  nickname?: string
  color: string
  bookings: number
  guests: number
  revenue: number
  percentage: number
}

interface AgentStats {
  id: string | null
  name: string
  bookings: number
  guests: number
  revenue: number
  percentage: number
  trend: number
}

interface MonthlyData {
  month: string
  monthLabel: string
  bookings: number
  guests: number
  revenue: number
}

interface DailyPattern {
  day: string
  bookings: number
  avgGuests: number
}

interface HotelAreaStats {
  area: string
  bookings: number
  guests: number
  percentage: number
}

interface StatusStats {
  status: string
  count: number
  percentage: number
  color: string
}

interface PaymentTypeStats {
  type: string
  count: number
  percentage: number
  color: string
}

interface ReportStats {
  // Overview
  totalBookings: number
  totalGuests: number
  totalAdults: number
  totalChildren: number
  totalInfants: number
  totalRevenue: number
  outstandingAmount: number
  avgBookingValue: number
  avgPartySize: number
  
  // Trends (compared to previous period)
  bookingsTrend: number
  guestsTrend: number
  revenueTrend: number
  
  // Time-based
  monthlyData: MonthlyData[]
  dailyPattern: DailyPattern[]
  
  // Program breakdown
  programStats: ProgramStats[]
  
  // Agent/Source breakdown
  agentStats: AgentStats[]
  directVsAgentRatio: { direct: number; agent: number }
  
  // Hotel areas
  hotelAreaStats: HotelAreaStats[]
  
  // Status breakdown
  statusStats: StatusStats[]
  
  // Payment types
  paymentTypeStats: PaymentTypeStats[]
  
  // Operational
  comeDirectRatio: { comeDirect: number; pickup: number }
  avgLeadTime: number
  invoicedVsUninvoiced: { invoiced: number; uninvoiced: number }
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CHART_COLORS = [
  '#93C5FD', '#A5F3FC', '#99F6E4', '#86EFAC', '#BBF7D0', 
  '#D9F99D', '#FDE68A', '#FED7AA', '#FCA5A5', '#FBCFE8',
  '#F9A8D4', '#DDD6FE', '#C4B5FD', '#D8B4FE', '#E9D5FF',
]

const STATUS_COLORS: Record<string, string> = {
  confirmed: '#93C5FD',  // Pastel blue
  completed: '#86EFAC',  // Pastel green
  pending: '#FED7AA',    // Pastel orange
  cancelled: '#FCA5A5',  // Pastel red
  void: '#D1D5DB',       // Pastel gray
}

const PAYMENT_TYPE_COLORS: Record<string, string> = {
  regular: '#93C5FD',  // Pastel blue
  foc: '#DDD6FE',      // Pastel purple
  insp: '#FED7AA',     // Pastel orange
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendLabel,
  gradient,
  loading 
}: { 
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  trend?: number
  trendLabel?: string
  gradient?: string
  loading?: boolean
}) {
  const getTrendIcon = () => {
    if (trend === undefined || trend === 0) return <Minus className="h-3 w-3" />
    return trend > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />
  }
  
  const getTrendColor = () => {
    if (trend === undefined || trend === 0) return 'text-gray-700 dark:text-gray-400'
    return trend > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'
  }

  return (
    <Card className={`relative overflow-hidden ${gradient ? 'text-gray-800 dark:text-gray-900 border-0' : ''}`}>
      {gradient && (
        <div className={`absolute inset-0 ${gradient}`} />
      )}
      <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={`text-sm font-medium ${gradient ? 'text-gray-800 dark:text-gray-900' : ''}`}>
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${gradient ? 'text-gray-700 dark:text-gray-800' : 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent className="relative">
        {loading ? (
          <Skeleton className={`h-8 w-24 ${gradient ? 'bg-white/30' : ''}`} />
        ) : (
          <>
            <div className={`text-2xl font-bold ${gradient ? 'text-gray-900' : ''}`}>{value}</div>
            {subtitle && (
              <p className={`text-xs ${gradient ? 'text-gray-800 dark:text-gray-900' : 'text-muted-foreground'}`}>
                {subtitle}
              </p>
            )}
            {trend !== undefined && (
              <div className={`flex items-center gap-1 mt-1 text-xs font-semibold ${getTrendColor()}`}>
                {getTrendIcon()}
                <span>{Math.abs(trend).toFixed(1)}%</span>
                {trendLabel && <span className="text-gray-700 dark:text-gray-800 ml-1">{trendLabel}</span>}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function MiniStatCard({
  title,
  value,
  icon: Icon,
  color,
  loading,
}: {
  title: string
  value: string | number
  icon: React.ElementType
  color: string
  loading?: boolean
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="h-4 w-4 text-gray-800 dark:text-gray-900" />
      </div>
      <div>
        {loading ? (
          <Skeleton className="h-5 w-12" />
        ) : (
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{value}</p>
        )}
        <p className="text-xs text-muted-foreground">{title}</p>
      </div>
    </div>
  )
}

function ChartCard({
  title,
  description,
  icon: Icon,
  children,
  loading,
  className = '',
}: {
  title: string
  description?: string
  icon?: React.ElementType
  children: React.ReactNode
  loading?: boolean
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

// Custom tooltip for charts
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  
  return (
    <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry: any, index: number) => (
        <p key={index} style={{ color: entry.color }} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          {entry.name}: {typeof entry.value === 'number' && entry.name.toLowerCase().includes('revenue') 
            ? formatCurrency(entry.value) 
            : entry.value}
        </p>
      ))}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ReportsPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<ReportStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('this_month')

  // Calculate date boundaries based on selected range
  const dateBoundaries = useMemo(() => {
    const now = new Date()
    let dateFrom: string
    let dateTo: string = now.toISOString().split('T')[0]
    let prevDateFrom: string
    let prevDateTo: string

    switch (dateRange) {
      case 'today':
        dateFrom = dateTo
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        prevDateFrom = prevDateTo = yesterday.toISOString().split('T')[0]
        break
      case 'this_week':
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay())
        dateFrom = weekStart.toISOString().split('T')[0]
        const prevWeekStart = new Date(weekStart)
        prevWeekStart.setDate(prevWeekStart.getDate() - 7)
        const prevWeekEnd = new Date(weekStart)
        prevWeekEnd.setDate(prevWeekEnd.getDate() - 1)
        prevDateFrom = prevWeekStart.toISOString().split('T')[0]
        prevDateTo = prevWeekEnd.toISOString().split('T')[0]
        break
      case 'this_month':
        dateFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
        prevDateFrom = prevMonth.toISOString().split('T')[0]
        prevDateTo = prevMonthEnd.toISOString().split('T')[0]
        break
      case 'this_quarter':
        const quarter = Math.floor(now.getMonth() / 3)
        dateFrom = `${now.getFullYear()}-${String(quarter * 3 + 1).padStart(2, '0')}-01`
        const prevQuarterStart = new Date(now.getFullYear(), quarter * 3 - 3, 1)
        const prevQuarterEnd = new Date(now.getFullYear(), quarter * 3, 0)
        prevDateFrom = prevQuarterStart.toISOString().split('T')[0]
        prevDateTo = prevQuarterEnd.toISOString().split('T')[0]
        break
      case 'this_year':
        dateFrom = `${now.getFullYear()}-01-01`
        prevDateFrom = `${now.getFullYear() - 1}-01-01`
        prevDateTo = `${now.getFullYear() - 1}-12-31`
        break
      case 'last_30_days':
        const thirtyDaysAgo = new Date(now)
        thirtyDaysAgo.setDate(now.getDate() - 30)
        dateFrom = thirtyDaysAgo.toISOString().split('T')[0]
        const sixtyDaysAgo = new Date(now)
        sixtyDaysAgo.setDate(now.getDate() - 60)
        prevDateFrom = sixtyDaysAgo.toISOString().split('T')[0]
        const thirtyOneDaysAgo = new Date(now)
        thirtyOneDaysAgo.setDate(now.getDate() - 31)
        prevDateTo = thirtyOneDaysAgo.toISOString().split('T')[0]
        break
      case 'last_90_days':
        const ninetyDaysAgo = new Date(now)
        ninetyDaysAgo.setDate(now.getDate() - 90)
        dateFrom = ninetyDaysAgo.toISOString().split('T')[0]
        const oneEightyDaysAgo = new Date(now)
        oneEightyDaysAgo.setDate(now.getDate() - 180)
        prevDateFrom = oneEightyDaysAgo.toISOString().split('T')[0]
        const ninetyOneDaysAgo = new Date(now)
        ninetyOneDaysAgo.setDate(now.getDate() - 91)
        prevDateTo = ninetyOneDaysAgo.toISOString().split('T')[0]
        break
      default:
        dateFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
        const defaultPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const defaultPrevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
        prevDateFrom = defaultPrevMonth.toISOString().split('T')[0]
        prevDateTo = defaultPrevMonthEnd.toISOString().split('T')[0]
    }

    return { dateFrom, dateTo, prevDateFrom, prevDateTo }
  }, [dateRange])

  useEffect(() => {
    async function fetchStats() {
      if (!user?.company_id) return
      setLoading(true)

      const supabase = createClient()
      const { dateFrom, dateTo, prevDateFrom, prevDateTo } = dateBoundaries

      // Fetch current period bookings
      const { data: currentBookings } = await supabase
        .from('bookings')
        .select(`
          *,
          program:programs(id, name, nickname, color, base_price),
          agent:agents(id, name),
          hotel:hotels(id, name, area)
        `)
        .eq('company_id', user.company_id)
        .gte('activity_date', dateFrom)
        .lte('activity_date', dateTo)
        .is('deleted_at', null)
        .neq('status', 'void')

      // Fetch previous period bookings for comparison
      const { data: prevBookings } = await supabase
        .from('bookings')
        .select('id, adults, children, infants, collect_money')
        .eq('company_id', user.company_id)
        .gte('activity_date', prevDateFrom)
        .lte('activity_date', prevDateTo)
        .is('deleted_at', null)
        .neq('status', 'void')

      // Fetch agent pricing for revenue calculation
      const { data: agentPricing } = await supabase
        .from('agent_pricing')
        .select('agent_id, program_id, agent_price, adult_agent_price, child_agent_price')

      if (!currentBookings) {
        setLoading(false)
        return
      }

      const bookings = currentBookings as BookingData[]
      const prevBookingsList = prevBookings || []

      // Create pricing lookup map
      const pricingMap = new Map<string, { agent_price: number; adult_price?: number; child_price?: number }>()
      agentPricing?.forEach(p => {
        pricingMap.set(`${p.agent_id}-${p.program_id}`, {
          agent_price: p.agent_price,
          adult_price: p.adult_agent_price || undefined,
          child_price: p.child_agent_price || undefined,
        })
      })

      // Calculate revenue for a booking
      const calculateRevenue = (booking: BookingData): number => {
        const program = booking.program
        if (!program) return 0
        
        // Try to get agent-specific pricing
        if (booking.agent_id) {
          const pricing = pricingMap.get(`${booking.agent_id}-${booking.program_id}`)
          if (pricing) {
            if (pricing.adult_price && pricing.child_price) {
              return (booking.adults * pricing.adult_price) + (booking.children * pricing.child_price)
            }
            return (booking.adults + booking.children * 0.5) * pricing.agent_price
          }
        }
        
        // Fallback to base price
        return (booking.adults + booking.children * 0.5) * program.base_price
      }

      // ========== OVERVIEW STATS ==========
      const totalBookings = bookings.length
      const totalAdults = bookings.reduce((sum, b) => sum + (b.adults || 0), 0)
      const totalChildren = bookings.reduce((sum, b) => sum + (b.children || 0), 0)
      const totalInfants = bookings.reduce((sum, b) => sum + (b.infants || 0), 0)
      const totalGuests = totalAdults + totalChildren + totalInfants
      const outstandingAmount = bookings.reduce((sum, b) => sum + (b.collect_money || 0), 0)
      const totalRevenue = bookings.reduce((sum, b) => sum + calculateRevenue(b), 0)
      const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0
      const avgPartySize = totalBookings > 0 ? totalGuests / totalBookings : 0

      // Previous period stats for trends
      const prevTotalBookings = prevBookingsList.length
      const prevTotalGuests = prevBookingsList.reduce((sum, b) => sum + (b.adults || 0) + (b.children || 0) + (b.infants || 0), 0)
      const prevOutstanding = prevBookingsList.reduce((sum, b) => sum + (b.collect_money || 0), 0)

      const bookingsTrend = prevTotalBookings > 0 ? ((totalBookings - prevTotalBookings) / prevTotalBookings) * 100 : 0
      const guestsTrend = prevTotalGuests > 0 ? ((totalGuests - prevTotalGuests) / prevTotalGuests) * 100 : 0
      const revenueTrend = prevOutstanding > 0 ? ((outstandingAmount - prevOutstanding) / prevOutstanding) * 100 : 0

      // ========== MONTHLY DATA ==========
      const monthlyMap = new Map<string, { bookings: number; guests: number; revenue: number }>()
      bookings.forEach(b => {
        const month = b.activity_date.substring(0, 7) // YYYY-MM
        const existing = monthlyMap.get(month) || { bookings: 0, guests: 0, revenue: 0 }
        existing.bookings++
        existing.guests += (b.adults || 0) + (b.children || 0) + (b.infants || 0)
        existing.revenue += calculateRevenue(b)
        monthlyMap.set(month, existing)
      })

      const monthlyData: MonthlyData[] = Array.from(monthlyMap.entries())
        .map(([month, data]) => ({
          month,
          monthLabel: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          ...data,
        }))
        .sort((a, b) => a.month.localeCompare(b.month))

      // ========== DAILY PATTERN ==========
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const dailyMap = new Map<number, { bookings: number; guests: number }>()
      bookings.forEach(b => {
        const dayOfWeek = new Date(b.activity_date).getDay()
        const existing = dailyMap.get(dayOfWeek) || { bookings: 0, guests: 0 }
        existing.bookings++
        existing.guests += (b.adults || 0) + (b.children || 0) + (b.infants || 0)
        dailyMap.set(dayOfWeek, existing)
      })

      const dailyPattern: DailyPattern[] = dayNames.map((day, index) => {
        const data = dailyMap.get(index) || { bookings: 0, guests: 0 }
        return {
          day,
          bookings: data.bookings,
          avgGuests: data.bookings > 0 ? Math.round(data.guests / data.bookings * 10) / 10 : 0,
        }
      })

      // ========== PROGRAM STATS ==========
      const programMap = new Map<string, { name: string; nickname?: string; color: string; bookings: number; guests: number; revenue: number }>()
      bookings.forEach(b => {
        const program = b.program
        if (!program) return
        const existing = programMap.get(program.id) || { 
          name: program.name, 
          nickname: program.nickname,
          color: program.color || '#3B82F6', 
          bookings: 0, 
          guests: 0, 
          revenue: 0 
        }
        existing.bookings++
        existing.guests += (b.adults || 0) + (b.children || 0) + (b.infants || 0)
        existing.revenue += calculateRevenue(b)
        programMap.set(program.id, existing)
      })

      const programStats: ProgramStats[] = Array.from(programMap.entries())
        .map(([id, data]) => ({
          id,
          ...data,
          percentage: totalBookings > 0 ? (data.bookings / totalBookings) * 100 : 0,
        }))
        .sort((a, b) => b.bookings - a.bookings)

      // ========== AGENT STATS ==========
      const agentMap = new Map<string | null, { name: string; bookings: number; guests: number; revenue: number }>()
      bookings.forEach(b => {
        const agentId = b.agent_id
        const agentName = b.is_direct_booking ? 'Direct Booking' : (b.agent?.name || 'Unknown')
        const existing = agentMap.get(agentId) || { name: agentName, bookings: 0, guests: 0, revenue: 0 }
        existing.bookings++
        existing.guests += (b.adults || 0) + (b.children || 0) + (b.infants || 0)
        existing.revenue += calculateRevenue(b)
        agentMap.set(agentId, existing)
      })

      const agentStats: AgentStats[] = Array.from(agentMap.entries())
        .map(([id, data]) => ({
          id,
          ...data,
          percentage: totalBookings > 0 ? (data.bookings / totalBookings) * 100 : 0,
          trend: 0, // Would need historical data to calculate
        }))
        .sort((a, b) => b.bookings - a.bookings)

      // Direct vs Agent ratio
      const directBookings = bookings.filter(b => b.is_direct_booking).length
      const agentBookings = totalBookings - directBookings
      const directVsAgentRatio = { direct: directBookings, agent: agentBookings }

      // ========== HOTEL AREA STATS ==========
      const areaMap = new Map<string, { bookings: number; guests: number }>()
      bookings.forEach(b => {
        const area = b.hotel?.area || 'Unknown'
        const existing = areaMap.get(area) || { bookings: 0, guests: 0 }
        existing.bookings++
        existing.guests += (b.adults || 0) + (b.children || 0) + (b.infants || 0)
        areaMap.set(area, existing)
      })

      const hotelAreaStats: HotelAreaStats[] = Array.from(areaMap.entries())
        .map(([area, data]) => ({
          area,
          ...data,
          percentage: totalBookings > 0 ? (data.bookings / totalBookings) * 100 : 0,
        }))
        .sort((a, b) => b.bookings - a.bookings)

      // ========== STATUS STATS ==========
      const statusMap = new Map<string, number>()
      bookings.forEach(b => {
        statusMap.set(b.status, (statusMap.get(b.status) || 0) + 1)
      })

      const statusStats: StatusStats[] = Array.from(statusMap.entries())
        .map(([status, count]) => ({
          status,
          count,
          percentage: totalBookings > 0 ? (count / totalBookings) * 100 : 0,
          color: STATUS_COLORS[status] || '#6B7280',
        }))
        .sort((a, b) => b.count - a.count)

      // ========== PAYMENT TYPE STATS ==========
      const paymentMap = new Map<string, number>()
      bookings.forEach(b => {
        paymentMap.set(b.payment_type, (paymentMap.get(b.payment_type) || 0) + 1)
      })

      const paymentTypeStats: PaymentTypeStats[] = Array.from(paymentMap.entries())
        .map(([type, count]) => ({
          type,
          count,
          percentage: totalBookings > 0 ? (count / totalBookings) * 100 : 0,
          color: PAYMENT_TYPE_COLORS[type] || '#6B7280',
        }))
        .sort((a, b) => b.count - a.count)

      // ========== OPERATIONAL STATS ==========
      const comeDirectCount = bookings.filter(b => b.is_come_direct).length
      const pickupCount = totalBookings - comeDirectCount
      const comeDirectRatio = { comeDirect: comeDirectCount, pickup: pickupCount }

      // Calculate average lead time (days between created_at and activity_date)
      const leadTimes = bookings.map(b => {
        const created = new Date(b.created_at)
        const activity = new Date(b.activity_date)
        return Math.max(0, Math.floor((activity.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)))
      })
      const avgLeadTime = leadTimes.length > 0 ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length : 0

      // Invoiced vs Uninvoiced
      const invoicedCount = bookings.filter(b => b.invoice_id).length
      const uninvoicedCount = totalBookings - invoicedCount
      const invoicedVsUninvoiced = { invoiced: invoicedCount, uninvoiced: uninvoicedCount }

      setStats({
        totalBookings,
        totalGuests,
        totalAdults,
        totalChildren,
        totalInfants,
        totalRevenue,
        outstandingAmount,
        avgBookingValue,
        avgPartySize,
        bookingsTrend,
        guestsTrend,
        revenueTrend,
        monthlyData,
        dailyPattern,
        programStats,
        agentStats,
        directVsAgentRatio,
        hotelAreaStats,
        statusStats,
        paymentTypeStats,
        comeDirectRatio,
        avgLeadTime,
        invoicedVsUninvoiced,
      })

      setLoading(false)
    }

    fetchStats()
  }, [user, dateBoundaries])

  // Prepare chart data
  const sourceDistributionData = useMemo(() => {
    if (!stats) return []
    return [
      { name: 'Direct', value: stats.directVsAgentRatio.direct, color: '#86EFAC' },
      { name: 'Agent', value: stats.directVsAgentRatio.agent, color: '#93C5FD' },
    ]
  }, [stats])

  const pickupDistributionData = useMemo(() => {
    if (!stats) return []
    return [
      { name: 'Pickup', value: stats.comeDirectRatio.pickup, color: '#A5F3FC' },
      { name: 'Come Direct', value: stats.comeDirectRatio.comeDirect, color: '#FED7AA' },
    ]
  }, [stats])

  const invoiceDistributionData = useMemo(() => {
    if (!stats) return []
    return [
      { name: 'Invoiced', value: stats.invoicedVsUninvoiced.invoiced, color: '#86EFAC' },
      { name: 'Uninvoiced', value: stats.invoicedVsUninvoiced.uninvoiced, color: '#FCA5A5' },
    ]
  }, [stats])

  const guestTypeData = useMemo(() => {
    if (!stats) return []
    return [
      { name: 'Adults', value: stats.totalAdults, color: '#93C5FD' },
      { name: 'Children', value: stats.totalChildren, color: '#86EFAC' },
      { name: 'Infants', value: stats.totalInfants, color: '#FED7AA' },
    ]
  }, [stats])

  return (
    <ProtectedPage pageKey="reports" pageName="Reports">
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Comprehensive insights into your business performance"
      >
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="this_quarter">This Quarter</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
              <SelectItem value="last_30_days">Last 30 Days</SelectItem>
              <SelectItem value="last_90_days">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </PageHeader>

      {/* ====== OVERVIEW STATS ROW ====== */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <StatCard
          title="Total Bookings"
          value={stats?.totalBookings || 0}
          subtitle="bookings"
          icon={Calendar}
          trend={stats?.bookingsTrend}
          trendLabel="vs prev"
          gradient="bg-blue-300"
          loading={loading}
        />
        <StatCard
          title="Total Guests"
          value={stats?.totalGuests || 0}
          subtitle={`${stats?.totalAdults || 0}A / ${stats?.totalChildren || 0}C / ${stats?.totalInfants || 0}I`}
          icon={Users}
          trend={stats?.guestsTrend}
          trendLabel="vs prev"
          gradient="bg-cyan-300"
          loading={loading}
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats?.totalRevenue || 0)}
          subtitle="estimated"
          icon={DollarSign}
          trend={stats?.revenueTrend}
          trendLabel="vs prev"
          gradient="bg-emerald-300"
          loading={loading}
        />
        <StatCard
          title="Outstanding"
          value={formatCurrency(stats?.outstandingAmount || 0)}
          subtitle="to collect"
          icon={Wallet}
          loading={loading}
        />
        <StatCard
          title="Avg Booking Value"
          value={formatCurrency(stats?.avgBookingValue || 0)}
          subtitle="per booking"
          icon={Target}
          loading={loading}
        />
        <StatCard
          title="Avg Party Size"
          value={(stats?.avgPartySize || 0).toFixed(1)}
          subtitle="guests/booking"
          icon={UserCheck}
          loading={loading}
        />
      </div>

      {/* ====== TREND CHARTS ROW ====== */}
      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard
          title="Booking Trends"
          description="Bookings and guests over time"
          icon={TrendingUp}
          loading={loading}
          className="lg:col-span-2"
        >
          {stats?.monthlyData.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={stats.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar yAxisId="left" dataKey="bookings" name="Bookings" fill="#93C5FD" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="guests" name="Guests" stroke="#86EFAC" strokeWidth={3} dot={{ fill: '#86EFAC', r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No data available for this period
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Weekly Pattern"
          description="Bookings by day of week"
          icon={CalendarDays}
          loading={loading}
        >
          {stats?.dailyPattern.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.dailyPattern}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="bookings" name="Bookings" fill="#A5F3FC" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </ChartCard>
      </div>

      {/* ====== PROGRAM & AGENT SECTION ====== */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Programs */}
        <ChartCard
          title="Bookings by Program"
          description="Top performing programs"
          icon={BarChart3}
          loading={loading}
        >
          {stats?.programStats.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.programStats.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis 
                  dataKey="nickname" 
                  type="category" 
                  tick={{ fontSize: 11 }} 
                  width={100}
                  tickFormatter={(value, index) => {
                    const program = stats.programStats[index]
                    return program?.nickname || program?.name?.substring(0, 15) || value
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="bookings" 
                  name="Bookings" 
                  radius={[0, 4, 4, 0]}
                >
                  {stats.programStats.slice(0, 8).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </ChartCard>

        {/* Program Revenue Distribution */}
        <ChartCard
          title="Revenue by Program"
          description="Revenue distribution across programs"
          icon={PieChart}
          loading={loading}
        >
          {stats?.programStats.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={stats.programStats.slice(0, 6)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="revenue"
                  nameKey="nickname"
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {stats.programStats.slice(0, 6).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend 
                  formatter={(value, entry: any) => {
                    const item = stats.programStats.find(p => p.nickname === value || p.name === value)
                    return item?.nickname || item?.name || value
                  }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </ChartCard>
      </div>

      {/* ====== AGENT RANKING & SOURCE ====== */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top Agents Table */}
        <ChartCard
          title="Top Agents"
          description="Ranking by bookings"
          icon={Building2}
          loading={loading}
          className="lg:col-span-2"
        >
          {stats?.agentStats.length ? (
            <div className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead className="text-right">Bookings</TableHead>
                    <TableHead className="text-right">Guests</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.agentStats.slice(0, 10).map((agent, index) => (
                    <TableRow key={agent.id || 'direct'}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {!agent.id && <Badge variant="secondary" className="text-xs">Direct</Badge>}
                          <span className={!agent.id ? 'text-muted-foreground' : ''}>{agent.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{agent.bookings}</TableCell>
                      <TableCell className="text-right">{agent.guests}</TableCell>
                      <TableCell className="text-right">{formatCurrency(agent.revenue)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{agent.percentage.toFixed(1)}%</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </ChartCard>

        {/* Source Distribution */}
        <ChartCard
          title="Booking Sources"
          description="Direct vs Agent bookings"
          icon={UserCheck}
          loading={loading}
        >
          {sourceDistributionData.length && stats?.totalBookings ? (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={180}>
                <RechartsPieChart>
                  <Pie
                    data={sourceDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {sourceDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2">
                {sourceDistributionData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.value}</p>
                      <p className="text-xs text-muted-foreground">{item.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </ChartCard>
      </div>

      {/* ====== GUEST & HOTEL SECTION ====== */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Guest Types */}
        <ChartCard
          title="Guest Demographics"
          description="Breakdown by guest type"
          icon={Users}
          loading={loading}
        >
          {guestTypeData.length && stats?.totalGuests ? (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={180}>
                <RechartsPieChart>
                  <Pie
                    data={guestTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {guestTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-2">
                {guestTypeData.map((item) => (
                  <div key={item.name} className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{item.value}</p>
                    <p className="text-xs text-muted-foreground">{item.name}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </ChartCard>

        {/* Hotel Areas */}
        <ChartCard
          title="Hotel Areas"
          description="Where guests are staying"
          icon={MapPin}
          loading={loading}
          className="lg:col-span-2"
        >
          {stats?.hotelAreaStats.length ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.hotelAreaStats.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="area" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="bookings" name="Bookings" fill="#DDD6FE" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </ChartCard>
      </div>

      {/* ====== OPERATIONAL & FINANCIAL SECTION ====== */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Booking Status */}
        <ChartCard
          title="Booking Status"
          description="Status distribution"
          icon={Activity}
          loading={loading}
        >
          {stats?.statusStats.length ? (
            <div className="space-y-3">
              {stats.statusStats.map((status) => (
                <div key={status.status} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize text-gray-900 dark:text-gray-100">{status.status}</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{status.count}</span>
                  </div>
                  <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${status.percentage}%`,
                        backgroundColor: status.color 
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </ChartCard>

        {/* Payment Types */}
        <ChartCard
          title="Payment Types"
          description="Regular, FOC, Inspection"
          icon={CreditCard}
          loading={loading}
        >
          {stats?.paymentTypeStats.length ? (
            <div className="space-y-3">
              {stats.paymentTypeStats.map((payment) => (
                <div key={payment.type} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="uppercase text-gray-900 dark:text-gray-100">{payment.type}</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{payment.count}</span>
                  </div>
                  <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${payment.percentage}%`,
                        backgroundColor: payment.color 
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </ChartCard>

        {/* Pickup vs Come Direct */}
        <ChartCard
          title="Pickup Method"
          description="How guests arrive"
          icon={Car}
          loading={loading}
        >
          {pickupDistributionData.length && stats?.totalBookings ? (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={140}>
                <RechartsPieChart>
                  <Pie
                    data={pickupDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pickupDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2">
                {pickupDistributionData.map((item) => (
                  <div key={item.name} className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{item.value}</p>
                    <p className="text-xs text-muted-foreground">{item.name}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </ChartCard>

        {/* Invoice Status */}
        <ChartCard
          title="Invoice Status"
          description="Invoiced vs pending"
          icon={Receipt}
          loading={loading}
        >
          {invoiceDistributionData.length && stats?.totalBookings ? (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={140}>
                <RechartsPieChart>
                  <Pie
                    data={invoiceDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {invoiceDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2">
                {invoiceDistributionData.map((item) => (
                  <div key={item.name} className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{item.value}</p>
                    <p className="text-xs text-muted-foreground">{item.name}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </ChartCard>
      </div>

      {/* ====== QUICK INSIGHTS ROW ====== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Insights</CardTitle>
          <CardDescription>Key operational metrics at a glance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <MiniStatCard
              title="Avg Lead Time"
              value={`${(stats?.avgLeadTime || 0).toFixed(1)} days`}
              icon={Clock}
              color="bg-blue-300"
              loading={loading}
            />
            <MiniStatCard
              title="Top Program"
              value={stats?.programStats[0]?.nickname || stats?.programStats[0]?.name || '-'}
              icon={Ship}
              color="bg-cyan-300"
              loading={loading}
            />
            <MiniStatCard
              title="Top Agent"
              value={stats?.agentStats.find(a => a.id)?.name || '-'}
              icon={Building2}
              color="bg-purple-300"
              loading={loading}
            />
            <MiniStatCard
              title="Top Area"
              value={stats?.hotelAreaStats[0]?.area || '-'}
              icon={MapPin}
              color="bg-amber-300"
              loading={loading}
            />
            <MiniStatCard
              title="Direct Bookings"
              value={`${stats?.directVsAgentRatio.direct || 0}`}
              icon={UserCheck}
              color="bg-emerald-300"
              loading={loading}
            />
            <MiniStatCard
              title="Come Direct"
              value={`${stats?.comeDirectRatio.comeDirect || 0}`}
              icon={Car}
              color="bg-orange-300"
              loading={loading}
            />
          </div>
        </CardContent>
      </Card>
    </div>
    </ProtectedPage>
  )
}
