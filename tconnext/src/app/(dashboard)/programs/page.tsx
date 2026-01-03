"use client"

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { TimeInput } from '@/components/ui/time-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import {
  Plus,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  X,
  Save,
  ChevronDown,
  ChevronUp,
  Palette,
  ShoppingCart,
  Link2,
  Image,
  Upload,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import type { Program, EntityStatus, ComeDirectLocation, PricingType } from '@/types'

interface FormData {
  name: string
  nickname: string
  description: string
  color: string
  duration: string
  base_price: number
  pricing_type: PricingType
  selling_price: number
  adult_selling_price: number
  child_selling_price: number
  default_pickup_time: string
  booking_cutoff_time: string
  status: EntityStatus
  come_direct_name: string
  come_direct_address: string
  come_direct_google_maps_url: string
  come_direct_contact_info: string
  // Direct booking fields
  slug: string
  thumbnail_url: string
  direct_booking_enabled: boolean
  short_description: string
  brochure_images: string[]
  itinerary_html: string
}

const defaultFormData: FormData = {
  name: '',
  nickname: '',
  description: '',
  color: '#3B82F6',
  duration: '',
  base_price: 0,
  pricing_type: 'single',
  selling_price: 0,
  adult_selling_price: 0,
  child_selling_price: 0,
  default_pickup_time: '08:00',
  booking_cutoff_time: '18:00',
  status: 'active',
  come_direct_name: '',
  come_direct_address: '',
  come_direct_google_maps_url: '',
  come_direct_contact_info: '',
  // Direct booking defaults
  slug: '',
  thumbnail_url: '',
  direct_booking_enabled: false,
  short_description: '',
  brochure_images: [],
  itinerary_html: '',
}

// Predefined color options for quick selection
const PROGRAM_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
  '#6366F1', // Indigo
]

