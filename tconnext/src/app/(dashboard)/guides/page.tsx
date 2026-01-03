"use client"

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import {
  Plus,
  Pencil,
  Trash2,
  UserCheck,
  Phone,
  MessageCircle,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Languages,
  X,
  Copy,
  ExternalLink,
  Key,
} from 'lucide-react'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import type { Guide, EntityStatus } from '@/types'

type SortDirection = 'asc' | 'desc' | null

// Available languages for guides
const AVAILABLE_LANGUAGES = [
  'English',
  'Thai',
  'Chinese',
  'Russian',
  'Spanish',
  'Italian',
  'French',
  'German',
  'Japanese',
  'Korean',
  'Portuguese',
  'Arabic',
  'Hindi',
]

export default function GuidesSetupPage() {
  const { user } = useAuth()
  const [guides, setGuides] = useState<Guide[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGuide, setEditingGuide] = useState<Guide | null>(null)
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
    languages: [] as string[],
    status: 'active' as EntityStatus,
    notes: '',
    pin: '',
  })

  const fetchGuides = async () => {
    if (!user?.company_id) return

    const supabase = createClient()
    const { data, error } = await supabase
      .from('guides')
      .select('*')
      .eq('company_id', user.company_id)
      .neq('status', 'deleted')
      .order('name')

    if (error) {
      toast.error('Failed to load guides')
    } else {
      setGuides(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchGuides()
  }, [user])

  // Filtered and sorted guides
  const filteredGuides = useMemo(() => {
    let result = [...guides]

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(guide =>
        guide.name.toLowerCase().includes(query) ||
        (guide.nickname && guide.nickname.toLowerCase().includes(query)) ||
        (guide.phone && guide.phone.toLowerCase().includes(query)) ||
        (guide.languages && guide.languages.some(lang => lang.toLowerCase().includes(query)))
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
  }, [guides, searchQuery, sortDirection])

  const openCreateDialog = () => {
    setEditingGuide(null)
    setFormData({
      name: '',
      nickname: '',
      phone: '',
      whatsapp: '',
      languages: ['English'],
      status: 'active',
      notes: '',
      pin: '',
    })
    setDialogOpen(true)
  }

  const openEditDialog = (guide: Guide) => {
    setEditingGuide(guide)
    setFormData({
      name: guide.name,
      nickname: guide.nickname || '',
      phone: guide.phone || '',
      whatsapp: guide.whatsapp || '',
      languages: guide.languages || [],
      status: guide.status,
      notes: guide.notes || '',
      pin: '', // Don't show existing PIN
    })
    setDialogOpen(true)
  }

  const toggleLanguage = (language: string) => {
    setFormData(prev => {
      const languages = prev.languages.includes(language)
        ? prev.languages.filter(l => l !== language)
        : [...prev.languages, language]
      return { ...prev, languages }
    })
  }

  const handleSubmit = async () => {
    if (!user?.company_id) return
    if (!formData.name.trim()) {
      toast.error('Guide name is required')
      return
    }
    if (formData.languages.length === 0) {
      toast.error('Please select at least one language')
      return
    }
    // PIN is required for new guides
    if (!editingGuide && !formData.pin) {
      toast.error('Portal PIN is required')
      return
    }
    // Validate PIN format (4 digits)
    if (formData.pin && !/^\d{4}$/.test(formData.pin)) {
      toast.error('PIN must be exactly 4 digits')
      return
    }

    setSaving(true)
    const supabase = createClient()

    try {
      // Hash PIN if provided
      let hashedPin: string | undefined
      if (formData.pin) {
        hashedPin = await bcrypt.hash(formData.pin, 10)
      }

      if (editingGuide) {
        const updateData: any = {
          name: formData.name,
          nickname: formData.nickname || null,
          phone: formData.phone || null,
          whatsapp: formData.whatsapp || null,
          languages: formData.languages,
          status: formData.status,
          notes: formData.notes || null,
        }
        // Only update PIN if a new one was provided
        if (hashedPin) {
          updateData.access_pin = hashedPin
        }

        const { error } = await supabase
          .from('guides')
          .update(updateData)
          .eq('id', editingGuide.id)

        if (error) throw error
        toast.success('Guide updated successfully')
      } else {
        // Generate unique link ID for new guides
        const uniqueLinkId = nanoid(16)

        const { error } = await supabase
          .from('guides')
          .insert({
            company_id: user.company_id,
            name: formData.name,
            nickname: formData.nickname || null,
            phone: formData.phone || null,
            whatsapp: formData.whatsapp || null,
            languages: formData.languages,
            status: formData.status,
            notes: formData.notes || null,
            unique_link_id: uniqueLinkId,
            access_pin: hashedPin,
          })

        if (error) throw error
        toast.success('Guide created successfully')
      }

      setDialogOpen(false)
      fetchGuides()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save guide')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return

    const supabase = createClient()
    const { error } = await supabase
      .from('guides')
      .update({ status: 'deleted' })
      .eq('id', deleteId)

    if (error) {
      toast.error('Failed to delete guide')
    } else {
      toast.success('Guide deleted successfully')
      fetchGuides()
    }
    setDeleteId(null)
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

  const getPortalUrl = (guide: Guide) => {
    if (!guide.unique_link_id) return null
    return `${window.location.origin}/guide/${guide.unique_link_id}`
  }

  const copyPortalLink = async (guide: Guide) => {
    const url = getPortalUrl(guide)
    if (!url) {
      toast.error('Portal link not available')
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Portal link copied to clipboard')
    } catch {
      toast.error('Failed to copy link')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Guide Setup"
        description="Manage tour guides and their language capabilities"
      >
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Add Guide
        </Button>
      </PageHeader>

      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : guides.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserCheck className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No guides yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add guides to manage boat and tour assignments.
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Guide
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
                placeholder="Search guides..."
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
                  <TableHead>Languages</TableHead>
                  <TableHead>Portal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGuides.map((guide, index) => (
                  <TableRow key={guide.id}>
                    <TableCell className="text-center text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {guide.name}
                      {guide.nickname && (
                        <span className="text-muted-foreground ml-1">
                          ({guide.nickname})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {guide.phone ? (
                        <a href={`tel:${guide.phone}`} className="flex items-center gap-1 text-sm hover:text-primary">
                          <Phone className="h-3 w-3" />
                          {guide.phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {guide.whatsapp ? (
                        <a
                          href={`https://wa.me/${guide.whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm hover:text-primary"
                        >
                          <MessageCircle className="h-3 w-3" />
                          {guide.whatsapp}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {guide.languages && guide.languages.length > 0 ? (
                          guide.languages.slice(0, 3).map((lang) => (
                            <Badge key={lang} variant="outline" className="text-xs">
                              {lang}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                        {guide.languages && guide.languages.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{guide.languages.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {guide.unique_link_id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => copyPortalLink(guide)}
                            title="Copy portal link"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            asChild
                            title="Open portal"
                          >
                            <a
                              href={getPortalUrl(guide) || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[guide.status]}>
                        {guide.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(guide)}
                          title="Edit Guide"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(guide.id)}
                          title="Delete Guide"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredGuides.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No guides found matching your search.
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingGuide ? 'Edit Guide' : 'Add Guide'}
            </DialogTitle>
            <DialogDescription>
              {editingGuide
                ? 'Update the guide details below.'
                : 'Add a new tour guide with their language capabilities.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Guide Name *</Label>
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

            {/* Languages Multi-Select */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Languages className="h-4 w-4" />
                Languages *
              </Label>
              <div className="border rounded-md p-3">
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.languages.map((lang) => (
                    <Badge key={lang} variant="default" className="gap-1">
                      {lang}
                      <button
                        type="button"
                        onClick={() => toggleLanguage(lang)}
                        className="ml-1 hover:bg-primary-foreground/20 rounded-full"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {formData.languages.length === 0 && (
                    <span className="text-sm text-muted-foreground">
                      Select languages below...
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {AVAILABLE_LANGUAGES.map((lang) => (
                    <label
                      key={lang}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded"
                    >
                      <Checkbox
                        checked={formData.languages.includes(lang)}
                        onCheckedChange={() => toggleLanguage(lang)}
                      />
                      {lang}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Portal PIN */}
            <div className="space-y-2">
              <Label htmlFor="pin" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Portal PIN {!editingGuide && '*'}
              </Label>
              <Input
                id="pin"
                type="password"
                value={formData.pin}
                onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                placeholder={editingGuide ? 'Leave empty to keep current PIN' : '4-digit PIN'}
                maxLength={4}
                className="font-mono tracking-widest"
              />
              <p className="text-xs text-muted-foreground">
                {editingGuide 
                  ? 'Enter a new 4-digit PIN to change it, or leave empty to keep the current PIN.'
                  : 'Set a 4-digit PIN for the guide to access their portal.'}
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

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this guide..."
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
            <AlertDialogTitle>Delete Guide</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this guide? They will be removed from all future assignments.
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
