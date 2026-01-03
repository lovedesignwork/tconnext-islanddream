"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Spinner } from '@/components/ui/spinner'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'
import type { CompanyTeamMember, TeamMemberPermissions } from '@/types'

interface StaffDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  staff?: CompanyTeamMember | null
  onSuccess: () => void
}

const PERMISSION_PAGES = [
  { key: 'dashboard', label: 'Bookings', description: 'Main bookings dashboard' },
  { key: 'slots', label: 'Program Slots', description: 'Daily capacity management' },
  { key: 'pickup', label: 'Pick-up', description: 'Pick-up scheduling' },
  { key: 'set_boat', label: 'Set Boat', description: 'Boat assignments' },
  { key: 'op_report', label: 'OP Report', description: 'Operations report' },
  { key: 'invoices', label: 'Invoices', description: 'Invoice management' },
  { key: 'finance', label: 'Finance', description: 'Financial overview' },
  { key: 'reports', label: 'Reports', description: 'Analytics and reports' },
  { key: 'programs', label: 'Programs', description: 'Program setup' },
  { key: 'agents', label: 'Agents', description: 'Agent management' },
  { key: 'drivers', label: 'Drivers', description: 'Driver management' },
  { key: 'guides', label: 'Guides', description: 'Guide management' },
  { key: 'restaurants', label: 'Restaurants', description: 'Restaurant management' },
  { key: 'boats', label: 'Boats', description: 'Boat setup' },
  { key: 'hotels', label: 'Hotels', description: 'Location management' },
] as const

const PERMISSION_ACTIONS = ['view', 'create', 'edit', 'delete'] as const

type PageKey = typeof PERMISSION_PAGES[number]['key']
type ActionKey = typeof PERMISSION_ACTIONS[number]