export default function ProgramsPage() {
  const { user } = useAuth()
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expandedComeDirectId, setExpandedComeDirectId] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  
  // Thumbnail upload state
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)
  
  // Brochure upload state
  const [uploadingBrochure, setUploadingBrochure] = useState(false)
  const brochureInputRef = useRef<HTMLInputElement>(null)

  // Form state for editing/creating
  const [formData, setFormData] = useState<FormData>(defaultFormData)

  const fetchPrograms = async () => {
    if (!user?.company_id) return

    const supabase = createClient()
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .eq('company_id', user.company_id)
      .neq('status', 'deleted')
      .order('name')

    if (error) {
      toast.error('Failed to load programs')
    } else {
      setPrograms(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchPrograms()
  }, [user])

  const startCreate = () => {
    setEditingId(null)
    setFormData(defaultFormData)
    setIsCreating(true)
    setExpandedComeDirectId('new')
  }

  const startEdit = (program: Program) => {
    setIsCreating(false)
    setEditingId(program.id)
    const comeDirectLocation = (program as any).come_direct_location as ComeDirectLocation | null
    setFormData({
      name: program.name,
      nickname: program.nickname || '',
      description: program.description || '',
      color: program.color || '#3B82F6',
      duration: program.duration || '',
      base_price: program.base_price,
      pricing_type: (program as any).pricing_type || 'single',
      selling_price: (program as any).selling_price || program.base_price || 0,
      adult_selling_price: (program as any).adult_selling_price || 0,
      child_selling_price: (program as any).child_selling_price || 0,
      default_pickup_time: (program as any).default_pickup_time || '08:00',
      booking_cutoff_time: program.booking_cutoff_time || '18:00',
      status: program.status,
      come_direct_name: comeDirectLocation?.name || '',
      come_direct_address: comeDirectLocation?.address || '',
      come_direct_google_maps_url: comeDirectLocation?.google_maps_url || '',
      come_direct_contact_info: comeDirectLocation?.contact_info || '',
      // Direct booking fields
      slug: (program as any).slug || '',
      thumbnail_url: (program as any).thumbnail_url || '',
      direct_booking_enabled: (program as any).direct_booking_enabled || false,
      short_description: (program as any).short_description || '',
      brochure_images: (program as any).brochure_images || [],
      itinerary_html: (program as any).itinerary_html || '',
    })
    setExpandedComeDirectId(program.id)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setIsCreating(false)
    setFormData(defaultFormData)
    setExpandedComeDirectId(null)
  }

  const handleSubmit = async () => {
    if (!user?.company_id) return
    if (!formData.name.trim()) {
      toast.error('Program name is required')
      return
    }

    setSaving(true)
    const supabase = createClient()

    // Build come_direct_location object if any field is filled
    const comeDirectLocation: ComeDirectLocation | null = 
      formData.come_direct_name || formData.come_direct_address || formData.come_direct_google_maps_url || formData.come_direct_contact_info
        ? {
            name: formData.come_direct_name || undefined,
            address: formData.come_direct_address || undefined,
            google_maps_url: formData.come_direct_google_maps_url || undefined,
            contact_info: formData.come_direct_contact_info || undefined,
          }
        : null

    try {
      if (editingId) {
        // Update
        const { error } = await supabase
          .from('programs')
          .update({
            name: formData.name,
            nickname: formData.nickname || null,
            description: formData.description || null,
            color: formData.color || '#3B82F6',
            duration: formData.duration || null,
            base_price: formData.base_price,
            pricing_type: formData.pricing_type,
            selling_price: formData.selling_price,
            adult_selling_price: formData.adult_selling_price,
            child_selling_price: formData.child_selling_price,
            default_pickup_time: formData.default_pickup_time || '08:00',
            booking_cutoff_time: formData.booking_cutoff_time || '18:00',
            status: formData.status,
            come_direct_location: comeDirectLocation,
            // Direct booking fields
            slug: formData.slug || null,
            thumbnail_url: formData.thumbnail_url || null,
            direct_booking_enabled: formData.direct_booking_enabled,
            short_description: formData.short_description || null,
            brochure_images: formData.brochure_images.length > 0 ? formData.brochure_images : null,
            itinerary_html: formData.itinerary_html || null,
          })
          .eq('id', editingId)

        if (error) throw error
        toast.success('Program updated successfully')
      } else {
        // Create
        const { error } = await supabase
          .from('programs')
          .insert({
            company_id: user.company_id,
            name: formData.name,
            nickname: formData.nickname || null,
            description: formData.description || null,
            color: formData.color || '#3B82F6',
            duration: formData.duration || null,
            base_price: formData.base_price,
            pricing_type: formData.pricing_type,
            selling_price: formData.selling_price,
            adult_selling_price: formData.adult_selling_price,
            child_selling_price: formData.child_selling_price,
            default_pickup_time: formData.default_pickup_time || '08:00',
            booking_cutoff_time: formData.booking_cutoff_time || '18:00',
            status: formData.status,
            come_direct_location: comeDirectLocation,
            // Direct booking fields
            slug: formData.slug || null,
            thumbnail_url: formData.thumbnail_url || null,
            direct_booking_enabled: formData.direct_booking_enabled,
            short_description: formData.short_description || null,
            brochure_images: formData.brochure_images.length > 0 ? formData.brochure_images : null,
            itinerary_html: formData.itinerary_html || null,
          })

        if (error) throw error
        toast.success('Program created successfully')
      }

      cancelEdit()
      fetchPrograms()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save program')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editingId) return

    const supabase = createClient()
    const { error } = await supabase
      .from('programs')
      .update({ status: 'deleted' })
      .eq('id', editingId)

    if (error) {
      toast.error('Failed to delete program')
    } else {
      toast.success('Program deleted successfully')
      cancelEdit()
      fetchPrograms()
    }
    setDeleteConfirmOpen(false)
  }

  // Handle thumbnail upload
  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editingId) return

    setUploadingThumbnail(true)
    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)
      formDataUpload.append('programId', editingId)

      const response = await fetch('/api/programs/upload-thumbnail', {
        method: 'POST',
        body: formDataUpload,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to upload thumbnail')
      }

      const { thumbnail_url } = await response.json()
      setFormData(prev => ({ ...prev, thumbnail_url }))
      toast.success('Thumbnail uploaded successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload thumbnail')
    } finally {
      setUploadingThumbnail(false)
      // Reset file input
      if (thumbnailInputRef.current) {
        thumbnailInputRef.current.value = ''
      }
    }
  }

  // Handle thumbnail delete
  const handleThumbnailDelete = async () => {
    if (!editingId) return

    setUploadingThumbnail(true)
    try {
      const response = await fetch('/api/programs/upload-thumbnail', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programId: editingId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete thumbnail')
      }

      setFormData(prev => ({ ...prev, thumbnail_url: '' }))
      toast.success('Thumbnail removed')
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete thumbnail')
    } finally {
      setUploadingThumbnail(false)
    }
  }

  // Handle brochure image upload
  const handleBrochureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editingId) return

    if (formData.brochure_images.length >= 10) {
      toast.error('Maximum 10 brochure images allowed')
      return
    }

    setUploadingBrochure(true)
    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)
      formDataUpload.append('programId', editingId)

      const response = await fetch('/api/programs/upload-brochure', {
        method: 'POST',
        body: formDataUpload,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to upload brochure')
      }

      const { brochure_images } = await response.json()
      setFormData(prev => ({ ...prev, brochure_images }))
      toast.success('Brochure image uploaded')
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload brochure')
    } finally {
      setUploadingBrochure(false)
      if (brochureInputRef.current) {
        brochureInputRef.current.value = ''
      }
    }
  }

  // Handle brochure image delete
  const handleBrochureDelete = async (imageUrl: string) => {
    if (!editingId) return

    setUploadingBrochure(true)
    try {
      const response = await fetch('/api/programs/upload-brochure', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programId: editingId, imageUrl }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete brochure')
      }

      const { brochure_images } = await response.json()
      setFormData(prev => ({ ...prev, brochure_images }))
      toast.success('Brochure image removed')
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete brochure')
    } finally {
      setUploadingBrochure(false)
    }
  }

  const statusColors = {
    active: 'success',
    suspended: 'warning',
    deleted: 'destructive',
  } as const

  // Inline edit form render function (not a component to prevent remounting)
  const renderEditForm = (isNew = false) => (
    <Card className={isNew ? 'border-primary border-2' : 'border-primary border-2 bg-primary/5'}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {isNew ? 'New Program' : 'Edit Program'}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={cancelEdit}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Program Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Phi Phi Island Tour"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nickname">
              Nickname
              <span className="text-xs text-muted-foreground ml-2">(Admin only)</span>
            </Label>
            <Input
              id="nickname"
              value={formData.nickname}
              onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
              placeholder="e.g. PhiPhi, JB Tour"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration">Duration</Label>
          <Input
            id="duration"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            placeholder="e.g. Full Day"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe the tour experience..."
            rows={2}
          />
        </div>

        {/* Color Picker */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Program Color
          </Label>
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5 flex-wrap">
              {PROGRAM_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    formData.color === color
                      ? 'border-foreground scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData({ ...formData, color })}
                  title={color}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 border-l pl-3">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer border-0 p-0"
              />
              <Input
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="#3B82F6"
                className="w-24 h-8 text-xs font-mono"
                maxLength={7}
              />
            </div>
          </div>
        </div>

        {/* Pricing Type Section */}
        <div className="space-y-3">
          <Label className="text-xs font-medium">Pricing Type</Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="pricing_type"
                value="single"
                checked={formData.pricing_type === 'single'}
                onChange={() => setFormData({ ...formData, pricing_type: 'single' })}
                className="w-4 h-4 text-primary"
              />
              <span className="text-sm">Single Price (Per Person)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="pricing_type"
                value="adult_child"
                checked={formData.pricing_type === 'adult_child'}
                onChange={() => setFormData({ ...formData, pricing_type: 'adult_child' })}
                className="w-4 h-4 text-primary"
              />
              <span className="text-sm">Adult / Child Prices</span>
            </label>
          </div>
        </div>

        {/* Selling Price Fields - Conditional based on pricing type */}
        {formData.pricing_type === 'single' ? (
          <div className="space-y-1">
            <Label htmlFor="selling_price" className="text-xs">Selling Price (THB)</Label>
            <NumberInput
              id="selling_price"
              min={0}
              decimal
              value={formData.selling_price}
              onChange={(value) => setFormData({ ...formData, selling_price: value })}
              className="h-9 max-w-[200px]"
            />
            <p className="text-xs text-muted-foreground">Price per person (same for all ages)</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="adult_selling_price" className="text-xs">Adult Selling Price (THB)</Label>
              <NumberInput
                id="adult_selling_price"
                min={0}
                decimal
                value={formData.adult_selling_price}
                onChange={(value) => setFormData({ ...formData, adult_selling_price: value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="child_selling_price" className="text-xs">Child Selling Price (THB)</Label>
              <NumberInput
                id="child_selling_price"
                min={0}
                decimal
                value={formData.child_selling_price}
                onChange={(value) => setFormData({ ...formData, child_selling_price: value })}
                className="h-9"
              />
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="base_price" className="text-xs">Base/Cost Price (THB)</Label>
            <NumberInput
              id="base_price"
              min={0}
              decimal
              value={formData.base_price}
              onChange={(value) => setFormData({ ...formData, base_price: value })}
              className="h-9"
            />
            <p className="text-xs text-muted-foreground">Internal cost reference</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="status" className="text-xs">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(v) => setFormData({ ...formData, status: v as EntityStatus })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="default_pickup_time" className="text-xs">Default Pickup Time</Label>
            <TimeInput
              id="default_pickup_time"
              value={formData.default_pickup_time}
              onChange={(value) => setFormData({ ...formData, default_pickup_time: value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="booking_cutoff_time" className="text-xs">Booking Cutoff Time</Label>
            <TimeInput
              id="booking_cutoff_time"
              value={formData.booking_cutoff_time}
              onChange={(value) => setFormData({ ...formData, booking_cutoff_time: value })}
            />
          </div>
        </div>

        <Separator />

        {/* Come Direct Location - Collapsible */}
        <div className="space-y-3">
          <button
            type="button"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setExpandedComeDirectId(
              expandedComeDirectId === (editingId || 'new') ? null : (editingId || 'new')
            )}
          >
            <MapPin className="h-4 w-4 text-blue-600" />
            Come Direct Location
            {expandedComeDirectId === (editingId || 'new') ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {expandedComeDirectId === (editingId || 'new') && (
            <div className="space-y-3 pl-6 border-l-2 border-blue-200">
              <p className="text-xs text-muted-foreground">
                For customers who prefer to come directly to the meeting point instead of hotel pickup.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="come_direct_name" className="text-xs">Location Name</Label>
                  <Input
                    id="come_direct_name"
                    value={formData.come_direct_name}
                    onChange={(e) => setFormData({ ...formData, come_direct_name: e.target.value })}
                    placeholder="e.g. Rassada Pier"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="come_direct_address" className="text-xs">Address</Label>
                  <Input
                    id="come_direct_address"
                    value={formData.come_direct_address}
                    onChange={(e) => setFormData({ ...formData, come_direct_address: e.target.value })}
                    placeholder="e.g. 123 Rassada Pier Rd"
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="come_direct_google_maps_url" className="text-xs">Google Maps Link</Label>
                  <Input
                    id="come_direct_google_maps_url"
                    value={formData.come_direct_google_maps_url}
                    onChange={(e) => setFormData({ ...formData, come_direct_google_maps_url: e.target.value })}
                    placeholder="https://maps.google.com/..."
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="come_direct_contact_info" className="text-xs">Contact Info</Label>
                  <Input
                    id="come_direct_contact_info"
                    value={formData.come_direct_contact_info}
                    onChange={(e) => setFormData({ ...formData, come_direct_contact_info: e.target.value })}
                    placeholder="e.g. Call: 076-123-456"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Direct Online Booking Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-green-600" />
              <Label className="text-sm font-medium">Direct Online Booking</Label>
            </div>
            <Switch
              checked={formData.direct_booking_enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, direct_booking_enabled: checked })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Enable this program on your public booking page for customers to book and pay online.
          </p>

          {formData.direct_booking_enabled && (
            <div className="space-y-3 pl-6 border-l-2 border-green-200">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="slug" className="text-xs flex items-center gap-1">
                    <Link2 className="h-3 w-3" />
                    URL Slug
                  </Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                    placeholder="phi-phi-island"
                    className="h-8 text-sm font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to auto-generate from name
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Image className="h-3 w-3" />
                    Thumbnail Image
                  </Label>
                  <input
                    ref={thumbnailInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleThumbnailUpload}
                    className="hidden"
                    disabled={!editingId || uploadingThumbnail}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => thumbnailInputRef.current?.click()}
                      disabled={!editingId || uploadingThumbnail}
                      className="h-8"
                    >
                      {uploadingThumbnail ? (
                        <>
                          <Spinner size="sm" className="mr-2" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-3 w-3 mr-2" />
                          {formData.thumbnail_url ? 'Change' : 'Upload'}
                        </>
                      )}
                    </Button>
                    {formData.thumbnail_url && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleThumbnailDelete}
                        disabled={uploadingThumbnail}
                        className="h-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>
                  {!editingId && (
                    <p className="text-xs text-muted-foreground">
                      Save the program first to upload a thumbnail
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="short_description" className="text-xs">Short Description (for booking page)</Label>
                <Textarea
                  id="short_description"
                  value={formData.short_description}
                  onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                  placeholder="A brief description shown on the booking page..."
                  rows={2}
                  className="text-sm"
                />
              </div>

              {formData.thumbnail_url && (
                <div className="space-y-1">
                  <Label className="text-xs">Preview</Label>
                  <div className="w-32 h-20 rounded-lg overflow-hidden border bg-muted">
                    <img
                      src={formData.thumbnail_url}
                      alt="Thumbnail preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Brochure Images Section */}
              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Brochure Images (up to 10)</Label>
                  {editingId && formData.brochure_images.length < 10 && (
                    <div>
                      <input
                        ref={brochureInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleBrochureUpload}
                        className="hidden"
                        id="brochure-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => brochureInputRef.current?.click()}
                        disabled={uploadingBrochure}
                      >
                        {uploadingBrochure ? (
                          <Spinner size="sm" />
                        ) : (
                          <>
                            <Upload className="h-3 w-3 mr-2" />
                            Add Image
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Images shown in a lightbox on the booking page. Customers can view and download.
                </p>
                {formData.brochure_images.length > 0 ? (
                  <div className="grid grid-cols-5 gap-2">
                    {formData.brochure_images.map((url, index) => (
                      <div key={index} className="relative group">
                        <div className="w-full aspect-square rounded-lg overflow-hidden border bg-muted">
                          <img
                            src={url}
                            alt={`Brochure ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleBrochureDelete(url)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                          disabled={uploadingBrochure}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No brochure images uploaded</p>
                )}
              </div>

              {/* Itinerary HTML Section */}
              <div className="space-y-2 pt-4 border-t">
                <Label htmlFor="itinerary_html" className="text-xs font-medium">Itinerary (HTML/Rich Text)</Label>
                <p className="text-xs text-muted-foreground">
                  Shown in an expandable accordion on the booking page. You can use HTML for formatting.
                </p>
                <Textarea
                  id="itinerary_html"
                  value={formData.itinerary_html}
                  onChange={(e) => setFormData({ ...formData, itinerary_html: e.target.value })}
                  placeholder="<h3>Day Schedule</h3>&#10;<p><strong>08:00</strong> - Pick up from hotel</p>&#10;<p><strong>09:00</strong> - Arrive at pier</p>&#10;..."
                  rows={6}
                  className="text-sm font-mono"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-2">
          <div>
            {!isNew && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={saving}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                title="Delete Program"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={cancelEdit} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Program
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // Program card component (view mode)
  const ProgramCard = ({ program }: { program: Program }) => {
    const comeDirectLocation = (program as any).come_direct_location as ComeDirectLocation | null
    const programColor = program.color || '#3B82F6'
    const pricingType = (program as any).pricing_type || 'single'
    const sellingPrice = (program as any).selling_price || program.base_price || 0
    const adultSellingPrice = (program as any).adult_selling_price || 0
    const childSellingPrice = (program as any).child_selling_price || 0
    
    return (
      <Card 
        className="relative hover:shadow-md transition-shadow cursor-pointer group"
        onClick={() => startEdit(program)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg group-hover:text-primary transition-colors flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: programColor }}
                />
                {program.nickname ? (
                  <span className="flex items-center gap-2">
                    <span className="font-bold text-primary">{program.nickname}</span>
                    <span className="text-sm font-normal text-muted-foreground">({program.name})</span>
                  </span>
                ) : (
                  program.name
                )}
              </CardTitle>
              {program.duration && (
                <CardDescription className="flex items-center gap-1 mt-1 ml-5">
                  <Clock className="h-3 w-3" />
                  {program.duration}
                </CardDescription>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant={statusColors[program.status]}>
                {program.status}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {pricingType === 'single' ? 'Per Person' : 'Adult/Child'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {program.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {program.description}
            </p>
          )}
          <div className="flex items-center justify-between">
            {pricingType === 'single' ? (
              <div className="text-lg font-semibold">
                {formatCurrency(sellingPrice)}
                <span className="text-xs font-normal text-muted-foreground ml-1">/person</span>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="text-sm font-semibold">
                  Adult: {formatCurrency(adultSellingPrice)}
                </div>
                <div className="text-sm font-semibold text-muted-foreground">
                  Child: {formatCurrency(childSellingPrice)}
                </div>
              </div>
            )}
            {comeDirectLocation?.name && (
              <div className="flex items-center gap-1 text-xs text-blue-600">
                <MapPin className="h-3 w-3" />
                {comeDirectLocation.name}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            Click to edit
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Program Setup"
        description="Manage your tour programs and packages"
      >
        {!isCreating && (
          <Button onClick={startCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Add Program
          </Button>
        )}
      </PageHeader>

      {/* Create new program form */}
      {isCreating && renderEditForm(true)}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : programs.length === 0 && !isCreating ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No programs yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first tour program to start accepting bookings.
            </p>
            <Button onClick={startCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Create Program
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => (
            editingId === program.id ? (
              <div key={program.id}>{renderEditForm(false)}</div>
            ) : (
              <ProgramCard key={program.id} program={program} />
            )
          ))}
        </div>
      )}

      {/* Delete Confirmation with TYPE DELETE */}
      <DeleteConfirmationDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleDelete}
        title="Delete Program"
        description="Are you sure you want to delete this program? This action cannot be undone. Existing bookings for this program will not be affected."
        itemName={formData.name}
      />
    </div>
  )
}
