"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { ProtectedPage } from '@/components/providers/page-lock-provider'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  MapPin,
  Search,
} from 'lucide-react'
import type { Hotel } from '@/types'

export default function HotelsPage() {
  const { user } = useAuth()
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [deleteAllOpen, setDeleteAllOpen] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    area: '',
    address: '',
    pickup_notes: '',
  })

  const fetchHotels = async () => {
    if (!user?.company_id) return

    const supabase = createClient()
    const { data, error } = await supabase
      .from('hotels')
      .select('*')
      .eq('company_id', user.company_id)
      .order('area')
      .order('name')

    if (error) {
      toast.error('Failed to load custom locations')
    } else {
      setHotels(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchHotels()
  }, [user])

  const openCreateDialog = () => {
    setEditingHotel(null)
    setFormData({
      name: '',
      area: '',
      address: '',
      pickup_notes: '',
    })
    setDialogOpen(true)
  }

  const openEditDialog = (hotel: Hotel) => {
    setEditingHotel(hotel)
    setFormData({
      name: hotel.name,
      area: hotel.area,
      address: hotel.address || '',
      pickup_notes: hotel.pickup_notes || '',
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!user?.company_id) return
    if (!formData.name.trim() || !formData.area.trim()) {
      toast.error('Name and area are required')
      return
    }

    setSaving(true)
    const supabase = createClient()

    try {
      if (editingHotel) {
        const { error } = await supabase
          .from('hotels')
          .update({
            name: formData.name,
            area: formData.area,
            address: formData.address || null,
            pickup_notes: formData.pickup_notes || null,
          })
          .eq('id', editingHotel.id)

        if (error) throw error
        toast.success('Location updated successfully')
      } else {
        const { error } = await supabase
          .from('hotels')
          .insert({
            company_id: user.company_id,
            name: formData.name,
            area: formData.area,
            address: formData.address || null,
            pickup_notes: formData.pickup_notes || null,
          })

        if (error) throw error
        toast.success('Location created successfully')
      }

      setDialogOpen(false)
      fetchHotels()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save location')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return

    const supabase = createClient()
    const { error } = await supabase
      .from('hotels')
      .delete()
      .eq('id', deleteId)

    if (error) {
      toast.error('Failed to delete location. It may be in use by bookings.')
    } else {
      toast.success('Location deleted successfully')
      fetchHotels()
    }
    setDeleteId(null)
  }

  // Bulk delete handler - delete in batches to avoid query size limits
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0 || !user?.company_id) return

    setBulkDeleting(true)
    const supabase = createClient()
    const idsToDelete = Array.from(selectedIds)
    const batchSize = 50 // Delete in smaller batches of 50
    let deletedCount = 0
    let errorCount = 0

    try {
      // Process in batches
      for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const batch = idsToDelete.slice(i, i + batchSize)
        
        const { error } = await supabase
          .from('hotels')
          .delete()
          .eq('company_id', user.company_id)
          .in('id', batch)

        if (error) {
          console.error('Batch delete error:', error)
          errorCount += batch.length
        } else {
          deletedCount += batch.length
        }
      }

      if (errorCount > 0) {
        toast.warning(`Deleted ${deletedCount} locations. ${errorCount} could not be deleted (may be in use by bookings).`)
      } else {
        toast.success(`Successfully deleted ${deletedCount} locations`)
      }
      
      setSelectedIds(new Set())
      fetchHotels()
    } catch (error: any) {
      console.error('Bulk delete error:', error)
      toast.error(error.message || 'Failed to delete locations. Some may be in use by bookings.')
    } finally {
      setBulkDeleting(false)
      setBulkDeleteOpen(false)
    }
  }

  // Delete ALL locations for this company
  const handleDeleteAll = async () => {
    if (!user?.company_id) return

    setBulkDeleting(true)
    const supabase = createClient()

    try {
      // Delete all hotels for this company
      const { error, count } = await supabase
        .from('hotels')
        .delete()
        .eq('company_id', user.company_id)

      if (error) {
        console.error('Delete all error:', error)
        throw error
      }

      toast.success(`Successfully deleted all custom locations`)
      setSelectedIds(new Set())
      fetchHotels()
    } catch (error: any) {
      console.error('Delete all error:', error)
      toast.error(error.message || 'Failed to delete locations.')
    } finally {
      setBulkDeleting(false)
      setDeleteAllOpen(false)
    }
  }

  // Toggle single selection
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  // Deselect all
  const deselectAll = () => {
    setSelectedIds(new Set())
  }

  // Get unique areas for badges
  const areas = [...new Set(hotels.map(h => h.area))].sort()

  // Filter hotels by search
  const filteredHotels = hotels.filter(hotel =>
    hotel.name.toLowerCase().includes(search.toLowerCase()) ||
    hotel.area.toLowerCase().includes(search.toLowerCase())
  )

  // Select all visible (must be after filteredHotels is defined)
  const selectAllVisible = () => {
    const newSelected = new Set(selectedIds)
    filteredHotels.forEach(hotel => newSelected.add(hotel.id))
    setSelectedIds(newSelected)
  }

  // Check if all visible are selected
  const allVisibleSelected = filteredHotels.length > 0 && 
    filteredHotels.every(hotel => selectedIds.has(hotel.id))

  // Group hotels by area
  const hotelsByArea = filteredHotels.reduce((acc, hotel) => {
    if (!acc[hotel.area]) {
      acc[hotel.area] = []
    }
    acc[hotel.area].push(hotel)
    return acc
  }, {} as Record<string, Hotel[]>)

  return (
    <ProtectedPage pageKey="hotels" pageName="Location Setup">
    <div className="space-y-6">
      <PageHeader
        title="Custom Pickup Locations"
        description="Add custom pickup points like 7-Eleven, malls, or private villas. Standard hotels are already available in the booking form."
      >
        <div className="flex gap-2">
          {hotels.length > 0 && (
            <Button variant="destructive" onClick={() => setDeleteAllOpen(true)}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete All ({hotels.length})
            </Button>
          )}
          <Button onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Add Location
          </Button>
        </div>
      </PageHeader>

      {/* Search and stats */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {areas.map((area) => (
            <Badge key={area} variant="secondary">
              {area}: {hotels.filter(h => h.area === area).length}
            </Badge>
          ))}
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg border">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {selectedIds.size} location{selectedIds.size > 1 ? 's' : ''} selected
            </span>
            <Button variant="ghost" size="sm" onClick={deselectAll}>
              Clear selection
            </Button>
          </div>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => setBulkDeleteOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Selected
          </Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : hotels.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No custom locations yet</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-md">
              Add custom pickup points for locations not in the standard hotel database,
              such as 7-Eleven, shopping malls, or private villas.
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Location
            </Button>
          </CardContent>
        </Card>
      ) : filteredHotels.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No locations match your search</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        selectAllVisible()
                      } else {
                        deselectAll()
                      }
                    }}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Location Name</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Pickup Notes</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(hotelsByArea).map(([area, areaHotels]) => (
                <>
                  {/* Area Header Row */}
                  <TableRow key={`area-${area}`} className="bg-muted/50 hover:bg-muted/50">
                    <TableCell colSpan={6} className="py-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{area}</span>
                        <Badge variant="secondary">{areaHotels.length}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2 h-6 text-xs"
                          onClick={() => {
                            const newSelected = new Set(selectedIds)
                            const allAreaSelected = areaHotels.every(h => selectedIds.has(h.id))
                            if (allAreaSelected) {
                              areaHotels.forEach(h => newSelected.delete(h.id))
                            } else {
                              areaHotels.forEach(h => newSelected.add(h.id))
                            }
                            setSelectedIds(newSelected)
                          }}
                        >
                          {areaHotels.every(h => selectedIds.has(h.id)) ? 'Deselect area' : 'Select area'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {/* Locations in this area */}
                  {areaHotels.map((hotel) => (
                    <TableRow 
                      key={hotel.id}
                      className={selectedIds.has(hotel.id) ? 'bg-primary/5' : ''}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(hotel.id)}
                          onCheckedChange={() => toggleSelection(hotel.id)}
                          aria-label={`Select ${hotel.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{hotel.name}</TableCell>
                      <TableCell className="text-muted-foreground">{hotel.area}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {hotel.address || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {hotel.pickup_notes || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(hotel)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteId(hotel.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingHotel ? 'Edit Location' : 'Add Custom Location'}
            </DialogTitle>
            <DialogDescription>
              {editingHotel
                ? 'Update the location details below.'
                : 'Add a custom pickup point like 7-Eleven, mall, or private villa.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Location Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. 7-Eleven Patong Beach, Central Festival"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="area">Area *</Label>
              <Input
                id="area"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                placeholder="e.g. Patong, Kata, Karon"
                list="areas"
              />
              <datalist id="areas">
                {areas.map((area) => (
                  <option key={area} value={area} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Full address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pickup_notes">Pickup Notes</Label>
              <Textarea
                id="pickup_notes"
                value={formData.pickup_notes}
                onChange={(e) => setFormData({ ...formData, pickup_notes: e.target.value })}
                placeholder="Where to meet, landmarks, etc."
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
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this custom location? This action cannot be undone.
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

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Locations</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} custom location{selectedIds.size > 1 ? 's' : ''}? 
              This action cannot be undone. Locations that are in use by bookings will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleting ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Deleting...
                </>
              ) : (
                `Delete ${selectedIds.size} Locations`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Confirmation */}
      <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ALL {hotels.length} Locations</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete ALL {hotels.length} custom locations? 
              This action cannot be undone. This will remove all custom pickup locations from your company.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              disabled={bulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleting ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Deleting...
                </>
              ) : (
                `Delete All ${hotels.length} Locations`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </ProtectedPage>
  )
}
