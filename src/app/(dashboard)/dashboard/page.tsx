"use client"

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { ProtectedPage } from '@/components/providers/page-lock-provider'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// Note: Card components used for stats cards only
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BookingsTable } from './bookings-table'
import { BookingsFilters } from './bookings-filters'
import { formatDate, formatCurrency, formatTime } from '@/lib/utils'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import {
  Plus,
  Calendar,
  Users,
  TrendingUp,
  Clock,
} from 'lucide-react'
import type { BookingWithRelations, BookingFilters, Program, Agent, Company, CompanySettings } from '@/types'

interface DashboardStats {
  todayBookings: number
  todayGuests: number
  tomorrowGuests: number
  nextWeekGuests: number
  pendingBookings: number
  todayCollect: number
  tomorrowCollect: number
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [bookings, setBookings] = useState<BookingWithRelations[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [company, setCompany] = useState<Company | null>(null)
  const [filters, setFilters] = useState<BookingFilters>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')

  const fetchBookings = useCallback(async () => {
    if (!user?.company_id) return

    const supabase = createClient()
    let query = supabase
      .from('bookings')
      .select(`
        *,
        program:programs(id, name, nickname, color),
        agent:agents(id, name)
      `)
      .eq('company_id', user.company_id)
      .order('activity_date', { ascending: false })

    // Apply filters
    if (filters.date_from) {
      query = query.gte('activity_date', filters.date_from)
    }
    if (filters.date_to) {
      query = query.lte('activity_date', filters.date_to)
    }
    if (filters.booking_date_from) {
      query = query.gte('created_at', filters.booking_date_from + 'T00:00:00')
    }
    if (filters.booking_date_to) {
      query = query.lt('created_at', filters.booking_date_to + 'T23:59:59')
    }
    if (filters.status?.length) {
      query = query.in('status', filters.status)
    }
    if (filters.program_id?.length) {
      query = query.in('program_id', filters.program_id)
    }
    if (filters.agent_id?.length) {
      if (filters.agent_id.includes('direct')) {
        query = query.is('agent_id', null)
      } else {
        query = query.in('agent_id', filters.agent_id)
      }
    }
    if (filters.search) {
      query = query.or(`customer_name.ilike.%${filters.search}%,booking_number.ilike.%${filters.search}%`)
    }

    // Tab-based filtering
    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
    
    if (activeTab === 'today_activity') {
      query = query.eq('activity_date', today)
    } else if (activeTab === 'tomorrow_activity') {
      query = query.eq('activity_date', tomorrow)
    } else if (activeTab === 'today_booking') {
      // Bookings created today
      query = query.gte('created_at', today + 'T00:00:00')
      query = query.lt('created_at', tomorrow + 'T00:00:00')
    } else if (activeTab === 'pending') {
      query = query.eq('status', 'pending')
    } else if (activeTab === 'void') {
      query = query.eq('status', 'void')
    }

    // Hide void bookings from all tabs except void
    if (activeTab !== 'void') {
      query = query.neq('status', 'void')
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching bookings:', error)
    } else {
      setBookings(data || [])
    }
  }, [user, filters, activeTab])

  useEffect(() => {
    async function fetchData() {
      if (!user?.company_id) return

      const supabase = createClient()
      const today = new Date().toISOString().split('T')[0]
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
      const nextWeekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

      // Fetch stats, programs, agents, and company in parallel
      const [
        todayResult, 
        tomorrowResult,
        nextWeekResult,
        pendingResult, 
        todayCollectResult, 
        tomorrowCollectResult,
        programsRes, 
        agentsRes,
        companyRes
      ] = await Promise.all([
        // Today's bookings with guest counts
        supabase
          .from('bookings')
          .select('adults, children, infants', { count: 'exact' })
          .eq('company_id', user.company_id)
          .eq('activity_date', today)
          .neq('status', 'void'),
        // Tomorrow's bookings with guest counts
        supabase
          .from('bookings')
          .select('adults, children, infants')
          .eq('company_id', user.company_id)
          .eq('activity_date', tomorrow)
          .neq('status', 'void'),
        // Next week's bookings with guest counts
        supabase
          .from('bookings')
          .select('adults, children, infants')
          .eq('company_id', user.company_id)
          .gte('activity_date', today)
          .lte('activity_date', nextWeekEnd)
          .neq('status', 'void'),
        // Pending bookings count
        supabase
          .from('bookings')
          .select('id', { count: 'exact' })
          .eq('company_id', user.company_id)
          .eq('status', 'pending'),
        // Today's collect amount
        supabase
          .from('bookings')
          .select('collect_money')
          .eq('company_id', user.company_id)
          .eq('activity_date', today)
          .gt('collect_money', 0)
          .neq('status', 'void'),
        // Tomorrow's collect amount
        supabase
          .from('bookings')
          .select('collect_money')
          .eq('company_id', user.company_id)
          .eq('activity_date', tomorrow)
          .gt('collect_money', 0)
          .neq('status', 'void'),
        // Programs
        supabase
          .from('programs')
          .select('*')
          .eq('company_id', user.company_id)
          .eq('status', 'active')
          .order('name'),
        // Agents
        supabase
          .from('agents')
          .select('*')
          .eq('company_id', user.company_id)
          .eq('status', 'active')
          .order('name'),
        // Company
        supabase
          .from('companies')
          .select('*')
          .eq('id', user.company_id)
          .single(),
      ])

      const todayGuests = todayResult.data?.reduce(
        (sum, b) => sum + (b.adults || 0) + (b.children || 0) + (b.infants || 0),
        0
      ) || 0

      const tomorrowGuests = tomorrowResult.data?.reduce(
        (sum, b) => sum + (b.adults || 0) + (b.children || 0) + (b.infants || 0),
        0
      ) || 0

      const nextWeekGuests = nextWeekResult.data?.reduce(
        (sum, b) => sum + (b.adults || 0) + (b.children || 0) + (b.infants || 0),
        0
      ) || 0

      const todayCollect = todayCollectResult.data?.reduce(
        (sum, b) => sum + (b.collect_money || 0),
        0
      ) || 0

      const tomorrowCollect = tomorrowCollectResult.data?.reduce(
        (sum, b) => sum + (b.collect_money || 0),
        0
      ) || 0

      setStats({
        todayBookings: todayResult.count || 0,
        todayGuests,
        tomorrowGuests,
        nextWeekGuests,
        pendingBookings: pendingResult.count || 0,
        todayCollect,
        tomorrowCollect,
      })

      setPrograms(programsRes.data || [])
      setAgents(agentsRes.data || [])
      if (companyRes.data) {
        setCompany(companyRes.data)
      }
      setLoading(false)
    }

    fetchData()
  }, [user])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  const handleExport = () => {
    if (bookings.length === 0) {
      toast.error('No bookings to export')
      return
    }

    const exportData = bookings.map(booking => ({
      'Booking #': booking.booking_number,
      'Booking Date': formatDate(booking.created_at),
      'Booking Time': formatTime(booking.created_at),
      'Activity Date': formatDate(booking.activity_date),
      'Status': booking.status,
      'Source': booking.is_direct_booking ? 'Direct' : (booking.agent as any)?.name || '-',
      'Staff': booking.is_direct_booking ? 'Online' : (booking.agent_staff as any)?.nickname || 'Company',
      'Program': (booking.program as any)?.name || '-',
      'Customer': booking.customer_name,
      'Email': booking.customer_email || '-',
      'WhatsApp': booking.customer_whatsapp || '-',
      'Adults': booking.adults,
      'Children': booking.children,
      'Infants': booking.infants,
      'Hotel': (booking.hotel as any)?.name || '-',
      'Area': (booking.hotel as any)?.area || '-',
      'Room': booking.room_number || '-',
      'Pickup Time': booking.pickup_time || '-',
      'Collect Amount': booking.collect_money,
      'Notes': booking.notes || '-',
      'Void Reason': booking.void_reason || '-',
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Bookings')
    XLSX.writeFile(wb, `bookings-${new Date().toISOString().split('T')[0]}.xlsx`)
    toast.success('Bookings exported successfully!')
  }

  return (
    <ProtectedPage pageKey="dashboard" pageName="Bookings">
    <div className="space-y-6 max-w-none">
      <PageHeader
        title="Bookings"
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveTab('today_activity')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Activity</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.todayBookings}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {stats?.todayGuests || 0} guests
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveTab('tomorrow_activity')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tomorrow Guests</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.tomorrowGuests}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Total guests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Week Guests</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.nextWeekGuests}</div>
            )}
            <p className="text-xs text-muted-foreground">
              7 days total
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveTab('pending')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.pendingBookings}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Awaiting confirmation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today Collect</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {formatCurrency(stats?.todayCollect || 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              To collect today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tomorrow Collect</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {formatCurrency(stats?.tomorrowCollect || 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              To collect tomorrow
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bookings with Tabs */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 pb-3 border-b">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="all">All Bookings</TabsTrigger>
                <TabsTrigger value="today_activity">Today Activity</TabsTrigger>
                <TabsTrigger value="tomorrow_activity">Tomorrow Activity</TabsTrigger>
                <TabsTrigger value="today_booking">Today Booking</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="void">Void</TabsTrigger>
              </TabsList>
              <Button asChild size="sm">
                <Link href="/dashboard/new">
                  <Plus className="w-4 h-4 mr-2" />
                  New Booking
                </Link>
              </Button>
            </div>
          </Tabs>
        </div>
        <div className="p-4 space-y-4">
          <BookingsFilters
            programs={programs}
            agents={agents}
            filters={filters}
            onFiltersChange={setFilters}
            onExport={handleExport}
            onTabReset={() => setActiveTab('all')}
          />
          
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <BookingsTable 
              bookings={bookings} 
              onRefresh={fetchBookings}
              companyName={company?.name}
              companySettings={company?.settings as CompanySettings}
            />
          )}
        </div>
      </div>
    </div>
    </ProtectedPage>
  )
}

