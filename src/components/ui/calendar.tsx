"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  modifiersClassNames,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      weekStartsOn={1}
      className={cn("p-3 bg-slate-50 dark:bg-slate-900", className)}
      classNames={{
        months: "flex gap-4",
        month: "flex flex-col gap-4",
        month_caption: "flex items-center justify-center h-8 relative",
        caption_label: "text-sm font-medium",
        nav: "flex items-center gap-1 absolute inset-x-0 justify-between",
        button_previous: cn(
          "h-7 w-7 bg-transparent p-0 hover:bg-muted rounded-md flex items-center justify-center transition-colors"
        ),
        button_next: cn(
          "h-7 w-7 bg-transparent p-0 hover:bg-muted rounded-md flex items-center justify-center transition-colors"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "text-muted-foreground w-9 font-normal text-xs text-center py-2",
        week: "flex w-full mt-1",
        // Day cell with modifier-based styling for child button
        day: cn(
          "h-9 w-9 text-center text-sm p-0 relative",
          // Full dates - solid red background
          "[&.full>button]:bg-red-500 [&.full>button]:text-white [&.full>button]:hover:bg-red-600",
          // Closed dates - darker gray with strikethrough
          "[&.closed>button]:bg-gray-300 [&.closed>button]:text-gray-600 [&.closed>button]:line-through"
        ),
        day_button: cn(
          "h-9 w-9 p-0 font-normal rounded-md hover:bg-accent hover:text-accent-foreground transition-colors inline-flex items-center justify-center cursor-pointer"
        ),
        selected:
          "bg-primary text-primary-foreground rounded-md hover:bg-primary hover:text-primary-foreground",
        today: "bg-accent text-accent-foreground font-semibold",
        outside:
          "text-muted-foreground/40 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        disabled: "text-muted-foreground/40 cursor-not-allowed",
        range_start: "bg-primary text-primary-foreground rounded-md",
        range_end: "bg-primary text-primary-foreground rounded-md",
        range_middle:
          "bg-accent rounded-none",
        hidden: "invisible",
        ...classNames,
      }}
      modifiersClassNames={modifiersClassNames}
      components={{
        Chevron: ({ orientation }) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight
          return <Icon className="h-4 w-4" />
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
