"use client"

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  format, 
  addDays, 
  isToday, 
  isTomorrow,
  startOfDay,
} from 'date-fns'
import { cn } from '@/lib/utils'
import { 
  Ship, 
  Phone, 
  Mail, 
  MessageCircle,
  Calendar,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import type { Program, ProgramAvailability, Company, CompanySettings } from '@/types'

interface BookingStats {
  program_id: string
  activity_date: string
  total_booked: number
}

interface ProgramDayData {
  program: Program
  availability: ProgramAvailability | null
  booked: number
  remaining: number
  totalSlots: number
  isOpen: boolean
  isPastCutoff: boolean
}

interface DayAvailability {
  date: Date
  dateStr: string
  programs: ProgramDayData[]
}

export default function PublicAvailabilityPage() {
  const params = useParams()
  const slug = params.slug as string
  
  const [company, setCompany] = useState<Company | null>(null)
  const [programs, setPrograms] = useState<Program[]>([])
  const [availability, setAvailability] = useState<ProgramAvailability[]>([])
  const [bookingStats, setBookingStats] = useState<BookingStats[]>([])
  const [loading, setLoading] = useState(true)
  const [daysToDisplay, setDaysToDisplay] = useState(7)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      // Fetch company by slug
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('slug', slug)
        .single()

      if (!companyData) {
        setLoading(false)
        return
      }

      setCompany(companyData)
      
      // Get days to display from settings
      const settings = companyData.settings as CompanySettings || {}
      const days = settings.availability?.days_to_display || 7
      setDaysToDisplay(days)

      // Calculate date range
      const today = startOfDay(new Date())
      const endDate = addDays(today, days - 1)
      const startDateStr = format(today, 'yyyy-MM-dd')
      const endDateStr = format(endDate, 'yyyy-MM-dd')

      // Fetch active programs
      const { data: programsData } = await supabase
        .from('programs')
        .select('*')
        .eq('company_id', companyData.id)
        .eq('status', 'active')
        .order('name')

      if (!programsData?.length) {
        setLoading(false)
        return
      }

      setPrograms(programsData)

      // Fetch availability for the date range
      const { data: availabilityData } = await supabase
        .from('program_availability')
        .select('*')
        .in('program_id', programsData.map(p => p.id))
        .gte('date', startDateStr)
        .lte('date', endDateStr)

      setAvailability(availabilityData || [])

      // Fetch booking stats (aggregate adults + children per program/date)
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('program_id, activity_date, adults, children')
        .eq('company_id', companyData.id)
        .in('program_id', programsData.map(p => p.id))
        .gte('activity_date', startDateStr)
        .lte('activity_date', endDateStr)
        .not('status', 'in', '("cancelled","void")')

      // Aggregate bookings
      const statsMap = new Map<string, BookingStats>()
      for (const booking of bookingsData || []) {
        const key = `${booking.program_id}-${booking.activity_date}`
        const existing = statsMap.get(key)
        const booked = (booking.adults || 0) + (booking.children || 0)
        
        if (existing) {
          existing.total_booked += booked
        } else {
          statsMap.set(key, {
            program_id: booking.program_id,
            activity_date: booking.activity_date,
            total_booked: booked,
          })
        }
      }
      
      setBookingStats(Array.from(statsMap.values()))
      setLoading(false)
    }

    fetchData()
  }, [slug])

  // Check if current time is past the cutoff time for a program
  const isPastCutoffTime = (program: Program): boolean => {
    const cutoffTime = program.booking_cutoff_time || '18:00'
    const now = new Date()
    const [hours, minutes] = cutoffTime.split(':').map(Number)
    const cutoffDate = new Date()
    cutoffDate.setHours(hours, minutes, 0, 0)
    return now > cutoffDate
  }

  // Generate days array with filtered programs
  const days = useMemo(() => {
    const result: DayAvailability[] = []
    const today = startOfDay(new Date())
    
    for (let i = 0; i < daysToDisplay; i++) {
      const date = addDays(today, i)
      const dateStr = format(date, 'yyyy-MM-dd')
      const isTodayDate = isToday(date)
      
      const dayPrograms: ProgramDayData[] = programs.map(program => {
        const avail = availability.find(
          a => a.program_id === program.id && a.date === dateStr
        )
        const stats = bookingStats.find(
          s => s.program_id === program.id && s.activity_date === dateStr
        )
        
        const totalSlots = avail?.total_slots ?? (program as any).default_slots ?? 0
        const booked = stats?.total_booked || 0
        const remaining = Math.max(0, totalSlots - booked)
        const isOpen = avail?.is_open !== false
        const isPastCutoff = isTodayDate && isPastCutoffTime(program)
        
        return {
          program,
          availability: avail || null,
          booked,
          remaining,
          totalSlots,
          isOpen,
          isPastCutoff,
        }
      })

      // Filter out programs that are:
      // - Closed by admin (is_open = false)
      // - Full (remaining = 0)
      // - Past cutoff time (for today only)
      const visiblePrograms = dayPrograms.filter(p => {
        // Hide if closed
        if (!p.isOpen) return false
        // Hide if full
        if (p.totalSlots > 0 && p.remaining === 0) return false
        // Hide if today and past cutoff
        if (p.isPastCutoff) return false
        return true
      })
      
      // Only add the day if there are visible programs
      if (visiblePrograms.length > 0) {
        result.push({ date, dateStr, programs: visiblePrograms })
      }
    }
    
    return result
  }, [programs, availability, bookingStats, daysToDisplay])

  // Get availability display text and style
  const getAvailabilityDisplay = (remaining: number, totalSlots: number) => {
    if (totalSlots === 0) {
      return {
        text: 'Available',
        icon: CheckCircle2,
        className: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      }
    }
    if (remaining < 10) {
      return {
        text: `${remaining} seats left`,
        icon: AlertCircle,
        className: 'bg-amber-50 text-amber-600 border-amber-200',
      }
    }
    return {
      text: 'Available',
      icon: CheckCircle2,
      className: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    }
  }

  // Get date label with day name for tomorrow
  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return `Tomorrow, ${format(date, 'EEE')}`
    return format(date, 'EEE')
  }

  // Get label style
  const getLabelStyle = (date: Date, primaryColor: string) => {
    if (isToday(date)) {
      return {
        className: "text-white",
        style: { backgroundColor: primaryColor }
      }
    }
    if (isTomorrow(date)) {
      return {
        className: "text-white bg-gray-700",
        style: {}
      }
    }
    return {
      className: "text-gray-600 bg-white/80",
      style: {}
    }
  }

  const settings = company?.settings as CompanySettings || {}
  const primaryColor = settings.branding?.primary_color || '#0EA5E9'

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50">
        <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Ship className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Company Not Found</h2>
            <p className="text-muted-foreground">
              The company you&apos;re looking for doesn&apos;t exist or the link may be incorrect.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50">
      {/* Sticky Header */}
      <header 
        className="sticky top-0 z-50 border-b backdrop-blur-xl bg-white/80"
        style={{ borderColor: `${primaryColor}20` }}
      >
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            {settings.branding?.logo_url ? (
              <img 
                src={settings.branding.logo_url} 
                alt={company.name}
                className="h-10 w-10 rounded-lg object-contain"
              />
            ) : (
              <div 
                className="flex items-center justify-center w-10 h-10 rounded-lg text-white"
                style={{ backgroundColor: primaryColor }}
              >
                <Ship className="w-6 h-6" />
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-gray-900">{company.name}</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Availability for next {daysToDisplay} days
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-4 pb-32">
        {days.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No availability at this time</p>
              <p className="text-sm text-muted-foreground mt-1">Please check back later or contact us directly</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {days.map(({ date, dateStr, programs: dayPrograms }) => {
              const labelStyle = getLabelStyle(date, primaryColor)
              
              return (
                <Card 
                  key={dateStr} 
                  className={cn(
                    "overflow-hidden transition-all",
                    isToday(date) && "ring-2 ring-offset-2",
                  )}
                  style={isToday(date) ? { ringColor: primaryColor } : undefined}
                >
                  {/* Date Header */}
                  <div 
                    className="px-4 py-3 border-b"
                    style={{ 
                      background: isToday(date) 
                        ? `linear-gradient(135deg, ${primaryColor}10, ${primaryColor}05)` 
                        : 'linear-gradient(135deg, #f8fafc, #f1f5f9)'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span 
                          className={cn(
                            "text-sm font-bold px-2 py-0.5 rounded",
                            labelStyle.className
                          )}
                          style={labelStyle.style}
                        >
                          {getDateLabel(date)}
                        </span>
                        <span className="text-sm text-gray-600 font-medium">
                          {format(date, 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Programs */}
                  <CardContent className="p-3 space-y-2">
                    {dayPrograms.map(({ program, remaining, totalSlots }) => {
                      const display = getAvailabilityDisplay(remaining, totalSlots)
                      const Icon = display.icon
                      
                      return (
                        <div 
                          key={program.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border transition-all",
                            display.className
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: (program as any).color || '#3B82F6' }}
                            />
                            <span className="font-medium text-gray-800 truncate">
                              {program.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Icon className="h-4 w-4" />
                            <span className="text-sm font-semibold whitespace-nowrap">
                              {display.text}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      {/* Footer with Contact Info */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t shadow-lg">
        <div className="max-w-lg mx-auto px-4 py-4">
          {/* Contact Info */}
          {(settings.availability?.contact_phone || settings.availability?.contact_email || settings.availability?.contact_whatsapp) && (
            <div className="flex flex-wrap items-center justify-center gap-3 mb-3">
              {settings.availability?.contact_phone && (
                <a 
                  href={`tel:${settings.availability.contact_phone}`}
                  className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <Phone className="h-4 w-4" style={{ color: primaryColor }} />
                  <span>{settings.availability.contact_phone}</span>
                </a>
              )}
              {settings.availability?.contact_whatsapp && (
                <a 
                  href={`https://wa.me/${settings.availability.contact_whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <MessageCircle className="h-4 w-4 text-green-500" />
                  <span>WhatsApp</span>
                </a>
              )}
              {settings.availability?.contact_email && (
                <a 
                  href={`mailto:${settings.availability.contact_email}`}
                  className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <Mail className="h-4 w-4" style={{ color: primaryColor }} />
                  <span>{settings.availability.contact_email}</span>
                </a>
              )}
            </div>
          )}
          
          {/* Powered by */}
          <div className="text-center">
            <p className="text-xs text-gray-400">
              Powered by{' '}
              <span className="font-semibold text-gray-500">TConnext</span>
              {' '}- Tour Management Software
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
