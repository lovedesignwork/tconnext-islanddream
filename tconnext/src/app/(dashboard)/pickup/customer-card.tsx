"use client"

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Building2, MapPin } from 'lucide-react'
import type { BookingWithRelations, Hotel } from '@/types'
import { getAreaColorClasses } from './area-colors'

export interface PickupBooking extends BookingWithRelations {
  hotel?: Hotel & { area?: string }
  program?: { name: string; nickname?: string | null; color?: string }
  pendingDriverId?: string | null
}

interface CustomerCardProps {
  booking: PickupBooking
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
    disabled: isLocked,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const adults = booking.adults || 0
  const children = booking.children || 0
  const infants = booking.infants || 0
  const totalGuests = adults + children + infants
  const hotelName = booking.hotel?.name || booking.custom_pickup_location || 'Unknown'
  const area = booking.hotel?.area || ''

  const dragging = isDragging || isSortableDragging

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-2.5 cursor-grab active:cursor-grabbing transition-all",
        "bg-card hover:bg-accent/50 border shadow-sm",
        dragging && "opacity-50 shadow-lg ring-2 ring-primary/50 rotate-2",
        isLocked && "cursor-not-allowed opacity-70"
      )}
      {...attributes}
      {...listeners}
    >
      <div className="space-y-1.5">
        {/* Row 1: Customer Name + Pickup Time | Total Guests */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-1">
            <span className="font-semibold text-sm">
              {booking.customer_name}
            </span>
            {booking.pickup_time && (
              <>
                <span className="text-muted-foreground">|</span>
                <span className="font-semibold text-primary text-sm flex-shrink-0">
                  {booking.pickup_time.substring(0, 5)}
                </span>
              </>
            )}
          </div>
          <Badge 
            variant="default" 
            className="flex-shrink-0 text-base font-bold h-7 px-2.5 min-w-[36px] justify-center"
          >
            {totalGuests}
          </Badge>
        </div>

        {/* Row 2: Guest Breakdown (A/C/I) */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">Guests:</span>
          <Badge variant="secondary" className="text-[11px] h-5 px-1.5 font-medium">
            {adults}A
          </Badge>
          {children > 0 && (
            <Badge variant="outline" className="text-[11px] h-5 px-1.5 font-medium">
              {children}C
            </Badge>
          )}
          {infants > 0 && (
            <Badge variant="outline" className="text-[11px] h-5 px-1.5 font-medium text-muted-foreground">
              {infants}I
            </Badge>
          )}
        </div>

        {/* Row 3: Hotel Name + Room Number - Full width, wrapping allowed */}
        <div className="flex items-start gap-1.5">
          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="font-medium text-sm leading-tight">
            {hotelName}
            {booking.room_number && (
              <span className="text-primary"> ({booking.room_number})</span>
            )}
          </div>
        </div>

        {/* Row 4: Area with colored background + Program */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-dashed">
          {area && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <Badge 
                className={cn(
                  "text-xs font-semibold px-2 py-0.5 border",
                  getAreaColorClasses(area)
                )}
              >
                {area}
              </Badge>
            </div>
          )}
          
          {booking.program && (
            <Badge 
              variant="outline" 
              className="text-[10px] px-1.5 py-0 h-5 max-w-[120px] truncate"
              style={{ borderColor: booking.program.color || '#3B82F6' }}
              title={booking.program.name}
            >
              <span
                className="w-2 h-2 rounded-full mr-1 flex-shrink-0"
                style={{ backgroundColor: booking.program.color || '#3B82F6' }}
              />
              <span className="truncate">{booking.program.nickname || booking.program.name}</span>
            </Badge>
          )}
        </div>
      </div>
    </Card>
  )
}

// Drag overlay version without sortable hooks
export function CustomerCardOverlay({ booking }: { booking: PickupBooking }) {
  const adults = booking.adults || 0
  const children = booking.children || 0
  const infants = booking.infants || 0
  const totalGuests = adults + children + infants
  const hotelName = booking.hotel?.name || booking.custom_pickup_location || 'Unknown'
  const area = booking.hotel?.area || ''

  return (
    <Card className="p-2.5 bg-card border shadow-xl ring-2 ring-primary rotate-3 w-[280px]">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-1">
            <span className="font-semibold text-sm">
              {booking.customer_name}
            </span>
            {booking.pickup_time && (
              <>
                <span className="text-muted-foreground">|</span>
                <span className="font-semibold text-primary text-sm flex-shrink-0">
                  {booking.pickup_time.substring(0, 5)}
                </span>
              </>
            )}
          </div>
          <Badge variant="default" className="flex-shrink-0 text-base font-bold h-7 px-2.5">
            {totalGuests}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <Badge variant="secondary" className="text-[11px] h-5 px-1.5">{adults}A</Badge>
          {children > 0 && <Badge variant="outline" className="text-[11px] h-5 px-1.5">{children}C</Badge>}
          {infants > 0 && <Badge variant="outline" className="text-[11px] h-5 px-1.5">{infants}I</Badge>}
        </div>
        <div className="flex items-start gap-1.5">
          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="font-medium text-sm leading-tight">
            {hotelName}
            {booking.room_number && <span className="text-primary"> ({booking.room_number})</span>}
          </div>
        </div>
        {area && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            <Badge className={cn("text-xs font-semibold px-2 border", getAreaColorClasses(area))}>
              {area}
            </Badge>
          </div>
        )}
      </div>
    </Card>
  )
}

