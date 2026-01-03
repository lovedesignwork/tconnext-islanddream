"use client"

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { 
  sortableKeyboardCoordinates, 
  SortableContext, 
  horizontalListSortingStrategy,
  arrayMove 
} from '@dnd-kit/sortable'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { ProtectedPage } from '@/components/providers/page-lock-provider'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar } from '@/components/ui/calendar'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { format } from 'date-fns'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { formatDate, cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import {
  CalendarIcon,
  Car,
  Users,
  Save,
  RefreshCw,
  FileDown,
  Copy,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react'
import { DriverColumn, UnassignedColumn } from './driver-column'
import { CustomerCardOverlay, type PickupBooking } from './customer-card'
import { AddDriverButton } from './add-driver-button'
import {
  generatePickupText,
  generateAllPickupText,
  generatePickupPdf,
  generateAllPickupPdf,
  copyToClipboard,
} from './pickup-utils'
import type { Driver, DriverPickupLock } from '@/types'

export default function PickupPage() {
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [bookings, setBookings] = useState<PickupBooking[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [activeDriverIds, setActiveDriverIds] = useState<string[]>([])
  const [columnOrder, setColumnOrder] = useState<string[]>(['unassigned']) // Column order for drag/drop
  const [locks, setLocks] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [activeBooking, setActiveBooking] = useState<PickupBooking | null>(null)
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const fetchData = useCallback(async () => {
    if (!user?.company_id) return

    setLoading(true)
    const supabase = createClient()
    const dateStr = format(selectedDate, 'yyyy-MM-dd')

    const [bookingsRes, driversRes, locksRes] = await Promise.all([
      supabase
        .from('bookings')
        .select(`
          *,
          program:programs(name, nickname, color),
          hotel:hotels(id, name, area)
        `)
        .eq('company_id', user.company_id)
        .eq('activity_date', dateStr)
        .not('status', 'in', '("void","cancelled")')
        .is('deleted_at', null)
        .or('is_come_direct.is.null,is_come_direct.eq.false') // Exclude Come Direct bookings - they don't need driver pickup
        .order('customer_name'),
      supabase
        .from('drivers')
        .select('*')
        .eq('company_id', user.company_id)
        .eq('status', 'active')
        .order('name'),
      supabase
        .from('driver_pickup_locks')
        .select('*')
        .eq('company_id', user.company_id)
        .eq('activity_date', dateStr),
    ])

    if (bookingsRes.error) {
      console.error('Bookings error:', bookingsRes.error)
      toast.error('Failed to load bookings')
    } else {
      const bookingsWithPending = (bookingsRes.data || []).map(b => ({
        ...b,
        pendingDriverId: b.driver_id,
      }))
      setBookings(bookingsWithPending)

      // Initialize active driver IDs from bookings that have drivers assigned
      const assignedDriverIds = [...new Set(
        bookingsWithPending
          .filter(b => b.driver_id)
          .map(b => b.driver_id as string)
      )]
      setActiveDriverIds(assignedDriverIds)
    }

    if (driversRes.error) {
      console.error('Drivers error:', driversRes.error)
      toast.error('Failed to load drivers')
    } else {
      const driversWithDefaults = (driversRes.data || []).map(d => ({
        ...d,
        car_capacity: d.car_capacity ?? 4,
      }))
      setDrivers(driversWithDefaults)
    }

    if (locksRes.error) {
      // Table might not exist yet if migration hasn't been run
      // This is expected behavior, just skip loading locks
      console.debug('Locks table not available:', locksRes.error.message)
    } else {
      const locksMap: Record<string, boolean> = {}
      ;(locksRes.data || []).forEach(lock => {
        locksMap[lock.driver_id] = lock.is_locked
      })
      setLocks(locksMap)
    }

    setLoading(false)
    setHasChanges(false)
  }, [user, selectedDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Derived data
  const unassignedBookings = useMemo(() => {
    return bookings.filter(b => !b.pendingDriverId)
  }, [bookings])

  const bookingsByDriver = useMemo(() => {
    const result: Record<string, PickupBooking[]> = {}
    // Include all driver IDs from columnOrder (not just activeDriverIds)
    // This ensures bookings show up even if the driver was added but not in activeDriverIds
    const allDriverIds = new Set([
      ...activeDriverIds,
      ...columnOrder
        .filter(id => id.startsWith('driver-'))
        .map(id => id.replace('driver-', ''))
    ])
    allDriverIds.forEach(driverId => {
      result[driverId] = bookings.filter(b => b.pendingDriverId === driverId)
    })
    return result
  }, [bookings, activeDriverIds, columnOrder])

  const availableDrivers = useMemo(() => {
    return drivers.filter(d => !activeDriverIds.includes(d.id))
  }, [drivers, activeDriverIds])

  const activeDrivers = useMemo(() => {
    return drivers.filter(d => activeDriverIds.includes(d.id))
  }, [drivers, activeDriverIds])

  // Stats
  const totalGuests = useMemo(() => {
    return bookings.reduce((sum, b) => 
      sum + (b.adults || 0) + (b.children || 0) + (b.infants || 0), 0
    )
  }, [bookings])

  const unassignedCount = unassignedBookings.length
  const assignedCount = bookings.length - unassignedCount

  // Update column order when active driver IDs change
  useEffect(() => {
    setColumnOrder(prev => {
      const newOrder = ['unassigned', ...activeDriverIds.map(id => `driver-${id}`)]
      // Only update if the driver columns changed (preserve manual reordering)
      const prevDriverCols = prev.filter(id => id !== 'unassigned')
      const newDriverCols = newOrder.filter(id => id !== 'unassigned')
      
      // If a new driver was added, append it
      if (newDriverCols.length > prevDriverCols.length) {
        const addedDrivers = newDriverCols.filter(id => !prev.includes(id))
        return [...prev, ...addedDrivers]
      }
      // If a driver was removed, filter it out
      if (newDriverCols.length < prevDriverCols.length) {
        return prev.filter(id => id === 'unassigned' || newDriverCols.includes(id))
      }
      return prev
    })
  }, [activeDriverIds])

  // Handlers
  const handleAddDriver = (driverId: string) => {
    setActiveDriverIds(prev => [...prev, driverId])
  }

  const handleRemoveDriver = (driverId: string) => {
    // Move all bookings back to unassigned
    setBookings(prev => prev.map(b => 
      b.pendingDriverId === driverId 
        ? { ...b, pendingDriverId: null }
        : b
    ))
    setActiveDriverIds(prev => prev.filter(id => id !== driverId))
    setHasChanges(true)
  }

  const handleToggleLock = async (driverId: string) => {
    if (!user?.company_id) return

    const newLocked = !locks[driverId]
    const supabase = createClient()
    const dateStr = format(selectedDate, 'yyyy-MM-dd')

    try {
      const { error } = await supabase
        .from('driver_pickup_locks')
        .upsert({
          company_id: user.company_id,
          driver_id: driverId,
          activity_date: dateStr,
          is_locked: newLocked,
          locked_at: newLocked ? new Date().toISOString() : null,
        }, {
          onConflict: 'company_id,driver_id,activity_date',
        })

      if (error) {
        // If table doesn't exist or not found, just update local state
        const isTableMissing = 
          error.message?.includes('does not exist') || 
          error.message?.includes('schema cache') ||
          error.message?.includes('not found') ||
          error.code === '42P01' ||
          error.code === 'PGRST204'
        
        if (isTableMissing) {
          setLocks(prev => ({ ...prev, [driverId]: newLocked }))
          toast.success(newLocked ? 'Driver list locked (local only)' : 'Driver list unlocked')
          return
        }
        throw error
      }

      setLocks(prev => ({ ...prev, [driverId]: newLocked }))
      toast.success(newLocked ? 'Driver list locked' : 'Driver list unlocked')
    } catch (error: any) {
      // Last resort - just update local state
      console.error('Lock error:', error)
      setLocks(prev => ({ ...prev, [driverId]: newLocked }))
      toast.success(newLocked ? 'Driver list locked (local only)' : 'Driver list unlocked')
    }
  }

  const handleDownloadPdf = (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId)
    if (!driver) return

    const driverBookings = bookingsByDriver[driverId] || []
    generatePickupPdf(driver, driverBookings, selectedDate)
    toast.success('PDF downloaded')
  }

  const handleCopyText = async (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId)
    if (!driver) return

    const driverBookings = bookingsByDriver[driverId] || []
    const text = generatePickupText(driver, driverBookings, selectedDate)
    const success = await copyToClipboard(text)
    
    if (success) {
      toast.success('Copied to clipboard')
    } else {
      toast.error('Failed to copy')
    }
  }

  const handleDownloadAllPdf = () => {
    const driversData = activeDrivers.map(driver => ({
      driver,
      bookings: bookingsByDriver[driver.id] || [],
    }))
    generateAllPickupPdf(driversData, selectedDate)
    toast.success('PDF downloaded')
  }

  const handleCopyAllText = async () => {
    const driversData = activeDrivers.map(driver => ({
      driver,
      bookings: bookingsByDriver[driver.id] || [],
    }))
    const text = generateAllPickupText(driversData, selectedDate)
    const success = await copyToClipboard(text)
    
    if (success) {
      toast.success('Copied to clipboard')
    } else {
      toast.error('Failed to copy')
    }
  }

  // DnD handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const activeData = active.data.current
    
    // Check if dragging a column
    if (activeData?.type === 'column') {
      setActiveColumnId(active.id as string)
      return
    }
    
    // Dragging a booking
    const booking = bookings.find(b => b.id === active.id)
    if (booking) {
      setActiveBooking(booking)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    // Visual feedback is handled by the droppable components
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    const activeData = active.data.current
    
    // Handle column reordering
    if (activeData?.type === 'column') {
      setActiveColumnId(null)
      if (!over) return
      
      const activeId = active.id as string
      const overId = over.id as string
      
      if (activeId !== overId) {
        setColumnOrder(prev => {
          const oldIndex = prev.indexOf(activeId)
          const newIndex = prev.indexOf(overId)
          if (oldIndex === -1 || newIndex === -1) return prev
          return arrayMove(prev, oldIndex, newIndex)
        })
      }
      return
    }
    
    // Handle booking drag
    setActiveBooking(null)

    if (!over) return

    const bookingId = active.id as string
    const overId = over.id as string
    const overData = over.data?.current as { type?: string; driverId?: string } | undefined

    // Determine the target driver
    let targetDriverId: string | null = null
    
    // First check if we have driverId in the data (from sortable/droppable)
    if (overData?.driverId) {
      targetDriverId = overData.driverId === 'unassigned' ? null : overData.driverId
    } else if (overId === 'unassigned') {
      targetDriverId = null
    } else if (overId.startsWith('driver-')) {
      targetDriverId = overId.replace('driver-', '')
    } else {
      // Dropped on another booking - find which column it's in
      const overBooking = bookings.find(b => b.id === overId)
      if (overBooking) {
        targetDriverId = overBooking.pendingDriverId || null
      } else {
        return
      }
    }

    // Check if target driver is locked
    if (targetDriverId && locks[targetDriverId]) {
      toast.error('This driver list is locked')
      return
    }

    // Update booking
    const booking = bookings.find(b => b.id === bookingId)
    if (!booking) return

    // Check if source driver is locked
    if (booking.pendingDriverId && locks[booking.pendingDriverId]) {
      toast.error('Cannot move from a locked driver list')
      return
    }

    // Don't update if dropping in the same place
    if (booking.pendingDriverId === targetDriverId) return

    setBookings(prev => prev.map(b => 
      b.id === bookingId 
        ? { ...b, pendingDriverId: targetDriverId }
        : b
    ))
    setHasChanges(true)
  }

  const saveAssignments = async () => {
    setSaving(true)
    const supabase = createClient()

    try {
      const updates = bookings.filter(b => b.pendingDriverId !== b.driver_id)

      for (const booking of updates) {
        const { error } = await supabase
          .from('bookings')
          .update({ driver_id: booking.pendingDriverId })
          .eq('id', booking.id)

        if (error) throw error
      }

      toast.success(`Saved ${updates.length} assignment${updates.length !== 1 ? 's' : ''}`)
      await fetchData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save assignments')
    } finally {
      setSaving(false)
    }
  }

  // Auto-save function (silent background save)
  const autoSave = useCallback(async () => {
    if (!user?.company_id) return
    
    const updates = bookings.filter(b => b.pendingDriverId !== b.driver_id)
    if (updates.length === 0) {
      setHasChanges(false)
      return
    }

    setAutoSaving(true)
    const supabase = createClient()

    try {
      for (const booking of updates) {
        const { error } = await supabase
          .from('bookings')
          .update({ driver_id: booking.pendingDriverId })
          .eq('id', booking.id)

        if (error) throw error
      }

      // Update local state to reflect saved changes (without refetching)
      setBookings(prev => prev.map(b => ({
        ...b,
        driver_id: b.pendingDriverId,
      })))
      setHasChanges(false)
    } catch (error: any) {
      console.error('Auto-save failed:', error)
      // Don't show error toast for auto-save to avoid disruption
    } finally {
      setAutoSaving(false)
    }
  }, [user?.company_id, bookings])

  // Auto-save effect with debounce
  useEffect(() => {
    if (hasChanges && !saving) {
      // Clear any existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
      
      // Set new timeout for auto-save (2 second delay)
      autoSaveTimeoutRef.current = setTimeout(() => {
        autoSave()
      }, 2000)
    }

    // Cleanup on unmount
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [hasChanges, saving, autoSave])

  // Swap column positions by number
  const handleSwapColumns = (currentPosition: number, targetPosition: number) => {
    setColumnOrder(prev => {
      const newOrder = [...prev]
      const currentIndex = currentPosition - 1 // Convert 1-based to 0-based
      const targetIndex = targetPosition - 1
      
      // Validate indices
      if (currentIndex < 0 || currentIndex >= newOrder.length ||
          targetIndex < 0 || targetIndex >= newOrder.length) {
        return prev
      }
      
      // Swap the columns
      const temp = newOrder[currentIndex]
      newOrder[currentIndex] = newOrder[targetIndex]
      newOrder[targetIndex] = temp
      
      return newOrder
    })
  }

  // Reset all assignments - move all customers to unassigned and clear drivers
  const handleReset = async () => {
    // Move all bookings to unassigned
    setBookings(prev => prev.map(b => ({
      ...b,
      pendingDriverId: null,
    })))
    
    // Clear all active drivers
    setActiveDriverIds([])
    
    // Reset column order to just unassigned
    setColumnOrder(['unassigned'])
    
    // Clear locks
    setLocks({})
    
    // Mark as having changes so it auto-saves
    setHasChanges(true)
    
    toast.success('All assignments have been reset')
  }

  return (
    <ProtectedPage pageKey="pickup" pageName="Pick-up Management">
    <TooltipProvider>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="flex-shrink-0 p-6 pb-4 space-y-4">
          <PageHeader
            title="Pick-up Management"
            description="Drag and drop customers to assign drivers"
          >
            <div className="flex items-center gap-2">
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
                    disabled={(date) => {
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      const maxDate = new Date(today)
                      maxDate.setDate(maxDate.getDate() + 2) // Today, tomorrow, day after tomorrow only
                      return date < today || date > maxDate
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Button variant="outline" onClick={fetchData} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
            </div>
          </PageHeader>

          {/* Stats & Actions Bar */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{bookings.length}</span>
                <span className="text-muted-foreground">bookings</span>
                <span className="text-muted-foreground">•</span>
                <span className="font-medium">{totalGuests}</span>
                <span className="text-muted-foreground">guests</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Car className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{activeDrivers.length}</span>
                <span className="text-muted-foreground">drivers</span>
              </div>
              {unassignedCount > 0 ? (
                <div className="flex items-center gap-1 text-warning text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">{unassignedCount}</span>
                  <span>unassigned</span>
                </div>
              ) : bookings.length > 0 ? (
                <div className="flex items-center gap-1 text-success text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>All assigned</span>
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              {activeDrivers.length > 0 && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadAllPdf}
                        disabled={assignedCount === 0}
                      >
                        <FileDown className="h-4 w-4 mr-1" />
                        All PDF
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Download all driver lists as PDF</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyAllText}
                        disabled={assignedCount === 0}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy All
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy all driver lists as text</TooltipContent>
                  </Tooltip>
                </>
              )}
              <AlertDialog>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={bookings.length === 0}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Reset
                      </Button>
                    </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Reset all assignments</TooltipContent>
                </Tooltip>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Reset All Assignments?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will move all {bookings.length} customers back to Unassigned and remove all driver columns. 
                      This action will be auto-saved and cannot be easily undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleReset}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Yes, Reset All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button 
                onClick={saveAssignments} 
                disabled={saving}
                variant={hasChanges ? "default" : "outline"}
              >
                {saving ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : autoSaving ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Auto-saving...
                  </>
                ) : hasChanges ? (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Now
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Saved
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        {loading ? (
          <div className="flex-1 p-6 pt-0">
            <div className="flex gap-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="w-[320px] h-[400px] flex-shrink-0" />
              ))}
            </div>
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex-1 p-6 pt-0">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Car className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No pickups for this date</h3>
                <p className="text-muted-foreground text-center">
                  Select a different date or wait for bookings to be created.
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden px-6 pb-6">
            <DndContext
              sensors={sensors}
              collisionDetection={pointerWithin}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <ScrollArea className="h-full">
                <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                  <div className="flex gap-4 pb-4" style={{ minHeight: 'calc(100% - 16px)' }}>
                    {/* Render columns in order */}
                    {columnOrder.map((columnId, index) => {
                      const position = index + 1 // 1-based position
                      const totalColumns = columnOrder.length
                      
                      if (columnId === 'unassigned') {
                        return (
                          <UnassignedColumn 
                            key="unassigned"
                            columnId="unassigned"
                            bookings={unassignedBookings} 
                            groupByArea={true}
                            position={position}
                            totalColumns={totalColumns}
                            onSwapPosition={handleSwapColumns}
                          />
                        )
                      }
                      
                      const driverId = columnId.replace('driver-', '')
                      const driver = drivers.find(d => d.id === driverId)
                      if (!driver) return null
                      
                      return (
                        <DriverColumn
                          key={driver.id}
                          columnId={columnId}
                          driver={driver}
                          bookings={bookingsByDriver[driver.id] || []}
                          isLocked={locks[driver.id] || false}
                          position={position}
                          totalColumns={totalColumns}
                          onToggleLock={handleToggleLock}
                          onDownloadPdf={handleDownloadPdf}
                          onCopyText={handleCopyText}
                          onRemoveDriver={handleRemoveDriver}
                          onSwapPosition={handleSwapColumns}
                        />
                      )
                    })}

                    {/* Add Driver Button */}
                    <AddDriverButton
                      availableDrivers={availableDrivers}
                      onAddDriver={handleAddDriver}
                    />
                  </div>
                </SortableContext>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>

              {/* Drag Overlay */}
              <DragOverlay>
                {activeBooking ? (
                  <CustomerCardOverlay booking={activeBooking} />
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        )}
      </div>
    </TooltipProvider>
    </ProtectedPage>
  )
}
