"use client"

import * as React from "react"
import {
  DateInput as AriaDateInput,
  DateSegment,
  Label,
  FieldError,
  Text,
} from "react-aria-components"
import { cn } from "@/lib/utils"
import type { DateInputProps as AriaDateInputProps } from "react-aria-components"

export interface DateInputProps extends AriaDateInputProps {
  label?: string
  description?: string
  errorMessage?: string
  className?: string
}

export function DateInput({
  label,
  description,
  errorMessage,
  className,
  ...props
}: DateInputProps) {
  return (
    <AriaDateInput
      className={cn(
        "group flex flex-col gap-1",
        className
      )}
      {...props}
    >
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <div className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
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
      </div>
      {description && (
        <Text slot="description" className="text-sm text-muted-foreground">
          {description}
        </Text>
      )}
      <FieldError className="text-sm text-destructive">
        {errorMessage}
      </FieldError>
    </AriaDateInput>
  )
}







