"use client"

import * as React from "react"
import { Button } from "@/components/base/buttons/button"
import {
  today,
  getLocalTimeZone,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "@internationalized/date"
import type { DateValue } from "@internationalized/date"

export interface RangePresetButtonProps {
  onSelect: (range: { start: DateValue; end: DateValue }) => void
  preset: "today" | "thisWeek" | "thisMonth" | "last7Days" | "last30Days"
  children: React.ReactNode
}

export function RangePresetButton({
  onSelect,
  preset,
  children,
}: RangePresetButtonProps) {
  const handleClick = () => {
    const now = today(getLocalTimeZone())
    let range: { start: DateValue; end: DateValue }

    switch (preset) {
      case "today":
        range = { start: now, end: now }
        break
      case "thisWeek":
        range = {
          start: startOfWeek(now, "en-US"),
          end: endOfWeek(now, "en-US"),
        }
        break
      case "thisMonth":
        range = {
          start: startOfMonth(now),
          end: endOfMonth(now),
        }
        break
      case "last7Days":
        range = {
          start: now.subtract({ days: 7 }),
          end: now,
        }
        break
      case "last30Days":
        range = {
          start: now.subtract({ days: 30 }),
          end: now,
        }
        break
      default:
        return
    }

    onSelect(range)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onPress={handleClick}
      className="h-8"
    >
      {children}
    </Button>
  )
}







