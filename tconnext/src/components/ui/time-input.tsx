"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface TimeInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value?: string
  onChange?: (value: string) => void
}

const TimeInput = React.forwardRef<HTMLInputElement, TimeInputProps>(
  ({ className, value = "", onChange, ...props }, ref) => {
    // Parse the time value (HH:MM format) - handle null/undefined/empty string
    const timeValue = value || ""
    const parts = timeValue.split(":")
    const hours = parts[0]?.padStart(2, "0") || "00"
    const minutes = parts[1]?.padStart(2, "0") || "00"
    
    // Local state to track user's input - allow empty values while editing
    const [localHours, setLocalHours] = React.useState(hours)
    const [localMinutes, setLocalMinutes] = React.useState(minutes)
    const [isHoursFocused, setIsHoursFocused] = React.useState(false)
    const [isMinutesFocused, setIsMinutesFocused] = React.useState(false)
    
    // Sync local state when value prop changes (only if not focused)
    React.useEffect(() => {
      if (!isHoursFocused) {
        setLocalHours(hours)
      }
      if (!isMinutesFocused) {
        setLocalMinutes(minutes)
      }
    }, [hours, minutes, isHoursFocused, isMinutesFocused])
    
    const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let newHours = e.target.value.replace(/\D/g, "")
      if (newHours.length > 2) newHours = newHours.slice(-2)
      
      // Allow empty value while editing (backspace/delete)
      if (newHours === "") {
        setLocalHours("")
        return
      }
      
      const numHours = parseInt(newHours, 10)
      if (numHours > 23) newHours = "23"
      setLocalHours(newHours)
    }
    
    const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let newMinutes = e.target.value.replace(/\D/g, "")
      if (newMinutes.length > 2) newMinutes = newMinutes.slice(-2)
      
      // Allow empty value while editing (backspace/delete)
      if (newMinutes === "") {
        setLocalMinutes("")
        return
      }
      
      const numMinutes = parseInt(newMinutes, 10)
      if (numMinutes > 59) newMinutes = "59"
      setLocalMinutes(newMinutes)
    }

    const handleHoursFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsHoursFocused(true)
      e.target.select()
    }

    const handleMinutesFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsMinutesFocused(true)
      e.target.select()
    }

    const handleHoursBlur = () => {
      setIsHoursFocused(false)
      // On blur, default empty to "00" and format properly
      const finalHours = localHours === "" ? "00" : localHours.padStart(2, "0")
      setLocalHours(finalHours)
      onChange?.(`${finalHours}:${localMinutes === "" ? "00" : localMinutes.padStart(2, "0")}`)
    }

    const handleMinutesBlur = () => {
      setIsMinutesFocused(false)
      // On blur, default empty to "00" and format properly
      const finalMinutes = localMinutes === "" ? "00" : localMinutes.padStart(2, "0")
      setLocalMinutes(finalMinutes)
      onChange?.(`${localHours === "" ? "00" : localHours.padStart(2, "0")}:${finalMinutes}`)
    }

    return (
      <div
        className={cn(
          "flex items-center h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          props.disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          maxLength={2}
          value={localHours}
          onChange={handleHoursChange}
          onFocus={handleHoursFocus}
          onBlur={handleHoursBlur}
          placeholder="00"
          className="w-8 bg-transparent text-center outline-none placeholder:text-muted-foreground focus:bg-muted/50 rounded"
          disabled={props.disabled}
        />
        <span className="text-muted-foreground mx-0.5">:</span>
        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          value={localMinutes}
          onChange={handleMinutesChange}
          onFocus={handleMinutesFocus}
          onBlur={handleMinutesBlur}
          placeholder="00"
          className="w-8 bg-transparent text-center outline-none placeholder:text-muted-foreground focus:bg-muted/50 rounded"
          disabled={props.disabled}
        />
      </div>
    )
  }
)
TimeInput.displayName = "TimeInput"

export { TimeInput }

