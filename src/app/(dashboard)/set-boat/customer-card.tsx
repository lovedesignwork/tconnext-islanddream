"use client"

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Users, Hotel, MapPin } from 'lucide-react'
import type { Booking, Program, Hotel as HotelType } from '@/types'

export interface BoatBooking extends Booking {
  program?: Program | null
  hotel?: HotelType | null
  pendingBoatId?: string | null
}

interface CustomerCardProps {
  booking: BoatBooking
  isDragging?: boolean
  isLocked?: boolean
}

export function CustomerCard({ booking, isDragging, isLocked }: CustomerCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: booking.id,
    data: {
      type: 'booking',
      booking,
      boatId: booking.pendingBoatId,
    },
    disabled: isLocked,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const totalGuests = (booking.adults || 0) + (booking.children || 0) + (booking.infants || 0)
  const programColor = booking.program?.color || '#6b7280'

  if (isSortableDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="h-[60px] rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30"
      />
    )
  }

  return (
    <Card
      ref={setNodeRef}
      style={{
        ...style,
        borderLeftColor: programColor,
        borderLeftWidth: '4px',
      }}
      {...(isLocked ? {} : { ...attributes, ...listeners })}
      className={cn(
        'transition-all w-full',
        isLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-50 shadow-lg scale-105'
      )}
    >
      <CardContent 
        className="p-3"
        style={{ backgroundColor: `${programColor}10` }}
      >
        <div className="space-y-1.5">
          {/* Customer name and guest count */}
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-base leading-tight flex-1">{booking.customer_name}</p>
            <Badge 
              variant="secondary" 
              className="shrink-0 text-sm h-6 px-2 flex items-center gap-1"
            >
              <Users className="h-4 w-4" />
              {totalGuests}
            </Badge>
          </div>
          
          {/* Hotel/Location */}
          <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
            {booking.hotel ? (
              <>
                <Hotel className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-tight">{booking.hotel.name}</span>
              </>
            ) : booking.custom_pickup_location ? (
              <>
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-tight">{booking.custom_pickup_location}</span>
              </>
            ) : null}
          </div>

          {/* Program name */}
          <div className="flex items-center gap-1">
            <div 
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: programColor }}
            />
            <span className="text-[10px] text-muted-foreground">
              {booking.program?.nickname || booking.program?.name || 'Unknown'}
            </span>
          </div>

          {/* Remark - only show if exists */}
          {booking.notes && (
            <div className="text-[13px] text-foreground border-t pt-1 mt-1">
              {booking.notes}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function CustomerCardOverlay({ booking }: { booking: BoatBooking }) {
  const totalGuests = (booking.adults || 0) + (booking.children || 0) + (booking.infants || 0)
  const programColor = booking.program?.color || '#6b7280'

  return (
    <Card 
      className="w-[260px] shadow-xl rotate-3 cursor-grabbing"
      style={{
        borderLeftColor: programColor,
        borderLeftWidth: '4px',
      }}
    >
      <CardContent 
        className="p-3"
        style={{ backgroundColor: `${programColor}10` }}
      >
        <div className="space-y-1.5">
          {/* Customer name and guest count */}
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-base leading-tight flex-1">{booking.customer_name}</p>
            <Badge 
              variant="secondary" 
              className="shrink-0 text-sm h-6 px-2 flex items-center gap-1"
            >
              <Users className="h-4 w-4" />
              {totalGuests}
            </Badge>
          </div>
          
          {/* Hotel/Location */}
          <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
            {booking.hotel ? (
              <>
                <Hotel className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-tight">{booking.hotel.name}</span>
              </>
            ) : booking.custom_pickup_location ? (
              <>
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-tight">{booking.custom_pickup_location}</span>
              </>
            ) : null}
          </div>

          {/* Program name */}
          <div className="flex items-center gap-1">
            <div 
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: programColor }}
            />
            <span className="text-[10px] text-muted-foreground">
              {booking.program?.nickname || booking.program?.name || 'Unknown'}
            </span>
          </div>

          {/* Remark - only show if exists */}
          {booking.notes && (
            <div className="text-[13px] text-foreground border-t pt-1 mt-1">
              {booking.notes}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
