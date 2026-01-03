"use client"

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Save, Users, Baby, UserRound } from 'lucide-react'
import type { Program, ProgramAvailability } from '@/types'

interface BookingStats {
  program_id: string
  activity_date: string
  total_adults: number
  total_children: number
  total_infants: number
}

interface SlotEditDialogProps {
  date: Date
  programs: Program[]
  availability: ProgramAvailability[]
  bookingStats: BookingStats[]
  onClose: () => void
}

interface ProgramSlotForm {
  program_id: string
  total_slots: number
  is_open: boolean
}

export function SlotEditDialog({
  date,
  programs,
  availability,
  bookingStats,
  onClose,
}: SlotEditDialogProps) {
  const { user } = useAuth()
  const dateStr = format(date, 'yyyy-MM-dd')
  
  // Initialize form state from existing availability
  const [formData, setFormData] = useState<ProgramSlotForm[]>(() =>
    programs.map(program => {
      const avail = availability.find(
        a => a.program_id === program.id && a.date === dateStr
      )
      return {
        program_id: program.id,
        total_slots: avail?.total_slots ?? (program as any).default_slots ?? 0,
        is_open: avail?.is_open !== false,
      }
    })
  )
  
  const [saving, setSaving] = useState(false)

  const getBookingStats = (programId: string) => {
    const stats = bookingStats.find(
      s => s.program_id === programId && s.activity_date === dateStr
    )
    return {
      adults: stats?.total_adults || 0,
      children: stats?.total_children || 0,
      infants: stats?.total_infants || 0,
      booked: (stats?.total_adults || 0) + (stats?.total_children || 0),
    }
  }

  const updateFormData = (programId: string, field: keyof ProgramSlotForm, value: number | boolean) => {
    setFormData(prev =>
      prev.map(item =>
        item.program_id === programId ? { ...item, [field]: value } : item
      )
    )
  }

  const handleSave = async () => {
    if (!user?.company_id) return

    setSaving(true)
    const supabase = createClient()

    try {
      // Upsert availability records for each program
      for (const item of formData) {
        const existingAvail = availability.find(
          a => a.program_id === item.program_id && a.date === dateStr
        )

        if (existingAvail) {
          // Update existing
          const { error } = await supabase
            .from('program_availability')
            .update({
              total_slots: item.total_slots,
              is_open: item.is_open,
            })
            .eq('id', existingAvail.id)

          if (error) throw error
        } else {
          // Insert new
          const { error } = await supabase
            .from('program_availability')
            .insert({
              program_id: item.program_id,
              date: dateStr,
              total_slots: item.total_slots,
              is_open: item.is_open,
            })

          if (error) throw error
        }
      }

      toast.success(`Slots updated for ${format(date, 'MMMM d, yyyy')}`)
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save slots')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Slots - {format(date, 'EEEE, MMMM d, yyyy')}</DialogTitle>
          <DialogDescription>
            Configure available slots for each program on this date. Infants are shown but do not count toward slot usage.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 pr-6 space-y-6">
          {programs.map((program, idx) => {
            const formItem = formData.find(f => f.program_id === program.id)!
            const stats = getBookingStats(program.id)
            const available = Math.max(0, formItem.total_slots - stats.booked)
            
            return (
              <div key={program.id}>
                {idx > 0 && <Separator className="mb-6" />}
                <div className="space-y-4">
                  {/* Header: Program name and toggle */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-lg flex items-center gap-2" title={program.name}>
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: (program as any).color || '#3B82F6' }}
                        />
                        {program.nickname || program.name}
                      </h4>
                      {program.duration && (
                        <p className="text-sm text-sky-600 ml-5">{program.duration}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Label htmlFor={`open-${program.id}`} className="text-sm text-muted-foreground">
                        Open for booking
                      </Label>
                      <Switch
                        id={`open-${program.id}`}
                        checked={formItem.is_open}
                        onCheckedChange={(checked) =>
                          updateFormData(program.id, 'is_open', checked)
                        }
                      />
                    </div>
                  </div>

                  {/* Slot Cards Row */}
                  <div className="flex items-start gap-3">
                    {/* Total Slot */}
                    <div className="w-[90px] flex-shrink-0">
                      <p className="text-sm text-muted-foreground mb-2">total slot</p>
                      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-4 text-center">
                        <NumberInput
                          min={0}
                          value={formItem.total_slots}
                          onChange={(value) =>
                            updateFormData(program.id, 'total_slots', value)
                          }
                          disabled={!formItem.is_open}
                          className="!text-[27px] !font-bold text-center !border-0 !bg-transparent !p-0 !h-auto !shadow-none text-gray-900 dark:text-gray-100"
                        />
                      </div>
                    </div>

                    {/* Available */}
                    <div className="w-[90px] flex-shrink-0">
                      <p className="text-sm text-muted-foreground mb-2">available</p>
                      <div className={`rounded-lg px-3 py-4 text-center ${
                        !formItem.is_open 
                          ? 'bg-gray-200 dark:bg-gray-700'
                          : available === 0 
                          ? 'bg-red-100 dark:bg-red-900/50' 
                          : available <= formItem.total_slots * 0.2 
                          ? 'bg-amber-100 dark:bg-amber-900/50' 
                          : 'bg-emerald-200 dark:bg-emerald-900/50'
                      }`}>
                        <span className={`text-[27px] font-bold ${
                          !formItem.is_open
                            ? 'text-gray-500 dark:text-gray-400'
                            : available === 0 
                            ? 'text-red-700 dark:text-red-300' 
                            : available <= formItem.total_slots * 0.2 
                            ? 'text-amber-700 dark:text-amber-300' 
                            : 'text-emerald-700 dark:text-emerald-300'
                        }`}>
                          {formItem.is_open ? available : '-'}
                        </span>
                      </div>
                    </div>

                    {/* Booked */}
                    <div className="w-[90px] flex-shrink-0">
                      <p className="text-sm text-muted-foreground mb-2">booked</p>
                      <div className="bg-yellow-100 dark:bg-yellow-900/50 rounded-lg px-3 py-4 text-center">
                        <span className="text-[27px] font-bold text-yellow-700 dark:text-yellow-300">
                          {stats.booked}
                        </span>
                      </div>
                    </div>

                    {/* Booking Details */}
                    <div className="flex-1 pt-6 pl-2">
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 flex-shrink-0" />
                          <span><span className="font-medium text-foreground">{stats.adults}</span> Adult</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <UserRound className="h-4 w-4 flex-shrink-0" />
                          <span><span className="font-medium text-foreground">{stats.children}</span> Children</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Baby className="h-4 w-4 flex-shrink-0" />
                          <span>
                            <span className="font-medium text-foreground">{stats.infants}</span> Infant
                            <span className="text-xs ml-1">(not counted)</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 pt-1 border-t mt-1">
                          <Users className="h-4 w-4 flex-shrink-0" />
                          <span>
                            <span className="font-medium text-foreground">{stats.booked}</span> Guest total
                            <span className="text-xs ml-1">(ex.infant)</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