export function StaffDialog({ open, onOpenChange, companyId, staff, onSuccess }: StaffDialogProps) {
  const isEditing = !!staff
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [permissions, setPermissions] = useState<TeamMemberPermissions>({})

  // Reset form when dialog opens/closes or staff changes
  useEffect(() => {
    if (open) {
      if (staff) {
        setName(staff.name)
        setEmail(staff.email || '')
        setPassword('')
        setIsActive(staff.status === 'active')
        setPermissions(staff.permissions || {})
      } else {
        setName('')
        setEmail('')
        setPassword('')
        setIsActive(true)
        setPermissions({})
      }
    }
  }, [open, staff])

  const handlePermissionChange = (page: PageKey, action: ActionKey, checked: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [page]: {
        ...(prev[page] || {}),
        [action]: checked,
      },
    }))
  }

  const handleSelectAllForPage = (page: PageKey, selectAll: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [page]: {
        view: selectAll,
        create: selectAll,
        edit: selectAll,
        delete: selectAll,
      },
    }))
  }

  const isAllSelectedForPage = (page: PageKey): boolean => {
    const pagePerms = permissions[page]
    if (!pagePerms) return false
    return PERMISSION_ACTIONS.every(action => pagePerms[action])
  }

  // Bulk permission controls
  const setFullAccess = () => {
    const fullPerms: TeamMemberPermissions = {}
    PERMISSION_PAGES.forEach(page => {
      fullPerms[page.key] = { view: true, create: true, edit: true, delete: true }
    })
    setPermissions(fullPerms)
  }

  const setViewOnly = () => {
    const viewPerms: TeamMemberPermissions = {}
    PERMISSION_PAGES.forEach(page => {
      viewPerms[page.key] = { view: true, create: false, edit: false, delete: false }
    })
    setPermissions(viewPerms)
  }

  const setNoAccess = () => {
    setPermissions({})
  }

  const selectAllPermissions = () => {
    setFullAccess()
  }

  const deselectAllPermissions = () => {
    setNoAccess()
  }

  // Check bulk selection state
  const isFullAccess = PERMISSION_PAGES.every(page => 
    permissions[page.key]?.view && permissions[page.key]?.create && 
    permissions[page.key]?.edit && permissions[page.key]?.delete
  )

  const isViewOnly = PERMISSION_PAGES.every(page => 
    permissions[page.key]?.view && !permissions[page.key]?.create && 
    !permissions[page.key]?.edit && !permissions[page.key]?.delete
  )

  const isNoAccess = PERMISSION_PAGES.every(page => 
    !permissions[page.key]?.view && !permissions[page.key]?.create && 
    !permissions[page.key]?.edit && !permissions[page.key]?.delete
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Name is required')
      return
    }

    if (!isEditing && !password) {
      toast.error('Password is required for new staff')
      return
    }

    if (password && password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      if (isEditing) {
        // Update existing staff
        const response = await fetch('/api/auth/update-team-member', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            team_member_id: staff!.id,
            name,
            email: email || null,
            password: password || undefined,
            status: isActive ? 'active' : 'suspended',
            permissions,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to update staff')
        }

        toast.success('Staff member updated successfully')
      } else {
        // Create new staff
        const response = await fetch('/api/auth/create-team-member', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_id: companyId,
            name,
            email: email || null,
            password,
            permissions,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create staff')
        }

        toast.success(`Staff member created! Staff ID: ${data.data.staff_code}`)
      }

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Staff Member' : 'Add Staff Member'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Editing ${staff?.name}${staff?.staff_code ? ` (${staff.staff_code})` : ''}`
              : 'Create a new staff member for your team. A unique Staff ID will be generated automatically.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Staff ID Badge (for existing staff) */}
          {isEditing && staff?.staff_code && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Staff ID:</span>
              <Badge variant="secondary" className="text-base font-mono">
                {staff.staff_code}
              </Badge>
            </div>
          )}

          {/* Basic Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Staff member name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@company.com"
              />
              <p className="text-xs text-muted-foreground">
                Optional. Staff can login with Staff ID even without email.
              </p>
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">
              Password {isEditing ? '(leave empty to keep current)' : '*'}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEditing ? 'Enter new password' : 'Create password'}
                required={!isEditing}
                minLength={6}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Status</Label>
              <p className="text-sm text-muted-foreground">
                Suspended staff cannot log in
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm ${isActive ? 'text-green-600' : 'text-muted-foreground'}`}>
                {isActive ? 'Active' : 'Suspended'}
              </span>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>

          <Separator />

          {/* Permissions */}
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-medium">Permissions</h3>
                <p className="text-sm text-muted-foreground">
                  Control what this staff member can access and do
                </p>
              </div>
            </div>

            {/* Bulk Permission Controls */}
            <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium text-muted-foreground mr-2 self-center">Quick Set:</span>
              <Button
                type="button"
                variant={isFullAccess ? "default" : "outline"}
                size="sm"
                onClick={setFullAccess}
              >
                Full Access
              </Button>
              <Button
                type="button"
                variant={isViewOnly ? "default" : "outline"}
                size="sm"
                onClick={setViewOnly}
              >
                View Only
              </Button>
              <Button
                type="button"
                variant={isNoAccess ? "default" : "outline"}
                size="sm"
                onClick={setNoAccess}
              >
                No Access
              </Button>
              <Separator orientation="vertical" className="h-8 mx-2" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={selectAllPermissions}
              >
                Select All
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={deselectAllPermissions}
              >
                Deselect All
              </Button>
            </div>

            <div className="space-y-3">
              {PERMISSION_PAGES.map((page) => (
                <div
                  key={page.key}
                  className="p-3 border rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{page.label}</p>
                      <p className="text-xs text-muted-foreground">{page.description}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSelectAllForPage(page.key, !isAllSelectedForPage(page.key))}
                    >
                      {isAllSelectedForPage(page.key) ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {PERMISSION_ACTIONS.map((action) => (
                      <label
                        key={`${page.key}-${action}`}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Checkbox
                          checked={permissions[page.key]?.[action] || false}
                          onCheckedChange={(checked) =>
                            handlePermissionChange(page.key, action, checked === true)
                          }
                        />
                        <span className="text-sm capitalize">{action}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Spinner size="sm" className="mr-2" />}
              {isEditing ? 'Save Changes' : 'Create Staff'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

