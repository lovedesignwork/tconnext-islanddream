"use client"

import * as React from "react"
import {
  RangeCalendar as AriaRangeCalendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  Heading,
  Button,
} from "react-aria-components"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { RangeCalendarProps as AriaRangeCalendarProps } from "react-aria-components"

export interface RangeCalendarProps<T extends any>
  extends Omit<AriaRangeCalendarProps<T>, "visibleDuration"> {
  className?: string
}

export function RangeCalendar<T extends any>({
  className,
  ...props
}: RangeCalendarProps<T>) {
  return (
    <AriaRangeCalendar
      className={cn(
        "p-3 space-y-3 bg-background rounded-lg",
        className
      )}
      {...props}
    >
      <header className="flex items-center justify-between">
        <Button
          slot="previous"
          className="h-7 w-7 bg-transparent p-0 hover:bg-muted rounded-md flex items-center justify-center transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Heading className="text-sm font-medium" />
        <Button
          slot="next"
          className="h-7 w-7 bg-transparent p-0 hover:bg-muted rounded-md flex items-center justify-center transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </header>
      <CalendarGrid className="w-full">
        <CalendarGridHeader className="mb-1">
          {(day) => (
            <CalendarHeaderCell className="text-muted-foreground w-9 font-normal text-xs text-center pb-2">
              {day}
            </CalendarHeaderCell>
          )}
        </CalendarGridHeader>
        <CalendarGridBody>
          {(date) => (
            <CalendarCell
              date={date}
              className={(renderProps) =>
                cn(
                  "inline-flex h-9 w-9 items-center justify-center text-sm p-0 relative",
                  "[&:not([data-disabled])]:cursor-pointer",
                  "rounded-md",
                  // Hover state
                  "[&:not([data-disabled])]:hover:bg-accent [&:not([data-disabled])]:hover:text-accent-foreground",
                  // Today
                  renderProps.isToday && "font-semibold text-primary",
                  // Disabled
                  renderProps.isDisabled && "text-muted-foreground/40 cursor-not-allowed",
                  // Outside month
                  renderProps.isOutsideMonth && "text-muted-foreground/40",
                  // Selection states
                  renderProps.isSelectionStart && "bg-primary text-primary-foreground rounded-l-md rounded-r-none",
                  renderProps.isSelectionEnd && "bg-primary text-primary-foreground rounded-r-md rounded-l-none",
                  renderProps.isSelected && !renderProps.isSelectionStart && !renderProps.isSelectionEnd && 
                    "bg-primary/20 rounded-none",
                  renderProps.isSelected && renderProps.isSelectionStart && renderProps.isSelectionEnd &&
                    "bg-primary text-primary-foreground rounded-md"
                )
              }
            />
          )}
        </CalendarGridBody>
      </CalendarGrid>
    </AriaRangeCalendar>
  )
}
