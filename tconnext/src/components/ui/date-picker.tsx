"use client"

import * as React from "react"
import {
  DatePicker as AriaDatePicker,
  DatePickerProps as AriaDatePickerProps,
  Dialog,
  Popover,
  Button as AriaButton,
} from "react-aria-components"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Calendar } from "./calendar-aria"
import { DateInput } from "./date-input"

export interface DatePickerProps<T extends any> extends AriaDatePickerProps<T> {
  label?: string
  description?: string
  errorMessage?: string
  className?: string
}

export function DatePicker<T extends any>({
  label,
  description,
  errorMessage,
  className,
  ...props
}: DatePickerProps<T>) {
  return (
    <AriaDatePicker
      className={cn(
        "group flex flex-col gap-1",
        className
      )}
      {...props}
    >
      <DateInput label={label} description={description} errorMessage={errorMessage} />
      <AriaButton className="absolute right-2 top-8 h-7 w-7 rounded-md hover:bg-muted flex items-center justify-center">
        <CalendarIcon className="h-4 w-4" />
      </AriaButton>
      <Popover placement="bottom start">
        <Dialog>
          <Calendar />
        </Dialog>
      </Popover>
    </AriaDatePicker>
  )
}







