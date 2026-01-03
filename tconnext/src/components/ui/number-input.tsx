"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  allowEmpty?: boolean
  emptyValue?: number
  decimal?: boolean
  decimalPlaces?: number
}

/**
 * A number input that allows proper editing with backspace/delete.
 * The value can be temporarily empty while editing, and converts to a number on blur.
 */
const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, value, onChange, min, max, allowEmpty = true, emptyValue = 0, decimal = false, decimalPlaces = 2, onBlur, onFocus, ...props }, ref) => {
    // Internal string state to allow empty values while editing
    const [internalValue, setInternalValue] = React.useState<string>(String(value))
    const [isFocused, setIsFocused] = React.useState(false)

    // Sync internal value when external value changes (and not focused)
    React.useEffect(() => {
      if (!isFocused) {
        setInternalValue(String(value))
      }
    }, [value, isFocused])

    const parseNumber = (str: string): number => {
      return decimal ? parseFloat(str) : parseInt(str, 10)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value

      // Allow empty string
      if (newValue === '') {
        setInternalValue('')
        return
      }

      // Allow negative sign at start
      if (newValue === '-') {
        setInternalValue('-')
        return
      }

      // Allow decimal point for decimal mode
      if (decimal && (newValue === '.' || newValue === '-.')) {
        setInternalValue(newValue)
        return
      }

      // Validate the input format
      const pattern = decimal ? /^-?\d*\.?\d*$/ : /^-?\d*$/
      if (!pattern.test(newValue)) {
        return
      }

      setInternalValue(newValue)

      // Update parent immediately if it's a valid number
      const parsed = parseNumber(newValue)
      if (!isNaN(parsed)) {
        let finalValue = parsed
        if (min !== undefined && finalValue < min) finalValue = min
        if (max !== undefined && finalValue > max) finalValue = max
        onChange(finalValue)
      }
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false)
      
      // Convert empty or invalid to emptyValue
      let finalValue = parseNumber(internalValue)
      if (isNaN(finalValue)) {
        finalValue = emptyValue
      }
      
      // Apply min/max constraints
      if (min !== undefined && finalValue < min) finalValue = min
      if (max !== undefined && finalValue > max) finalValue = max
      
      // Format the display value
      const displayValue = decimal 
        ? (Number.isInteger(finalValue) ? String(finalValue) : finalValue.toFixed(decimalPlaces))
        : String(finalValue)
      
      setInternalValue(displayValue)
      onChange(finalValue)
      
      onBlur?.(e)
    }

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true)
      // Select all text on focus for easy replacement
      e.target.select()
      onFocus?.(e)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow: backspace, delete, tab, escape, enter, arrows
      const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']
      
      if (allowedKeys.includes(e.key)) {
        return
      }

      // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) {
        return
      }

      // Allow: numbers
      if (/^\d$/.test(e.key)) {
        return
      }

      // Allow minus sign at start only
      if (e.key === '-' && (e.currentTarget.selectionStart === 0 || e.currentTarget.value === '')) {
        return
      }

      // Allow decimal point (only one, only in decimal mode)
      if (decimal && e.key === '.' && !e.currentTarget.value.includes('.')) {
        return
      }

      // Block everything else
      e.preventDefault()
    }

    return (
      <input
        type="text"
        inputMode={decimal ? "decimal" : "numeric"}
        pattern={decimal ? "[0-9]*\\.?[0-9]*" : "[0-9]*"}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        value={internalValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        {...props}
      />
    )
  }
)
NumberInput.displayName = "NumberInput"

export { NumberInput }

