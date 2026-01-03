"use client"

import * as React from "react"
import {
  Calendar as AriaCalendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  Heading,
  Button,
  useLocale,
} from "react-aria-components"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CalendarProps as AriaCalendarProps } from "react-aria-components"

export interface CalendarProps<T extends any>
  extends Omit<AriaCalendarProps<T>, "visibleDuration"> {
  className?: string
}

export function Calendar<T extends any>({
  className,
  ...props
}: CalendarProps<T>) {
  return (
    <AriaCalendar
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
                  // Focus state
                  "data-[focused]:outline-none data-[focused]:ring-2 data-[focused]:ring-ring data-[focused]:ring-offset-2",
                  // Today
                  renderProps.isToday && "font-semibold text-primary",
                  // Selected
                  renderProps.isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  // Disabled
                  renderProps.isDisabled && "text-muted-foreground/40 cursor-not-allowed",
                  // Outside month
                  renderProps.isOutsideMonth && "text-muted-foreground/40"
                )
              }
            />
          )}
        </CalendarGridBody>
      </CalendarGrid>
    </AriaCalendar>
  )
}
