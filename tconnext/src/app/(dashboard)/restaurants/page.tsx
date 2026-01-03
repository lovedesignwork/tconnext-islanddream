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
  UtensilsCrossed,
  Users,
  Phone,
  MapPin,
  MoreVertical,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Restaurant, EntityStatus } from '@/types'

export default function RestaurantsPage() {
  const { user } = useAuth()
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    capacity: 50,
    phone: '',
    status: 'active' as EntityStatus,
    notes: '',
  })

  const fetchRestaurants = async () => {
    if (!user?.company_id) return

    const supabase = createClient()
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('company_id', user.company_id)
      .neq('status', 'deleted')
      .order('name')

    if (error) {
      toast.error('Failed to load restaurants')
    } else {
      setRestaurants(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchRestaurants()
  }, [user])

  const openCreateDialog = () => {
    setEditingRestaurant(null)
    setFormData({
      name: '',
      location: '',
      capacity: 50,
      phone: '',
      status: 'active',
      notes: '',
    })
    setDialogOpen(true)
  }

  const openEditDialog = (restaurant: Restaurant) => {
    setEditingRestaurant(restaurant)
    setFormData({
      name: restaurant.name,
      location: restaurant.location || '',
      capacity: restaurant.capacity,
      phone: restaurant.phone || '',
      status: restaurant.status,
      notes: restaurant.notes || '',
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!user?.company_id) return
    if (!formData.name.trim()) {
      toast.error('Restaurant name is required')
      return
    }
    if (formData.capacity < 1) {
      toast.error('Capacity must be at least 1')
      return
    }

    setSaving(true)
    const supabase = createClient()

    try {
      if (editingRestaurant) {
        const { error } = await supabase
          .from('restaurants')
          .update({
            name: formData.name,
            location: formData.location || null,
            capacity: formData.capacity,
            phone: formData.phone || null,
            status: formData.status,
            notes: formData.notes || null,
          })
          .eq('id', editingRestaurant.id)

        if (error) throw error
        toast.success('Restaurant updated successfully')
      } else {
        const { error } = await supabase
          .from('restaurants')
          .insert({
            company_id: user.company_id,
            name: formData.name,
            location: formData.location || null,
            capacity: formData.capacity,
            phone: formData.phone || null,
            status: formData.status,
            notes: formData.notes || null,
          })

        if (error) throw error
        toast.success('Restaurant created successfully')
      }

      setDialogOpen(false)
      fetchRestaurants()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save restaurant')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return

    const supabase = createClient()
    const { error } = await supabase
      .from('restaurants')
      .update({ status: 'deleted' })
      .eq('id', deleteId)

    if (error) {
      toast.error('Failed to delete restaurant')
    } else {
      toast.success('Restaurant deleted successfully')
      fetchRestaurants()
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
        title="Restaurant Setup"
        description="Manage lunch restaurants for tour groups"
      >
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Add Restaurant
        </Button>
      </PageHeader>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : restaurants.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UtensilsCrossed className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No restaurants yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add restaurants to manage lunch assignments for tour groups.
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Restaurant
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((restaurant) => (
            <Card key={restaurant.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <UtensilsCrossed className="h-4 w-4" />
                      {restaurant.name}
                    </CardTitle>
                    {restaurant.location && (
                      <CardDescription className="mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {restaurant.location}
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
                      <DropdownMenuItem onClick={() => openEditDialog(restaurant)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteId(restaurant.id)}
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
                    {restaurant.capacity} seats
                  </div>
                  {restaurant.phone && (
                    <a
                      href={`tel:${restaurant.phone}`}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <Phone className="h-3 w-3" />
                      {restaurant.phone}
                    </a>
                  )}
                </div>

                {restaurant.notes && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {restaurant.notes}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2">
                  <Badge variant={statusColors[restaurant.status]}>
                    {restaurant.status}
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
              {editingRestaurant ? 'Edit Restaurant' : 'Add Restaurant'}
            </DialogTitle>
            <DialogDescription>
              {editingRestaurant
                ? 'Update the restaurant details below.'
                : 'Add a new restaurant for lunch assignments.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Restaurant Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Beach Paradise Restaurant"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Phi Phi Island"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity (seats) *</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
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

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this restaurant..."
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
            <AlertDialogTitle>Delete Restaurant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this restaurant? It will be removed from future assignments.
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










