"use client"

import { useMemo, useState, useRef, useEffect } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  Anchor,
  Users,
  Lock,
  Unlock,
  FileDown,
  Copy,
  X,
  GripVertical,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react'
import { CustomerCard, type BoatBooking } from './customer-card'
import type { Boat, Guide, Restaurant, Program } from '@/types'

// Column position selector component for swapping columns by number
interface ColumnPositionSelectorProps {
  position: number
  totalColumns: number
  onSwap: (targetPosition: number) => void
}

function ColumnPositionSelector({ 
  position, 
  totalColumns, 
  onSwap 
}: ColumnPositionSelectorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState(position.toString())
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setInputValue(position.toString())
  }, [position])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleClick = () => {
    setIsEditing(true)
  }

  const handleBlur = () => {
    setIsEditing(false)
    setInputValue(position.toString())
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const newPosition = parseInt(inputValue, 10)
      if (!isNaN(newPosition) && newPosition >= 1 && newPosition <= totalColumns && newPosition !== position) {
        onSwap(newPosition)
      }
      setIsEditing(false)
      setInputValue(position.toString())
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setInputValue(position.toString())
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value === '' || /^\d+$/.test(value)) {
      setInputValue(value)
    }
  }

  return (
    <div className="flex justify-center mb-2">
      {isEditing ? (
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-12 h-8 text-center text-sm font-semibold p-0 border-2 border-primary"
        />
      ) : (
        <button
          onClick={handleClick}
          className={cn(
            "w-12 h-8 rounded-md border-2 border-dashed border-muted-foreground/40",
            "text-sm font-semibold text-muted-foreground",
            "hover:border-primary hover:text-primary hover:bg-primary/5",
            "transition-all cursor-pointer"
          )}
        >
          {position}
        </button>
      )}
    </div>
  )
}

interface BoatColumnProps {
  columnId: string
  boat: Boat
  bookings: BoatBooking[]
  programs: Program[]
  guides: Guide[]
  restaurants: Restaurant[]
  selectedProgramId: string | null
  selectedGuideId: string | null
  selectedRestaurantId: string | null
  isLocked: boolean
  position: number
  totalColumns: number
  onToggleLock: (boatId: string) => void
  onDownloadPdf: (boatId: string) => void
  onCopyText: (boatId: string) => void
  onRemoveBoat: (boatId: string) => void
  onProgramChange: (boatId: string, programId: string | null) => void
  onGuideChange: (boatId: string, guideId: string | null) => void
  onRestaurantChange: (boatId: string, restaurantId: string | null) => void
  onSwapPosition: (currentPosition: number, targetPosition: number) => void
}

