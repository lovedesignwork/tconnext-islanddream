"use client"

import { useState, useRef, useEffect } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { 
  Car, 
  Lock, 
  Unlock, 
  FileDown, 
  Copy, 
  Users,
  AlertTriangle,
  X,
  GripVertical
} from 'lucide-react'
import { CustomerCard, type PickupBooking } from './customer-card'
import { getAreaColorClasses } from './area-colors'
import type { Driver } from '@/types'

// Column position selector component for swapping columns by number
interface ColumnPositionSelectorProps {
  position: number
  totalColumns: number
  onSwap: (targetPosition: number) => void
}

export function ColumnPositionSelector({ 
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
    // Only allow numbers
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

interface DriverColumnProps {
  driver: Driver
  bookings: PickupBooking[]
  isLocked: boolean
  columnId: string
  position: number
  totalColumns: number
  onToggleLock: (driverId: string) => void
  onDownloadPdf: (driverId: string) => void
  onCopyText: (driverId: string) => void
  onRemoveDriver: (driverId: string) => void
  onSwapPosition: (currentPosition: number, targetPosition: number) => void
}

export function DriverColumn({
  driver,
  bookings,
  isLocked,
  columnId,
  position,
  totalColumns,
  onToggleLock,
  onDownloadPdf,
  onCopyText,
  onRemoveDriver,
  onSwapPosition,
}: DriverColumnProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: columnId,
    data: { type: 'column', driverId: driver.id },
  })

  const { setNodeRef: setDroppableNodeRef, isOver } = useDroppable({
    id: `driver-${driver.id}`,
    data: { type: 'column', driverId: driver.id },
    disabled: isLocked,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const capacity = driver.car_capacity || 4
  const usedSlots = bookings.reduce((sum, b) => 
    sum + (b.adults || 0) + (b.children || 0) + (b.infants || 0), 0
  )
  const percentage = (usedSlots / capacity) * 100
  const isOverCapacity = usedSlots > capacity
  const isFullCapacity = usedSlots === capacity
  const isUnderCapacity = usedSlots < capacity && usedSlots > 0
  const isNearCapacity = percentage >= 80 && percentage <= 100
  const canLock = !isOverCapacity

  // Background color based on capacity status
  const getCapacityBackground = () => {
    if (isOverCapacity) return "bg-red-100 dark:bg-red-900/40" // Light red for over capacity
    if (isFullCapacity) return "bg-green-100 dark:bg-green-900/40" // Light green for full
    if (isUnderCapacity) return "bg-amber-100 dark:bg-amber-900/40" // Light yellow/amber for under capacity
    return "bg-slate-50 dark:bg-slate-900/30" // Empty/no bookings
  }

  // Group bookings by area
  const groupedBookings = bookings.reduce((acc, booking) => {
    const area = booking.hotel?.area || 'Other'
    if (!acc[area]) acc[area] = []
    acc[area].push(booking)
    return acc
  }, {} as Record<string, PickupBooking[]>)

  const sortedAreas = Object.keys(groupedBookings).sort((a, b) => {
    if (a === 'Other') return 1
    if (b === 'Other') return -1
    return a.localeCompare(b)
  })

  const bookingIds = bookings.map(b => b.id)

  // Combine refs
  const setRefs = (node: HTMLDivElement | null) => {
    setSortableNodeRef(node)
    setDroppableNodeRef(node)
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
          "w-[280px] flex-shrink-0 flex flex-col h-full transition-all",
          getCapacityBackground(),
          isOver && !isLocked && "ring-2 ring-primary",
          isLocked && "opacity-80",
          isDragging && "opacity-50 shadow-2xl z-50"
        )}
      >
        <CardHeader className="p-2 pb-1.5 space-y-1.5">
          {/* Driver Name & Drag Handle */}
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <div 
              {...attributes} 
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground"
            >
              <GripVertical className="h-4 w-4" />
            </div>
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5 truncate">
              <Car className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="truncate">
                {driver.nickname ? `${driver.name} (${driver.nickname})` : driver.name}
              </span>
            </CardTitle>
          </div>
          {!isLocked && bookings.length === 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground hover:text-destructive flex-shrink-0"
              onClick={() => onRemoveDriver(driver.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Capacity Indicator */}
        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Badge
                  variant={isOverCapacity ? 'destructive' : isNearCapacity ? 'warning' : 'secondary'}
                  className="font-mono text-[10px] cursor-default h-5 px-1.5"
                >
                  {isOverCapacity && <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />}
                  {usedSlots}/{capacity} slots
                </Badge>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {isOverCapacity 
                ? `Over capacity by ${usedSlots - capacity} slots! Cannot lock.`
                : `${capacity - usedSlots} slots remaining`
              }
            </TooltipContent>
          </Tooltip>

          {/* Capacity Progress Bar */}
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
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
                  onClick={() => onToggleLock(driver.id)}
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
                onClick={() => onDownloadPdf(driver.id)}
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
                onClick={() => onCopyText(driver.id)}
                disabled={bookings.length === 0}
              >
                <Copy className="h-2.5 w-2.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy Text</TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>

      <CardContent className="p-1.5 pt-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full pr-1">
          <SortableContext items={bookingIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {bookings.length === 0 ? (
                <div className={cn(
                  "border-2 border-dashed rounded-lg p-3 text-center text-xs text-muted-foreground",
                  isOver && !isLocked && "border-primary bg-primary/5"
                )}>
                  {isLocked ? "List is locked" : "Drag customers here"}
                </div>
              ) : (
                sortedAreas.map(area => (
                  <div key={area} className="space-y-1.5">
                    <div className="flex items-center gap-1 sticky top-0 py-0.5 z-10">
                      <Badge className={cn("text-[9px] h-4 px-1 border", getAreaColorClasses(area))}>
                        {area}
                      </Badge>
                    </div>
                    {groupedBookings[area].map(booking => (
                      <CustomerCard 
                        key={booking.id} 
                        booking={booking}
                        isLocked={isLocked}
                      />
                    ))}
                  </div>
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

// Unassigned column (special case without driver)
interface UnassignedColumnProps {
  bookings: PickupBooking[]
  groupByArea?: boolean
  columnId: string
  position: number
  totalColumns: number
  onSwapPosition: (currentPosition: number, targetPosition: number) => void
}

export function UnassignedColumn({ 
  bookings, 
  groupByArea = true, 
  columnId,
  position,
  totalColumns,
  onSwapPosition,
}: UnassignedColumnProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: columnId,
    data: { type: 'column', driverId: 'unassigned' },
  })

  const { setNodeRef: setDroppableNodeRef, isOver } = useDroppable({
    id: 'unassigned',
    data: { type: 'column', driverId: 'unassigned' },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const totalGuests = bookings.reduce((sum, b) => 
    sum + (b.adults || 0) + (b.children || 0) + (b.infants || 0), 0
  )

  // Group bookings by area
  const groupedBookings = groupByArea ? bookings.reduce((acc, booking) => {
    const area = booking.hotel?.area || 'Other'
    if (!acc[area]) acc[area] = []
    acc[area].push(booking)
    return acc
  }, {} as Record<string, PickupBooking[]>) : { 'All': bookings }

  // Sort areas alphabetically, but keep "Other" at the end
  const sortedAreas = Object.keys(groupedBookings).sort((a, b) => {
    if (a === 'Other') return 1
    if (b === 'Other') return -1
    return a.localeCompare(b)
  })

  const allBookingIds = bookings.map(b => b.id)

  // Combine refs
  const setRefs = (node: HTMLDivElement | null) => {
    setSortableNodeRef(node)
    setDroppableNodeRef(node)
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
          "w-[280px] flex-shrink-0 flex flex-col h-full transition-all",
          "border-2 border-foreground",
          "bg-blue-100 dark:bg-blue-900/40", // Light blue for unassigned
          isOver && "ring-2 ring-primary",
          isDragging && "opacity-50 shadow-2xl z-50"
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
              <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
              Unassigned
            </CardTitle>
          </div>
          <Badge variant="secondary" className="font-mono text-[10px] h-5 px-1.5">
            {bookings.length}
          </Badge>
        </div>
        <Badge variant="outline" className="w-fit text-[10px] h-5 px-1.5">
          <Users className="h-2.5 w-2.5 mr-1" />
          {totalGuests} guests
        </Badge>
      </CardHeader>

      <CardContent className="p-1.5 pt-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full pr-1">
          <SortableContext items={allBookingIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {sortedAreas.map(area => (
                <div key={area} className="space-y-1.5">
                  {groupByArea && (
                    <div className="flex items-center gap-1 sticky top-0 py-0.5 z-10">
                      <Badge className={cn("text-[9px] h-4 px-1 border", getAreaColorClasses(area))}>
                        {area}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        ({groupedBookings[area].length})
                      </span>
                    </div>
                  )}
                  {groupedBookings[area].map(booking => (
                    <CustomerCard 
                      key={booking.id} 
                      booking={booking}
                    />
                  ))}
                </div>
              ))}
              {bookings.length === 0 && (
                <div className="border-2 border-dashed rounded-lg p-4 text-center text-xs text-muted-foreground">
                  No unassigned customers
                </div>
              )}
            </div>
          </SortableContext>
        </ScrollArea>
      </CardContent>
      </Card>
    </div>
  )
}
