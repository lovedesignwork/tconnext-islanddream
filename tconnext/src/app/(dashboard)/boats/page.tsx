"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import {
  Plus,
  Pencil,
  Trash2,
  Anchor,
  Users,
  Phone,
  MoreVertical,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Boat, EntityStatus } from '@/types'

export default function BoatsPage() {
  const { user } = useAuth()
  const [boats, setBoats] = useState<Boat[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBoat, setEditingBoat] = useState<Boat | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    capacity: 20,
    captain_name: '',
    phone: '',
    status: 'active' as EntityStatus,
    notes: '',
  })

  const fetchBoats = async () => {
    if (!user?.company_id) return

    const supabase = createClient()
    const { data, error } = await supabase
      .from('boats')
      .select('*')
      .eq('company_id', user.company_id)
      .neq('status', 'deleted')
      .order('name')

    if (error) {
      toast.error('Failed to load boats')
    } else {
      setBoats(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchBoats()
  }, [user])

  const openCreateDialog = () => {
    setEditingBoat(null)
    setFormData({
      name: '',
      capacity: 20,
      captain_name: '',
      phone: '',
      status: 'active',
      notes: '',
    })
    setDialogOpen(true)
  }

  const openEditDialog = (boat: Boat) => {
    setEditingBoat(boat)
    setFormData({
      name: boat.name,
      capacity: boat.capacity,
      captain_name: boat.captain_name || '',
      phone: boat.phone || '',
      status: boat.status,
      notes: boat.notes || '',
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!user?.company_id) return
    if (!formData.name.trim()) {
      toast.error('Boat name is required')
      return
    }
    if (formData.capacity < 1) {
      toast.error('Capacity must be at least 1')
      return
    }

    setSaving(true)
    const supabase = createClient()

    try {
      if (editingBoat) {
        const { error } = await supabase
          .from('boats')
          .update({
            name: formData.name,
            capacity: formData.capacity,
            captain_name: formData.captain_name || null,
            phone: formData.phone || null,
            status: formData.status,
            notes: formData.notes || null,
          })
          .eq('id', editingBoat.id)

        if (error) throw error
        toast.success('Boat updated successfully')
      } else {
        const { error } = await supabase
          .from('boats')
          .insert({
            company_id: user.company_id,
            name: formData.name,
            capacity: formData.capacity,
            captain_name: formData.captain_name || null,
            phone: formData.phone || null,
            status: formData.status,
            notes: formData.notes || null,
          })

        if (error) throw error
        toast.success('Boat created successfully')
      }

      setDialogOpen(false)
      fetchBoats()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save boat')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return

    const supabase = createClient()
    const { error } = await supabase
      .from('boats')
      .update({ status: 'deleted' })
      .eq('id', deleteId)

    if (error) {
      toast.error('Failed to delete boat')
    } else {
      toast.success('Boat deleted successfully')
      fetchBoats()
    }
    setDeleteId(null)
  }

  const statusColors = {
    active: 'success',
    suspended: 'warning',
    deleted: 'destructive',
  } as const

  return (
    <div className="space-y-6">
      <PageHeader
        title="Boats"
        description="Manage boats and their capacity"
      >
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Add Boat
        </Button>
      </PageHeader>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : boats.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Anchor className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No boats yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add boats to manage passenger assignments.
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Boat
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {boats.map((boat) => (
            <Card key={boat.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Anchor className="h-4 w-4" />
                      {boat.name}
                    </CardTitle>
                    {boat.captain_name && (
                      <CardDescription className="mt-1">
                        Captain: {boat.captain_name}
                      </CardDescription>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(boat)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteId(boat.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    {boat.capacity} pax
                  </div>
                  {boat.phone && (
                    <a
                      href={`tel:${boat.phone}`}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <Phone className="h-3 w-3" />
                      {boat.phone}
                    </a>
                  )}
                </div>

                {boat.notes && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {boat.notes}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2">
                  <Badge variant={statusColors[boat.status]}>
                    {boat.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBoat ? 'Edit Boat' : 'Add Boat'}
            </DialogTitle>
            <DialogDescription>
              {editingBoat
                ? 'Update the boat details below.'
                : 'Add a new boat to your fleet.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Boat Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Island Explorer"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity (passengers) *</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v as EntityStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="captain_name">Captain Name</Label>
                <Input
                  id="captain_name"
                  value={formData.captain_name}
                  onChange={(e) => setFormData({ ...formData, captain_name: e.target.value })}
                  placeholder="Captain's name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+66 xxx xxx xxxx"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Boat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this boat? Existing bookings will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}












