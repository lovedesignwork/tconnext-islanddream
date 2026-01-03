"use client"

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { generatePin } from '@/lib/utils'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import { nanoid } from 'nanoid'
import {
  Plus,
  Pencil,
  Trash2,
  Car,
  Phone,
  MessageCircle,
  Link as LinkIcon,
  Copy,
  RefreshCw,
  Users,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import type { Driver, EntityStatus } from '@/types'

type SortDirection = 'asc' | 'desc' | null

export default function DriversSetupPage() {
  const { user } = useAuth()
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    nickname: '',
    phone: '',
    whatsapp: '',
    vehicle_info: '',
    car_capacity: 4,
    status: 'active' as EntityStatus,
    access_pin: '',
  })

  const fetchDrivers = async () => {
    if (!user?.company_id) return

    try {
      const response = await fetch('/api/drivers')
      if (!response.ok) {
        toast.error('Failed to load drivers')
        setLoading(false)
        return
      }
      const { drivers: data } = await response.json()
      setDrivers(data || [])
    } catch (error) {
      toast.error('Failed to load drivers')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchDrivers()
  }, [user])

  // Filtered and sorted drivers
  const filteredDrivers = useMemo(() => {
    let result = [...drivers]

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(driver =>
        driver.name.toLowerCase().includes(query) ||
        (driver.nickname && driver.nickname.toLowerCase().includes(query)) ||
        (driver.phone && driver.phone.toLowerCase().includes(query)) ||
        (driver.whatsapp && driver.whatsapp.toLowerCase().includes(query)) ||
        (driver.vehicle_info && driver.vehicle_info.toLowerCase().includes(query))
      )
    }

    // Apply sorting
    if (sortDirection) {
      result.sort((a, b) => {
        const nameA = a.name.toLowerCase()
        const nameB = b.name.toLowerCase()
        if (sortDirection === 'asc') {
          return nameA.localeCompare(nameB)
        } else {
          return nameB.localeCompare(nameA)
        }
      })
    }

    return result
  }, [drivers, searchQuery, sortDirection])

  const openCreateDialog = () => {
    setEditingDriver(null)
    const pin = generatePin(4)
    setFormData({
      name: '',
      nickname: '',
      phone: '',
      whatsapp: '',
      vehicle_info: '',
      car_capacity: 4,
      status: 'active',
      access_pin: pin,
    })
    setDialogOpen(true)
  }

  const openEditDialog = (driver: Driver) => {
    setEditingDriver(driver)
    // Check if access_pin is a bcrypt hash (starts with $2) or plain 4-digit PIN
    const isHashedPin = driver.access_pin?.startsWith('$2')
    setFormData({
      name: driver.name,
      nickname: driver.nickname || '',
      phone: driver.phone || '',
      whatsapp: driver.whatsapp || '',
      vehicle_info: driver.vehicle_info || '',
      car_capacity: driver.car_capacity || 4,
      status: driver.status,
      // If it's a hashed PIN, show empty (user must generate new one or leave unchanged)
      // If it's a plain PIN, show it
      access_pin: isHashedPin ? '' : (driver.access_pin || ''),
    })
    setDialogOpen(true)
  }

  const regeneratePin = () => {
    const pin = generatePin(4)
    setFormData({ ...formData, access_pin: pin })
    toast.success('New PIN generated')
  }

  const handleSubmit = async () => {
    if (!user?.company_id) return
    if (!formData.name.trim()) {
      toast.error('Driver name is required')
      return
    }
    // For new drivers, PIN is required. For editing, PIN is optional (only update if provided)
    if (!editingDriver && (!formData.access_pin || formData.access_pin.length !== 4)) {
      toast.error('Access PIN must be 4 digits')
      return
    }
    // If editing and PIN is provided, it must be 4 digits
    if (editingDriver && formData.access_pin && formData.access_pin.length !== 4) {
      toast.error('Access PIN must be 4 digits')
      return
    }

    setSaving(true)
    const supabase = createClient()

    try {
      if (editingDriver) {
        // Update existing driver via API
        const response = await fetch('/api/drivers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingDriver.id,
            name: formData.name,
            nickname: formData.nickname || null,
            phone: formData.phone || null,
            whatsapp: formData.whatsapp || null,
            vehicle_info: formData.vehicle_info || null,
            car_capacity: formData.car_capacity ? Number(formData.car_capacity) : null,
            status: formData.status,
            // Only send PIN if a new one is provided
            access_pin: formData.access_pin && formData.access_pin.length === 4 ? formData.access_pin : undefined,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to update driver')
        }
        toast.success('Driver updated successfully')
      } else {
        // Create new driver via API (PIN will be hashed on server)
        const response = await fetch('/api/drivers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            nickname: formData.nickname || null,
            phone: formData.phone || null,
            whatsapp: formData.whatsapp || null,
            vehicle_info: formData.vehicle_info || null,
            car_capacity: formData.car_capacity ? Number(formData.car_capacity) : null,
            status: formData.status,
            access_pin: formData.access_pin,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to create driver')
        }
        toast.success('Driver created successfully')
      }

      setDialogOpen(false)
      fetchDrivers()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save driver')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return

    try {
      const response = await fetch('/api/drivers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteId }),
      })

      if (!response.ok) {
        toast.error('Failed to delete driver')
      } else {
        toast.success('Driver deleted successfully')
        fetchDrivers()
      }
    } catch (error) {
      toast.error('Failed to delete driver')
    }
    setDeleteId(null)
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  const getDriverPortalLink = (driver: Driver) => {
    return `${window.location.origin}/driver/${driver.unique_link_id}`
  }

  const toggleSort = () => {
    if (sortDirection === null) {
      setSortDirection('asc')
    } else if (sortDirection === 'asc') {
      setSortDirection('desc')
    } else {
      setSortDirection('asc')
    }
  }

  const statusColors = {
    active: 'success',
    suspended: 'warning',
    deleted: 'destructive',
  } as const

  return (
    <div className="space-y-6">
      <PageHeader
        title="Drivers Setup"
        description="Manage drivers, their vehicle capacity, and access to pickup lists"
      >
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Add Driver
        </Button>
      </PageHeader>

      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : drivers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Car className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No drivers yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add drivers to manage pickup assignments.
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Driver
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search drivers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>
                    <button
                      onClick={toggleSort}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      Name
                      {sortDirection === null && <ArrowUpDown className="h-4 w-4" />}
                      {sortDirection === 'asc' && <ArrowUp className="h-4 w-4" />}
                      {sortDirection === 'desc' && <ArrowDown className="h-4 w-4" />}
                    </button>
                  </TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Vehicle Info</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-4 w-4" />
                      Capacity
                    </div>
                  </TableHead>
                  <TableHead>Access PIN</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrivers.map((driver, index) => (
                  <TableRow key={driver.id}>
                    <TableCell className="text-center text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {driver.name}
                      {driver.nickname && (
                        <span className="text-muted-foreground ml-1">
                          ({driver.nickname})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {driver.phone ? (
                        <a href={`tel:${driver.phone}`} className="flex items-center gap-1 text-sm hover:text-primary">
                          <Phone className="h-3 w-3" />
                          {driver.phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {driver.whatsapp ? (
                        <a
                          href={`https://wa.me/${driver.whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm hover:text-primary"
                        >
                          <MessageCircle className="h-3 w-3" />
                          {driver.whatsapp}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {driver.vehicle_info ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Car className="h-3 w-3" />
                          {driver.vehicle_info}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-mono">
                        {driver.car_capacity || 4} slots
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm tracking-widest">
                        {driver.access_pin?.startsWith('$2') ? '••••' : driver.access_pin}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[driver.status]}>
                        {driver.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => copyToClipboard(getDriverPortalLink(driver), 'Portal link')}
                          title="Copy Portal Link"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(driver)}
                          title="Edit Driver"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(driver.id)}
                          title="Delete Driver"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredDrivers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No drivers found matching your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingDriver ? 'Edit Driver' : 'Add Driver'}
            </DialogTitle>
            <DialogDescription>
              {editingDriver
                ? 'Update the driver details below.'
                : 'Add a new driver with portal access.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Driver Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nickname">Nickname</Label>
              <Input
                id="nickname"
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                placeholder="Short nickname (optional)"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+66 xxx xxx xxxx"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="+66 xxx xxx xxxx"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle_info">Vehicle Info</Label>
              <Input
                id="vehicle_info"
                value={formData.vehicle_info}
                onChange={(e) => setFormData({ ...formData, vehicle_info: e.target.value })}
                placeholder="e.g. Toyota Hiace - White - ABC 1234"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="car_capacity">Car Capacity (Passenger Slots)</Label>
              <Input
                id="car_capacity"
                type="number"
                min="1"
                max="50"
                value={formData.car_capacity}
                onChange={(e) => setFormData({ ...formData, car_capacity: parseInt(e.target.value) || 4 })}
                placeholder="Number of passengers"
              />
              <p className="text-xs text-muted-foreground">
                Total number of guests (adults + children + infants) this vehicle can accommodate
              </p>
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

            {/* PIN Section */}
            <div className="space-y-2 pt-2 border-t">
              <Label htmlFor="access_pin">Access PIN (4 digits)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="access_pin"
                  value={formData.access_pin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                    setFormData({ ...formData, access_pin: value })
                  }}
                  className="font-mono text-lg tracking-widest text-center"
                  maxLength={4}
                  placeholder={editingDriver ? "Leave empty to keep current" : "0000"}
                />
                <Button variant="outline" size="icon" onClick={regeneratePin} title="Generate new PIN">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(formData.access_pin, 'PIN')}
                  title="Copy PIN"
                  disabled={!formData.access_pin}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {editingDriver && !formData.access_pin && (
                <p className="text-xs text-muted-foreground">
                  Leave empty to keep the current PIN, or enter a new 4-digit PIN
                </p>
              )}
            </div>

            {/* Driver Portal Link Section (only for editing existing drivers) */}
            {editingDriver && (
              <div className="space-y-2 pt-2 border-t">
                <Label>Driver Portal Link</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={getDriverPortalLink(editingDriver)}
                    readOnly
                    className="text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(getDriverPortalLink(editingDriver), 'Portal link')}
                    title="Copy link"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this link with the driver to access their pickup list
                </p>
              </div>
            )}
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
            <AlertDialogTitle>Delete Driver</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this driver? Their portal access will be revoked.
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
