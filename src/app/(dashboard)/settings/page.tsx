"use client"

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  Shield,
  Lock,
  Save,
  Building2,
  FileText,
  CreditCard,
  Mail,
  Car,
  Globe,
  Clock,
  CheckCircle,
  AlertCircle,
  Trash2,
  Banknote,
  Users,
  Plus,
  Pencil,
  UserX,
  ExternalLink,
  Eye,
  EyeOff,
  Key,
  Send,
  TestTube,
  Upload,
  ImageIcon,
} from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StaffDialog } from './staff-dialog'
import type { Company, PageLockSettings, CompanySettings, CompanyTeamMember } from '@/types'

// Tab aliases for URL flexibility
const tabAliases: Record<string, string> = {
  'payments': 'payment',
  'emails': 'email',
  'teams': 'team',
  'invoices': 'invoice',
}

function normalizeTab(tab: string): string {
  return tabAliases[tab] || tab
}

export default function SettingsPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const rawTab = searchParams.get('tab') || 'general'
  const tabFromUrl = normalizeTab(rawTab)
  const [activeTab, setActiveTab] = useState(tabFromUrl)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [company, setCompany] = useState<Company | null>(null)

  // Update active tab when URL changes
  useEffect(() => {
    setActiveTab(tabFromUrl)
  }, [tabFromUrl])

  // PIN settings
  const [pinEnabled, setPinEnabled] = useState(false)
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)

  // Page locks
  const [pageLocks, setPageLocks] = useState<PageLockSettings>({})

  // Company info
  const [companyInfo, setCompanyInfo] = useState({
    tax_id: '',
    address: '',
    phone: '',
  })

  // Timezone setting
  const [timezone, setTimezone] = useState('Asia/Bangkok')

  // Invoice settings
  const [invoiceSettings, setInvoiceSettings] = useState({
    payment_footer: '',
    tax_percentage: 7,
  })

  // Payment settings (bank details)
  const [paymentSettings, setPaymentSettings] = useState({
    bank_name: '',
    account_name: '',
    account_number: '',
    payment_instructions: '',
  })

  // Email settings
  const [emailSettings, setEmailSettings] = useState({
    from_name: '',
    reply_to: '',
    footer_text: '',
    booking_notification_emails: [] as string[],
  })
  const [newBookingNotificationEmail, setNewBookingNotificationEmail] = useState('')

  // Pickup settings
  const [pickupSettings, setPickupSettings] = useState({
    contact_info: '',
    pickup_email_template: '',
    come_direct_email_template: '',
  })

  // Online booking settings
  const [bookingSettings, setBookingSettings] = useState({
    thank_you_message: '',
    failed_payment_message: '',
    contact_for_manual_booking: '',
    page_header_text: '',
    page_footer_text: '',
    allow_cash_on_tour: false,
    stripe_payments_enabled: true,
    cash_booking_message: '',
  })

  // OP Report auto email settings
  const [opReportSettings, setOpReportSettings] = useState({
    send_time: '',
    recipient_emails: [] as string[],
  })
  const [newRecipientEmail, setNewRecipientEmail] = useState('')

  // Team members state
  const [teamMembers, setTeamMembers] = useState<CompanyTeamMember[]>([])
  const [loadingTeam, setLoadingTeam] = useState(false)
  const [staffDialogOpen, setStaffDialogOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<CompanyTeamMember | null>(null)

  // Email test state
  const [testEmailRecipient, setTestEmailRecipient] = useState('')
  const [testEmailTemplate, setTestEmailTemplate] = useState('booking-confirmation')
  const [sendingTestEmail, setSendingTestEmail] = useState(false)

  // OP Report manual send state
  const [sendingOpReport, setSendingOpReport] = useState(false)

  // Stripe Keys state
  const [stripeSettings, setStripeSettings] = useState({
    public_key: '',
    secret_key: '',
    webhook_secret: '',
    test_mode: true,
  })
  const [showStripeSecretKey, setShowStripeSecretKey] = useState(false)
  const [showWebhookSecret, setShowWebhookSecret] = useState(false)
  const [stripeValidating, setStripeValidating] = useState(false)
  const [stripeKeyStatus, setStripeKeyStatus] = useState<{
    valid: boolean
    message: string
  } | null>(null)
  
  // Flag to track if we've loaded stripe settings from sessionStorage
  const stripeLoadedFromSessionRef = useRef(false)
  
  // FAILSAFE: Restore Stripe settings from sessionStorage on mount
  // This ensures form data survives even if the component remounts
  useEffect(() => {
    const saved = sessionStorage.getItem('tconnext-stripe-settings-draft')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setStripeSettings(parsed)
        stripeLoadedFromSessionRef.current = true
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, [])
  
  // FAILSAFE: Save Stripe settings to sessionStorage on every change
  // Skip the initial empty state to avoid overwriting saved data
  const isStripeInitialized = useRef(false)
  useEffect(() => {
    // Skip if this is the initial render or if we just loaded from session
    if (!isStripeInitialized.current) {
      // Only mark initialized if we have any non-empty values
      if (stripeSettings.public_key || stripeSettings.secret_key || stripeSettings.webhook_secret) {
        isStripeInitialized.current = true
      }
      return
    }
    
    // Save current stripe settings to sessionStorage
    sessionStorage.setItem('tconnext-stripe-settings-draft', JSON.stringify(stripeSettings))
  }, [stripeSettings])

  // Company logo state (dual theme support)
  const [companyLogoLight, setCompanyLogoLight] = useState<string | null>(null)
  const [companyLogoDark, setCompanyLogoDark] = useState<string | null>(null)
  const [uploadingLogoLight, setUploadingLogoLight] = useState(false)
  const [uploadingLogoDark, setUploadingLogoDark] = useState(false)
  const logoLightInputRef = useRef<HTMLInputElement>(null)
  const logoDarkInputRef = useRef<HTMLInputElement>(null)

  const isMasterAdmin = user?.role === 'master_admin'

  const fetchCompany = async () => {
    if (!user?.company_id) {
      setLoading(false)
      return
    }

    try {
      // Use API route to bypass RLS
      const response = await fetch('/api/settings/company')
      if (!response.ok) {
        toast.error('Failed to load company settings')
        setLoading(false)
        return
      }
      
      const { company: data } = await response.json()

    if (data) {
      setCompany(data)
      setPinEnabled(data.pricing_pin_enabled || false)
      setPin(data.pricing_pin || '')
      setPageLocks(data.page_locks || {})
      setCompanyInfo({
        tax_id: data.tax_id || '',
        address: data.address || '',
        phone: data.phone || '',
      })

      // Load settings from the settings JSON field
      const settings = data.settings as CompanySettings || {}
      
      // Load company logos (light and dark variants)
      setCompanyLogoLight((settings as any).logo_url || null)
      setCompanyLogoDark((settings as any).logo_url_dark || null)
      
      setInvoiceSettings({
        payment_footer: settings.invoice?.payment_footer || '',
        tax_percentage: settings.invoice?.tax_percentage ?? 7,
      })

      setPaymentSettings({
        bank_name: settings.payment?.bank_name || '',
        account_name: settings.payment?.account_name || '',
        account_number: settings.payment?.account_number || '',
        payment_instructions: settings.payment?.payment_instructions || '',
      })

      setEmailSettings({
        from_name: settings.email?.from_name || '',
        reply_to: settings.email?.reply_to || '',
        footer_text: settings.email?.footer_text || '',
        booking_notification_emails: settings.email?.booking_notification_emails || [],
      })

      setPickupSettings({
        contact_info: settings.pickup?.contact_info || '',
        pickup_email_template: settings.pickup?.pickup_email_template || '',
        come_direct_email_template: settings.pickup?.come_direct_email_template || '',
      })

      setBookingSettings({
        thank_you_message: settings.booking?.thank_you_message || '',
        failed_payment_message: settings.booking?.failed_payment_message || '',
        contact_for_manual_booking: settings.booking?.contact_for_manual_booking || '',
        page_header_text: settings.booking?.page_header_text || '',
        page_footer_text: settings.booking?.page_footer_text || '',
        allow_cash_on_tour: settings.booking?.allow_cash_on_tour || false,
        stripe_payments_enabled: settings.booking?.stripe_payments_enabled !== false, // Default to true
        cash_booking_message: settings.booking?.cash_booking_message || '',
      })

      setOpReportSettings({
        send_time: settings.op_report_auto_email?.send_time || '',
        recipient_emails: settings.op_report_auto_email?.recipient_emails || [],
      })

      // Load timezone setting
      setTimezone(settings.timezone || 'Asia/Bangkok')

      // Load Stripe settings
      setStripeSettings({
        public_key: settings.stripe?.public_key || '',
        secret_key: settings.stripe?.secret_key || '',
        webhook_secret: settings.stripe?.webhook_secret || '',
        test_mode: settings.stripe?.test_mode !== false, // Default to true (test mode)
      })
    }

    setLoading(false)
    } catch (error) {
      console.error('Error fetching company:', error)
      toast.error('Failed to load company settings')
      setLoading(false)
    }
  }

  const fetchTeamMembers = async () => {
    if (!user?.company_id) return

    setLoadingTeam(true)
    try {
      const response = await fetch('/api/team-members')
      if (!response.ok) {
        throw new Error('Failed to load team members')
      }
      const { members } = await response.json()
      setTeamMembers(members || [])
    } catch (error) {
      console.error('Error fetching team members:', error)
      toast.error('Failed to load team members')
    }
    setLoadingTeam(false)
  }

  // Validate Stripe keys format
  const validateStripeKeyFormat = (key: string, type: 'public' | 'secret' | 'webhook'): boolean => {
    if (!key) return false
    switch (type) {
      case 'public':
        return key.startsWith('pk_test_') || key.startsWith('pk_live_')
      case 'secret':
        return key.startsWith('sk_test_') || key.startsWith('sk_live_')
      case 'webhook':
        return key.startsWith('whsec_')
      default:
        return false
    }
  }

  // Check if Stripe keys are configured
  const isStripeConfigured = (): boolean => {
    return !!(stripeSettings.public_key && stripeSettings.secret_key)
  }

  // Validate Stripe keys by making a test API call
  const handleValidateStripeKeys = async () => {
    if (!stripeSettings.public_key || !stripeSettings.secret_key) {
      toast.error('Please enter both Publishable Key and Secret Key')
      return
    }

    // Validate format
    if (!validateStripeKeyFormat(stripeSettings.public_key, 'public')) {
      toast.error('Invalid Publishable Key format. Should start with pk_test_ or pk_live_')
      return
    }
    if (!validateStripeKeyFormat(stripeSettings.secret_key, 'secret')) {
      toast.error('Invalid Secret Key format. Should start with sk_test_ or sk_live_')
      return
    }

    setStripeValidating(true)
    try {
      const response = await fetch('/api/stripe/keys/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret_key: stripeSettings.secret_key,
        }),
      })

      const data = await response.json()

      if (response.ok && data.valid) {
        setStripeKeyStatus({ valid: true, message: 'Keys are valid and working!' })
        toast.success('Stripe keys validated successfully')
      } else {
        setStripeKeyStatus({ valid: false, message: data.error || 'Invalid keys' })
        toast.error(data.error || 'Failed to validate Stripe keys')
      }
    } catch (error: any) {
      setStripeKeyStatus({ valid: false, message: 'Failed to validate keys' })
      toast.error('Failed to validate Stripe keys')
    } finally {
      setStripeValidating(false)
    }
  }

  // Save Stripe settings
  const handleSaveStripeSettings = async () => {
    // Validate format if keys are provided
    if (stripeSettings.public_key && !validateStripeKeyFormat(stripeSettings.public_key, 'public')) {
      toast.error('Invalid Publishable Key format. Should start with pk_test_ or pk_live_')
      return
    }
    if (stripeSettings.secret_key && !validateStripeKeyFormat(stripeSettings.secret_key, 'secret')) {
      toast.error('Invalid Secret Key format. Should start with sk_test_ or sk_live_')
      return
    }
    if (stripeSettings.webhook_secret && !validateStripeKeyFormat(stripeSettings.webhook_secret, 'webhook')) {
      toast.error('Invalid Webhook Secret format. Should start with whsec_')
      return
    }

    const success = await updateSettings('stripe', stripeSettings)
    if (success) {
      // Clear sessionStorage draft after successful save
      sessionStorage.removeItem('tconnext-stripe-settings-draft')
    }
    setStripeKeyStatus(null) // Reset validation status after saving
  }

  // Clear Stripe settings
  const handleClearStripeSettings = async () => {
    if (!confirm('Are you sure you want to clear all Stripe settings? You will no longer be able to accept online payments until you reconfigure.')) {
      return
    }

    setStripeSettings({
      public_key: '',
      secret_key: '',
      webhook_secret: '',
      test_mode: true,
    })
    setStripeKeyStatus(null)

    await updateSettings('stripe', {
      public_key: '',
      secret_key: '',
      webhook_secret: '',
      test_mode: true,
    })
  }

  const handleDeleteStaff = async (staffId: string) => {
    if (!confirm('Are you sure you want to delete this staff member? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/auth/update-team-member?id=${staffId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete staff member')
      }

      toast.success('Staff member deleted successfully')
      fetchTeamMembers()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleToggleStaffStatus = async (staff: CompanyTeamMember) => {
    const newStatus = staff.status === 'active' ? 'suspended' : 'active'

    try {
      const response = await fetch('/api/auth/update-team-member', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_member_id: staff.id,
          status: newStatus,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update staff status')
      }

      toast.success(`Staff member ${newStatus === 'active' ? 'activated' : 'suspended'}`)
      fetchTeamMembers()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  // Only fetch ONCE when component mounts - do NOT refetch on re-renders
  // This prevents losing form data when switching browser tabs
  const hasFetchedRef = useRef(false)
  
  useEffect(() => {
    // Only fetch if we haven't fetched yet AND we have a company_id
    if (!hasFetchedRef.current && user?.company_id) {
      hasFetchedRef.current = true
      fetchCompany()
      fetchTeamMembers()
    }
  }, [user?.company_id])


  // Helper function to update settings in database (uses API route to bypass RLS)
  // newValues can be a Record for nested settings or a primitive for top-level settings like timezone
  const updateSettings = async (settingsKey: keyof CompanySettings | 'timezone', newValues: Record<string, unknown> | string) => {
    if (!user?.company_id || !company) return false

    setSaving(true)
    
    try {
      const response = await fetch('/api/settings/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settingsKey, newValues }),
      })

      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || `Failed to save ${settingsKey} settings`)
        setSaving(false)
        return false
      }

      const { settings: updatedSettings } = await response.json()

      // Update local state with the returned settings
      setCompany({ ...company, settings: updatedSettings })
      toast.success('Settings saved successfully')
      setSaving(false)
      return true
    } catch (error) {
      console.error('Error updating settings:', error)
      toast.error(`Failed to save ${settingsKey} settings`)
      setSaving(false)
      return false
    }
  }

  const handleSavePinSettings = async () => {
    if (!user?.company_id) return

    if (pinEnabled && pin.length !== 4) {
      toast.error('PIN must be exactly 4 digits')
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/settings/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'pin',
          pinEnabled,
          pin: pinEnabled ? pin : null,
        }),
      })

      if (!response.ok) {
        const { error } = await response.json()
        toast.error(error || 'Failed to save PIN settings')
      } else {
        toast.success('PIN settings saved')
      }
    } catch (error) {
      console.error('Error saving PIN settings:', error)
      toast.error('Failed to save PIN settings')
    }

    setSaving(false)
  }

  const handleSavePageLocks = async () => {
    if (!user?.company_id) return

    setSaving(true)

    try {
      const response = await fetch('/api/settings/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'pageLocks',
          pageLocks,
        }),
      })

      if (!response.ok) {
        const { error } = await response.json()
        toast.error(error || 'Failed to save page lock settings')
      } else {
        toast.success('Page lock settings saved')
      }
    } catch (error) {
      console.error('Error saving page locks:', error)
      toast.error('Failed to save page lock settings')
    }

    setSaving(false)
  }

  const handleSaveCompanyInfo = async () => {
    if (!user?.company_id) return

    setSaving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('companies')
      .update({
        tax_id: companyInfo.tax_id || null,
        address: companyInfo.address || null,
        phone: companyInfo.phone || null,
      })
      .eq('id', user.company_id)

    if (error) {
      toast.error('Failed to save company info')
    } else {
      toast.success('Company info saved')
    }

    setSaving(false)
  }

  const handleSaveInvoiceSettings = async () => {
    await updateSettings('invoice', invoiceSettings)
  }

  const handleSavePaymentSettings = async () => {
    await updateSettings('payment', paymentSettings)
  }

  const handleSaveEmailSettings = async () => {
    await updateSettings('email', emailSettings)
  }

  const handleSavePickupSettings = async () => {
    await updateSettings('pickup', pickupSettings)
  }

  const handleSaveBookingSettings = async () => {
    await updateSettings('booking', bookingSettings)
  }

  const handleSaveOpReportSettings = async () => {
    await updateSettings('op_report_auto_email', opReportSettings)
  }

  const handleSendOpReportNow = async () => {
    if (opReportSettings.recipient_emails.length === 0) {
      toast.error('Please add at least one recipient email')
      return
    }
    
    setSendingOpReport(true)
    try {
      const response = await fetch('/api/op-report/send-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_emails: opReportSettings.recipient_emails,
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OP report')
      }
      
      toast.success(`OP Report sent to ${opReportSettings.recipient_emails.length} recipient(s)`)
    } catch (error: any) {
      console.error('Error sending OP report:', error)
      toast.error(error.message || 'Failed to send OP report')
    } finally {
      setSendingOpReport(false)
    }
  }

  const handleSendTestEmail = async () => {
    if (!testEmailRecipient.trim()) {
      toast.error('Please enter a recipient email address')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(testEmailRecipient.trim())) {
      toast.error('Please enter a valid email address')
      return
    }

    setSendingTestEmail(true)
    try {
      const response = await fetch('/api/email-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: testEmailRecipient.trim(),
          templateType: testEmailTemplate,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test email')
      }

      toast.success(`Test email sent to ${testEmailRecipient}!`, {
        description: data.attachmentCount > 0 
          ? `Includes ${data.attachmentCount} attachment(s)` 
          : 'Email sent successfully',
      })
    } catch (error: any) {
      console.error('Error sending test email:', error)
      toast.error(error.message || 'Failed to send test email')
    } finally {
      setSendingTestEmail(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, variant: 'light' | 'dark') => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Allowed: JPG, PNG, GIF, WebP')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Max size: 5MB')
      return
    }

    const setUploading = variant === 'light' ? setUploadingLogoLight : setUploadingLogoDark
    const setLogo = variant === 'light' ? setCompanyLogoLight : setCompanyLogoDark
    const inputRef = variant === 'light' ? logoLightInputRef : logoDarkInputRef

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('variant', variant)

      const response = await fetch('/api/settings/upload-logo', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      setLogo(data.url)
      toast.success(`${variant === 'light' ? 'Light' : 'Dark'} theme logo uploaded successfully!`)
      // Notify all components that branding has changed
      window.dispatchEvent(new CustomEvent('branding-updated'))
    } catch (error: any) {
      console.error('Logo upload error:', error)
      toast.error(error.message || 'Failed to upload logo')
    } finally {
      setUploading(false)
      // Reset input
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  const handleLogoDelete = async (variant: 'light' | 'dark') => {
    const themeLabel = variant === 'light' ? 'light theme' : 'dark theme'
    if (!confirm(`Are you sure you want to delete the ${themeLabel} logo?`)) {
      return
    }

    const setUploading = variant === 'light' ? setUploadingLogoLight : setUploadingLogoDark
    const setLogo = variant === 'light' ? setCompanyLogoLight : setCompanyLogoDark

    setUploading(true)
    try {
      const response = await fetch(`/api/settings/upload-logo?variant=${variant}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Delete failed')
      }

      setLogo(null)
      toast.success(`${variant === 'light' ? 'Light' : 'Dark'} theme logo deleted successfully`)
      // Notify all components that branding has changed
      window.dispatchEvent(new CustomEvent('branding-updated'))
    } catch (error: any) {
      console.error('Logo delete error:', error)
      toast.error(error.message || 'Failed to delete logo')
    } finally {
      setUploading(false)
    }
  }

  const addRecipientEmail = () => {
    if (!newRecipientEmail || !newRecipientEmail.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }
    if (opReportSettings.recipient_emails.includes(newRecipientEmail)) {
      toast.error('Email already added')
      return
    }
    setOpReportSettings(prev => ({
      ...prev,
      recipient_emails: [...prev.recipient_emails, newRecipientEmail],
    }))
    setNewRecipientEmail('')
  }

  const removeRecipientEmail = (email: string) => {
    setOpReportSettings(prev => ({
      ...prev,
      recipient_emails: prev.recipient_emails.filter(e => e !== email),
    }))
  }

  const togglePageLock = (key: keyof PageLockSettings) => {
    setPageLocks(prev => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  // Page options organized to match sidebar order
  const pageOptions: { key: keyof PageLockSettings; label: string; description: string; isSetup?: boolean }[] = [
    // Main Navigation
    { key: 'dashboard', label: 'Bookings', description: 'Main bookings dashboard' },
    { key: 'slots', label: 'Program Slots', description: 'Daily capacity management' },
    { key: 'pickup', label: 'Pick-up / Drop-off', description: 'Pick-up scheduling' },
    { key: 'set_boat', label: 'Set Boat', description: 'Boat assignments' },
    { key: 'op_report', label: 'OP Report', description: 'Operations report' },
    { key: 'invoices', label: 'Invoices', description: 'Invoice management' },
    { key: 'finance', label: 'Finance', description: 'Financial overview' },
    { key: 'reports', label: 'Reports', description: 'Analytics and reports' },
    // Setup Navigation
    { key: 'programs', label: 'Program Setup', description: 'Program configuration', isSetup: true },
    { key: 'agents', label: 'Agents Setup', description: 'Agent management', isSetup: true },
    { key: 'drivers', label: 'Driver Setup', description: 'Driver management', isSetup: true },
    { key: 'guides', label: 'Guide Setup', description: 'Guide management', isSetup: true },
    { key: 'restaurants', label: 'Restaurant Setup', description: 'Restaurant management', isSetup: true },
    { key: 'boats', label: 'Boat Setup', description: 'Boat configuration', isSetup: true },
    { key: 'hotels', label: 'Location Setup', description: 'Location management', isSetup: true },
  ]

  if (!isMasterAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Shield className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Only administrators can access settings. Please contact your admin if you need to make changes.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          {/* Company Logo - Dual Theme Support */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" />
                <CardTitle>Company Logo</CardTitle>
              </div>
              <CardDescription>
                Upload your company logo for light and dark themes. The light theme logo is also used for invoices, emails, and booking pages.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Light Theme Logo */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <span className="font-medium text-sm">Light Theme Logo</span>
                  <span className="text-xs text-muted-foreground">(Required - used in invoices, emails, booking pages)</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg bg-white" style={{ minWidth: '200px', minHeight: '80px', maxWidth: '300px', maxHeight: '100px' }}>
                    {companyLogoLight ? (
                      <img 
                        src={companyLogoLight} 
                        alt="Light Theme Logo" 
                        className="max-h-[80px] max-w-[280px] object-contain p-2"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 p-4 text-muted-foreground">
                        <ImageIcon className="h-8 w-8" />
                        <span className="text-sm">No logo</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={logoLightInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={(e) => handleLogoUpload(e, 'light')}
                      className="hidden"
                      id="logo-light-upload"
                    />
                    <Button
                      variant="outline"
                      onClick={() => logoLightInputRef.current?.click()}
                      disabled={uploadingLogoLight}
                    >
                      {uploadingLogoLight ? (
                        <>
                          <Spinner size="sm" className="mr-2" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          {companyLogoLight ? 'Change' : 'Upload'}
                        </>
                      )}
                    </Button>
                    {companyLogoLight && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleLogoDelete('light')}
                        disabled={uploadingLogoLight}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Dark Theme Logo */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-700" />
                  <span className="font-medium text-sm">Dark Theme Logo</span>
                  <span className="text-xs text-muted-foreground">(Optional - sidebar only)</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg bg-slate-900" style={{ minWidth: '200px', minHeight: '80px', maxWidth: '300px', maxHeight: '100px' }}>
                    {companyLogoDark ? (
                      <img 
                        src={companyLogoDark} 
                        alt="Dark Theme Logo" 
                        className="max-h-[80px] max-w-[280px] object-contain p-2"
                      />
                    ) : companyLogoLight ? (
                      <div className="flex flex-col items-center gap-1 p-4 text-slate-400">
                        <img 
                          src={companyLogoLight} 
                          alt="Using light logo" 
                          className="max-h-[50px] max-w-[200px] object-contain opacity-50"
                        />
                        <span className="text-xs">Using light logo</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 p-4 text-slate-400">
                        <ImageIcon className="h-8 w-8" />
                        <span className="text-sm">No logo</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={logoDarkInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={(e) => handleLogoUpload(e, 'dark')}
                      className="hidden"
                      id="logo-dark-upload"
                    />
                    <Button
                      variant="outline"
                      onClick={() => logoDarkInputRef.current?.click()}
                      disabled={uploadingLogoDark}
                    >
                      {uploadingLogoDark ? (
                        <>
                          <Spinner size="sm" className="mr-2" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          {companyLogoDark ? 'Change' : 'Upload'}
                        </>
                      )}
                    </Button>
                    {companyLogoDark && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleLogoDelete('dark')}
                        disabled={uploadingLogoDark}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Recommended: PNG or JPG, minimum 500px wide. If no dark theme logo is uploaded, the light theme logo will be used in dark mode.
              </p>
            </CardContent>
          </Card>

          {/* Company Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle>Company Information</CardTitle>
              </div>
              <CardDescription>
                Basic information displayed on invoices and documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tax_id">Tax ID</Label>
                  <Input
                    id="tax_id"
                    value={companyInfo.tax_id}
                    onChange={(e) => setCompanyInfo(prev => ({ ...prev, tax_id: e.target.value }))}
                    placeholder="e.g. 1234567898-1548"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={companyInfo.phone}
                    onChange={(e) => setCompanyInfo(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+66 xxx xxx xxxx"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={companyInfo.address}
                  onChange={(e) => setCompanyInfo(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Company address for invoices..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveCompanyInfo} disabled={saving}>
                  {saving ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Company Info
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Timezone Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <CardTitle>Timezone</CardTitle>
              </div>
              <CardDescription>
                Set the timezone for displaying dates and times throughout the app
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="max-w-sm">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pacific/Honolulu">Pacific/Honolulu (HST) UTC-10</SelectItem>
                    <SelectItem value="America/Anchorage">America/Anchorage (AKST) UTC-9</SelectItem>
                    <SelectItem value="America/Los_Angeles">America/Los Angeles (PST) UTC-8</SelectItem>
                    <SelectItem value="America/Denver">America/Denver (MST) UTC-7</SelectItem>
                    <SelectItem value="America/Chicago">America/Chicago (CST) UTC-6</SelectItem>
                    <SelectItem value="America/New_York">America/New York (EST) UTC-5</SelectItem>
                    <SelectItem value="America/Sao_Paulo">America/Sao Paulo (BRT) UTC-3</SelectItem>
                    <SelectItem value="Europe/London">Europe/London (GMT) UTC+0</SelectItem>
                    <SelectItem value="Europe/Paris">Europe/Paris (CET) UTC+1</SelectItem>
                    <SelectItem value="Europe/Athens">Europe/Athens (EET) UTC+2</SelectItem>
                    <SelectItem value="Europe/Moscow">Europe/Moscow (MSK) UTC+3</SelectItem>
                    <SelectItem value="Asia/Dubai">Asia/Dubai (GST) UTC+4</SelectItem>
                    <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST) UTC+5:30</SelectItem>
                    <SelectItem value="Asia/Dhaka">Asia/Dhaka (BST) UTC+6</SelectItem>
                    <SelectItem value="Asia/Bangkok">Asia/Bangkok (ICT) UTC+7</SelectItem>
                    <SelectItem value="Asia/Singapore">Asia/Singapore (SGT) UTC+8</SelectItem>
                    <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST) UTC+9</SelectItem>
                    <SelectItem value="Australia/Sydney">Australia/Sydney (AEDT) UTC+11</SelectItem>
                    <SelectItem value="Pacific/Auckland">Pacific/Auckland (NZDT) UTC+13</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={async () => {
                    const success = await updateSettings('timezone', timezone)
                    if (success) {
                      toast.success('Timezone saved successfully')
                    }
                  }}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Timezone
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoice Tab */}
        <TabsContent value="invoice" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle>Invoice Settings</CardTitle>
              </div>
              <CardDescription>
                Configure how your invoices look and behave
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tax_percentage">Default Tax Percentage (%)</Label>
                <NumberInput
                  id="tax_percentage"
                  min={0}
                  max={100}
                  decimal
                  value={invoiceSettings.tax_percentage}
                  onChange={(value) => setInvoiceSettings(prev => ({ ...prev, tax_percentage: value }))}
                  className="max-w-32"
                />
                <p className="text-xs text-muted-foreground">
                  Default VAT/tax rate applied to invoices for agents with tax enabled.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_footer">Payment Footer</Label>
                <Textarea
                  id="payment_footer"
                  value={invoiceSettings.payment_footer}
                  onChange={(e) => setInvoiceSettings(prev => ({ ...prev, payment_footer: e.target.value }))}
                  placeholder="Bank transfer details, payment terms, or other instructions..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  This text appears at the bottom of invoices. Include bank details or payment terms.
                </p>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveInvoiceSettings} disabled={saving}>
                  {saving ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Invoice Settings
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Bank Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-primary" />
                <CardTitle>Bank Details</CardTitle>
              </div>
              <CardDescription>
                Bank account information for invoice payments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bank_name">Bank Name</Label>
                  <Input
                    id="bank_name"
                    value={paymentSettings.bank_name}
                    onChange={(e) => setPaymentSettings(prev => ({ ...prev, bank_name: e.target.value }))}
                    placeholder="e.g. Bangkok Bank"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account_name">Account Name</Label>
                  <Input
                    id="account_name"
                    value={paymentSettings.account_name}
                    onChange={(e) => setPaymentSettings(prev => ({ ...prev, account_name: e.target.value }))}
                    placeholder="Account holder name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_number">Account Number</Label>
                <Input
                  id="account_number"
                  value={paymentSettings.account_number}
                  onChange={(e) => setPaymentSettings(prev => ({ ...prev, account_number: e.target.value }))}
                  placeholder="xxx-x-xxxxx-x"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_instructions">Payment Instructions</Label>
                <Textarea
                  id="payment_instructions"
                  value={paymentSettings.payment_instructions}
                  onChange={(e) => setPaymentSettings(prev => ({ ...prev, payment_instructions: e.target.value }))}
                  placeholder="Additional payment instructions, such as reference number format, PromptPay info, etc."
                  rows={4}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSavePaymentSettings} disabled={saving}>
                  {saving ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Bank Details
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Tab */}
        <TabsContent value="payment" className="space-y-6">
          {/* Payment Methods */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <CardTitle>Payment Methods</CardTitle>
              </div>
              <CardDescription>
                Enable or disable payment methods for your direct booking page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Cash on Tour Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30">
                    <Banknote className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">Cash on Tour</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow customers to book now and pay cash when they join the tour
                    </p>
                  </div>
                </div>
                <Switch
                  checked={bookingSettings.allow_cash_on_tour}
                  onCheckedChange={(checked) => setBookingSettings(prev => ({ ...prev, allow_cash_on_tour: checked }))}
                />
              </div>

              {/* Stripe Credit Card Toggle */}
              <div className={`flex items-center justify-between p-4 rounded-lg border ${
                !isStripeConfigured() ? 'opacity-60' : ''
              }`}>
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label className="text-base font-medium">Credit Card via Stripe</Label>
                      {isStripeConfigured() && (
                        <Badge variant="outline" className="text-xs">
                          {stripeSettings.test_mode ? 'Test Mode' : 'Live'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isStripeConfigured()
                        ? 'Accept credit/debit card payments online with instant confirmation'
                        : 'Configure your Stripe API keys below to enable credit card payments'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={bookingSettings.stripe_payments_enabled}
                  onCheckedChange={(checked) => setBookingSettings(prev => ({ ...prev, stripe_payments_enabled: checked }))}
                  disabled={!isStripeConfigured()}
                />
              </div>

              {/* Warning if no payment methods enabled */}
              {!bookingSettings.allow_cash_on_tour && (!bookingSettings.stripe_payments_enabled || !isStripeConfigured()) && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    No payment methods are enabled. Customers will not be able to complete bookings.
                  </p>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleSaveBookingSettings} disabled={saving}>
                  {saving ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Payment Methods
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stripe API Keys */}
          {company && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <CardTitle>Stripe Payment Integration</CardTitle>
                </div>
                <CardDescription>
                  Enter your Stripe API keys to accept credit card payments from customers. You can find your keys in your{' '}
                  <a
                    href="https://dashboard.stripe.com/apikeys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Stripe Dashboard
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Status indicator */}
                {isStripeConfigured() ? (
                  <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-6 w-6 text-green-500" />
                      <div>
                        <p className="font-medium text-green-700 dark:text-green-400">Stripe Configured</p>
                        <p className="text-sm text-green-600 dark:text-green-500">
                          {stripeSettings.test_mode ? 'Running in Test Mode' : 'Running in Live Mode'}
                        </p>
                      </div>
                    </div>
                    <Badge className={stripeSettings.test_mode ? 'bg-amber-500' : 'bg-green-500'}>
                      {stripeSettings.test_mode ? 'Test' : 'Live'}
                    </Badge>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border">
                    <Key className="h-6 w-6 text-muted-foreground" />
                    <div>
                      <p className="font-medium">API Keys Required</p>
                      <p className="text-sm text-muted-foreground">
                        Enter your Stripe API keys below to enable online payments.
                      </p>
                    </div>
                  </div>
                )}

                {/* Test Mode Toggle */}
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">Test Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      When enabled, use test keys (pk_test_..., sk_test_...). Disable for live payments.
                    </p>
                  </div>
                  <Switch
                    checked={stripeSettings.test_mode}
                    onCheckedChange={(checked) => setStripeSettings(prev => ({ ...prev, test_mode: checked }))}
                  />
                </div>

                {/* Publishable Key */}
                <div className="space-y-2">
                  <Label htmlFor="stripe_public_key">Publishable Key</Label>
                  <Input
                    id="stripe_public_key"
                    value={stripeSettings.public_key}
                    onChange={(e) => setStripeSettings(prev => ({ ...prev, public_key: e.target.value }))}
                    placeholder={stripeSettings.test_mode ? 'pk_test_...' : 'pk_live_...'}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your Stripe publishable key (starts with pk_test_ or pk_live_)
                  </p>
                </div>

                {/* Secret Key */}
                <div className="space-y-2">
                  <Label htmlFor="stripe_secret_key">Secret Key</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="stripe_secret_key"
                        type={showStripeSecretKey ? 'text' : 'password'}
                        value={stripeSettings.secret_key}
                        onChange={(e) => setStripeSettings(prev => ({ ...prev, secret_key: e.target.value }))}
                        placeholder={stripeSettings.test_mode ? 'sk_test_...' : 'sk_live_...'}
                        className="font-mono text-sm pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowStripeSecretKey(!showStripeSecretKey)}
                      >
                        {showStripeSecretKey ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your Stripe secret key (starts with sk_test_ or sk_live_). Keep this secret!
                  </p>
                </div>

                {/* Webhook Secret */}
                <div className="space-y-2">
                  <Label htmlFor="stripe_webhook_secret">Webhook Secret (Optional)</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="stripe_webhook_secret"
                        type={showWebhookSecret ? 'text' : 'password'}
                        value={stripeSettings.webhook_secret}
                        onChange={(e) => setStripeSettings(prev => ({ ...prev, webhook_secret: e.target.value }))}
                        placeholder="whsec_..."
                        className="font-mono text-sm pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                      >
                        {showWebhookSecret ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Required for webhook signature verification. Get this from your Stripe Dashboard &gt; Webhooks.
                  </p>
                </div>

                {/* Validation Status */}
                {stripeKeyStatus && (
                  <div className={`flex items-center gap-2 p-3 rounded-lg ${
                    stripeKeyStatus.valid 
                      ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900' 
                      : 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900'
                  }`}>
                    {stripeKeyStatus.valid ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                    <p className={`text-sm ${stripeKeyStatus.valid ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                      {stripeKeyStatus.message}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 justify-between">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleValidateStripeKeys}
                      disabled={stripeValidating || !stripeSettings.public_key || !stripeSettings.secret_key}
                    >
                      {stripeValidating ? (
                        <>
                          <Spinner size="sm" className="mr-2" />
                          Validating...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Validate Keys
                        </>
                      )}
                    </Button>
                    {isStripeConfigured() && (
                      <Button
                        variant="outline"
                        onClick={handleClearStripeSettings}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear Keys
                      </Button>
                    )}
                  </div>
                  <Button onClick={handleSaveStripeSettings} disabled={saving}>
                    {saving ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Stripe Settings
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Online Booking Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                <CardTitle>Direct Booking Page Settings</CardTitle>
              </div>
              <CardDescription>
                Configure your direct booking page for customers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="page_header_text">Page Header Text</Label>
                <Textarea
                  id="page_header_text"
                  value={bookingSettings.page_header_text}
                  onChange={(e) => setBookingSettings(prev => ({ ...prev, page_header_text: e.target.value }))}
                  placeholder="Welcome message or instructions shown at the top of booking page..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="page_footer_text">Page Footer Text</Label>
                <Textarea
                  id="page_footer_text"
                  value={bookingSettings.page_footer_text}
                  onChange={(e) => setBookingSettings(prev => ({ ...prev, page_footer_text: e.target.value }))}
                  placeholder="Terms, conditions, or contact info shown at the bottom..."
                  rows={2}
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="thank_you_message">Thank You Message</Label>
                <Textarea
                  id="thank_you_message"
                  value={bookingSettings.thank_you_message}
                  onChange={(e) => setBookingSettings(prev => ({ ...prev, thank_you_message: e.target.value }))}
                  placeholder="Message shown after successful booking..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="failed_payment_message">Failed Payment Message</Label>
                <Textarea
                  id="failed_payment_message"
                  value={bookingSettings.failed_payment_message}
                  onChange={(e) => setBookingSettings(prev => ({ ...prev, failed_payment_message: e.target.value }))}
                  placeholder="Message shown when payment fails..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_manual_booking">Contact for Manual Booking</Label>
                <Input
                  id="contact_manual_booking"
                  value={bookingSettings.contact_for_manual_booking}
                  onChange={(e) => setBookingSettings(prev => ({ ...prev, contact_for_manual_booking: e.target.value }))}
                  placeholder="Phone, email, or LINE ID for manual bookings"
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="cash_booking_message">Cash Booking Message</Label>
                <Textarea
                  id="cash_booking_message"
                  value={bookingSettings.cash_booking_message}
                  onChange={(e) => setBookingSettings(prev => ({ ...prev, cash_booking_message: e.target.value }))}
                  placeholder="Instructions for customers choosing cash payment..."
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  Message shown to customers who choose to pay cash on tour.
                </p>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveBookingSettings} disabled={saving}>
                  {saving ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Booking Settings
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                <CardTitle>Email Settings</CardTitle>
              </div>
              <CardDescription>
                Configure email sender information and templates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="from_name">From Name</Label>
                  <Input
                    id="from_name"
                    value={emailSettings.from_name}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, from_name: e.target.value }))}
                    placeholder="Your Company Name"
                  />
                  <p className="text-xs text-muted-foreground">
                    Display name shown in email &quot;From&quot; field
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reply_to">Reply-To Email</Label>
                  <Input
                    id="reply_to"
                    type="email"
                    value={emailSettings.reply_to}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, reply_to: e.target.value }))}
                    placeholder="reply@yourcompany.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email address for customer replies
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email_footer">Email Footer Text</Label>
                <Textarea
                  id="email_footer"
                  value={emailSettings.footer_text}
                  onChange={(e) => setEmailSettings(prev => ({ ...prev, footer_text: e.target.value }))}
                  placeholder="Footer text included in all outgoing emails..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveEmailSettings} disabled={saving}>
                  {saving ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Email Settings
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Booking Notification Emails */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Booking Notification Emails
              </CardTitle>
              <CardDescription>
                Receive email notifications when customers make direct website bookings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Notification Recipients</Label>
                <p className="text-sm text-muted-foreground">
                  Add email addresses to receive notifications for direct website purchases
                </p>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={newBookingNotificationEmail}
                    onChange={(e) => setNewBookingNotificationEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (newBookingNotificationEmail.trim() && !emailSettings.booking_notification_emails.includes(newBookingNotificationEmail.trim())) {
                          setEmailSettings(prev => ({
                            ...prev,
                            booking_notification_emails: [...prev.booking_notification_emails, newBookingNotificationEmail.trim()]
                          }))
                          setNewBookingNotificationEmail('')
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (newBookingNotificationEmail.trim() && !emailSettings.booking_notification_emails.includes(newBookingNotificationEmail.trim())) {
                        setEmailSettings(prev => ({
                          ...prev,
                          booking_notification_emails: [...prev.booking_notification_emails, newBookingNotificationEmail.trim()]
                        }))
                        setNewBookingNotificationEmail('')
                      }
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
              
              {emailSettings.booking_notification_emails.length > 0 && (
                <div className="space-y-2">
                  <Label>Current Recipients</Label>
                  <div className="flex flex-wrap gap-2">
                    {emailSettings.booking_notification_emails.map((email, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1 py-1 px-2">
                        <Mail className="h-3 w-3" />
                        {email}
                        <button
                          type="button"
                          onClick={() => {
                            setEmailSettings(prev => ({
                              ...prev,
                              booking_notification_emails: prev.booking_notification_emails.filter((_, i) => i !== index)
                            }))
                          }}
                          className="ml-1 hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button onClick={handleSaveEmailSettings} disabled={saving}>
                  {saving ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Notification Settings
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Email Test Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Email Template Testing
              </CardTitle>
              <CardDescription>
                Send test emails with mock data to verify your email templates look correct
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Info Banner */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">Test Mode</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      All emails sent from here use mock/dummy data and are clearly marked as test emails.
                    </p>
                  </div>
                </div>
              </div>

              {/* Email Test Form */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="test-email-recipient">Recipient Email</Label>
                  <Input
                    id="test-email-recipient"
                    type="email"
                    placeholder="Enter email address"
                    value={testEmailRecipient}
                    onChange={(e) => setTestEmailRecipient(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="test-email-template">Email Template</Label>
                  <select
                    id="test-email-template"
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={testEmailTemplate}
                    onChange={(e) => setTestEmailTemplate(e.target.value)}
                  >
                    <option value="booking-confirmation">Booking Confirmation</option>
                    <option value="pickup-time">Pickup Time Notification</option>
                    <option value="invoice">Invoice (with PDF)</option>
                    <option value="receipt">Payment Receipt (with PDF)</option>
                    <option value="operation-report">Operation Report (PDF + CSV)</option>
                    <option value="auto-daily-report">Auto Daily Report (8 files)</option>
                  </select>
                </div>
              </div>

              {/* Template Description */}
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                {testEmailTemplate === 'booking-confirmation' && (
                  <p><strong>Booking Confirmation:</strong> Sent to customers when booked. No attachments.</p>
                )}
                {testEmailTemplate === 'pickup-time' && (
                  <p><strong>Pickup Time:</strong> Pickup details with hotel location. No attachments.</p>
                )}
                {testEmailTemplate === 'invoice' && (
                  <p><strong>Invoice:</strong> Agent invoice with 7 booking line items. 1 PDF attachment.</p>
                )}
                {testEmailTemplate === 'receipt' && (
                  <p><strong>Receipt:</strong> Payment receipt for paid invoice. 1 PDF attachment.</p>
                )}
                {testEmailTemplate === 'operation-report' && (
                  <p><strong>Operation Report:</strong> Daily report with 7 bookings. 2 attachments (PDF + CSV).</p>
                )}
                {testEmailTemplate === 'auto-daily-report' && (
                  <p><strong>Auto Daily Report:</strong> Full backup report. 8 attachments (4 PDFs + 4 CSVs).</p>
                )}
              </div>

              {/* Send Button */}
              <Button 
                onClick={handleSendTestEmail} 
                disabled={sendingTestEmail || !testEmailRecipient.trim()}
              >
                {sendingTestEmail ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Test Email
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pickup Tab */}
        <TabsContent value="pickup" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Car className="h-5 w-5 text-primary" />
                <CardTitle>Pickup Settings</CardTitle>
              </div>
              <CardDescription>
                Configure pickup contact information and email templates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pickup_contact">Pickup Contact Info</Label>
                <Textarea
                  id="pickup_contact"
                  value={pickupSettings.contact_info}
                  onChange={(e) => setPickupSettings(prev => ({ ...prev, contact_info: e.target.value }))}
                  placeholder="Phone numbers, LINE IDs, or other contact methods for pickup inquiries..."
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  This information is included in pickup notification emails
                </p>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="pickup_email_template">Pickup Email Template</Label>
                <Textarea
                  id="pickup_email_template"
                  value={pickupSettings.pickup_email_template}
                  onChange={(e) => setPickupSettings(prev => ({ ...prev, pickup_email_template: e.target.value }))}
                  placeholder="Custom text to include in pickup notification emails..."
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  Additional instructions or information sent with pickup time notifications
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="come_direct_template">Come Direct Email Template</Label>
                <Textarea
                  id="come_direct_template"
                  value={pickupSettings.come_direct_email_template}
                  onChange={(e) => setPickupSettings(prev => ({ ...prev, come_direct_email_template: e.target.value }))}
                  placeholder="Instructions for guests who will come directly to the pier/meeting point..."
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  Sent to guests who selected &quot;Come Direct&quot; option instead of hotel pickup
                </p>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSavePickupSettings} disabled={saving}>
                  {saving ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Pickup Settings
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OP Report Tab */}
        <TabsContent value="op-report" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <CardTitle>OP Report Auto Email</CardTitle>
              </div>
              <CardDescription>
                Automatically send daily OP reports via email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="send_time">Auto Send Time</Label>
                <Input
                  id="send_time"
                  type="time"
                  value={opReportSettings.send_time}
                  onChange={(e) => setOpReportSettings(prev => ({ ...prev, send_time: e.target.value }))}
                  className="max-w-40"
                />
                <p className="text-xs text-muted-foreground">
                  Time to automatically send the daily OP report (e.g., 23:30 for end of day)
                </p>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Recipient Emails</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={newRecipientEmail}
                    onChange={(e) => setNewRecipientEmail(e.target.value)}
                    placeholder="email@example.com"
                    onKeyDown={(e) => e.key === 'Enter' && addRecipientEmail()}
                  />
                  <Button type="button" variant="outline" onClick={addRecipientEmail}>
                    Add
                  </Button>
                </div>
                {opReportSettings.recipient_emails.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {opReportSettings.recipient_emails.map((email) => (
                      <Badge key={email} variant="secondary" className="flex items-center gap-1">
                        {email}
                        <button
                          type="button"
                          onClick={() => removeRecipientEmail(email)}
                          className="ml-1 hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Emails that will receive the daily OP report
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button onClick={handleSaveOpReportSettings} disabled={saving}>
                  {saving ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save OP Report Settings
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Send OP Report Now */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                <CardTitle>Send OP Report Now</CardTitle>
              </div>
              <CardDescription>
                Manually send the OP report for tomorrow&apos;s bookings to all configured recipients
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800 dark:text-blue-200">How Auto Send Works</p>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 mt-1 space-y-1">
                      <li>• The system checks hourly if it&apos;s time to send (Thailand timezone)</li>
                      <li>• If send time is before noon: sends report for today&apos;s bookings</li>
                      <li>• If send time is noon or later: sends report for tomorrow&apos;s bookings</li>
                      <li>• Make sure to save your settings before expecting auto emails</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              {opReportSettings.recipient_emails.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Add recipient emails above to send reports</p>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Will send to: <span className="font-medium">{opReportSettings.recipient_emails.join(', ')}</span>
                  </div>
                  <Button 
                    onClick={handleSendOpReportNow} 
                    disabled={sendingOpReport || opReportSettings.recipient_emails.length === 0}
                    variant="default"
                  >
                    {sendingOpReport ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Report Now
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>
                      Manage staff accounts and their permissions
                      {company?.company_code && (
                        <span className="ml-2">
                          (Company Code: <span className="font-mono font-medium">{company.company_code}</span>)
                        </span>
                      )}
                    </CardDescription>
                  </div>
                </div>
                <Button onClick={() => {
                  setEditingStaff(null)
                  setStaffDialogOpen(true)
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Staff
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingTeam ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : teamMembers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No staff members yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add staff members to help manage your bookings and operations.
                  </p>
                  <Button onClick={() => {
                    setEditingStaff(null)
                    setStaffDialogOpen(true)
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Staff Member
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamMembers.map((staff) => (
                      <TableRow key={staff.id}>
                        <TableCell className="font-mono font-medium">
                          {staff.staff_code || '—'}
                        </TableCell>
                        <TableCell>{staff.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {staff.email || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={staff.status === 'active' ? 'default' : 'secondary'}>
                            {staff.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingStaff(staff)
                              setStaffDialogOpen(true)
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStaffStatus(staff)}
                          >
                            {staff.status === 'active' ? (
                              <UserX className="h-4 w-4 text-amber-500" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteStaff(staff.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Staff Dialog */}
          {user?.company_id && (
            <StaffDialog
              open={staffDialogOpen}
              onOpenChange={setStaffDialogOpen}
              companyId={user.company_id}
              staff={editingStaff}
              onSuccess={fetchTeamMembers}
            />
          )}
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          {/* PIN Protection */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <CardTitle>PIN Protection</CardTitle>
              </div>
              <CardDescription>
                Require a 4-digit PIN to access sensitive pages like pricing and agent settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable PIN Protection</Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, locked pages will require PIN verification
                  </p>
                </div>
                <Switch
                  checked={pinEnabled}
                  onCheckedChange={setPinEnabled}
                />
              </div>

              {pinEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="pin">4-Digit PIN</Label>
                  <div className="flex gap-2 max-w-xs">
                    <Input
                      id="pin"
                      type={showPin ? 'text' : 'password'}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="••••"
                      className="text-center text-xl tracking-widest font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowPin(!showPin)}
                    >
                      {showPin ? 'Hide' : 'Show'}
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleSavePinSettings} disabled={saving}>
                  {saving ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save PIN Settings
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Page Locks */}
          {pinEnabled && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <CardTitle>Page Access Control</CardTitle>
                </div>
                <CardDescription>
                  Select which pages require PIN verification before access
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Main Navigation Pages */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Main Navigation</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {pageOptions.filter(p => !p.isSetup).map((page) => (
                      <div
                        key={page.key}
                        className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                          pageLocks[page.key]
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => togglePageLock(page.key)}
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm">{page.label}</p>
                          <p className="text-xs text-muted-foreground">{page.description}</p>
                        </div>
                        {pageLocks[page.key] ? (
                          <Lock className="h-4 w-4 text-amber-500" />
                        ) : (
                          <div className="h-4 w-4" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Setup Pages */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Setup Pages</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {pageOptions.filter(p => p.isSetup).map((page) => (
                      <div
                        key={page.key}
                        className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                          pageLocks[page.key]
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => togglePageLock(page.key)}
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm">{page.label}</p>
                          <p className="text-xs text-muted-foreground">{page.description}</p>
                        </div>
                        {pageLocks[page.key] ? (
                          <Lock className="h-4 w-4 text-amber-500" />
                        ) : (
                          <div className="h-4 w-4" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {Object.values(pageLocks).filter(Boolean).length} page(s) locked
                  </p>
                  <Button onClick={handleSavePageLocks} disabled={saving}>
                    {saving ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Page Locks
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

      </Tabs>
    </div>
  )
}
