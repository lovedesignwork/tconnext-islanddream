"use client"

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Settings2,
} from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
  isToday,
} from 'date-fns'
import { cn } from '@/lib/utils'
import type { Program, ProgramAvailability } from '@/types'
import { SlotEditDialog } from './slot-edit-dialog'
import { BulkSetupDialog } from './bulk-setup-dialog'

interface BookingStats {
  program_id: string
  activity_date: string
  total_adults: number
  total_children: number
  total_infants: number
}

interface DayData {
  date: Date
  programs: {
    program: Program
    availability: ProgramAvailability | null
    booked: number
    infants: number
    remaining: number
  }[]
}

export default function SlotsPage() {
  const { user } = useAuth()
  const [programs, setPrograms] = useState<Program[]>([])
  const [availability, setAvailability] = useState<ProgramAvailability[]>([])
  const [bookingStats, setBookingStats] = useState<BookingStats[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showBulkSetup, setShowBulkSetup] = useState(false)

  const fetchData = async () => {
    if (!user?.company_id) return

    const supabase = createClient()
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)

    // Fetch active programs
    const { data: programsData, error: programsError } = await supabase
      .from('programs')
      .select('*')
      .eq('company_id', user.company_id)
      .eq('status', 'active')
      .order('name')

    if (programsError) {
      toast.error('Failed to load programs')
      return
    }

    setPrograms(programsData || [])

    if (!programsData?.length) {
      setLoading(false)
      return
    }

    // Fetch availability for the month
    const { data: availabilityData, error: availabilityError } = await supabase
      .from('program_availability')
      .select('*')
      .in('program_id', programsData.map(p => p.id))
      .gte('date', format(monthStart, 'yyyy-MM-dd'))
      .lte('date', format(monthEnd, 'yyyy-MM-dd'))

    if (availabilityError) {
      toast.error('Failed to load availability')
    } else {
      setAvailability(availabilityData || [])
    }

    // Fetch booking stats for the month (aggregate adults + children + infants per program/date)
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select('program_id, activity_date, adults, children, infants')
      .eq('company_id', user.company_id)
      .in('program_id', programsData.map(p => p.id))
      .gte('activity_date', format(monthStart, 'yyyy-MM-dd'))
      .lte('activity_date', format(monthEnd, 'yyyy-MM-dd'))
      .not('status', 'in', '("cancelled","void")')

    if (bookingsError) {
      toast.error('Failed to load booking stats')
    } else {
      // Aggregate bookings by program_id and activity_date
      const statsMap = new Map<string, BookingStats>()
      
      for (const booking of bookingsData || []) {
        const key = `${booking.program_id}-${booking.activity_date}`
        const existing = statsMap.get(key)
        
        if (existing) {
          existing.total_adults += booking.adults || 0
          existing.total_children += booking.children || 0
          existing.total_infants += booking.infants || 0
        } else {
          statsMap.set(key, {
            program_id: booking.program_id,
            activity_date: booking.activity_date,
            total_adults: booking.adults || 0,
            total_children: booking.children || 0,
            total_infants: booking.infants || 0,
          })
        }
      }
      
      setBookingStats(Array.from(statsMap.values()))
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [user, currentMonth])

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
    
    // Add padding days for the start of the month
    const startPadding = getDay(monthStart)
    const paddingDays: Date[] = []
    for (let i = startPadding - 1; i >= 0; i--) {
      const paddingDate = new Date(monthStart)
      paddingDate.setDate(paddingDate.getDate() - (i + 1))
      paddingDays.push(paddingDate)
    }
    
    return [...paddingDays, ...days]
  }, [currentMonth])

  // Build day data with program availability and booking stats
  const dayDataMap = useMemo(() => {
    const map = new Map<string, DayData>()
    
    for (const day of calendarDays) {
      const dateStr = format(day, 'yyyy-MM-dd')
      const dayPrograms = programs.map(program => {
        const avail = availability.find(
          a => a.program_id === program.id && a.date === dateStr
        )
        const stats = bookingStats.find(
          s => s.program_id === program.id && s.activity_date === dateStr
        )
        
        const totalSlots = avail?.total_slots ?? (program as any).default_slots ?? 0
        const booked = (stats?.total_adults || 0) + (stats?.total_children || 0)
        const infants = stats?.total_infants || 0
        const remaining = Math.max(0, totalSlots - booked)
        
        return {
          program,
          availability: avail || null,
          booked,
          infants,
          remaining,
        }
      })
      
      map.set(dateStr, { date: day, programs: dayPrograms })
    }
    
    return map
  }, [calendarDays, programs, availability, bookingStats])

  const getStatusColor = (remaining: number, total: number, isOpen: boolean) => {
    if (!isOpen) return 'bg-gray-200 text-gray-500'
    if (total === 0) return 'bg-gray-100 text-gray-400'
    const ratio = remaining / total
    if (ratio <= 0) return 'bg-red-100 text-red-700'
    if (ratio <= 0.2) return 'bg-amber-100 text-amber-700'
    return 'bg-emerald-100 text-emerald-700'
  }

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const handleToday = () => setCurrentMonth(new Date())

  const handleDateClick = (date: Date) => {
    if (isSameMonth(date, currentMonth)) {
      setSelectedDate(date)
    }
  }

  const handleDialogClose = () => {
    setSelectedDate(null)
    fetchData()
  }

  const handleBulkSetupClose = () => {
    setShowBulkSetup(false)
    fetchData()
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="space-y-6">
      <PageHeader
        title="Program Slots"
        description="Manage availability and view booking statistics for each program"
      >
        <Button onClick={() => setShowBulkSetup(true)} variant="outline">
          <Settings2 className="w-4 h-4 mr-2" />
          Bulk Setup
        </Button>
      </PageHeader>

      {/* Calendar Navigation */}
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handlePrevMonth}
                className="h-10 w-10 bg-muted/60 hover:bg-muted"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h2 className="text-xl font-semibold min-w-[180px] text-center">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleNextMonth}
                className="h-10 w-10 bg-muted/60 hover:bg-muted"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleToday} className="ml-2">
                Today
              </Button>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" />
                <span className="text-muted-foreground">Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-amber-100 border border-amber-300" />
                <span className="text-muted-foreground">Limited</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-red-100 border border-red-300" />
                <span className="text-muted-foreground">Full</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-7 gap-1">
              {[...Array(35)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : programs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No programs yet</h3>
              <p className="text-muted-foreground text-center">
                Create programs in Program Setup first to manage their slots.
              </p>
            </div>
          ) : (
            <>
              {/* Week day headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {weekDays.map(day => (
                  <div
                    key={day}
                    className="text-center text-sm font-medium text-muted-foreground py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, idx) => {
                  const dateStr = format(day, 'yyyy-MM-dd')
                  const dayData = dayDataMap.get(dateStr)
                  const isCurrentMonth = isSameMonth(day, currentMonth)
                  const isCurrentDay = isToday(day)

                  return (
                    <div
                      key={idx}
                      onClick={() => handleDateClick(day)}
                      className={cn(
                        'min-h-[120px] p-1.5 border rounded-lg transition-all cursor-pointer',
                        isCurrentMonth
                          ? 'bg-card hover:bg-accent/50 hover:border-primary/50'
                          : 'bg-muted/30 opacity-50 cursor-default',
                        isCurrentDay && 'ring-2 ring-primary ring-offset-1'
                      )}
                    >
                      <div className={cn(
                        'text-sm font-bold mb-1',
                        isCurrentDay ? 'text-primary' : 'text-foreground'
                      )}>
                        {format(day, 'd')}
                        {isCurrentDay && <span className="ml-1 text-primary font-bold">TODAY</span>}
                      </div>
                      
                      {isCurrentMonth && dayData && (
                        <div className="space-y-1.5">
                          {dayData.programs.slice(0, 4).map(({ program, availability: avail, booked, remaining }) => {
                            const totalSlots = avail?.total_slots ?? (program as any).default_slots ?? 0
                            const isOpen = avail?.is_open !== false
                            const bookedPercent = totalSlots > 0 ? Math.min(100, (booked / totalSlots) * 100) : 0
                            const isFull = totalSlots > 0 && booked >= totalSlots
                            
                            return (
                              <div
                                key={program.id}
                                className="relative overflow-hidden rounded h-[22px] flex items-center"
                                title={`${program.name}: ${booked}/${totalSlots} booked`}
                              >
                                {/* Base green background */}
                                <div className={cn(
                                  'absolute inset-0',
                                  !isOpen ? 'bg-gray-200' : totalSlots === 0 ? 'bg-gray-100' : 'bg-emerald-200'
                                )} />
                                {/* Progress overlay for bookings - red when full, orange otherwise */}
                                {isOpen && totalSlots > 0 && booked > 0 && (
                                  <div 
                                    className={cn(
                                      "absolute inset-y-0 left-0",
                                      isFull ? "bg-red-300" : "bg-orange-300"
                                    )}
                                    style={{ width: `${bookedPercent}%` }}
                                  />
                                )}
                                {/* Text content - vertically centered */}
                                <div className={cn(
                                  'relative z-10 text-[16px] px-1.5 truncate font-medium leading-none flex items-center gap-1',
                                  !isOpen ? 'text-gray-500' : 'text-gray-800'
                                )}>
                                  <span
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: (program as any).color || '#3B82F6' }}
                                  />
                                  {(program.nickname || program.name).slice(0, 10)}
                                  {totalSlots > 0 && (
                                    <span className="ml-1">
                                      {booked}/{totalSlots}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                          {dayData.programs.length > 4 && (
                            <div className="text-[13px] text-muted-foreground text-center">
                              +{dayData.programs.length - 4} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Slot Edit Dialog */}
      {selectedDate && (
        <SlotEditDialog
          date={selectedDate}
          programs={programs}
          availability={availability}
          bookingStats={bookingStats}
          onClose={handleDialogClose}
        />
      )}

      {/* Bulk Setup Dialog */}
      {showBulkSetup && (
        <BulkSetupDialog
          programs={programs}
          onClose={handleBulkSetupClose}
        />
      )}
    </div>
  )
}

