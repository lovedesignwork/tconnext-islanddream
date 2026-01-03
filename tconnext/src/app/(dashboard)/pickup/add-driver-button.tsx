"use client"

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { Plus, Car, Users, Check } from 'lucide-react'
import type { Driver } from '@/types'

interface AddDriverButtonProps {
  availableDrivers: Driver[]
  onAddDriver: (driverId: string) => void
}

export function AddDriverButton({ availableDrivers, onAddDriver }: AddDriverButtonProps) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'button' | 'select'>('button')

  const handleAddClick = () => {
    if (availableDrivers.length === 0) return
    setMode('select')
    setOpen(true)
  }

  const handleSelect = (driverId: string) => {
    onAddDriver(driverId)
    setOpen(false)
    setMode('button')
  }

  const handleCancel = () => {
    setOpen(false)
    setMode('button')
  }

  if (mode === 'button') {
    return (
      <Card className="w-[280px] flex-shrink-0 h-full border-dashed bg-muted/20 hover:bg-muted/40 transition-colors">
        <CardContent className="flex flex-col items-center justify-center h-full p-4">
          <Button
            variant="ghost"
            className="flex flex-col items-center gap-1.5 h-auto py-4 px-6 text-muted-foreground hover:text-foreground"
            onClick={handleAddClick}
            disabled={availableDrivers.length === 0}
          >
            <Plus className="h-6 w-6" />
            <span className="text-xs font-medium">Add Driver List</span>
            {availableDrivers.length === 0 ? (
              <span className="text-[10px]">No more drivers available</span>
            ) : (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                {availableDrivers.length} available
              </Badge>
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-[280px] flex-shrink-0 h-full border-primary/50 bg-primary/5">
      <CardContent className="p-2 h-full flex flex-col">
        <div className="text-xs font-medium mb-1.5 flex items-center gap-1.5">
          <Car className="h-3.5 w-3.5" />
          Select Driver
        </div>
        
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8">
              <Car className="mr-1.5 h-3.5 w-3.5" />
              Choose a driver...
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[260px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search drivers..." className="h-8 text-xs" />
              <CommandList>
                <CommandEmpty>No drivers found.</CommandEmpty>
                <CommandGroup>
                  {availableDrivers.map((driver) => {
                    // Format: Full Name (Nick Name) or just Full Name if no nickname
                    const displayName = driver.nickname && driver.nickname !== driver.name
                      ? `${driver.name} (${driver.nickname})`
                      : driver.name
                    
                    return (
                      <CommandItem
                        key={driver.id}
                        value={`${driver.name} ${driver.nickname || ''}`}
                        onSelect={() => handleSelect(driver.id)}
                        className="cursor-pointer py-1.5"
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-1.5">
                            <Car className="h-3.5 w-3.5 text-muted-foreground" />
                            <div>
                              <div className="text-xs font-medium">
                                {displayName}
                              </div>
                              {driver.vehicle_info && (
                                <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                                  {driver.vehicle_info}
                                </div>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] font-mono h-5 px-1.5">
                            {driver.car_capacity || 4}
                          </Badge>
                        </div>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <div className="mt-auto pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground text-xs h-7"
            onClick={handleCancel}
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

