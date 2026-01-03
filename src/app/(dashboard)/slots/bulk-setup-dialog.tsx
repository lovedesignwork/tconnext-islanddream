"use client"

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import {
  format,
  eachDayOfInterval,
  getDay,
  isAfter,
  isBefore,
  startOfDay,
} from 'date-fns'
import { CalendarIcon, Settings2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Program } from '@/types'

interface BulkSetupDialogProps {
  programs: Program[]
  onClose: () => void
}

const WEEKDAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

export function BulkSetupDialog({ programs, onClose }: BulkSetupDialogProps) {
  const { user } = useAuth()
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6])
  const [totalSlots, setTotalSlots] = useState(50)
  const [isOpen, setIsOpen] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const toggleProgram = (programId: string) => {
    setSelectedPrograms(prev =>
      prev.includes(programId)
        ? prev.filter(id => id !== programId)
        : [...prev, programId]
    )
  }

  const selectAllPrograms = () => {
    if (selectedPrograms.length === programs.length) {
      setSelectedPrograms([])
    } else {
      setSelectedPrograms(programs.map(p => p.id))
    }
  }

  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    )
  }

  // Calculate affected dates
  const affectedDates = useMemo(() => {
    if (!dateFrom || !dateTo) return []
    
    const start = startOfDay(dateFrom)
    const end = startOfDay(dateTo)
    
    if (isAfter(start, end)) return []
    
    const allDays = eachDayOfInterval({ start, end })
    return allDays.filter(day => selectedDays.includes(getDay(day)))
  }, [dateFrom, dateTo, selectedDays])

  const totalChanges = affectedDates.length * selectedPrograms.length

  const handleSave = async () => {
    if (!user?.company_id) return
    if (selectedPrograms.length === 0) {
      toast.error('Please select at least one program')
      return
    }
    if (affectedDates.length === 0) {
      toast.error('No dates match your selection criteria')
      return
    }

    setSaving(true)
    const supabase = createClient()

    try {
      // Build upsert data
      const upsertData = []
      
      for (const programId of selectedPrograms) {
        for (const date of affectedDates) {
          upsertData.push({
            program_id: programId,
            date: format(date, 'yyyy-MM-dd'),
            total_slots: totalSlots,
            is_open: isOpen,
          })
        }
      }

      // Batch upsert in chunks of 100
      const chunkSize = 100
      for (let i = 0; i < upsertData.length; i += chunkSize) {
        const chunk = upsertData.slice(i, i + chunkSize)
        const { error } = await supabase
          .from('program_availability')
          .upsert(chunk, {
            onConflict: 'program_id,date',
          })

        if (error) throw error
      }

      toast.success(`Updated ${totalChanges} slot configurations`)
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'Failed to apply bulk setup')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Bulk Slot Setup
          </DialogTitle>
          <DialogDescription>
            Configure slots for multiple programs and dates at once. Select programs, date range, and days of the week to apply settings.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Program Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Select Programs</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAllPrograms}
                className="h-8"
              >
                {selectedPrograms.length === programs.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {programs.map(program => (
                <div
                  key={program.id}
                  onClick={() => toggleProgram(program.id)}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors',
                    selectedPrograms.includes(program.id)
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-muted'
                  )}
                >
                  <Checkbox
                    checked={selectedPrograms.includes(program.id)}
                    onCheckedChange={() => toggleProgram(program.id)}
                  />
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: (program as any).color || '#3B82F6' }}
                  />
                  <span className="text-sm truncate" title={program.name}>{program.nickname || program.name}</span>
                </div>
              ))}
            </div>
            {selectedPrograms.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {selectedPrograms.length} program{selectedPrograms.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          <Separator />

          {/* Date Range */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Date Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">From</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !dateFrom && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">To</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !dateTo && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      disabled={(date) => dateFrom ? isBefore(date, dateFrom) : false}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <Separator />

          {/* Days of Week Filter */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Days of Week</Label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map(day => (
                <Button
                  key={day.value}
                  variant={selectedDays.includes(day.value) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleDay(day.value)}
                  className="min-w-[80px]"
                >
                  {day.label.slice(0, 3)}
                </Button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Only dates falling on selected days will be updated
            </p>
          </div>

          <Separator />

          {/* Slot Settings */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Slot Settings</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bulk-slots">Total Slots per Day</Label>
                <NumberInput
                  id="bulk-slots"
                  min={0}
                  value={totalSlots}
                  onChange={setTotalSlots}
                />
              </div>
              <div className="space-y-2">
                <Label>Open for Booking</Label>
                <div className="flex items-center gap-2 h-10">
                  <Switch
                    checked={isOpen}
                    onCheckedChange={setIsOpen}
                  />
                  <span className="text-sm text-muted-foreground">
                    {isOpen ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          {affectedDates.length > 0 && selectedPrograms.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Preview</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    {showPreview ? 'Hide' : 'Show'} Details
                  </Button>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Total changes:</span>
                    <Badge variant="secondary" className="text-base">
                      {totalChanges} slot configurations
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedPrograms.length} program{selectedPrograms.length !== 1 ? 's' : ''} × {affectedDates.length} date{affectedDates.length !== 1 ? 's' : ''}
                  </p>
                  
                  {showPreview && (
                    <ScrollArea className="h-32 mt-3 border rounded-md">
                      <div className="p-2 space-y-1">
                        {affectedDates.slice(0, 20).map(date => (
                          <div
                            key={date.toISOString()}
                            className="flex items-center gap-2 text-xs"
                          >
                            <Check className="h-3 w-3 text-green-600" />
                            <span>{format(date, 'EEE, MMM d, yyyy')}</span>
                          </div>
                        ))}
                        {affectedDates.length > 20 && (
                          <p className="text-xs text-muted-foreground pl-5">
                            ... and {affectedDates.length - 20} more dates
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || selectedPrograms.length === 0 || affectedDates.length === 0}
          >
            {saving ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Applying...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Apply to {totalChanges} Slots
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}



