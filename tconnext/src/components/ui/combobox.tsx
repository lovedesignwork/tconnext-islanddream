"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface ComboboxOption {
  value: string
  label: string
  group?: string
  description?: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onValueChange?: (value: string) => void
  onCreateNew?: (inputValue: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
  groupBy?: boolean
  allowCreate?: boolean
  createLabel?: string
}

export function Combobox({
  options,
  value,
  onValueChange,
  onCreateNew,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  className,
  disabled = false,
  groupBy = false,
  allowCreate = false,
  createLabel = "Add",
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")

  const selectedOption = options.find((option) => option.value === value)

  // Group options by their group property
  const groupedOptions = React.useMemo(() => {
    if (!groupBy) return { "": options }
    
    return options.reduce((acc, option) => {
      const group = option.group || ""
      if (!acc[group]) {
        acc[group] = []
      }
      acc[group].push(option)
      return acc
    }, {} as Record<string, ComboboxOption[]>)
  }, [options, groupBy])

  // Check if the input value matches any existing option
  const hasExactMatch = React.useMemo(() => {
    if (!inputValue.trim()) return true
    return options.some(
      (option) => option.label.toLowerCase() === inputValue.toLowerCase()
    )
  }, [options, inputValue])

  // Check if there are any filtered results
  const hasFilteredResults = React.useMemo(() => {
    if (!inputValue.trim()) return true
    return options.some(
      (option) => option.label.toLowerCase().includes(inputValue.toLowerCase())
    )
  }, [options, inputValue])

  const handleCreateNew = () => {
    if (onCreateNew && inputValue.trim()) {
      onCreateNew(inputValue.trim())
      setInputValue("")
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
          disabled={disabled}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={true}>
          <CommandInput 
            placeholder={searchPlaceholder} 
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            {/* Show create option when allowCreate is enabled and no exact match */}
            {allowCreate && inputValue.trim() && !hasExactMatch && (
              <CommandGroup>
                <CommandItem
                  value={`create-new-${inputValue}`}
                  onSelect={handleCreateNew}
                  className="text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {createLabel} "{inputValue}"
                </CommandItem>
              </CommandGroup>
            )}
            {/* Show empty message only when no results and not creating */}
            {!hasFilteredResults && (!allowCreate || !inputValue.trim()) && (
              <CommandEmpty>{emptyText}</CommandEmpty>
            )}
            {Object.entries(groupedOptions).map(([group, groupOptions]) => (
              <CommandGroup key={group} heading={group || undefined}>
                {groupOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      onValueChange?.(option.value === value ? "" : option.value)
                      setInputValue("")
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      {option.description && (
                        <span className="text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
