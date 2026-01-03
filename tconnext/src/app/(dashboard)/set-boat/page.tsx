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
  Anchor,
  Users,
  Save,
  RefreshCw,
  FileDown,
  Copy,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react'
import { BoatColumn, UnassignedColumn } from './boat-column'
import { CustomerCardOverlay, type BoatBooking } from './customer-card'
import { AddBoatButton } from './add-boat-button'
import {
  generateBoatText,
  generateAllBoatText,
  generateBoatPdf,
  generateAllBoatPdf,
  copyToClipboard,
} from './set-boat-utils'
import type { Boat, Guide, Restaurant, Program, BoatAssignmentLock } from '@/types'

interface BoatAssignment {
  programId: string | null
  guideId: string | null
  restaurantId: string | null
  isLocked: boolean
}

export default function SetBoatPage() {
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [bookings, setBookings] = useState<BoatBooking[]>([])
  const [boats, setBoats] = useState<Boat[]>([])
  const [guides, setGuides] = useState<Guide[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [activeBoatIds, setActiveBoatIds] = useState<string[]>([])
  const [columnOrder, setColumnOrder] = useState<string[]>(['unassigned'])
  const [boatAssignments, setBoatAssignments] = useState<Record<string, BoatAssignment>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [activeBooking, setActiveBooking] = useState<BoatBooking | null>(null)
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

    const [bookingsRes, boatsRes, guidesRes, restaurantsRes, programsRes, locksRes] = await Promise.all([
      supabase
        .from('bookings')
        .select(`
          *,
          program:programs(id, name, nickname, color),
          hotel:hotels(id, name, area)
        `)
        .eq('company_id', user.company_id)
        .eq('activity_date', dateStr)
        .not('status', 'in', '("void","cancelled")')
        .is('deleted_at', null)
        .order('customer_name'),
      supabase
        .from('boats')
        .select('*')
        .eq('company_id', user.company_id)
        .eq('status', 'active')
        .order('name'),
      supabase
        .from('guides')
        .select('*')
        .eq('company_id', user.company_id)
        .eq('status', 'active')
        .order('name'),
      supabase
        .from('restaurants')
        .select('*')
        .eq('company_id', user.company_id)
        .eq('status', 'active')
        .order('name'),
      supabase
        .from('programs')
        .select('*')
        .eq('company_id', user.company_id)
        .eq('status', 'active')
        .order('name'),
      supabase
        .from('boat_assignment_locks')
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
        pendingBoatId: b.boat_id,
      }))
      setBookings(bookingsWithPending)

      // Initialize active boat IDs from bookings that have boats assigned
      const assignedBoatIds = [...new Set(
        bookingsWithPending
          .filter(b => b.boat_id)
          .map(b => b.boat_id as string)
      )]
      
      // Also include boat IDs from locks (boats with program/guide/restaurant assigned)
      const lockedBoatIds = !locksRes.error && locksRes.data 
        ? locksRes.data.map((lock: any) => lock.boat_id as string)
        : []
      
      // Merge both sets of boat IDs
      const allActiveBoatIds = [...new Set([...assignedBoatIds, ...lockedBoatIds])]
      setActiveBoatIds(allActiveBoatIds)
    }

    if (boatsRes.error) {
      console.error('Boats error:', boatsRes.error)
      toast.error('Failed to load boats')
    } else {
      setBoats(boatsRes.data || [])
    }

    if (guidesRes.error) {
      console.error('Guides error:', guidesRes.error)
    } else {
      setGuides(guidesRes.data || [])
    }

    if (restaurantsRes.error) {
      console.error('Restaurants error:', restaurantsRes.error)
    } else {
      setRestaurants(restaurantsRes.data || [])
    }

    if (programsRes.error) {
      console.error('Programs error:', programsRes.error)
    } else {
      setPrograms(programsRes.data || [])
    }

    // Process locks
    if (!locksRes.error && locksRes.data) {
      const assignments: Record<string, BoatAssignment> = {}
      locksRes.data.forEach((lock: any) => {
        assignments[lock.boat_id] = {
          programId: lock.program_id || null,
          guideId: lock.guide_id,
          restaurantId: lock.restaurant_id,
          isLocked: lock.is_locked,
        }
      })
      setBoatAssignments(assignments)
    }

    setLoading(false)
    setHasChanges(false)
  }, [user, selectedDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Derived data
  const unassignedBookings = useMemo(() => {
    return bookings.filter(b => !b.pendingBoatId)
  }, [bookings])

  const bookingsByBoat = useMemo(() => {
    const result: Record<string, BoatBooking[]> = {}
    const allBoatIds = new Set([
      ...activeBoatIds,
      ...columnOrder
        .filter(id => id.startsWith('boat-'))
        .map(id => id.replace('boat-', ''))
    ])
    allBoatIds.forEach(boatId => {
      result[boatId] = bookings.filter(b => b.pendingBoatId === boatId)
    })
    return result
  }, [bookings, activeBoatIds, columnOrder])

  const availableBoats = useMemo(() => {
    return boats.filter(b => !activeBoatIds.includes(b.id))
  }, [boats, activeBoatIds])

  const activeBoats = useMemo(() => {
    return boats.filter(b => activeBoatIds.includes(b.id))
  }, [boats, activeBoatIds])

  // Stats
  const totalGuests = useMemo(() => {
    return bookings.reduce((sum, b) => 
      sum + (b.adults || 0) + (b.children || 0) + (b.infants || 0), 0
    )
  }, [bookings])

  const unassignedCount = unassignedBookings.length
  const assignedCount = bookings.length - unassignedCount

  // Update column order when active boat IDs change
  useEffect(() => {
    setColumnOrder(prev => {
      const newOrder = ['unassigned', ...activeBoatIds.map(id => `boat-${id}`)]
      const prevBoatCols = prev.filter(id => id !== 'unassigned')
      const newBoatCols = newOrder.filter(id => id !== 'unassigned')
      
      if (newBoatCols.length > prevBoatCols.length) {
        const addedBoats = newBoatCols.filter(id => !prev.includes(id))
        return [...prev, ...addedBoats]
      }
      if (newBoatCols.length < prevBoatCols.length) {
        return prev.filter(id => id === 'unassigned' || newBoatCols.includes(id))
      }
      return prev
    })
  }, [activeBoatIds])

  // Handlers
  const handleAddBoat = (boatId: string) => {
    setActiveBoatIds(prev => [...prev, boatId])
  }

  const handleRemoveBoat = (boatId: string) => {
    // Move all bookings back to unassigned
    setBookings(prev => prev.map(b => 
      b.pendingBoatId === boatId 
        ? { ...b, pendingBoatId: null }
        : b
    ))
    setActiveBoatIds(prev => prev.filter(id => id !== boatId))
    setHasChanges(true)
  }

  const handleToggleLock = async (boatId: string) => {
    if (!user?.company_id) return

    const currentAssignment = boatAssignments[boatId] || { programId: null, guideId: null, restaurantId: null, isLocked: false }
    const newLocked = !currentAssignment.isLocked
    const supabase = createClient()
    const dateStr = format(selectedDate, 'yyyy-MM-dd')

    try {
      const { error } = await supabase
        .from('boat_assignment_locks')
        .upsert({
          company_id: user.company_id,
          boat_id: boatId,
          activity_date: dateStr,
          program_id: currentAssignment.programId,
          guide_id: currentAssignment.guideId,
          restaurant_id: currentAssignment.restaurantId,
          is_locked: newLocked,
          locked_at: newLocked ? new Date().toISOString() : null,
        }, {
          onConflict: 'company_id,boat_id,activity_date',
        })

      if (error) {
        console.error('Lock error:', error)
        // Still update local state
      }

      setBoatAssignments(prev => ({
        ...prev,
        [boatId]: { ...currentAssignment, isLocked: newLocked },
      }))
      toast.success(newLocked ? 'Boat locked' : 'Boat unlocked')
    } catch (error: any) {
      console.error('Lock error:', error)
      setBoatAssignments(prev => ({
        ...prev,
        [boatId]: { ...currentAssignment, isLocked: newLocked },
      }))
      toast.success(newLocked ? 'Boat locked (local only)' : 'Boat unlocked')
    }
  }

  const handleProgramChange = async (boatId: string, programId: string | null) => {
    const currentAssignment = boatAssignments[boatId] || { programId: null, guideId: null, restaurantId: null, isLocked: false }
    
    // If changing program, remove any bookings from different programs
    if (programId) {
      const boatBookings = bookingsByBoat[boatId] || []
      const bookingsToRemove = boatBookings.filter(b => b.program_id !== programId)
      if (bookingsToRemove.length > 0) {
        setBookings(prev => prev.map(b => 
          bookingsToRemove.some(br => br.id === b.id)
            ? { ...b, pendingBoatId: null }
            : b
        ))
        toast.info(`${bookingsToRemove.length} booking(s) moved to Unassigned (different program)`)
      }
    }
    
    setBoatAssignments(prev => ({
      ...prev,
      [boatId]: { ...currentAssignment, programId },
    }))
    setHasChanges(true)
  }

  const handleGuideChange = async (boatId: string, guideId: string | null) => {
    const currentAssignment = boatAssignments[boatId] || { programId: null, guideId: null, restaurantId: null, isLocked: false }
    
    setBoatAssignments(prev => ({
      ...prev,
      [boatId]: { ...currentAssignment, guideId },
    }))
    setHasChanges(true)
  }

  const handleRestaurantChange = async (boatId: string, restaurantId: string | null) => {
    const currentAssignment = boatAssignments[boatId] || { programId: null, guideId: null, restaurantId: null, isLocked: false }
    
    setBoatAssignments(prev => ({
      ...prev,
      [boatId]: { ...currentAssignment, restaurantId },
    }))
    setHasChanges(true)
  }

  const handleDownloadPdf = (boatId: string) => {
    const boat = boats.find(b => b.id === boatId)
    if (!boat) return

    const boatBookings = bookingsByBoat[boatId] || []
    const assignment = boatAssignments[boatId]
    const guide = assignment?.guideId ? guides.find(g => g.id === assignment.guideId) : null
    const restaurant = assignment?.restaurantId ? restaurants.find(r => r.id === assignment.restaurantId) : null

    generateBoatPdf(boat, boatBookings, guide, restaurant, selectedDate)
    toast.success('PDF downloaded')
  }

  const handleCopyText = async (boatId: string) => {
    const boat = boats.find(b => b.id === boatId)
    if (!boat) return

    const boatBookings = bookingsByBoat[boatId] || []
    const assignment = boatAssignments[boatId]
    const guide = assignment?.guideId ? guides.find(g => g.id === assignment.guideId) : null
    const restaurant = assignment?.restaurantId ? restaurants.find(r => r.id === assignment.restaurantId) : null

    const text = generateBoatText(boat, boatBookings, guide, restaurant, selectedDate)
    const success = await copyToClipboard(text)
    
    if (success) {
      toast.success('Copied to clipboard')
    } else {
      toast.error('Failed to copy')
    }
  }

  const handleDownloadAllPdf = () => {
    const boatsData = activeBoats.map(boat => {
      const assignment = boatAssignments[boat.id]
      return {
        boat,
        bookings: bookingsByBoat[boat.id] || [],
        guide: assignment?.guideId ? guides.find(g => g.id === assignment.guideId) : null,
        restaurant: assignment?.restaurantId ? restaurants.find(r => r.id === assignment.restaurantId) : null,
      }
    })
    generateAllBoatPdf(boatsData, selectedDate)
    toast.success('PDF downloaded')
  }

  const handleCopyAllText = async () => {
    const boatsData = activeBoats.map(boat => {
      const assignment = boatAssignments[boat.id]
      return {
        boat,
        bookings: bookingsByBoat[boat.id] || [],
        guide: assignment?.guideId ? guides.find(g => g.id === assignment.guideId) : null,
        restaurant: assignment?.restaurantId ? restaurants.find(r => r.id === assignment.restaurantId) : null,
      }
    })
    const text = generateAllBoatText(boatsData, selectedDate)
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
    
    if (activeData?.type === 'column') {
      setActiveColumnId(active.id as string)
      return
    }
    
    const booking = bookings.find(b => b.id === active.id)
    if (booking) {
      setActiveBooking(booking)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    // Visual feedback handled by droppable components
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
    const overData = over.data?.current as { type?: string; boatId?: string } | undefined

    // Determine the target boat
    let targetBoatId: string | null = null
    
    if (overData?.boatId) {
      targetBoatId = overData.boatId === 'unassigned' ? null : overData.boatId
    } else if (overId === 'unassigned') {
      targetBoatId = null
    } else if (overId.startsWith('boat-')) {
      targetBoatId = overId.replace('boat-', '')
    } else {
      // Dropped on another booking - find which column it's in
      const overBooking = bookings.find(b => b.id === overId)
      if (overBooking) {
        targetBoatId = overBooking.pendingBoatId || null
      } else {
        return
      }
    }

    // Check if target boat is locked
    if (targetBoatId && boatAssignments[targetBoatId]?.isLocked) {
      toast.error('This boat is locked')
      return
    }

    // Update booking
    const booking = bookings.find(b => b.id === bookingId)
    if (!booking) return

    // Check if source boat is locked
    if (booking.pendingBoatId && boatAssignments[booking.pendingBoatId]?.isLocked) {
      toast.error('Cannot move from a locked boat')
      return
    }

    // Check program restriction - if boat has a program selected, only that program's customers can be assigned
    if (targetBoatId) {
      const targetAssignment = boatAssignments[targetBoatId]
      if (targetAssignment?.programId && booking.program_id !== targetAssignment.programId) {
        const targetProgram = programs.find(p => p.id === targetAssignment.programId)
        toast.error(`This boat only accepts "${targetProgram?.nickname || targetProgram?.name}" program`)
        return
      }
    }

    // Don't update if dropping in the same place
    if (booking.pendingBoatId === targetBoatId) return

    setBookings(prev => prev.map(b => 
      b.id === bookingId 
        ? { ...b, pendingBoatId: targetBoatId }
        : b
    ))
    setHasChanges(true)
  }

  const saveAssignments = async () => {
    if (!user?.company_id) return
    
    setSaving(true)
    const supabase = createClient()
    const dateStr = format(selectedDate, 'yyyy-MM-dd')

    try {
      // Save booking boat assignments
      const bookingUpdates = bookings.filter(b => b.pendingBoatId !== b.boat_id)
      for (const booking of bookingUpdates) {
        const { error } = await supabase
          .from('bookings')
          .update({ boat_id: booking.pendingBoatId })
          .eq('id', booking.id)
        if (error) throw error
      }

      // Save boat assignment locks (program/guide/restaurant)
      for (const boatId of activeBoatIds) {
        const assignment = boatAssignments[boatId]
        if (assignment) {
          let { error } = await supabase
            .from('boat_assignment_locks')
            .upsert({
              company_id: user.company_id,
              boat_id: boatId,
              activity_date: dateStr,
              program_id: assignment.programId,
              guide_id: assignment.guideId,
              restaurant_id: assignment.restaurantId,
              is_locked: assignment.isLocked,
              locked_at: assignment.isLocked ? new Date().toISOString() : null,
            }, {
              onConflict: 'company_id,boat_id,activity_date',
            })
          
          // If program_id column doesn't exist in schema cache, try without it
          if (error?.code === 'PGRST204' && error?.message?.includes('program_id')) {
            const { error: fallbackError } = await supabase
              .from('boat_assignment_locks')
              .upsert({
                company_id: user.company_id,
                boat_id: boatId,
                activity_date: dateStr,
                guide_id: assignment.guideId,
                restaurant_id: assignment.restaurantId,
                is_locked: assignment.isLocked,
                locked_at: assignment.isLocked ? new Date().toISOString() : null,
              }, {
                onConflict: 'company_id,boat_id,activity_date',
              })
            error = fallbackError
          }
          
          if (error) console.error('Lock save error:', error)
        }
      }

      toast.success(`Saved ${bookingUpdates.length} assignment${bookingUpdates.length !== 1 ? 's' : ''}`)
      await fetchData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save assignments')
    } finally {
      setSaving(false)
    }
  }

  // Auto-save function
  const autoSave = useCallback(async () => {
    if (!user?.company_id) return
    
    const updates = bookings.filter(b => b.pendingBoatId !== b.boat_id)
    if (updates.length === 0 && Object.keys(boatAssignments).length === 0) {
      setHasChanges(false)
      return
    }

    setAutoSaving(true)
    const supabase = createClient()
    const dateStr = format(selectedDate, 'yyyy-MM-dd')

    try {
      for (const booking of updates) {
        const { error } = await supabase
          .from('bookings')
          .update({ boat_id: booking.pendingBoatId })
          .eq('id', booking.id)
        if (error) throw error
      }

      // Save program/guide/restaurant assignments
      for (const boatId of activeBoatIds) {
        const assignment = boatAssignments[boatId]
        if (assignment) {
          // Try with program_id first, fall back to without if column doesn't exist
          let { error: upsertError } = await supabase
            .from('boat_assignment_locks')
            .upsert({
              company_id: user.company_id,
              boat_id: boatId,
              activity_date: dateStr,
              program_id: assignment.programId,
              guide_id: assignment.guideId,
              restaurant_id: assignment.restaurantId,
              is_locked: assignment.isLocked,
            }, {
              onConflict: 'company_id,boat_id,activity_date',
            })
          
          // If program_id column doesn't exist in schema cache, try without it
          if (upsertError?.code === 'PGRST204' && upsertError?.message?.includes('program_id')) {
            const { error: fallbackError } = await supabase
              .from('boat_assignment_locks')
              .upsert({
                company_id: user.company_id,
                boat_id: boatId,
                activity_date: dateStr,
                guide_id: assignment.guideId,
                restaurant_id: assignment.restaurantId,
                is_locked: assignment.isLocked,
              }, {
                onConflict: 'company_id,boat_id,activity_date',
              })
            upsertError = fallbackError
          }
          
          if (upsertError) {
            console.error('Auto-save upsert error for boat', boatId, ':', upsertError)
          }
        }
      }

      setBookings(prev => prev.map(b => ({
        ...b,
        boat_id: b.pendingBoatId,
      })))
      setHasChanges(false)
    } catch (error: any) {
      console.error('Auto-save failed:', error)
    } finally {
      setAutoSaving(false)
    }
  }, [user?.company_id, bookings, boatAssignments, activeBoatIds, selectedDate])

  // Auto-save effect with debounce
  useEffect(() => {
    if (hasChanges && !saving) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
      
      autoSaveTimeoutRef.current = setTimeout(() => {
        autoSave()
      }, 2000)
    }

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
      const currentIndex = currentPosition - 1
      const targetIndex = targetPosition - 1
      
      if (currentIndex < 0 || currentIndex >= newOrder.length ||
          targetIndex < 0 || targetIndex >= newOrder.length) {
        return prev
      }
      
      const temp = newOrder[currentIndex]
      newOrder[currentIndex] = newOrder[targetIndex]
      newOrder[targetIndex] = temp
      
      return newOrder
    })
  }

  // Reset all assignments
  const handleReset = async () => {
    setBookings(prev => prev.map(b => ({
      ...b,
      pendingBoatId: null,
    })))
    setActiveBoatIds([])
    setColumnOrder(['unassigned'])
    setBoatAssignments({})
    setHasChanges(true)
    toast.success('All assignments have been reset')
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="flex-shrink-0 p-6 pb-4 space-y-4">
          <PageHeader
            title="Set Boat"
            description="Assign customers to boats with guide and restaurant"
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
                <Anchor className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{activeBoats.length}</span>
                <span className="text-muted-foreground">boats</span>
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
              {activeBoats.length > 0 && (
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
                    <TooltipContent>Download all boat lists as PDF</TooltipContent>
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
                    <TooltipContent>Copy all boat lists as text</TooltipContent>
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
                      This will move all {bookings.length} customers back to Unassigned and remove all boat columns. 
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
                <Anchor className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No bookings for this date</h3>
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
                      const position = index + 1
                      const totalColumns = columnOrder.length
                      
                      if (columnId === 'unassigned') {
                        return (
                          <UnassignedColumn 
                            key="unassigned"
                            columnId="unassigned"
                            bookings={unassignedBookings}
                            programs={programs}
                            position={position}
                            totalColumns={totalColumns}
                            onSwapPosition={handleSwapColumns}
                          />
                        )
                      }
                      
                      const boatId = columnId.replace('boat-', '')
                      const boat = boats.find(b => b.id === boatId)
                      if (!boat) return null
                      
                      const assignment = boatAssignments[boatId] || { programId: null, guideId: null, restaurantId: null, isLocked: false }
                      
                      return (
                        <BoatColumn
                          key={boat.id}
                          columnId={columnId}
                          boat={boat}
                          bookings={bookingsByBoat[boat.id] || []}
                          programs={programs}
                          guides={guides}
                          restaurants={restaurants}
                          selectedProgramId={assignment.programId}
                          selectedGuideId={assignment.guideId}
                          selectedRestaurantId={assignment.restaurantId}
                          isLocked={assignment.isLocked}
                          position={position}
                          totalColumns={totalColumns}
                          onToggleLock={handleToggleLock}
                          onDownloadPdf={handleDownloadPdf}
                          onCopyText={handleCopyText}
                          onRemoveBoat={handleRemoveBoat}
                          onProgramChange={handleProgramChange}
                          onGuideChange={handleGuideChange}
                          onRestaurantChange={handleRestaurantChange}
                          onSwapPosition={handleSwapColumns}
                        />
                      )
                    })}

                    {/* Add Boat Button */}
                    <AddBoatButton
                      availableBoats={availableBoats}
                      onAddBoat={handleAddBoat}
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
  )
}

