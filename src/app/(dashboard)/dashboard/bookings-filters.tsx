"use client"

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Combobox, ComboboxOption } from '@/components/ui/combobox'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { Badge } from '@/components/ui/badge'
import { Search, X, Filter, Download } from 'lucide-react'
import type { Program, Agent, BookingFilters } from '@/types'
import { format } from 'date-fns'
import { parseDate, today, getLocalTimeZone } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'

interface BookingsFiltersProps {
  programs: Program[]
  agents: Agent[]
  filters: BookingFilters
  onFiltersChange: (filters: BookingFilters) => void
  onExport: () => void
  onTabReset?: () => void
}

type DateFilterType = 'activity' | 'booking' | null

export function BookingsFilters({
  programs,
  agents,
  filters,
  onFiltersChange,
  onExport,
  onTabReset,
}: BookingsFiltersProps) {
  // Track which date filter is active (mutually exclusive)
  const [activeDateFilter, setActiveDateFilter] = useState<DateFilterType>(() => {
    if (filters.date_from || filters.date_to) return 'activity'
    if (filters.booking_date_from || filters.booking_date_to) return 'booking'
    return null
  })

  // Activity date range - convert to DateValue format
  const activityDateRange = useMemo(() => {
    if (filters.date_from && filters.date_to) {
      return {
        start: parseDate(filters.date_from),
        end: parseDate(filters.date_to),
      }
    }
    return null
  }, [filters.date_from, filters.date_to])

  // Booking date range - convert to DateValue format
  const bookingDateRange = useMemo(() => {
    if (filters.booking_date_from && filters.booking_date_to) {
      return {
        start: parseDate(filters.booking_date_from),
        end: parseDate(filters.booking_date_to),
      }
    }
    return null
  }, [filters.booking_date_from, filters.booking_date_to])

  const [showFilters, setShowFilters] = useState(false)

  const handleSearch = (value: string) => {
    onFiltersChange({ ...filters, search: value })
  }

  // Activity date change (clears booking date)
  const handleActivityDateChange = (range: { start: DateValue; end: DateValue } | null) => {
    setActiveDateFilter('activity')
    onFiltersChange({
      ...filters,
      date_from: range ? range.start.toString() : undefined,
      date_to: range ? range.end.toString() : undefined,
      booking_date_from: undefined,
      booking_date_to: undefined,
    })
    if (range && onTabReset) onTabReset()
  }

  // Booking date change (clears activity date)
  const handleBookingDateChange = (range: { start: DateValue; end: DateValue } | null) => {
    setActiveDateFilter('booking')
    onFiltersChange({
      ...filters,
      date_from: undefined,
      date_to: undefined,
      booking_date_from: range ? range.start.toString() : undefined,
      booking_date_to: range ? range.end.toString() : undefined,
    })
    if (range && onTabReset) onTabReset()
  }

  const handleStatusChange = (value: string) => {
    if (value === 'all') {
      onFiltersChange({ ...filters, status: undefined })
    } else {
      onFiltersChange({ ...filters, status: [value] })
    }
  }

  const handleProgramChange = (value: string) => {
    if (value === 'all') {
      onFiltersChange({ ...filters, program_id: undefined })
    } else {
      onFiltersChange({ ...filters, program_id: [value] })
    }
  }

  const handleAgentChange = (value: string) => {
    if (value === '' || value === 'all') {
      onFiltersChange({ ...filters, agent_id: undefined })
    } else {
      onFiltersChange({ ...filters, agent_id: [value] })
    }
  }

  const agentOptions: ComboboxOption[] = useMemo(() => {
    const options: ComboboxOption[] = [
      { value: 'all', label: 'All sources' },
      { value: 'direct', label: 'Direct Website' },
    ]
    
    const seenNames = new Set<string>()
    agents.forEach((agent) => {
      if (!seenNames.has(agent.name)) {
        seenNames.add(agent.name)
        options.push({
          value: agent.id,
          label: agent.name,
        })
      }
    })
    
    return options
  }, [agents])

  const clearFilters = () => {
    setActiveDateFilter(null)
    onFiltersChange({})
  }

  const activeFiltersCount = [
    filters.date_from || filters.date_to,
    filters.booking_date_from || filters.booking_date_to,
    filters.status?.length,
    filters.program_id?.length,
    filters.agent_id?.length,
  ].filter(Boolean).length

  return (
    <div className="space-y-3">
      {/* Search and quick actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or booking #..."
            value={filters.search || ''}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 h-9 rounded-lg"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="h-9 rounded-lg"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 rounded-md">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={onExport} className="h-9 rounded-lg">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
          <div className="p-4 border rounded-xl bg-muted/30 space-y-3">
            {/* Date Pickers and Main Filters Row */}
            <div className="flex flex-wrap items-start gap-3">
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
                <Select
                  value={filters.status?.[0] || 'all'}
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger className="h-10 w-auto min-w-[120px] text-sm rounded-md">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Program */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Program</label>
                <Select
                  value={filters.program_id?.[0] || 'all'}
                  onValueChange={handleProgramChange}
                >
                  <SelectTrigger className="h-10 w-auto min-w-[130px] text-sm rounded-md">
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
            </div>

          {/* Source Filter Row */}
          <div className="flex flex-wrap items-start gap-3">
            {/* Source */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Source</label>
              <Combobox
                options={agentOptions}
                value={filters.agent_id?.[0] || 'all'}
                onValueChange={handleAgentChange}
                placeholder="Source"
                searchPlaceholder="Search..."
                emptyText="No match"
                className="h-10 min-w-[360px] text-sm rounded-md"
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
      )}
    </div>
  )
}
