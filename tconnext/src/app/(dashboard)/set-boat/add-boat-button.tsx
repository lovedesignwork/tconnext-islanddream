"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Anchor, Users, X } from 'lucide-react'
import type { Boat } from '@/types'

interface AddBoatButtonProps {
  availableBoats: Boat[]
  onAddBoat: (boatId: string) => void
}

export function AddBoatButton({ availableBoats, onAddBoat }: AddBoatButtonProps) {
  const [isSelecting, setIsSelecting] = useState(false)

  if (availableBoats.length === 0) {
    return (
      <div className="flex-shrink-0 w-[280px]">
        <Card className="h-full border-dashed bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Anchor className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              All boats are in use
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show inline boat selection when isSelecting is true
  if (isSelecting) {
    return (
      <div className="flex-shrink-0 w-[280px]">
        <Card className="h-full border-primary">
          <CardHeader className="p-2 pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                <Anchor className="h-4 w-4 text-muted-foreground" />
                Select Boat
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={() => setIsSelecting(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-2">
            <Command className="rounded-lg border">
              <CommandInput placeholder="Search boats..." className="h-9" />
              <CommandList>
                <CommandEmpty>No boats found.</CommandEmpty>
                <ScrollArea className="h-[300px]">
                  <CommandGroup>
                    {availableBoats.map((boat) => (
                      <CommandItem
                        key={boat.id}
                        value={boat.name}
                        onSelect={() => {
                          onAddBoat(boat.id)
                          setIsSelecting(false)
                        }}
                        className="flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Anchor className="h-4 w-4" />
                          <span>{boat.name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Users className="h-3 w-3" />
                          {boat.capacity}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </ScrollArea>
              </CommandList>
            </Command>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Default "Add Boat" button state
  return (
    <div className="flex-shrink-0 w-[280px]">
      <Card 
        className="h-full border-dashed cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors"
        onClick={() => setIsSelecting(true)}
      >
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
            <Plus className="h-6 w-6 text-primary" />
          </div>
          <p className="font-medium">Add Boat</p>
          <p className="text-sm text-muted-foreground mt-1">
            {availableBoats.length} available
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
