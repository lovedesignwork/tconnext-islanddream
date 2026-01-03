"use client"

import * as React from "react"
import {
  DateRangePicker as AriaDateRangePicker,
  DateRangePickerProps as AriaDateRangePickerProps,
  Dialog,
  Popover,
  Button as AriaButton,
  Label,
  Group,
  DateInput as AriaDateInput,
  DateSegment,
  FieldError,
  Text,
} from "react-aria-components"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { RangeCalendar } from "./range-calendar"

export interface DateRangePickerProps<T extends any> extends AriaDateRangePickerProps<T> {
  label?: string
  description?: string
  errorMessage?: string
  className?: string
}

export function DateRangePicker<T extends any>({
  label,
  description,
  errorMessage,
  className,
  ...props
}: DateRangePickerProps<T>) {
  return (
    <AriaDateRangePicker
      className={cn(
        "group flex flex-col gap-1",
        className
      )}
      {...props}
    >
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <Group className="relative flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <AriaDateInput slot="start" className="flex">
          {(segment) => (
            <DateSegment
              segment={segment}
              className={cn(
                "px-0.5 tabular-nums outline-none rounded focus:bg-accent focus:text-accent-foreground",
                segment.isEditable ? "cursor-text" : "cursor-default",
                segment.isPlaceholder ? "text-muted-foreground" : ""
              )}
            />
          )}
        </AriaDateInput>
        <span className="mx-2 text-muted-foreground">–</span>
        <AriaDateInput slot="end" className="flex">
          {(segment) => (
            <DateSegment
              segment={segment}
              className={cn(
                "px-0.5 tabular-nums outline-none rounded focus:bg-accent focus:text-accent-foreground",
                segment.isEditable ? "cursor-text" : "cursor-default",
                segment.isPlaceholder ? "text-muted-foreground" : ""
              )}
            />
          )}
        </AriaDateInput>
        <AriaButton className="ml-auto h-7 w-7 rounded-md hover:bg-muted flex items-center justify-center">
          <CalendarIcon className="h-4 w-4" />
        </AriaButton>
      </Group>
      {description && (
        <Text slot="description" className="text-sm text-muted-foreground">
          {description}
        </Text>
      )}
      <FieldError className="text-sm text-destructive">
        {errorMessage}
      </FieldError>
      <Popover placement="bottom start" className="z-50">
        <Dialog className="bg-background border rounded-lg shadow-lg p-0 outline-none">
          <RangeCalendar />
        </Dialog>
      </Popover>
    </AriaDateRangePicker>
  )
}