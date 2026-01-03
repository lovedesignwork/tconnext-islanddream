"use client"

import React, { useEffect, useState, useMemo } from 'react'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  Mail,
  Phone,
  MessageCircle,
  DollarSign,
  MoreVertical,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  UserPlus,
  Ban,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Building2,
  Zap,
  X,
  Lock,
  Calendar,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Agent, Program, EntityStatus, AgentStaff, AgentType, Company } from '@/types'

interface AgentWithStats extends Agent {
  bookings_count?: number
  last_booking_date?: string | null
  staff_count?: number
  staff?: AgentStaff[]
}

type SortField = 'name' | 'bookings_count' | 'status' | 'last_booking_date'
type SortOrder = 'asc' | 'desc'

export default function AgentsPage() {
  const { user } = useAuth()
  const [agents, setAgents] = useState<AgentWithStats[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pricingDialogOpen, setPricingDialogOpen] = useState(false)
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [staffDialogOpen, setStaffDialogOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<AgentWithStats | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set())
  const [bulkPricingDialogOpen, setBulkPricingDialogOpen] = useState(false)
  
  // PIN verification state
  const [pinVerified, setPinVerified] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [pendingPricingAgent, setPendingPricingAgent] = useState<AgentWithStats | null>(null)
  
  // Staff delete state
  const [deleteStaffId, setDeleteStaffId] = useState<string | null>(null)
  const [deleteStaffName, setDeleteStaffName] = useState<string>('')

  // Filtering state
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  // Staff management state
  const [editingStaff, setEditingStaff] = useState<AgentStaff | null>(null)
  const [staffFormData, setStaffFormData] = useState({
    full_name: '',
    nickname: '',
    phone: '',
    status: 'active' as 'active' | 'suspended',
  })

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    unique_code: '',
    contact_person: '',
    email: '',
    phone: '',
    whatsapp: '',
    status: 'active' as EntityStatus,
    agent_type: 'partner' as AgentType,
    notes: '',
    tax_id: '',
    address: '',
    tax_applied: true,
  })

  // Pricing form state - now includes adult/child prices
  const [pricingData, setPricingData] = useState<Record<string, { 
    selling_price: number
    agent_price: number
    adult_agent_price: number
    child_agent_price: number
  }>>({})

  const fetchAgents = async () => {
    if (!user?.company_id) return

    try {
      // Fetch company settings for PIN
      const supabase = createClient()
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', user.company_id)
        .single()
      
      if (companyData) {
        setCompany(companyData)
      }

      // Fetch agents via API route to bypass RLS
      const response = await fetch('/api/agents/data')
      
      if (!response.ok) {
        if (response.status >= 500) {
          toast.error('Failed to load agents')
        }
        setLoading(false)
        return
      }

      const { agents: agentsData, programs: programsData, agentPricing } = await response.json()

      // Transform agents data
      const agentsWithStats = (agentsData || []).map((agent: any) => ({
        ...agent,
        bookings_count: agent.booking_count || 0,
        last_booking_date: null,
        staff_count: agent.agent_staff?.length || 0,
        staff: agent.agent_staff || [],
      }))

      setAgents(agentsWithStats)
      setPrograms(programsData || [])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching agents:', error)
      toast.error('Failed to load agents')
      setLoading(false)
    }
  }

  const fetchPrograms = async () => {
    if (!user?.company_id) return

    const supabase = createClient()
    const { data } = await supabase
      .from('programs')
      .select('*')
      .eq('company_id', user.company_id)
      .eq('status', 'active')
      .order('name')

    setPrograms(data || [])
  }

  useEffect(() => {
    fetchAgents()
    fetchPrograms()
  }, [user])

  // Function to merge duplicate agents
  const mergeDuplicateAgents = async () => {
    if (!user?.company_id) return

    setSaving(true)
    const supabase = createClient()

    try {
      // Group agents by normalized name
      const agentGroups: Record<string, AgentWithStats[]> = {}
      for (const agent of agents) {
        const key = agent.name.toLowerCase().trim()
        if (!agentGroups[key]) {
          agentGroups[key] = []
        }
        agentGroups[key].push(agent)
      }

      // Find groups with duplicates
      const duplicateGroups = Object.entries(agentGroups).filter(
        ([_, group]) => group.length > 1
      )

      if (duplicateGroups.length === 0) {
        toast.info('No duplicate agents found')
        setSaving(false)
        return
      }

      let totalMerged = 0

      for (const [_, group] of duplicateGroups) {
        // Sort by booking count (desc), then by created_at (asc)
        const sorted = [...group].sort((a, b) => {
          if ((b.bookings_count || 0) !== (a.bookings_count || 0)) {
            return (b.bookings_count || 0) - (a.bookings_count || 0)
          }
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
        })

        // Keep the first one (most bookings or oldest)
        const keepAgent = sorted[0]
        const duplicates = sorted.slice(1)

        for (const duplicate of duplicates) {
          // Move bookings to kept agent
          await supabase
            .from('bookings')
            .update({ agent_id: keepAgent.id })
            .eq('agent_id', duplicate.id)

          // Get existing pricing for kept agent
          const { data: existingPricing } = await supabase
            .from('agent_pricing')
            .select('program_id')
            .eq('agent_id', keepAgent.id)

          const existingProgramIds = new Set(
            existingPricing?.map((p) => p.program_id) || []
          )

          // Delete duplicate pricing that would conflict
          if (existingProgramIds.size > 0) {
            await supabase
              .from('agent_pricing')
              .delete()
              .eq('agent_id', duplicate.id)
              .in('program_id', Array.from(existingProgramIds))
          }

          // Move remaining pricing
          await supabase
            .from('agent_pricing')
            .update({ agent_id: keepAgent.id })
            .eq('agent_id', duplicate.id)

          // Move agent_staff
          await supabase
            .from('agent_staff')
            .update({ agent_id: keepAgent.id })
            .eq('agent_id', duplicate.id)

          // Soft delete the duplicate agent
          await supabase
            .from('agents')
            .update({ status: 'deleted' })
            .eq('id', duplicate.id)

          totalMerged++
        }
      }

      toast.success(`Merged ${totalMerged} duplicate agent(s)`)
      fetchAgents() // Refresh the list
    } catch (error: any) {
      toast.error(error.message || 'Failed to merge duplicate agents')
    } finally {
      setSaving(false)
    }
  }

  // Filtered and sorted agents
  const filteredAgents = useMemo(() => {
    let result = [...agents]

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(agent => 
        agent.name.toLowerCase().includes(term) ||
        agent.contact_person?.toLowerCase().includes(term) ||
        agent.email?.toLowerCase().includes(term)
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(agent => agent.status === statusFilter)
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'bookings_count':
          comparison = (a.bookings_count || 0) - (b.bookings_count || 0)
          break
        case 'last_booking_date':
          const dateA = a.last_booking_date || ''
          const dateB = b.last_booking_date || ''
          comparison = dateA.localeCompare(dateB)
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [agents, searchTerm, statusFilter, sortField, sortOrder])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />
    return sortOrder === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" /> 
      : <ArrowDown className="h-4 w-4 ml-1" />
  }

  const toggleRowExpansion = (agentId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(agentId)) {
      newExpanded.delete(agentId)
    } else {
      newExpanded.add(agentId)
    }
    setExpandedRows(newExpanded)
  }

  const toggleAgentSelection = (agentId: string) => {
    const newSelected = new Set(selectedAgents)
    if (newSelected.has(agentId)) {
      newSelected.delete(agentId)
    } else {
      newSelected.add(agentId)
    }
    setSelectedAgents(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedAgents.size === filteredAgents.length) {
      setSelectedAgents(new Set())
    } else {
      setSelectedAgents(new Set(filteredAgents.map(a => a.id)))
    }
  }

  const openCreateDialog = () => {
    setEditingAgent(null)
    setFormData({
      name: '',
      unique_code: '',
      contact_person: '',
      email: '',
      phone: '',
      whatsapp: '',
      status: 'active',
      agent_type: 'partner',
      notes: '',
      tax_id: '',
      address: '',
      tax_applied: true,
    })
    setDialogOpen(true)
  }

  const openEditDialog = (agent: AgentWithStats) => {
    setEditingAgent(agent)
    setFormData({
      name: agent.name,
      unique_code: agent.unique_code || '',
      contact_person: agent.contact_person || '',
      email: agent.email || '',
      phone: agent.phone || '',
      whatsapp: agent.whatsapp || '',
      status: agent.status,
      agent_type: agent.agent_type || 'partner',
      notes: agent.notes || '',
      tax_id: agent.tax_id || '',
      address: agent.address || '',
      tax_applied: agent.tax_applied !== false, // Default to true if undefined
    })
    setDialogOpen(true)
  }

  const openDetailsDialog = (agent: AgentWithStats) => {
    setEditingAgent(agent)
    setDetailsDialogOpen(true)
  }

  const openStaffDialog = (agent: AgentWithStats, staff?: AgentStaff) => {
    setEditingAgent(agent)
    setEditingStaff(staff || null)
    setStaffFormData({
      full_name: staff?.full_name || '',
      nickname: staff?.nickname || '',
      phone: staff?.phone || '',
      status: staff?.status || 'active',
    })
    setStaffDialogOpen(true)
  }

  const openPricingDialog = async (agent: AgentWithStats) => {
    // Check if PIN protection is enabled and not yet verified
    if (company?.pricing_pin_enabled && company?.pricing_pin && !pinVerified) {
      setPendingPricingAgent(agent)
      setPinInput('')
      setPinError('')
      setPinDialogOpen(true)
      return
    }
    
    await loadPricingAndOpenDialog(agent)
  }
  
  const loadPricingAndOpenDialog = async (agent: AgentWithStats) => {
    setEditingAgent(agent)
    
    // Fetch existing pricing
    const supabase = createClient()
    const { data } = await supabase
      .from('agent_pricing')
      .select('*')
      .eq('agent_id', agent.id)

    const pricing: Record<string, { 
      selling_price: number
      agent_price: number
      adult_agent_price: number
      child_agent_price: number
    }> = {}
    programs.forEach(program => {
      const existing = data?.find(p => p.program_id === program.id)
      const pricingType = (program as any).pricing_type || 'single'
      const sellingPrice = (program as any).selling_price || program.base_price || 0
      const adultSellingPrice = (program as any).adult_selling_price || 0
      const childSellingPrice = (program as any).child_selling_price || 0
      
      pricing[program.id] = {
        // Selling prices come from program (read-only in agent pricing)
        selling_price: sellingPrice,
        agent_price: existing?.agent_price || sellingPrice,
        adult_agent_price: existing?.adult_agent_price || adultSellingPrice,
        child_agent_price: existing?.child_agent_price || childSellingPrice,
      }
    })
    setPricingData(pricing)
    setPricingDialogOpen(true)
  }
  
  const handlePinSubmit = async () => {
    if (pinInput === company?.pricing_pin) {
      setPinVerified(true)
      setPinDialogOpen(false)
      if (pendingPricingAgent) {
        await loadPricingAndOpenDialog(pendingPricingAgent)
        setPendingPricingAgent(null)
      } else if (selectedAgents.size > 0) {
        // Bulk pricing mode
        await loadBulkPricingAndOpenDialog()
      }
    } else {
      setPinError('Incorrect PIN. Please try again.')
    }
  }

  const loadBulkPricingAndOpenDialog = async () => {
    // Initialize pricing data for bulk edit (using program defaults)
    const pricing: Record<string, { 
      selling_price: number
      agent_price: number
      adult_agent_price: number
      child_agent_price: number
    }> = {}
    programs.forEach(program => {
      const pricingType = (program as any).pricing_type || 'single'
      const sellingPrice = (program as any).selling_price || program.base_price || 0
      const adultSellingPrice = (program as any).adult_selling_price || 0
      const childSellingPrice = (program as any).child_selling_price || 0
      
      pricing[program.id] = {
        selling_price: sellingPrice,
        agent_price: sellingPrice,
        adult_agent_price: adultSellingPrice,
        child_agent_price: childSellingPrice,
      }
    })
    setPricingData(pricing)
    setBulkPricingDialogOpen(true)
  }

  const handleSaveBulkPricing = async () => {
    if (selectedAgents.size === 0) return

    setSaving(true)
    const supabase = createClient()

    try {
      // Apply pricing to all selected agents
      for (const agentId of selectedAgents) {
        for (const [programId, prices] of Object.entries(pricingData)) {
          const program = programs.find(p => p.id === programId)
          const pricingType = (program as any)?.pricing_type || 'single'
          const sellingPrice = (program as any)?.selling_price || program?.base_price || 0
          
          const { error } = await supabase
            .from('agent_pricing')
            .upsert({
              agent_id: agentId,
              program_id: programId,
              selling_price: sellingPrice,
              agent_price: prices.agent_price,
              adult_agent_price: pricingType === 'adult_child' ? prices.adult_agent_price : null,
              child_agent_price: pricingType === 'adult_child' ? prices.child_agent_price : null,
            }, { onConflict: 'agent_id,program_id' })

          if (error) throw error
        }
      }

      toast.success(`Pricing updated for ${selectedAgents.size} agent${selectedAgents.size > 1 ? 's' : ''}`)
      setBulkPricingDialogOpen(false)
      setSelectedAgents(new Set())
    } catch (error: any) {
      toast.error(error.message || 'Failed to save pricing')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    if (!user?.company_id) return
    if (!formData.name.trim()) {
      toast.error('Agent name is required')
      return
    }
    if (!formData.unique_code.trim()) {
      toast.error('Agent ID is required')
      return
    }

    setSaving(true)
    const supabase = createClient()

    try {
      // Check for unique_code uniqueness within company
      const { data: existingAgent } = await supabase
        .from('agents')
        .select('id')
        .eq('company_id', user.company_id)
        .eq('unique_code', formData.unique_code.trim())
        .neq('status', 'deleted')
        .neq('id', editingAgent?.id || '')
        .single()
      
      if (existingAgent) {
        toast.error('This Agent ID is already in use. Please choose a different one.')
        setSaving(false)
        return
      }

      if (editingAgent) {
        // Update via API route to bypass RLS
        const response = await fetch('/api/agents/crud', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingAgent.id,
            name: formData.name,
            unique_code: formData.unique_code.trim() || null,
            contact_person: formData.contact_person || null,
            email: formData.email || null,
            phone: formData.phone || null,
            whatsapp: formData.whatsapp || null,
            status: formData.status,
            agent_type: formData.agent_type,
            notes: formData.notes || null,
            tax_id: formData.tax_id || null,
            address: formData.address || null,
            tax_applied: formData.tax_applied,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to update agent')
        }
        toast.success('Agent updated successfully')
      } else {
        // Create via API route to bypass RLS
        const response = await fetch('/api/agents/crud', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            unique_code: formData.unique_code.trim() || null,
            contact_person: formData.contact_person || null,
            email: formData.email || null,
            phone: formData.phone || null,
            whatsapp: formData.whatsapp || null,
            status: formData.status,
            agent_type: formData.agent_type,
            notes: formData.notes || null,
            tax_id: formData.tax_id || null,
            address: formData.address || null,
            tax_applied: formData.tax_applied,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to create agent')
        }
        toast.success('Agent created successfully')
      }

      setDialogOpen(false)
      fetchAgents()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save agent')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveStaff = async () => {
    if (!editingAgent) return
    if (!staffFormData.full_name.trim()) {
      toast.error(editingAgent.agent_type === 'direct' ? 'Source name is required' : 'Staff name is required')
      return
    }

    setSaving(true)
    const supabase = createClient()

    try {
      if (editingStaff) {
        const { error } = await supabase
          .from('agent_staff')
          .update({
            full_name: staffFormData.full_name,
            nickname: staffFormData.nickname || null,
            phone: staffFormData.phone || null,
            status: staffFormData.status,
          })
          .eq('id', editingStaff.id)

        if (error) throw error
        toast.success(editingAgent.agent_type === 'direct' ? 'Source updated successfully' : 'Staff updated successfully')
      } else {
        const { error } = await supabase
          .from('agent_staff')
          .insert({
            agent_id: editingAgent.id,
            full_name: staffFormData.full_name,
            nickname: staffFormData.nickname || null,
            phone: staffFormData.phone || null,
            status: staffFormData.status,
          })

        if (error) throw error
        toast.success(editingAgent.agent_type === 'direct' ? 'Source added successfully' : 'Staff added successfully')
      }

      setStaffDialogOpen(false)
      fetchAgents()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteStaff = async () => {
    if (!deleteStaffId) return
    
    const supabase = createClient()
    const { error } = await supabase
      .from('agent_staff')
      .delete()
      .eq('id', deleteStaffId)

    if (error) {
      toast.error('Failed to delete')
    } else {
      toast.success('Deleted successfully')
      fetchAgents()
    }
    setDeleteStaffId(null)
    setDeleteStaffName('')
  }
  
  const openDeleteStaffDialog = (staffId: string, staffName: string) => {
    setDeleteStaffId(staffId)
    setDeleteStaffName(staffName)
  }

  const handleSavePricing = async () => {
    if (!editingAgent) return

    setSaving(true)
    const supabase = createClient()

    try {
      // Upsert pricing for each program
      for (const [programId, prices] of Object.entries(pricingData)) {
        const program = programs.find(p => p.id === programId)
        const pricingType = (program as any)?.pricing_type || 'single'
        const sellingPrice = (program as any)?.selling_price || program?.base_price || 0
        
        const { error } = await supabase
          .from('agent_pricing')
          .upsert({
            agent_id: editingAgent.id,
            program_id: programId,
            // Selling price comes from program, not editable here
            selling_price: sellingPrice,
            agent_price: prices.agent_price,
            adult_agent_price: pricingType === 'adult_child' ? prices.adult_agent_price : null,
            child_agent_price: pricingType === 'adult_child' ? prices.child_agent_price : null,
          }, { onConflict: 'agent_id,program_id' })

        if (error) throw error
      }

      toast.success('Pricing updated successfully')
      setPricingDialogOpen(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to save pricing')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async (agent: AgentWithStats) => {
    const newStatus = agent.status === 'active' ? 'suspended' : 'active'
    const supabase = createClient()
    
    const { error } = await supabase
      .from('agents')
      .update({ status: newStatus })
      .eq('id', agent.id)

    if (error) {
      toast.error('Failed to update status')
    } else {
      toast.success(`Agent ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`)
      fetchAgents()
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return

    const supabase = createClient()
    const { error } = await supabase
      .from('agents')
      .update({ status: 'deleted' })
      .eq('id', deleteId)

    if (error) {
      toast.error('Failed to delete agent')
    } else {
      toast.success('Agent deleted successfully')
      fetchAgents()
    }
    setDeleteId(null)
  }

  const statusColors = {
    active: 'success',
    suspended: 'warning',
    deleted: 'destructive',
  } as const

  const getStaffLabel = (agent: AgentWithStats) => {
    return agent.agent_type === 'direct' ? 'Sources' : 'Staff'
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agents"
        description="Manage booking agents, partners, and direct booking sources"
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={mergeDuplicateAgents} disabled={saving}>
            <Trash2 className="w-4 h-4 mr-2" />
            Merge Duplicates
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Add Agent
          </Button>
        </div>
      </PageHeader>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search agents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="p-0">
            <div className="space-y-4 p-6">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : agents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No agents yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add agents to track booking sources and commission.
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Agent
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          {/* Bulk Actions Bar */}
          {selectedAgents.size > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
              <span className="text-sm text-muted-foreground">
                {selectedAgents.size} agent{selectedAgents.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedAgents(new Set())}
                >
                  Clear Selection
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (company?.pricing_pin_enabled && company?.pricing_pin && !pinVerified) {
                      setPinInput('')
                      setPinError('')
                      setPinDialogOpen(true)
                      // After PIN verification, open bulk pricing
                      setPendingPricingAgent(null) // Use null to indicate bulk mode
                    } else {
                      setBulkPricingDialogOpen(true)
                    }
                  }}
                >
                  <DollarSign className="w-4 h-4 mr-1" />
                  Bulk Edit Pricing
                </Button>
              </div>
            </div>
          )}
          <CardContent className="p-0">
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px] px-2">
                    <Checkbox
                      checked={selectedAgents.size === filteredAgents.length && filteredAgents.length > 0}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead className="w-[40px] px-2"></TableHead>
                  <TableHead className="w-[80px] px-2">
                    <span className="text-xs font-medium">ID</span>
                  </TableHead>
                  <TableHead className="w-[200px] px-2">
                    <button
                      className="flex items-center text-xs font-medium hover:text-foreground"
                      onClick={() => handleSort('name')}
                    >
                      Agent Name
                      {getSortIcon('name')}
                    </button>
                  </TableHead>
                  <TableHead className="w-[180px] px-2">
                    <span className="text-xs font-medium">Contact</span>
                  </TableHead>
                  <TableHead className="w-[50px] px-2 text-center">
                    <span className="text-xs font-medium">Staff</span>
                  </TableHead>
                  <TableHead className="w-[70px] px-2">
                    <button
                      className="flex items-center text-xs font-medium hover:text-foreground"
                      onClick={() => handleSort('bookings_count')}
                    >
                      Bookings
                      {getSortIcon('bookings_count')}
                    </button>
                  </TableHead>
                  <TableHead className="w-[90px] px-2">
                    <button
                      className="flex items-center text-xs font-medium hover:text-foreground"
                      onClick={() => handleSort('last_booking_date')}
                    >
                      Last Booking
                      {getSortIcon('last_booking_date')}
                    </button>
                  </TableHead>
                  <TableHead className="w-[70px] px-2">
                    <button
                      className="flex items-center text-xs font-medium hover:text-foreground"
                      onClick={() => handleSort('status')}
                    >
                      Status
                      {getSortIcon('status')}
                    </button>
                  </TableHead>
                  <TableHead className="w-[240px] px-2 text-right">
                    <span className="text-xs font-medium">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No agents found matching your filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAgents.map((agent) => (
                    <>
                      <TableRow key={agent.id} className="group">
                        <TableCell className="px-2 py-2">
                          <Checkbox
                            checked={selectedAgents.has(agent.id)}
                            onCheckedChange={() => toggleAgentSelection(agent.id)}
                            aria-label={`Select ${agent.name}`}
                          />
                        </TableCell>
                        <TableCell className="px-2 py-2">
                          <button
                            onClick={() => toggleRowExpansion(agent.id)}
                            className="p-0.5 hover:bg-muted rounded"
                          >
                            {expandedRows.has(agent.id) ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </TableCell>
                        <TableCell className="px-2 py-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            {agent.unique_code || '—'}
                          </span>
                        </TableCell>
                        <TableCell className="px-2 py-2">
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{agent.name}</span>
                            {agent.contact_person && (
                              <span className="text-xs text-muted-foreground">{agent.contact_person}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-2 py-2">
                          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                            {agent.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-2.5 w-2.5" />
                                <span className="truncate max-w-[120px]">{agent.email}</span>
                              </div>
                            )}
                            {agent.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-2.5 w-2.5" />
                                {agent.phone}
                              </div>
                            )}
                            {!agent.email && !agent.phone && (
                              <span className="text-muted-foreground/50">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-2 py-2 text-center">
                          <Badge variant="outline" className="font-mono text-xs px-1.5 py-0">
                            {agent.staff_count || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-2 py-2">
                          <span className="font-mono text-xs">{agent.bookings_count || 0}</span>
                        </TableCell>
                        <TableCell className="px-2 py-2">
                          {agent.last_booking_date ? (
                            <span className="text-xs text-muted-foreground">
                              {new Date(agent.last_booking_date).toLocaleDateString('en-GB', { 
                                day: '2-digit', 
                                month: 'short', 
                                year: '2-digit' 
                              })}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">—</span>
                          )}
                        </TableCell>
                        <TableCell className="px-2 py-2">
                          <Badge variant={statusColors[agent.status]} className="text-xs px-1.5 py-0">
                            {agent.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-2 py-2">
                          <div className="flex items-center justify-end gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openDetailsDialog(agent)}
                              title="View Details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => openEditDialog(agent)}
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => openStaffDialog(agent)}
                            >
                              <UserPlus className="h-3 w-3 mr-1" />
                              {agent.agent_type === 'direct' ? 'Source' : 'Staff'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => openPricingDialog(agent)}
                            >
                              <DollarSign className="h-3 w-3 mr-1" />
                              Pricing
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleToggleStatus(agent)}
                              title={agent.status === 'active' ? 'Suspend' : 'Activate'}
                            >
                              {agent.status === 'active' ? (
                                <Ban className="h-3.5 w-3.5" />
                              ) : (
                                <CheckCircle className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteId(agent.id)}
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {/* Expanded Staff/Sources Row */}
                      {expandedRows.has(agent.id) && (
                        <TableRow key={`${agent.id}-expanded`}>
                          <TableCell colSpan={10} className="bg-muted/30 p-0">
                            <div className="p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium text-sm">
                                  {getStaffLabel(agent)} ({agent.staff?.length || 0})
                                </h4>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openStaffDialog(agent)}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add {agent.agent_type === 'direct' ? 'Source' : 'Staff'}
                                </Button>
                              </div>
                              {agent.staff && agent.staff.length > 0 ? (
                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                  {agent.staff.map((staff) => (
                                    <div
                                      key={staff.id}
                                      className="flex items-center justify-between p-3 bg-background rounded-lg border"
                                    >
                                      <div className="flex flex-col">
                                        <span className="font-medium text-sm">{staff.full_name}</span>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          {staff.nickname && <span>({staff.nickname})</span>}
                                          {staff.phone && (
                                            <span className="flex items-center gap-1">
                                              <Phone className="h-3 w-3" />
                                              {staff.phone}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Badge variant={staff.status === 'active' ? 'success' : 'warning'} className="text-xs">
                                          {staff.status}
                                        </Badge>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                              <MoreVertical className="h-3 w-3" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => openStaffDialog(agent, staff)}>
                                              <Pencil className="mr-2 h-4 w-4" />
                                              Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              className="text-destructive focus:text-destructive"
                                              onClick={() => openDeleteStaffDialog(staff.id, staff.full_name)}
                                            >
                                              <Trash2 className="mr-2 h-4 w-4" />
                                              Delete
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  No {agent.agent_type === 'direct' ? 'sources' : 'staff'} added yet
                                </p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Agent Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAgent ? 'Edit Agent' : 'Add Agent'}
            </DialogTitle>
            <DialogDescription>
              {editingAgent
                ? 'Update the agent details below.'
                : 'Add a new booking agent or direct booking source.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="agent_type">Agent Type</Label>
              <Select
                value={formData.agent_type}
                onValueChange={(v) => setFormData({ ...formData, agent_type: v as AgentType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="partner">
                    <div className="flex items-center">
                      <Building2 className="h-4 w-4 mr-2" />
                      Partner Agent
                    </div>
                  </SelectItem>
                  <SelectItem value="direct">
                    <div className="flex items-center">
                      <Zap className="h-4 w-4 mr-2" />
                      Direct Booking
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="unique_code">Agent ID *</Label>
                <Input
                  id="unique_code"
                  value={formData.unique_code}
                  onChange={(e) => setFormData({ ...formData, unique_code: e.target.value.toUpperCase() })}
                  placeholder="e.g. AGT001"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Unique identifier for this agent
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Agent Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={formData.agent_type === 'direct' ? 'e.g. Direct Booking' : 'e.g. Thailand Tours Co.'}
                />
              </div>
            </div>

            {formData.agent_type === 'partner' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="contact_person">Contact Person</Label>
                  <Input
                    id="contact_person"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    placeholder="Primary contact name"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@example.com"
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
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="+66 xxx xxx xxxx"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="e.g. 78/89 Moo 8, Chaofah Rd., Chalong, Muang, Phuket 83000 Thailand."
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional. Will be displayed on invoices if provided.
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="tax_applied" className="text-sm font-medium">Tax Applied</Label>
                    <p className="text-xs text-muted-foreground">
                      When disabled, invoices will not show Tax IDs or calculate tax.
                    </p>
                  </div>
                  <Switch
                    id="tax_applied"
                    checked={formData.tax_applied}
                    onCheckedChange={(checked) => setFormData({ ...formData, tax_applied: checked })}
                  />
                </div>

                {formData.tax_applied && (
                  <div className="space-y-2">
                    <Label htmlFor="tax_id">Tax ID</Label>
                    <Input
                      id="tax_id"
                      value={formData.tax_id}
                      onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                      placeholder="e.g. 1234567898-1548"
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional. Will be displayed on invoices if provided.
                    </p>
                  </div>
                )}
              </>
            )}

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
                placeholder="Internal notes about this agent..."
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

      {/* Staff/Source Dialog */}
      <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingStaff 
                ? `Edit ${editingAgent?.agent_type === 'direct' ? 'Source' : 'Staff'}`
                : `Add ${editingAgent?.agent_type === 'direct' ? 'Source' : 'Staff'}`
              }
            </DialogTitle>
            <DialogDescription>
              {editingAgent?.agent_type === 'direct'
                ? 'Add a booking source like Phone, Email, Walk-in, etc.'
                : 'Add staff member details for this agent.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="staff_name">
                {editingAgent?.agent_type === 'direct' ? 'Source Name *' : 'Full Name *'}
              </Label>
              <Input
                id="staff_name"
                value={staffFormData.full_name}
                onChange={(e) => setStaffFormData({ ...staffFormData, full_name: e.target.value })}
                placeholder={editingAgent?.agent_type === 'direct' ? 'e.g. Facebook Messenger' : 'e.g. John Smith'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff_nickname">
                {editingAgent?.agent_type === 'direct' ? 'Short Name' : 'Nickname'}
              </Label>
              <Input
                id="staff_nickname"
                value={staffFormData.nickname}
                onChange={(e) => setStaffFormData({ ...staffFormData, nickname: e.target.value })}
                placeholder={editingAgent?.agent_type === 'direct' ? 'e.g. FB' : 'e.g. John'}
              />
            </div>

            {editingAgent?.agent_type === 'partner' && (
              <div className="space-y-2">
                <Label htmlFor="staff_phone">Phone</Label>
                <Input
                  id="staff_phone"
                  value={staffFormData.phone}
                  onChange={(e) => setStaffFormData({ ...staffFormData, phone: e.target.value })}
                  placeholder="+66 xxx xxx xxxx"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="staff_status">Status</Label>
              <Select
                value={staffFormData.status}
                onValueChange={(v) => setStaffFormData({ ...staffFormData, status: v as 'active' | 'suspended' })}
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setStaffDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveStaff} disabled={saving}>
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

      {/* View Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingAgent?.name}
              {editingAgent?.unique_code && (
                <Badge variant="outline" className="font-mono">
                  {editingAgent.unique_code}
                </Badge>
              )}
              <Badge variant={editingAgent?.agent_type === 'direct' ? 'secondary' : 'outline'}>
                {editingAgent?.agent_type === 'direct' ? 'Direct' : 'Partner'}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Agent details and {editingAgent?.agent_type === 'direct' ? 'booking sources' : 'staff members'}
            </DialogDescription>
          </DialogHeader>

          {editingAgent && (
            <div className="space-y-6 py-4">
              {/* Agent Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                {editingAgent.contact_person && (
                  <div>
                    <Label className="text-muted-foreground">Contact Person</Label>
                    <p className="font-medium">{editingAgent.contact_person}</p>
                  </div>
                )}
                {editingAgent.email && (
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {editingAgent.email}
                    </p>
                  </div>
                )}
                {editingAgent.phone && (
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="font-medium flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {editingAgent.phone}
                    </p>
                  </div>
                )}
                {editingAgent.whatsapp && (
                  <div>
                    <Label className="text-muted-foreground">WhatsApp</Label>
                    <p className="font-medium flex items-center gap-1">
                      <MessageCircle className="h-4 w-4" />
                      {editingAgent.whatsapp}
                    </p>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold">{editingAgent.bookings_count || 0}</p>
                    <p className="text-sm text-muted-foreground">Total Bookings</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold">
                      {editingAgent.last_booking_date 
                        ? new Date(editingAgent.last_booking_date).toLocaleDateString('en-GB', { 
                            day: '2-digit', 
                            month: 'short', 
                            year: '2-digit' 
                          })
                        : '—'}
                    </p>
                    <p className="text-sm text-muted-foreground">Last Booking</p>
                  </CardContent>
                </Card>
              </div>

              {/* Staff/Sources List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>{getStaffLabel(editingAgent)} ({editingAgent.staff?.length || 0})</Label>
                  <Button size="sm" variant="outline" onClick={() => {
                    setDetailsDialogOpen(false)
                    openStaffDialog(editingAgent)
                  }}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
                {editingAgent.staff && editingAgent.staff.length > 0 ? (
                  <div className="border rounded-lg divide-y">
                    {editingAgent.staff.map((staff) => (
                      <div key={staff.id} className="flex items-center justify-between p-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{staff.full_name}</span>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {staff.nickname && <span>({staff.nickname})</span>}
                            {staff.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {staff.phone}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant={staff.status === 'active' ? 'success' : 'warning'}>
                          {staff.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6 border rounded-lg">
                    No {editingAgent.agent_type === 'direct' ? 'sources' : 'staff'} added yet
                  </p>
                )}
              </div>

              {/* Notes */}
              {editingAgent.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <p className="mt-1 text-sm">{editingAgent.notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setDetailsDialogOpen(false)
              if (editingAgent) openEditDialog(editingAgent)
            }}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pricing Dialog */}
      <Dialog open={pricingDialogOpen} onOpenChange={setPricingDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Agent Pricing - {editingAgent?.name}</DialogTitle>
            <DialogDescription>
              Set agent prices for each program. Selling prices are set in Program Setup and shown here for reference.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 max-h-[500px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Program</TableHead>
                  <TableHead className="text-center">Type</TableHead>
                  <TableHead className="text-right">Selling Price</TableHead>
                  <TableHead>Agent Price</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {programs.map((program) => {
                  const pricingType = (program as any).pricing_type || 'single'
                  const sellingPrice = (program as any).selling_price || program.base_price || 0
                  const adultSellingPrice = (program as any).adult_selling_price || 0
                  const childSellingPrice = (program as any).child_selling_price || 0
                  
                  const prices = pricingData[program.id] || {
                    selling_price: sellingPrice,
                    agent_price: sellingPrice,
                    adult_agent_price: adultSellingPrice,
                    child_agent_price: childSellingPrice,
                  }

                  if (pricingType === 'single') {
                    const commission = sellingPrice - prices.agent_price
                    return (
                      <TableRow key={program.id}>
                        <TableCell className="font-medium">
                          <span className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: (program as any).color || '#3B82F6' }}
                            />
                            {program.name}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-xs">Per Person</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm text-muted-foreground font-medium">
                            {formatCurrency(sellingPrice)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={prices.agent_price}
                            onChange={(e) => setPricingData({
                              ...pricingData,
                              [program.id]: {
                                ...prices,
                                agent_price: parseFloat(e.target.value) || 0,
                              },
                            })}
                            className="w-28"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={commission >= 0 ? 'success' : 'destructive'}>
                            {formatCurrency(commission)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  } else {
                    // Adult/Child pricing - show two rows
                    const adultCommission = adultSellingPrice - prices.adult_agent_price
                    const childCommission = childSellingPrice - prices.child_agent_price
                    return (
                      <React.Fragment key={program.id}>
                        <TableRow className="border-b-0">
                          <TableCell className="font-medium" rowSpan={2}>
                            <span className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: (program as any).color || '#3B82F6' }}
                              />
                              {program.name}
                            </span>
                          </TableCell>
                          <TableCell className="text-center" rowSpan={2}>
                            <Badge variant="secondary" className="text-xs">Adult/Child</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end">
                              <span className="text-xs text-muted-foreground">Adult</span>
                              <span className="text-sm text-muted-foreground font-medium">
                                {formatCurrency(adultSellingPrice)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-muted-foreground">Adult</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={prices.adult_agent_price}
                                onChange={(e) => setPricingData({
                                  ...pricingData,
                                  [program.id]: {
                                    ...prices,
                                    adult_agent_price: parseFloat(e.target.value) || 0,
                                  },
                                })}
                                className="w-28"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-xs text-muted-foreground">Adult</span>
                              <Badge variant={adultCommission >= 0 ? 'success' : 'destructive'}>
                                {formatCurrency(adultCommission)}
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end">
                              <span className="text-xs text-muted-foreground">Child</span>
                              <span className="text-sm text-muted-foreground font-medium">
                                {formatCurrency(childSellingPrice)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-muted-foreground">Child</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={prices.child_agent_price}
                                onChange={(e) => setPricingData({
                                  ...pricingData,
                                  [program.id]: {
                                    ...prices,
                                    child_agent_price: parseFloat(e.target.value) || 0,
                                  },
                                })}
                                className="w-28"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-xs text-muted-foreground">Child</span>
                              <Badge variant={childCommission >= 0 ? 'success' : 'destructive'}>
                                {formatCurrency(childCommission)}
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    )
                  }
                })}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPricingDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePricing} disabled={saving}>
              {saving ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                'Save Pricing'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Agent Confirmation */}
      <DeleteConfirmationDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Agent"
        description="Are you sure you want to delete this agent? Existing bookings will not be affected."
        itemName={agents.find(a => a.id === deleteId)?.name}
      />

      {/* Delete Staff Confirmation */}
      <DeleteConfirmationDialog
        open={!!deleteStaffId}
        onOpenChange={() => {
          setDeleteStaffId(null)
          setDeleteStaffName('')
        }}
        onConfirm={handleDeleteStaff}
        title="Delete Staff/Source"
        description="Are you sure you want to delete this staff member or source?"
        itemName={deleteStaffName}
      />

      {/* PIN Verification Dialog */}
      <Dialog open={pinDialogOpen} onOpenChange={(open) => {
        setPinDialogOpen(open)
        if (!open) {
          setPinInput('')
          setPinError('')
          setPendingPricingAgent(null)
        }
      }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              PIN Required
            </DialogTitle>
            <DialogDescription>
              Enter the 4-digit PIN to access agent pricing settings.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pin">Enter PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                    setPinInput(value)
                    setPinError('')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && pinInput.length === 4) {
                      handlePinSubmit()
                    }
                  }}
                  placeholder="••••"
                  className="text-center text-2xl tracking-widest font-mono"
                  autoFocus
                />
                {pinError && (
                  <p className="text-sm text-destructive">{pinError}</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setPinDialogOpen(false)
              setPinInput('')
              setPinError('')
              setPendingPricingAgent(null)
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handlePinSubmit} 
              disabled={pinInput.length !== 4}
            >
              <Lock className="h-4 w-4 mr-2" />
              Verify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Pricing Dialog */}
      <Dialog open={bulkPricingDialogOpen} onOpenChange={setBulkPricingDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Bulk Edit Pricing - {selectedAgents.size} Agent{selectedAgents.size > 1 ? 's' : ''}</DialogTitle>
            <DialogDescription>
              Set pricing for all selected agents. This will overwrite existing pricing for these agents.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 max-h-[500px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Program</TableHead>
                  <TableHead className="text-center">Type</TableHead>
                  <TableHead className="text-right">Selling Price</TableHead>
                  <TableHead>Agent Price</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {programs.map((program) => {
                  const pricingType = (program as any).pricing_type || 'single'
                  const sellingPrice = (program as any).selling_price || program.base_price || 0
                  const adultSellingPrice = (program as any).adult_selling_price || 0
                  const childSellingPrice = (program as any).child_selling_price || 0
                  
                  const prices = pricingData[program.id] || {
                    selling_price: sellingPrice,
                    agent_price: sellingPrice,
                    adult_agent_price: adultSellingPrice,
                    child_agent_price: childSellingPrice,
                  }

                  if (pricingType === 'single') {
                    const commission = sellingPrice - prices.agent_price
                    return (
                      <TableRow key={program.id}>
                        <TableCell className="font-medium">
                          <span className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: (program as any).color || '#3B82F6' }}
                            />
                            {program.name}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-xs">Per Person</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm text-muted-foreground font-medium">
                            {formatCurrency(sellingPrice)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={prices.agent_price}
                            onChange={(e) => setPricingData({
                              ...pricingData,
                              [program.id]: {
                                ...prices,
                                agent_price: parseFloat(e.target.value) || 0,
                              },
                            })}
                            className="w-28"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={commission >= 0 ? 'success' : 'destructive'}>
                            {formatCurrency(commission)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  } else {
                    // Adult/Child pricing
                    const adultCommission = adultSellingPrice - prices.adult_agent_price
                    const childCommission = childSellingPrice - prices.child_agent_price
                    return (
                      <React.Fragment key={program.id}>
                        <TableRow className="border-b-0">
                          <TableCell className="font-medium" rowSpan={2}>
                            <span className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: (program as any).color || '#3B82F6' }}
                              />
                              {program.name}
                            </span>
                          </TableCell>
                          <TableCell className="text-center" rowSpan={2}>
                            <Badge variant="secondary" className="text-xs">Adult/Child</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end">
                              <span className="text-xs text-muted-foreground">Adult</span>
                              <span className="text-sm text-muted-foreground font-medium">
                                {formatCurrency(adultSellingPrice)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-muted-foreground">Adult</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={prices.adult_agent_price}
                                onChange={(e) => setPricingData({
                                  ...pricingData,
                                  [program.id]: {
                                    ...prices,
                                    adult_agent_price: parseFloat(e.target.value) || 0,
                                  },
                                })}
                                className="w-28"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-xs text-muted-foreground">Adult</span>
                              <Badge variant={adultCommission >= 0 ? 'success' : 'destructive'}>
                                {formatCurrency(adultCommission)}
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end">
                              <span className="text-xs text-muted-foreground">Child</span>
                              <span className="text-sm text-muted-foreground font-medium">
                                {formatCurrency(childSellingPrice)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-muted-foreground">Child</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={prices.child_agent_price}
                                onChange={(e) => setPricingData({
                                  ...pricingData,
                                  [program.id]: {
                                    ...prices,
                                    child_agent_price: parseFloat(e.target.value) || 0,
                                  },
                                })}
                                className="w-28"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-xs text-muted-foreground">Child</span>
                              <Badge variant={childCommission >= 0 ? 'success' : 'destructive'}>
                                {formatCurrency(childCommission)}
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    )
                  }
                })}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkPricingDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveBulkPricing} disabled={saving}>
              {saving ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                `Apply to ${selectedAgents.size} Agent${selectedAgents.size > 1 ? 's' : ''}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