export function BoatColumn({
  columnId,
  boat,
  bookings,
  programs,
  guides,
  restaurants,
  selectedProgramId,
  selectedGuideId,
  selectedRestaurantId,
  isLocked,
  position,
  totalColumns,
  onToggleLock,
  onDownloadPdf,
  onCopyText,
  onRemoveBoat,
  onProgramChange,
  onGuideChange,
  onRestaurantChange,
  onSwapPosition,
}: BoatColumnProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging: isColumnDragging,
  } = useSortable({
    id: columnId,
    data: { type: 'column' },
  })

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: columnId,
    data: {
      type: 'boat',
      boatId: boat.id,
      programId: selectedProgramId,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const totalGuests = useMemo(() => {
    return bookings.reduce((sum, b) => 
      sum + (b.adults || 0) + (b.children || 0) + (b.infants || 0), 0
    )
  }, [bookings])

  const percentage = (totalGuests / boat.capacity) * 100
  const isOverCapacity = totalGuests > boat.capacity
  const isFullCapacity = totalGuests === boat.capacity
  const isUnderCapacity = totalGuests < boat.capacity && totalGuests > 0
  const isNearCapacity = percentage >= 80 && percentage <= 100
  const canLock = !isOverCapacity

  const selectedProgram = programs.find(p => p.id === selectedProgramId)
  const selectedGuide = guides.find(g => g.id === selectedGuideId)
  const selectedRestaurant = restaurants.find(r => r.id === selectedRestaurantId)

  // Background color based on capacity status
  const getCapacityBackground = () => {
    if (isOverCapacity) return "bg-red-100 dark:bg-red-900/40"
    if (isFullCapacity) return "bg-green-100 dark:bg-green-900/40"
    if (isUnderCapacity) return "bg-amber-50 dark:bg-amber-900/20"
    return "bg-slate-50 dark:bg-slate-900/30"
  }

  const bookingIds = useMemo(() => bookings.map(b => b.id), [bookings])

  // Combine refs
  const setRefs = (node: HTMLDivElement | null) => {
    setSortableRef(node)
    setDroppableRef(node)
  }

  const handleSwap = (targetPosition: number) => {
    onSwapPosition(position, targetPosition)
  }

  return (
    <div className="flex flex-col">
      <ColumnPositionSelector
        position={position}
        totalColumns={totalColumns}
        onSwap={handleSwap}
      />
      <Card
        ref={setRefs}
        style={style}
        className={cn(
          'w-[280px] flex-shrink-0 flex flex-col h-full transition-all',
          getCapacityBackground(),
          isOver && !isLocked && 'ring-2 ring-primary',
          isLocked && 'opacity-80',
          isColumnDragging && 'opacity-50 shadow-2xl z-50'
        )}
      >
        <CardHeader className="p-2 pb-1.5 space-y-1.5">
          {/* Boat Name & Drag Handle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <div 
                {...attributes} 
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground"
              >
                <GripVertical className="h-4 w-4" />
              </div>
              <CardTitle className="text-base font-semibold flex items-center gap-1.5 truncate">
                <Anchor className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{boat.name}</span>
              </CardTitle>
            </div>
            {!isLocked && bookings.length === 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-muted-foreground hover:text-destructive flex-shrink-0"
                onClick={() => onRemoveBoat(boat.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Capacity Indicator */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Badge
                    variant={isOverCapacity ? 'destructive' : isNearCapacity ? 'warning' : 'secondary'}
                    className="font-mono text-sm cursor-default h-7 px-2.5"
                  >
                    {isOverCapacity && <AlertTriangle className="h-4 w-4 mr-1" />}
                    <Users className="h-4 w-4 mr-1" />
                    {totalGuests}/{boat.capacity}
                  </Badge>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {isOverCapacity 
                  ? `Over capacity by ${totalGuests - boat.capacity}! Cannot lock.`
                  : `${boat.capacity - totalGuests} slots remaining`
                }
              </TooltipContent>
            </Tooltip>

            <span className="text-sm text-muted-foreground">
              {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
            </span>

            {/* Capacity Progress Bar */}
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all",
                  isOverCapacity ? "bg-destructive" : isNearCapacity ? "bg-warning" : "bg-primary"
                )}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex-1">
                  <Button
                    variant={isLocked ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "w-full h-6 text-[10px]", 
                      isLocked && "bg-green-600 hover:bg-green-700",
                      !canLock && !isLocked && "opacity-50"
                    )}
                    onClick={() => onToggleLock(boat.id)}
                    disabled={!canLock && !isLocked}
                  >
                    {isLocked ? (
                      <>
                        <Lock className="h-2.5 w-2.5 mr-1" />
                        Locked
                      </>
                    ) : (
                      <>
                        <Unlock className="h-2.5 w-2.5 mr-1" />
                        Lock
                      </>
                    )}
                  </Button>
                </span>
              </TooltipTrigger>
              {!canLock && !isLocked && (
                <TooltipContent>Cannot lock - over capacity</TooltipContent>
              )}
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => onDownloadPdf(boat.id)}
                  disabled={bookings.length === 0}
                >
                  <FileDown className="h-2.5 w-2.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download PDF</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => onCopyText(boat.id)}
                  disabled={bookings.length === 0}
                >
                  <Copy className="h-2.5 w-2.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy Text</TooltipContent>
            </Tooltip>
          </div>

          {/* Program, Guide & Restaurant Selectors */}
          <div className="space-y-2 pt-2 border-t">
            {/* Program Selector */}
            <Select
              value={selectedProgramId || 'none'}
              onValueChange={(v) => onProgramChange(boat.id, v === 'none' ? null : v)}
              disabled={isLocked}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select program..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select Program</SelectItem>
                {programs.map(program => (
                  <SelectItem key={program.id} value={program.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: program.color || '#6b7280' }}
                      />
                      <span>{program.nickname || program.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Guide Selector */}
            <Select
              value={selectedGuideId || 'none'}
              onValueChange={(v) => onGuideChange(boat.id, v === 'none' ? null : v)}
              disabled={isLocked}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select guide..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No guide</SelectItem>
                {guides.map(guide => (
                  <SelectItem key={guide.id} value={guide.id}>
                    {guide.name}
                    {guide.nickname && ` (${guide.nickname})`}
                    {guide.languages && guide.languages.length > 0 && (
                      <span className="text-muted-foreground ml-1">
                        - {guide.languages.slice(0, 2).join(', ')}
                        {guide.languages.length > 2 && '...'}
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Restaurant Selector */}
            <Select
              value={selectedRestaurantId || 'none'}
              onValueChange={(v) => onRestaurantChange(boat.id, v === 'none' ? null : v)}
              disabled={isLocked}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select restaurant..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No restaurant</SelectItem>
                {restaurants.map(restaurant => (
                  <SelectItem key={restaurant.id} value={restaurant.id}>
                    {restaurant.name}
                    {restaurant.location && (
                      <span className="text-muted-foreground ml-1">
                        - {restaurant.location}
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-1.5 pt-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full pr-1">
            <SortableContext items={bookingIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-1.5">
                {bookings.length === 0 ? (
                  <div className={cn(
                    "border-2 border-dashed rounded-lg p-3 text-center text-xs text-muted-foreground",
                    isOver && !isLocked && "border-primary bg-primary/5"
                  )}>
                    {isLocked ? "Boat is locked" : selectedProgramId ? "Drag customers from this program" : "Drag customers here"}
                  </div>
                ) : (
                  bookings.map((booking) => (
                    <CustomerCard key={booking.id} booking={booking} isLocked={isLocked} />
                  ))
                )}
              </div>
            </SortableContext>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

// Constants for pagination
const ITEMS_PER_PAGE = 20

// Unassigned Column - groups by program with load more pagination
interface UnassignedColumnProps {
  columnId: string
  bookings: BoatBooking[]
  programs: Program[]
  position: number
  totalColumns: number
  onSwapPosition: (currentPosition: number, targetPosition: number) => void
}

export function UnassignedColumn({
  columnId,
  bookings,
  programs,
  position,
  totalColumns,
  onSwapPosition,
}: UnassignedColumnProps) {
  // Track visible count per program for load more functionality
  const [visibleCountByProgram, setVisibleCountByProgram] = useState<Record<string, number>>({})

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging: isColumnDragging,
  } = useSortable({
    id: columnId,
    data: { type: 'column' },
  })

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: columnId,
    data: {
      type: 'unassigned',
      boatId: 'unassigned',
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Group bookings by program
  const bookingsByProgram = useMemo(() => {
    const grouped: Record<string, { program: Program | null; bookings: BoatBooking[] }> = {}
    
    bookings.forEach(booking => {
      const programId = booking.program_id
      if (!grouped[programId]) {
        const program = programs.find(p => p.id === programId) || null
        grouped[programId] = { program, bookings: [] }
      }
      grouped[programId].bookings.push(booking)
    })

    return Object.values(grouped).sort((a, b) => {
      const nameA = a.program?.name || 'Unknown'
      const nameB = b.program?.name || 'Unknown'
      return nameA.localeCompare(nameB)
    })
  }, [bookings, programs])

  const totalGuests = useMemo(() => {
    return bookings.reduce((sum, b) => 
      sum + (b.adults || 0) + (b.children || 0) + (b.infants || 0), 0
    )
  }, [bookings])

  // Get visible bookings for each program (with load more)
  const getVisibleBookings = (programId: string, allBookings: BoatBooking[]) => {
    const visibleCount = visibleCountByProgram[programId] || ITEMS_PER_PAGE
    return allBookings.slice(0, visibleCount)
  }

  // Get IDs for only visible bookings (for SortableContext)
  const visibleBookingIds = useMemo(() => {
    const ids: string[] = []
    bookingsByProgram.forEach(({ program, bookings: programBookings }) => {
      const programId = program?.id || 'unknown'
      const visibleCount = visibleCountByProgram[programId] || ITEMS_PER_PAGE
      programBookings.slice(0, visibleCount).forEach(b => ids.push(b.id))
    })
    return ids
  }, [bookingsByProgram, visibleCountByProgram])

  const handleLoadMore = (programId: string) => {
    setVisibleCountByProgram(prev => ({
      ...prev,
      [programId]: (prev[programId] || ITEMS_PER_PAGE) + ITEMS_PER_PAGE,
    }))
  }

  // Combine refs
  const setRefs = (node: HTMLDivElement | null) => {
    setSortableRef(node)
    setDroppableRef(node)
  }

  const handleSwap = (targetPosition: number) => {
    onSwapPosition(position, targetPosition)
  }

  return (
    <div className="flex flex-col">
      <ColumnPositionSelector
        position={position}
        totalColumns={totalColumns}
        onSwap={handleSwap}
      />
      <Card
        ref={setRefs}
        style={style}
        className={cn(
          'w-[280px] flex-shrink-0 flex flex-col h-full transition-all',
          'border-2 border-foreground',
          'bg-blue-100 dark:bg-blue-900/40',
          isOver && 'ring-2 ring-primary',
          isColumnDragging && 'opacity-50 shadow-2xl z-50'
        )}
      >
        <CardHeader className="p-2 pb-1.5 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <div 
                {...attributes} 
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground"
              >
                <GripVertical className="h-4 w-4" />
              </div>
              <CardTitle className="text-base font-semibold flex items-center gap-1.5">
                <Users className="h-4 w-4 text-muted-foreground" />
                Unassigned
              </CardTitle>
            </div>
            <Badge variant="secondary" className="font-mono text-sm h-7 px-2.5">
              {bookings.length}
            </Badge>
          </div>
          <Badge variant="outline" className="w-fit text-sm h-7 px-2.5">
            <Users className="h-4 w-4 mr-1.5" />
            {totalGuests} guests
          </Badge>
        </CardHeader>

        <CardContent className="p-1.5 pt-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full pr-1">
            <SortableContext items={visibleBookingIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {bookingsByProgram.length === 0 ? (
                  <div className="border-2 border-dashed rounded-lg p-4 text-center text-xs text-muted-foreground">
                    All customers assigned!
                  </div>
                ) : (
                  bookingsByProgram.map(({ program, bookings: programBookings }) => {
                    const programId = program?.id || 'unknown'
                    const programGuests = programBookings.reduce((sum, b) => 
                      sum + (b.adults || 0) + (b.children || 0) + (b.infants || 0), 0
                    )
                    const visibleBookings = getVisibleBookings(programId, programBookings)
                    const hasMore = visibleBookings.length < programBookings.length
                    const remainingCount = programBookings.length - visibleBookings.length

                    return (
                      <div key={programId} className="space-y-1.5">
                        {/* Program Header */}
                        <div 
                          className="flex items-center gap-1.5 sticky top-0 py-1 px-1.5 rounded z-10"
                          style={{ 
                            backgroundColor: program?.color ? `${program.color}20` : '#6b728020',
                            borderLeft: `3px solid ${program?.color || '#6b7280'}`
                          }}
                        >
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: program?.color || '#6b7280' }}
                          />
                          <span className="text-[10px] font-medium truncate flex-1">
                            {program?.nickname || program?.name || 'Unknown'}
                          </span>
                          <Badge variant="outline" className="text-[9px] h-4 px-1">
                            {visibleBookings.length}/{programBookings.length} ({programGuests} pax)
                          </Badge>
                        </div>
                        
                        {/* Program Bookings - only visible ones */}
                        {visibleBookings.map((booking) => (
                          <CustomerCard key={booking.id} booking={booking} />
                        ))}

                        {/* Load More Button */}
                        {hasMore && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => handleLoadMore(programId)}
                          >
                            <ChevronDown className="h-3 w-3 mr-1" />
                            Load {Math.min(remainingCount, ITEMS_PER_PAGE)} more ({remainingCount} remaining)
                          </Button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </SortableContext>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
