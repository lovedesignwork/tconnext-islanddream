"use client"

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TimeInput } from '@/components/ui/time-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { toast } from 'sonner'
import { ArrowLeft, Save, Users, Baby, UserRound, Upload, X, Image as ImageIcon } from 'lucide-react'
import type { Program, Hotel, Agent, BookingWithRelations, AgentStaff, ReferenceHotel } from '@/types'

// Combined hotel type for display
interface CombinedHotel {
  id: string
  name: string
  area: string
  isCustom: boolean
}

export default function EditBookingPage() {
  const router = useRouter()
  const params = useParams()
  const bookingId = params.id as string
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [programs, setPrograms] = useState<Program[]>([])
  const [referenceHotels, setReferenceHotels] = useState<ReferenceHotel[]>([])
  const [allReferenceHotels, setAllReferenceHotels] = useState<ReferenceHotel[]>([])
  const [customLocations, setCustomLocations] = useState<Hotel[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [agentStaff, setAgentStaff] = useState<AgentStaff[]>([])
  const [booking, setBooking] = useState<BookingWithRelations | null>(null)
  const [useCustomLocation, setUseCustomLocation] = useState(false)
  const [companyRegion, setCompanyRegion] = useState<string>('Phuket')
  const [voucherUploading, setVoucherUploading] = useState(false)
  const [voucherImageUrl, setVoucherImageUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    activity_date: '',
    program_id: '',
    agent_id: '',
    agent_staff_id: '',
    customer_name: '',
    customer_email: '',
    customer_whatsapp: '',
    adults: 1,
    children: 0,
    infants: 0,
    hotel_id: '',
    custom_pickup_location: '',
    room_number: '',
    pickup_time: '',
    notes: '',
    voucher_number: '',
    collect_money: 0,
    internal_remarks: '',
    status: 'confirmed' as string,
    payment_type: 'regular' as 'regular' | 'foc' | 'insp',
  })
  const [originalPaymentType, setOriginalPaymentType] = useState<'regular' | 'foc' | 'insp'>('regular')

  useEffect(() => {
    async function fetchData() {
      if (!user?.company_id || !bookingId) return

      const supabase = createClient()

      // First get company to know the region
      const { data: companyData } = await supabase
        .from('companies')
        .select('region')
        .eq('id', user.company_id)
        .single()

      const region = companyData?.region || 'Phuket'
      setCompanyRegion(region)

      // Fetch ALL reference hotels (for area-to-province mapping)
      // We'll filter by region later for display
      const allReferenceHotelsQuery = supabase
        .from('reference_hotels')
        .select('*')
        .order('area')
        .order('name')

      // Fetch booking and reference data in parallel
      const [bookingRes, programsRes, allReferenceHotelsRes, customLocationsRes, agentsRes] = await Promise.all([
        supabase
          .from('bookings')
          .select('*')
          .eq('id', bookingId)
          .eq('company_id', user.company_id)
          .single(),
        supabase
          .from('programs')
          .select('*')
          .eq('company_id', user.company_id)
          .eq('status', 'active')
          .order('name'),
        allReferenceHotelsQuery,
        supabase
          .from('hotels')
          .select('*')
          .eq('company_id', user.company_id)
          .order('area')
          .order('name'),
        supabase
          .from('agents')
          .select('*')
          .eq('company_id', user.company_id)
          .eq('status', 'active')
          .order('name'),
      ])

      if (bookingRes.error || !bookingRes.data) {
        toast.error('Booking not found')
        router.push('/dashboard')
        return
      }

      const bookingData = bookingRes.data
      setBooking(bookingData)
      
      // Check if using custom location (has custom_pickup_location but no hotel_id)
      const hasCustomLocation = !!bookingData.custom_pickup_location && !bookingData.hotel_id
      setUseCustomLocation(hasCustomLocation)
      
      // Determine the hotel_id for the form
      // If there's a hotel_id, it's from custom locations (hotels table)
      let formHotelId = ''
      if (bookingData.hotel_id) {
        formHotelId = `custom-${bookingData.hotel_id}`
      }
      
      const paymentType = (bookingData.payment_type || 'regular') as 'regular' | 'foc' | 'insp'
      setOriginalPaymentType(paymentType)
      
      setFormData({
        activity_date: bookingData.activity_date || '',
        program_id: bookingData.program_id || '',
        agent_id: bookingData.agent_id || '',
        agent_staff_id: bookingData.agent_staff_id || '',
        customer_name: bookingData.customer_name || '',
        customer_email: bookingData.customer_email || '',
        customer_whatsapp: bookingData.customer_whatsapp || '',
        adults: bookingData.adults || 1,
        children: bookingData.children || 0,
        infants: bookingData.infants || 0,
        hotel_id: formHotelId,
        custom_pickup_location: bookingData.custom_pickup_location || '',
        room_number: bookingData.room_number || '',
        pickup_time: bookingData.pickup_time || '',
        notes: bookingData.notes || '',
        voucher_number: bookingData.voucher_number || '',
        collect_money: bookingData.collect_money || 0,
        internal_remarks: bookingData.internal_remarks || '',
        status: bookingData.status || 'confirmed',
        payment_type: paymentType,
      })
      
      // Set voucher image URL from booking data
      setVoucherImageUrl(bookingData.voucher_image_url || null)

      setPrograms(programsRes.data || [])
      
      // Store all reference hotels (for area-to-province mapping)
      const allHotels = allReferenceHotelsRes.data || []
      setAllReferenceHotels(allHotels)
      
      // Filter by region for display, then deduplicate by name
      const regionFilteredHotels = region === 'Both' 
        ? allHotels 
        : allHotels.filter(h => h.province === region)
      
      const seenNames = new Set<string>()
      const uniqueReferenceHotels = regionFilteredHotels.filter(hotel => {
        const normalizedName = hotel.name.toLowerCase().trim()
        if (seenNames.has(normalizedName)) {
          return false
        }
        seenNames.add(normalizedName)
        return true
      })
      setReferenceHotels(uniqueReferenceHotels)
      setCustomLocations(customLocationsRes.data || [])
      
      // Deduplicate agents by name (case-insensitive, keep first occurrence)
      const seenAgentNames = new Set<string>()
      const uniqueAgents = (agentsRes.data || []).filter(agent => {
        const normalizedName = agent.name.toLowerCase().trim()
        if (seenAgentNames.has(normalizedName)) {
          return false
        }
        seenAgentNames.add(normalizedName)
        return true
      })
      setAgents(uniqueAgents)
      
      // Fetch agent staff if agent is selected
      if (bookingData.agent_id) {
        const { data: staffData } = await supabase
          .from('agent_staff')
          .select('*')
          .eq('agent_id', bookingData.agent_id)
          .eq('status', 'active')
          .order('nickname')
        setAgentStaff(staffData || [])
      }
      
      setLoading(false)
    }

    fetchData()
  }, [user, bookingId, router])

  // Fetch agent staff when agent changes
  useEffect(() => {
    async function fetchAgentStaff() {
      if (!formData.agent_id || loading) {
        if (!formData.agent_id) {
          setAgentStaff([])
          setFormData(prev => ({ ...prev, agent_staff_id: '' }))
        }
        return
      }

      const supabase = createClient()
      const { data } = await supabase
        .from('agent_staff')
        .select('*')
        .eq('agent_id', formData.agent_id)
        .eq('status', 'active')
        .order('nickname')

      setAgentStaff(data || [])
    }

    fetchAgentStaff()
  }, [formData.agent_id, loading])

  // Combine reference hotels and custom locations for display
  const combinedHotels: CombinedHotel[] = useMemo(() => {
    const refHotels = referenceHotels.map(h => ({
      id: `ref-${h.id}`,
      name: h.name,
      area: h.area,
      isCustom: false,
    }))
    const customHotels = customLocations.map(h => ({
      id: `custom-${h.id}`,
      name: h.name,
      area: h.area,
      isCustom: true,
    }))
    return [...customHotels, ...refHotels]
  }, [referenceHotels, customLocations])

  // Auto-select area when hotel is selected
  const selectedHotel = useMemo(() => {
    return combinedHotels.find(h => h.id === formData.hotel_id)
  }, [combinedHotels, formData.hotel_id])

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Handler for creating a new location inline
  const handleCreateLocation = async (locationName: string) => {
    if (!user?.company_id) {
      toast.error('Company not found')
      return
    }

    try {
      const supabase = createClient()
      
      // Default area based on company region
      const defaultArea = companyRegion === 'Phang Nga' ? 'Khao Lak' : 'Patong'
      
      const { data, error } = await supabase
        .from('hotels')
        .insert({
          company_id: user.company_id,
          name: locationName,
          area: defaultArea,
        })
        .select()
        .single()

      if (error) throw error

      // Add to custom locations list
      setCustomLocations(prev => [...prev, data])
      
      // Select the newly created location
      handleChange('hotel_id', `custom-${data.id}`)
      setUseCustomLocation(false)
      
      toast.success(`Location "${locationName}" added and selected`)
    } catch (error: any) {
      console.error('Error creating location:', error)
      toast.error(error.message || 'Failed to create location')
    }
  }

  // Handler for uploading voucher image (supports both input change and drag-drop)
  const handleVoucherUpload = async (file: File) => {
    if (!file || !user?.company_id) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload an image (JPEG, PNG, GIF, WebP) or PDF.')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 5MB.')
      return
    }

    setVoucherUploading(true)

    try {
      const supabase = createClient()
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.company_id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      
      const { data, error } = await supabase.storage
        .from('vouchers')
        .upload(fileName, file)

      if (error) throw error

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('vouchers')
        .getPublicUrl(fileName)

      setVoucherImageUrl(publicUrl)
      toast.success('Voucher uploaded successfully')
    } catch (error: any) {
      console.error('Error uploading voucher:', error)
      toast.error(error.message || 'Failed to upload voucher')
    } finally {
      setVoucherUploading(false)
    }
  }

  // Handler for removing voucher image
  const handleRemoveVoucher = async () => {
    if (!voucherImageUrl) return

    try {
      const supabase = createClient()
      
      // Extract file path from URL
      const urlParts = voucherImageUrl.split('/vouchers/')
      if (urlParts.length > 1) {
        const filePath = urlParts[1]
        await supabase.storage.from('vouchers').remove([filePath])
      }
      
      setVoucherImageUrl(null)
      toast.success('Voucher removed')
    } catch (error: any) {
      console.error('Error removing voucher:', error)
      // Still remove from state even if storage delete fails
      setVoucherImageUrl(null)
    }
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleVoucherUpload(files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleVoucherUpload(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user?.company_id || !bookingId) {
      toast.error('Invalid booking')
      return
    }

    if (!formData.program_id) {
      toast.error('Please select a program')
      return
    }

    if (!formData.agent_id) {
      toast.error('Please select a booking source')
      return
    }

    // Check if selected agent is a direct booking type and requires source selection
    const currentAgent = agents.find(a => a.id === formData.agent_id)
    if (currentAgent?.agent_type === 'direct' && !formData.agent_staff_id) {
      toast.error('Please select a booking source')
      return
    }

    if (!formData.customer_name.trim()) {
      toast.error('Please enter customer name')
      return
    }

    setSaving(true)

    try {
      const supabase = createClient()

      // Determine hotel_id and custom_pickup_location based on selection
      let hotelId: string | null = null
      let customPickupLocation: string | null = null

      if (useCustomLocation) {
        // User typed a custom location
        customPickupLocation = formData.custom_pickup_location
      } else if (formData.hotel_id) {
        if (formData.hotel_id.startsWith('custom-')) {
          // Selected from company's custom locations (hotels table)
          hotelId = formData.hotel_id.replace('custom-', '')
        } else if (formData.hotel_id.startsWith('ref-')) {
          // Selected from reference hotels - store the hotel name as custom location
          const refHotel = referenceHotels.find(h => `ref-${h.id}` === formData.hotel_id)
          if (refHotel) {
            customPickupLocation = `${refHotel.name} (${refHotel.area})`
          }
        }
      }

      // If payment_type changed, update the booking number suffix
      let newBookingNumber = booking?.booking_number
      if (formData.payment_type !== originalPaymentType) {
        const { data: updatedNumber, error: suffixError } = await supabase
          .rpc('update_booking_number_suffix', {
            p_booking_id: bookingId,
            p_payment_type: formData.payment_type
          })
        
        if (suffixError) {
          throw suffixError
        }
        newBookingNumber = updatedNumber
      } else {
        // Just update the booking without changing the number
        const { error } = await supabase
          .from('bookings')
          .update({
            activity_date: formData.activity_date,
            program_id: formData.program_id,
            agent_id: formData.agent_id || null,
            agent_staff_id: formData.agent_staff_id || null,
            customer_name: formData.customer_name,
            customer_email: formData.customer_email || null,
            customer_whatsapp: formData.customer_whatsapp || null,
            adults: formData.adults,
            children: formData.children,
            infants: formData.infants,
            hotel_id: hotelId,
            custom_pickup_location: customPickupLocation,
            room_number: formData.room_number || null,
            pickup_time: formData.pickup_time || null,
            notes: formData.notes || null,
            voucher_number: formData.voucher_number || null,
            voucher_image_url: voucherImageUrl,
            collect_money: formData.collect_money,
            internal_remarks: formData.internal_remarks || null,
            status: formData.status,
            payment_type: formData.payment_type,
            is_direct_booking: currentAgent?.agent_type === 'direct',
            last_modified_by: user.id,
            last_modified_by_name: user.name,
          })
          .eq('id', bookingId)

        if (error) {
          throw error
        }
      }

      // If payment type changed but we still need to update other fields
      if (formData.payment_type !== originalPaymentType) {
        const { error } = await supabase
          .from('bookings')
          .update({
            activity_date: formData.activity_date,
            program_id: formData.program_id,
            agent_id: formData.agent_id || null,
            agent_staff_id: formData.agent_staff_id || null,
            customer_name: formData.customer_name,
            customer_email: formData.customer_email || null,
            customer_whatsapp: formData.customer_whatsapp || null,
            adults: formData.adults,
            children: formData.children,
            infants: formData.infants,
            hotel_id: hotelId,
            custom_pickup_location: customPickupLocation,
            room_number: formData.room_number || null,
            pickup_time: formData.pickup_time || null,
            notes: formData.notes || null,
            voucher_number: formData.voucher_number || null,
            voucher_image_url: voucherImageUrl,
            collect_money: formData.collect_money,
            internal_remarks: formData.internal_remarks || null,
            status: formData.status,
            is_direct_booking: currentAgent?.agent_type === 'direct',
            last_modified_by: user.id,
            last_modified_by_name: user.name,
          })
          .eq('id', bookingId)

        if (error) {
          throw error
        }
      }

      toast.success(`Booking ${newBookingNumber} updated successfully!`)
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Error updating booking:', error)
      toast.error(error.message || 'Failed to update booking')
    } finally {
      setSaving(false)
    }
  }

  // Find the selected agent and check if it's a direct booking type
  const selectedAgent = useMemo(() => {
    return agents.find(a => a.id === formData.agent_id)
  }, [agents, formData.agent_id])

  const isDirectBooking = selectedAgent?.agent_type === 'direct'

  // Prepare combobox options for agents
  const agentOptions: ComboboxOption[] = useMemo(() => {
    return agents.map(agent => ({
      value: agent.id,
      label: agent.name,
    }))
  }, [agents])

  // Prepare combobox options for agent staff
  const agentStaffOptions: ComboboxOption[] = useMemo(() => {
    return agentStaff.map(staff => ({
      value: staff.id,
      label: staff.nickname || staff.full_name,
      description: staff.nickname ? staff.full_name : undefined,
    }))
  }, [agentStaff])

  // Prepare combobox options for hotels grouped by area
  const hotelOptions: ComboboxOption[] = useMemo(() => {
    const options: ComboboxOption[] = [
      { value: 'custom', label: '+ Enter Custom Location', group: '' },
    ]

    // Track seen names to avoid duplicates across both lists
    const seenNames = new Set<string>()
    
    // Build area-to-province mapping from ALL reference hotels (not just filtered ones)
    const areaToProvince = new Map<string, string>()
    allReferenceHotels.forEach(hotel => {
      if (!areaToProvince.has(hotel.area)) {
        areaToProvince.set(hotel.area, hotel.province)
      }
    })

    // Add saved locations first (company's custom locations)
    if (customLocations.length > 0) {
      customLocations.forEach(hotel => {
        const normalizedName = hotel.name.toLowerCase().trim()
        if (!seenNames.has(normalizedName)) {
          seenNames.add(normalizedName)
          // Look up province from reference hotels based on area, fallback to company region
          const province = areaToProvince.get(hotel.area) || (companyRegion === 'Both' ? 'Phuket' : companyRegion)
          options.push({
            value: `custom-${hotel.id}`,
            label: hotel.name,
            group: `${province} - ${hotel.area}`,
          })
        }
      })
    }

    // Add reference hotels (skip if name already exists in custom locations)
    referenceHotels.forEach(hotel => {
      const normalizedName = hotel.name.toLowerCase().trim()
      if (!seenNames.has(normalizedName)) {
        seenNames.add(normalizedName)
        options.push({
          value: `ref-${hotel.id}`,
          label: hotel.name,
          group: `${hotel.province} - ${hotel.area}`,
        })
      }
    })

    return options
  }, [referenceHotels, customLocations, companyRegion, allReferenceHotels])

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-36" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-36" />
            <Skeleton className="h-28" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <PageHeader 
        title={`Edit Booking ${booking?.booking_number || ''}`} 
        description="Update booking details"
      >
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-4">
            {/* Tour Details */}
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-base">Tour Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Program first */}
                  <div className="space-y-1.5">
                    <Label htmlFor="program_id" className="text-sm">Program *</Label>
                    <Select
                      value={formData.program_id}
                      onValueChange={(v) => handleChange('program_id', v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select program" />
                      </SelectTrigger>
                      <SelectContent>
                        {programs.map((program) => (
                          <SelectItem key={program.id} value={program.id}>
                            <span className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: (program as any).color || '#3B82F6' }}
                              />
                              {program.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Activity Date second */}
                  <div className="space-y-1.5">
                    <Label htmlFor="activity_date" className="text-sm">Activity Date *</Label>
                    <Input
                      id="activity_date"
                      type="date"
                      className="h-9"
                      value={formData.activity_date}
                      onChange={(e) => handleChange('activity_date', e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Booking Source - Agent Combobox */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Booking Source *</Label>
                  <Combobox
                    options={agentOptions}
                    value={formData.agent_id}
                    onValueChange={(v) => handleChange('agent_id', v)}
                    placeholder="Select agent..."
                    searchPlaceholder="Type to search agents..."
                    emptyText="No agents found"
                    className="h-9"
                  />
                </div>

                {/* Agent Staff/Source dropdown - only show when agent is selected */}
                {formData.agent_id && agentStaff.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-sm">
                      {isDirectBooking ? 'Source *' : 'Staff Name'}
                    </Label>
                    <Combobox
                      options={agentStaffOptions}
                      value={formData.agent_staff_id}
                      onValueChange={(v) => handleChange('agent_staff_id', v)}
                      placeholder={isDirectBooking ? 'Select source...' : 'Select staff member...'}
                      searchPlaceholder={isDirectBooking ? 'Search source...' : 'Search staff...'}
                      emptyText={isDirectBooking ? 'No sources found' : 'No staff found'}
                      className="h-9"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-base">Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4">
                <div className="space-y-1.5">
                  <Label htmlFor="customer_name" className="text-sm">Customer Name *</Label>
                  <Input
                    id="customer_name"
                    className="h-9"
                    value={formData.customer_name}
                    onChange={(e) => handleChange('customer_name', e.target.value)}
                    placeholder="John Smith"
                    required
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="customer_email" className="text-sm">Email</Label>
                    <Input
                      id="customer_email"
                      type="email"
                      className="h-9"
                      value={formData.customer_email}
                      onChange={(e) => handleChange('customer_email', e.target.value)}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="customer_whatsapp" className="text-sm">WhatsApp</Label>
                    <Input
                      id="customer_whatsapp"
                      className="h-9"
                      value={formData.customer_whatsapp}
                      onChange={(e) => handleChange('customer_whatsapp', e.target.value)}
                      placeholder="+66 812 345 678"
                    />
                  </div>
                </div>

                <Separator className="my-3" />

                {/* Guest Count - Enhanced styling */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="adults" className="text-sm flex items-center gap-1.5">
                      <UserRound className="w-4 h-4" />
                      Adults
                    </Label>
                    <div className="relative">
                      <Input
                        id="adults"
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={formData.adults}
                        onChange={(e) => handleChange('adults', parseInt(e.target.value) || 0)}
                        className="h-16 text-3xl font-bold text-center bg-blue-50 border-blue-200 focus:border-blue-400 focus:ring-blue-400"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="children" className="text-sm flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      Children
                    </Label>
                    <div className="relative">
                      <Input
                        id="children"
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={formData.children}
                        onChange={(e) => handleChange('children', parseInt(e.target.value) || 0)}
                        className="h-16 text-3xl font-bold text-center bg-green-50 border-green-200 focus:border-green-400 focus:ring-green-400"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="infants" className="text-sm flex items-center gap-1.5">
                      <Baby className="w-4 h-4" />
                      Infants
                    </Label>
                    <div className="relative">
                      <Input
                        id="infants"
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={formData.infants}
                        onChange={(e) => handleChange('infants', parseInt(e.target.value) || 0)}
                        className="h-16 text-3xl font-bold text-center bg-orange-50 border-orange-200 focus:border-orange-400 focus:ring-orange-400"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pickup Details */}
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-base">Pickup Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Hotel / Pickup Location</Label>
                    <Combobox
                      options={hotelOptions}
                      value={useCustomLocation ? 'custom' : formData.hotel_id}
                      onValueChange={(v) => {
                        if (v === 'custom') {
                          setUseCustomLocation(true)
                          handleChange('hotel_id', '')
                        } else {
                          setUseCustomLocation(false)
                          handleChange('hotel_id', v)
                        }
                      }}
                      onCreateNew={handleCreateLocation}
                      placeholder="Search hotel..."
                      searchPlaceholder="Type hotel name..."
                      emptyText="No hotels found"
                      groupBy
                      allowCreate
                      createLabel="Add new location"
                      className="h-9"
                    />
                    {/* Show area badge when hotel is selected */}
                    {selectedHotel && !useCustomLocation && (
                      <p className="text-xs text-muted-foreground">
                        Area: <span className="font-medium">{selectedHotel.area}</span>
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="room_number" className="text-sm">Room Number</Label>
                    <Input
                      id="room_number"
                      className="h-9"
                      value={formData.room_number}
                      onChange={(e) => handleChange('room_number', e.target.value)}
                      placeholder="e.g. 302"
                    />
                  </div>
                </div>

                {/* Custom pickup location input */}
                {useCustomLocation && (
                  <div className="space-y-1.5">
                    <Label htmlFor="custom_pickup_location" className="text-sm">Custom Pickup Location *</Label>
                    <Input
                      id="custom_pickup_location"
                      className="h-9"
                      value={formData.custom_pickup_location}
                      onChange={(e) => handleChange('custom_pickup_location', e.target.value)}
                      placeholder="e.g. 7-Eleven near Central Phuket, Jungceylon entrance..."
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="pickup_time" className="text-sm">Pickup Time</Label>
                  <TimeInput
                    id="pickup_time"
                    className="w-full sm:w-32"
                    value={formData.pickup_time}
                    onChange={(value) => handleChange('pickup_time', value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-sm">Notes (visible to customer)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    placeholder="Dietary requirements, allergies, special requests..."
                    rows={2}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="voucher_number" className="text-sm">Voucher Number</Label>
                  <Input
                    id="voucher_number"
                    className="h-9"
                    value={formData.voucher_number}
                    onChange={(e) => handleChange('voucher_number', e.target.value)}
                    placeholder="Agent voucher/reference number"
                  />
                </div>

                {/* Voucher Image Upload */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Voucher Image</Label>
                  {voucherImageUrl ? (
                    <div className="relative border rounded-lg p-3 bg-green-50 border-green-200">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <a 
                            href={voucherImageUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-green-700 hover:underline block truncate"
                          >
                            Voucher uploaded successfully
                          </a>
                          <p className="text-xs text-green-600">Click to view file</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-green-600 hover:text-red-600 hover:bg-red-50"
                          onClick={handleRemoveVoucher}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`relative border-2 border-dashed rounded-lg p-6 transition-all duration-200 ${
                        isDragging 
                          ? 'border-primary bg-primary/5' 
                          : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
                      } ${voucherUploading ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}
                    >
                      <input
                        id="voucher_image"
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                        onChange={handleFileInputChange}
                        disabled={voucherUploading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="flex flex-col items-center gap-2 text-center">
                        {voucherUploading ? (
                          <>
                            <Spinner size="md" />
                            <p className="text-sm text-muted-foreground">Uploading...</p>
                          </>
                        ) : (
                          <>
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                              isDragging ? 'bg-primary/10' : 'bg-muted'
                            }`}>
                              <Upload className={`w-6 h-6 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {isDragging ? 'Drop file here' : 'Drag & drop or click to upload'}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                JPEG, PNG, GIF, WebP, PDF (max 5MB)
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Payment & Status */}
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-base">Payment & Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4">
                <div className="space-y-1.5">
                  <Label htmlFor="status" className="text-sm">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => handleChange('status', v)}
                  >
                    <SelectTrigger 
                      className={`h-9 font-medium ${
                        formData.status === 'confirmed' 
                          ? 'bg-green-100 border-green-300 text-green-800' 
                          : formData.status === 'pending' 
                          ? 'bg-yellow-100 border-yellow-300 text-yellow-800' 
                          : formData.status === 'cancelled' 
                          ? 'bg-red-100 border-red-300 text-red-800' 
                          : formData.status === 'completed' 
                          ? 'bg-blue-100 border-blue-300 text-blue-800' 
                          : ''
                      }`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confirmed" className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-green-500"></span>
                          <span className="text-green-700">Confirmed</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="pending" className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                          <span className="text-yellow-700">Pending</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="cancelled" className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-red-500"></span>
                          <span className="text-red-700">Cancelled</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="completed" className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                          <span className="text-blue-700">Completed</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="payment_type" className="text-sm">Payment</Label>
                  <Select
                    value={formData.payment_type}
                    onValueChange={(v) => handleChange('payment_type', v)}
                  >
                    <SelectTrigger 
                      className={`h-9 font-medium ${
                        formData.payment_type === 'regular' 
                          ? 'bg-gray-100 border-gray-300 text-gray-800' 
                          : formData.payment_type === 'foc' 
                          ? 'bg-purple-100 border-purple-300 text-purple-800' 
                          : formData.payment_type === 'insp' 
                          ? 'bg-orange-100 border-orange-300 text-orange-800' 
                          : ''
                      }`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular" className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-gray-500"></span>
                          <span className="text-gray-700">REGULAR</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="foc" className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                          <span className="text-purple-700">FREE OF CHARGE (FOC)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="insp" className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                          <span className="text-orange-700">INSPECTION (INSP)</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.payment_type !== originalPaymentType && (
                    <p className="text-xs text-amber-600">
                      Booking number will be updated to reflect new payment type
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="collect_money" className="text-sm">Amount to Collect (THB)</Label>
                  <Input
                    id="collect_money"
                    type="number"
                    min="0"
                    step="0.01"
                    className="h-9"
                    value={formData.collect_money || ''}
                    onChange={(e) => handleChange('collect_money', parseFloat(e.target.value) || 0)}
                    placeholder="Enter amount"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank if fully prepaid
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Internal Notes */}
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-base">Internal Notes</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="space-y-1.5">
                  <Label htmlFor="internal_remarks" className="text-sm">Admin Remarks</Label>
                  <Textarea
                    id="internal_remarks"
                    value={formData.internal_remarks}
                    onChange={(e) => handleChange('internal_remarks', e.target.value)}
                    placeholder="Internal notes (not visible to customer)..."
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-4 px-4 pb-4">
                <Button type="submit" className="w-full" disabled={saving}>
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
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
