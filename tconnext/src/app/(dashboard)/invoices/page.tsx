"use client"

import { useEffect, useState, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { formatDate, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import {
  FileText,
  Send,
  Download,
  CheckCircle,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Copy,
  Receipt,
  Mail,
  X,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Combobox, ComboboxOption } from '@/components/ui/combobox'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { parseDate } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'
import type { Invoice, Agent, Booking, InvoiceItem, Company, InvoicePaymentType } from '@/types'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

interface InvoiceWithDetails extends Invoice {
  agent?: Agent
  items?: (InvoiceItem & { booking?: Booking & { program?: { name: string } } })[]
  payment_type?: InvoicePaymentType
}

type SortColumn = 'invoice_number' | 'agent' | 'date_from' | 'total_amount' | 'status' | 'created_at' | 'updated_at' | 'due_date'
type SortDirection = 'asc' | 'desc'

export default function InvoicesPage() {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [company, setCompany] = useState<Company | null>(null)
  const [paymentTypes, setPaymentTypes] = useState<InvoicePaymentType[]>([])
  const [loading, setLoading] = useState(true)
  
  // View invoice dialog
  const [viewInvoice, setViewInvoice] = useState<InvoiceWithDetails | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  
  // Edit invoice dialog
  const [editInvoice, setEditInvoice] = useState<InvoiceWithDetails | null>(null)
  const [editForm, setEditForm] = useState({ status: '', notes: '', internal_notes: '' })
  const [isSaving, setIsSaving] = useState(false)
  
  // Delete invoice dialog
  const [deleteInvoice, setDeleteInvoice] = useState<InvoiceWithDetails | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Send email dialog
  const [sendEmailInvoice, setSendEmailInvoice] = useState<InvoiceWithDetails | null>(null)
  const [emailAddress, setEmailAddress] = useState('')
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [emailType, setEmailType] = useState<'invoice' | 'receipt'>('invoice')
  
  // Receipt dialog
  const [receiptInvoice, setReceiptInvoice] = useState<InvoiceWithDetails | null>(null)
  
  // Mark as Paid dialog
  const [markPaidInvoice, setMarkPaidInvoice] = useState<InvoiceWithDetails | null>(null)
  const [markPaidForm, setMarkPaidForm] = useState({ payment_type_id: '', internal_notes: '' })
  const [isMarkingPaid, setIsMarkingPaid] = useState(false)

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [agentFilter, setAgentFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<{ start: DateValue; end: DateValue } | null>(null)
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<SortColumn>('created_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(30)

  const fetchInvoices = async () => {
    if (!user?.company_id) return

    const supabase = createClient()
    const [invoicesRes, companyRes, agentsRes, paymentTypesRes] = await Promise.all([
      supabase
        .from('invoices')
        .select(`
          *,
          agent:agents(id, name, email, phone, address, tax_id, tax_applied),
          payment_type:invoice_payment_types(id, name),
          invoice_items(id)
        `)
        .eq('company_id', user.company_id)
        .order('created_at', { ascending: false }),
      supabase
        .from('companies')
        .select('*')
        .eq('id', user.company_id)
        .single(),
      supabase
        .from('agents')
        .select('id, name')
        .eq('company_id', user.company_id)
        .eq('status', 'active')
        .order('name'),
      supabase
        .from('invoice_payment_types')
        .select('*')
        .eq('company_id', user.company_id)
        .eq('is_active', true)
        .order('name')
    ])

    if (invoicesRes.error) {
      toast.error('Failed to load invoices')
    } else {
      setInvoices(invoicesRes.data || [])
    }
    
    if (companyRes.data) {
      setCompany(companyRes.data)
    }
    
    if (agentsRes.data) {
      setAgents(agentsRes.data)
    }
    
    if (paymentTypesRes.data) {
      setPaymentTypes(paymentTypesRes.data)
    }
    
    setLoading(false)
  }

  useEffect(() => {
    fetchInvoices()
  }, [user])

  const fetchInvoiceDetails = async (invoice: InvoiceWithDetails) => {
    setLoadingDetails(true)
    setViewInvoice(invoice)

    const supabase = createClient()
    const { data: items, error } = await supabase
      .from('invoice_items')
      .select(`
        *,
        booking:bookings(
          id,
          booking_number,
          activity_date,
          created_at,
          customer_name,
          adults,
          children,
          infants,
          program:programs(name)
        )
      `)
      .eq('invoice_id', invoice.id)

    if (!error && items) {
      setViewInvoice({ ...invoice, items })
    }
    setLoadingDetails(false)
  }

  const statusColors = {
    draft: 'secondary',
    sent: 'default',
    paid: 'success',
    overdue: 'destructive',
  } as const

  // Helper function to check if invoice is overdue
  const isInvoiceOverdue = (invoice: InvoiceWithDetails) => {
    if (invoice.status === 'paid') return false
    if (!invoice.due_date) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDate = new Date(invoice.due_date)
    dueDate.setHours(0, 0, 0, 0)
    return dueDate < today
  }

  // Get display status (shows 'overdue' if past due date and not paid)
  const getDisplayStatus = (invoice: InvoiceWithDetails) => {
    if (isInvoiceOverdue(invoice)) return 'overdue'
    return invoice.status
  }

  const handleOpenMarkPaid = (invoice: InvoiceWithDetails) => {
    setMarkPaidForm({ 
      payment_type_id: paymentTypes[0]?.id || '', 
      internal_notes: invoice.internal_notes || '' 
    })
    setMarkPaidInvoice(invoice)
  }

  const handleMarkPaid = async () => {
    if (!markPaidInvoice) return
    if (!markPaidForm.payment_type_id) {
      toast.error('Please select a payment type')
      return
    }

    setIsMarkingPaid(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('invoices')
      .update({ 
        status: 'paid', 
        paid_at: new Date().toISOString(),
        payment_type_id: markPaidForm.payment_type_id,
        internal_notes: markPaidForm.internal_notes || null,
        last_modified_by: user?.id || null,
        last_modified_by_name: user?.name || null,
      })
      .eq('id', markPaidInvoice.id)

    if (error) {
      toast.error('Failed to update invoice')
    } else {
      toast.success('Invoice marked as paid')
      setMarkPaidInvoice(null)
      fetchInvoices()
    }
    setIsMarkingPaid(false)
  }

  const handleEditInvoice = (invoice: InvoiceWithDetails) => {
    setEditForm({
      status: invoice.status,
      notes: invoice.notes || '',
      internal_notes: invoice.internal_notes || ''
    })
    setEditInvoice(invoice)
  }

  const handleSaveEdit = async () => {
    if (!editInvoice) return

    // If changing to paid, require payment type selection via the Mark as Paid dialog
    if (editForm.status === 'paid' && editInvoice.status !== 'paid') {
      setEditInvoice(null)
      handleOpenMarkPaid(editInvoice)
      return
    }

    setIsSaving(true)
    const supabase = createClient()
    
    const updateData: any = {
      status: editForm.status,
      notes: editForm.notes || null,
      internal_notes: editForm.internal_notes || null,
      last_modified_by: user?.id || null,
      last_modified_by_name: user?.name || null,
    }

    // If marking as sent, set sent_at
    if (editForm.status === 'sent' && editInvoice.status !== 'sent') {
      updateData.sent_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', editInvoice.id)

    if (error) {
      console.error('Invoice update error:', error)
      toast.error(`Failed to update invoice: ${error.message}`)
    } else {
      toast.success('Invoice updated successfully')
      setEditInvoice(null)
      fetchInvoices()
    }
    setIsSaving(false)
  }

  const handleDeleteInvoice = async () => {
    if (!deleteInvoice) return

    setIsDeleting(true)
    const supabase = createClient()

    // First, clear invoice_id from all bookings linked to this invoice
    await supabase
      .from('bookings')
      .update({ invoice_id: null })
      .eq('invoice_id', deleteInvoice.id)

    // Delete invoice items (should cascade, but just in case)
    await supabase
      .from('invoice_items')
      .delete()
      .eq('invoice_id', deleteInvoice.id)

    // Delete the invoice
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', deleteInvoice.id)

    if (error) {
      toast.error('Failed to delete invoice')
    } else {
      toast.success('Invoice deleted successfully')
      setDeleteInvoice(null)
      fetchInvoices()
    }
    setIsDeleting(false)
  }

  // Helper function to convert external URL to base64 data URL via server proxy
  const urlToBase64 = async (url: string): Promise<string> => {
    if (!url || url.startsWith('data:')) return url // Already base64 or empty
    try {
      // Use server-side proxy to avoid CORS issues
      const response = await fetch(`/api/proxy-image?url=${encodeURIComponent(url)}`)
      if (!response.ok) {
        throw new Error('Failed to proxy image')
      }
      const data = await response.json()
      return data.dataUrl || ''
    } catch (error) {
      console.error('Failed to convert URL to base64:', error)
      return '' // Return empty string if conversion fails
    }
  }

  // Generate PDF as base64 for email attachment (reuses the same design as download)
  const generatePdfBase64 = async (invoice: InvoiceWithDetails, type: 'invoice' | 'receipt'): Promise<{ base64: string; filename: string }> => {
    // Always fetch fresh details for PDF to ensure we have latest data including staff
    const supabase = createClient()
    const { data: freshItems } = await supabase
      .from('invoice_items')
      .select(`
        *,
        booking:bookings(
          id,
          booking_number,
          activity_date,
          created_at,
          customer_name,
          adults,
          children,
          infants,
          voucher_number,
          program:programs(name),
          agent_staff:agent_staff(full_name, nickname)
        )
      `)
      .eq('invoice_id', invoice.id)

    invoice = { ...invoice, items: freshItems || [] }

    // Get company settings for invoice
    const settings = company?.settings as any || {}
    const invoiceSettings = settings.invoice || {}
    // Use company logo from settings
    let logoUrl = settings.logo_url || ''
    // Convert logo URL to base64 if it's an external URL (to avoid CORS issues)
    if (logoUrl && !logoUrl.startsWith('data:')) {
      logoUrl = await urlToBase64(logoUrl)
    }
    const paymentFooter = invoiceSettings.payment_footer || ''
    
    // Agent details
    const agent = invoice.agent as any
    const agentName = agent?.name || 'Agent'
    const agentAddress = agent?.address || ''
    const agentPhone = agent?.phone || ''
    
    // Check if tax should be applied for this agent
    const isTaxApplied = agent?.tax_applied !== false
    
    // Only show tax info if tax is applied
    const taxPercentage = isTaxApplied ? (invoiceSettings.tax_percentage ?? 7) : 0
    const agentTaxId = isTaxApplied ? (agent?.tax_id || '') : ''

    // Calculate totals
    const subtotal = invoice.total_amount
    const taxAmount = taxPercentage > 0 ? Math.round(subtotal * taxPercentage / 100) : 0
    const grandTotal = subtotal + taxAmount

    // Company details
    const companyName = company?.name || 'TConnext'
    const companyAddress = company?.address || ''
    const companyPhone = company?.phone || ''
    // Only show company tax ID if tax is applied
    const companyTaxId = isTaxApplied ? (company?.tax_id || '') : ''

    const isReceipt = type === 'receipt'
    const docNumber = invoice.invoice_number
    const receiptNumber = `RCP-${docNumber.replace('INV-', '')}`
    const dueDate = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null
    const invoiceDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    const paidDate = invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : invoiceDate

    // Calculate pagination - approximately 8 items per page for A4
    const itemsPerPage = 8
    const items = invoice.items || []
    const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage))

    // Generate RECEIPT pages (matching the provided design)
    const generateReceiptPageForEmail = (pageNum: number, pageItems: any[]) => {
      const isFirstPage = pageNum === 1
      const isLastPage = pageNum === totalPages

      return `
        <div class="page receipt-page">
          <!-- Receipt Header -->
          <div class="receipt-header">
            <div class="header-left">
              ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="receipt-logo" />` : `<div class="company-name-large">${companyName}</div>`}
            </div>
            <div class="header-right">
              <div class="company-name">${companyName}</div>
              <div class="company-info">${companyAddress.replace(/\n/g, '<br/>')}</div>
              ${companyPhone ? `<div class="company-info">Tel: ${companyPhone}</div>` : ''}
            </div>
          </div>

          <!-- Receipt Title -->
          <div class="receipt-title-bar">
            <span class="receipt-title">PAYMENT RECEIPT</span>
            <span class="receipt-doc-number">#${docNumber}</span>
          </div>

          ${isFirstPage ? `
          <!-- Info Cards Row -->
          <div class="receipt-info-cards">
            <div class="info-card">
              <div class="info-card-icon">📋</div>
              <div class="info-card-label">INVOICE<br/>REFERENCE</div>
              <div class="info-card-value orange">${docNumber}</div>
            </div>
            <div class="info-card">
              <div class="info-card-icon">📅</div>
              <div class="info-card-label">PAYMENT<br/>DATE</div>
              <div class="info-card-value">${paidDate}</div>
            </div>
            <div class="info-card">
              <div class="info-card-icon">🏢</div>
              <div class="info-card-label">RECEIVED<br/>FROM</div>
              <div class="info-card-value">${agentName}</div>
            </div>
            <div class="info-card highlight">
              <div class="info-card-icon">💰</div>
              <div class="info-card-label">AMOUNT PAID</div>
              <div class="info-card-value large">฿${grandTotal.toLocaleString()}</div>
            </div>
          </div>

          <!-- Service Period -->
          <div class="service-period">
            <span class="period-label">Service Period:</span>
            <span class="period-dates">${formatDate(invoice.date_from)} - ${formatDate(invoice.date_to)}</span>
          </div>
          ` : ''}

          <!-- Booking Details Table -->
          <div class="booking-details-section">
            <div class="section-title">Booking Details</div>
            <table class="booking-table">
              <thead>
                <tr>
                  <th class="col-booking">BOOKING #</th>
                  <th class="col-customer">CUSTOMER</th>
                  <th class="col-program">PROGRAM</th>
                  <th class="col-date">TOUR DATE<br/><span class="sub">DATE</span></th>
                  <th class="col-guests">GUESTS</th>
                  <th class="col-amount">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                ${pageItems.map(item => {
                  const booking = item.booking
                  if (!booking) return ''
                  const programName = (booking.program as any)?.name || '-'
                  const tourDate = formatDate(booking.activity_date)
                  const totalGuests = booking.adults + booking.children + booking.infants
                  
                  return `
                    <tr>
                      <td class="col-booking"><span class="booking-num">${booking.booking_number}</span></td>
                      <td class="col-customer">${booking.customer_name}</td>
                      <td class="col-program">${programName}</td>
                      <td class="col-date">${tourDate}</td>
                      <td class="col-guests">${totalGuests}</td>
                      <td class="col-amount">฿${item.amount.toLocaleString()}</td>
                    </tr>
                  `
                }).join('')}
              </tbody>
            </table>
          </div>

          ${isLastPage ? `
          <!-- Payment Summary Box -->
          <div class="payment-summary-container">
            <div class="payment-summary-box">
              <div class="summary-row">
                <span class="summary-label">Subtotal</span>
                <span class="summary-value">฿${subtotal.toLocaleString()}</span>
              </div>
              ${taxPercentage > 0 ? `
              <div class="summary-row">
                <span class="summary-label">Tax (${taxPercentage}%)</span>
                <span class="summary-value">฿${taxAmount.toLocaleString()}</span>
              </div>
              ` : ''}
              <div class="summary-row total-row">
                <span class="summary-label">Total Paid</span>
                <span class="summary-value total-value">฿${grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <!-- Thank You Section -->
          <div class="thank-you-box">
            <div class="thank-you-title">Thank you for your payment!</div>
            <div class="thank-you-text">This receipt confirms that payment has been received in full.</div>
          </div>
          ` : ''}

          <!-- Receipt Footer -->
          <div class="receipt-footer">
            <div class="footer-left">
              <div class="receipt-id">Receipt ID: ${receiptNumber}</div>
              <div class="page-info">Page ${pageNum} of ${totalPages}</div>
            </div>
            <div class="footer-right">
              <div class="footer-system">INVOICING & BOOKING SYSTEM</div>
              <div class="footer-brand">POWERED BY <strong>TCONNEXT</strong></div>
            </div>
          </div>
        </div>
      `
    }

    // Generate INVOICE pages (original design)
    const generateInvoicePageForEmail = (pageNum: number, pageItems: any[]) => {
      const isFirstPage = pageNum === 1
      const isLastPage = pageNum === totalPages

      return `
        <div class="page invoice-page">
          <!-- Header -->
          <div class="header">
            <div class="header-left">
              ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="logo" />` : `<div class="company-name-large">${companyName}</div>`}
            </div>
            <div class="header-right">
              <div class="company-name">${companyName}</div>
              <div class="company-info">${companyAddress.replace(/\n/g, '<br/>')}</div>
              ${companyPhone ? `<div class="company-info">Tel: ${companyPhone}</div>` : ''}
              ${companyTaxId ? `<div class="company-info">TAX ID: ${companyTaxId}</div>` : ''}
            </div>
          </div>

          <!-- Invoice Title Bar -->
          <div class="invoice-title-bar">
            <div class="invoice-title">
              <div class="invoice-label">INVOICE</div>
              <div class="invoice-number">#${docNumber}</div>
              <div class="invoice-date">Invoice Date: ${invoiceDate}</div>
            </div>
            <div class="page-number">Page <strong>${pageNum}</strong> of ${totalPages}</div>
          </div>

          <div class="divider"></div>

          ${isFirstPage ? `
          <!-- Bill To / Invoice Details -->
          <div class="info-section">
            <div class="info-box bill-to">
              <div class="info-title">Bill To</div>
              <div class="info-content">
                <div class="agent-name">${agentName}</div>
                ${agentAddress ? `<div>${agentAddress.replace(/\n/g, '<br/>')}</div>` : ''}
                ${agentPhone ? `<div>Tel: ${agentPhone}</div>` : ''}
                ${agentTaxId ? `<div>TAX ID: ${agentTaxId}</div>` : ''}
              </div>
            </div>
            <div class="info-box invoice-details">
              <div class="info-title">Invoice Details</div>
              <div class="info-content">
                <div><span class="label">Invoice #:</span> ${docNumber}</div>
                <div><span class="label">Period:</span> ${formatDate(invoice.date_from)} - ${formatDate(invoice.date_to)}</div>
                ${dueDate ? `<div><span class="label">Due Date:</span> <strong>${dueDate}</strong></div>` : ''}
              </div>
            </div>
          </div>
          ` : ''}

          <!-- Items Table -->
          <table class="items-table">
            <thead>
              <tr>
                <th class="col-booking">Booking #</th>
                <th class="col-details">Details</th>
                <th class="col-guest">Guest</th>
                <th class="col-price">Price</th>
                <th class="col-total">Total</th>
              </tr>
            </thead>
            <tbody>
              ${pageItems.map(item => {
                const booking = item.booking
                if (!booking) return ''
                const programName = (booking.program as any)?.name || '-'
                const tourDate = formatDate(booking.activity_date)
                const voucherNum = booking.voucher_number || '-'
                const agentStaff = (booking as any).agent_staff
                const staffName = agentStaff?.nickname || agentStaff?.full_name || ''
                
                // Calculate individual prices (simplified - using total / pax)
                const totalPax = booking.adults + booking.children
                const pricePerPerson = totalPax > 0 ? Math.round(item.amount / totalPax) : item.amount
                const adultTotal = booking.adults * pricePerPerson
                const childTotal = booking.children * pricePerPerson
                
                const bookingDate = new Date(booking.created_at || booking.activity_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                
                return `
                  <tr>
                    <td class="col-booking">
                      <div>${booking.booking_number}</div>
                      <div class="booking-date">${bookingDate}</div>
                      ${staffName ? `<div class="staff-name">${staffName}</div>` : ''}
                    </td>
                    <td class="col-details">
                      <div class="customer-name">${booking.customer_name}</div>
                      <div class="tour-info">Tour Date: ${tourDate}</div>
                      <div class="tour-info">${programName}</div>
                      <div class="tour-info">Voucher: ${voucherNum}</div>
                    </td>
                    <td class="col-guest">
                      ${booking.adults > 0 ? `<div>${booking.adults} Adult</div>` : ''}
                      ${booking.children > 0 ? `<div>${booking.children} Children</div>` : ''}
                      ${booking.infants > 0 ? `<div>${booking.infants} Infant</div>` : ''}
                    </td>
                    <td class="col-price">
                      ${booking.adults > 0 ? `<div>${pricePerPerson.toLocaleString()}</div>` : ''}
                      ${booking.children > 0 ? `<div>${pricePerPerson.toLocaleString()}</div>` : ''}
                      ${booking.infants > 0 ? `<div>0</div>` : ''}
                    </td>
                    <td class="col-total">
                      ${booking.adults > 0 ? `<div>${adultTotal.toLocaleString()}</div>` : ''}
                      ${booking.children > 0 ? `<div>${childTotal.toLocaleString()}</div>` : ''}
                      ${booking.infants > 0 ? `<div>0</div>` : ''}
                    </td>
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>

          ${isLastPage ? `
          <!-- Totals Section -->
          <div class="totals-section">
            <div class="totals-box">
              <div class="total-row">
                <span>TOTAL</span>
                <span class="total-value">${subtotal.toLocaleString()}</span>
              </div>
              ${taxPercentage > 0 ? `
              <div class="total-row">
                <span>Gov. Tax ${taxPercentage}%</span>
                <span class="total-value">${taxAmount.toLocaleString()}</span>
              </div>
              ` : ''}
              <div class="total-row grand-total">
                <span>GRAND TOTAL</span>
                <span class="total-value">${grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>
          ` : ''}

          <!-- Footer -->
          <div class="footer">
            ${isLastPage ? `
            <div class="footer-content">
              ${paymentFooter ? `
              <div class="payment-info">
                <div class="payment-title">Payment to:</div>
                <div class="payment-content">${paymentFooter.replace(/\n/g, '<br/>')}</div>
              </div>
              ` : '<div></div>'}
              <div class="issued-by">
                <div class="issued-title">Invoice Issued by.</div>
                <div class="signature-space"></div>
              </div>
            </div>
            ` : ''}
            <div class="powered-by">
              <div class="powered-text">INVOICING & BOOKING SYSTEM</div>
              <div class="powered-brand">POWERED BY. <strong>TCONNEXT</strong></div>
            </div>
          </div>
        </div>
      `
    }

    // Generate all pages based on type
    let pagesHtml = ''
    for (let i = 0; i < totalPages; i++) {
      const startIdx = i * itemsPerPage
      const pageItems = items.slice(startIdx, startIdx + itemsPerPage)
      if (isReceipt) {
        pagesHtml += generateReceiptPageForEmail(i + 1, pageItems)
      } else {
        pagesHtml += generateInvoicePageForEmail(i + 1, pageItems)
      }
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${isReceipt ? 'RECEIPT' : 'INVOICE'} ${isReceipt ? receiptNumber : docNumber}</title>
        <style>
          @page {
            size: A4;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 11px;
            color: #333;
            background: white;
          }
          .page {
            width: 210mm;
            min-height: 297mm;
            padding: 15mm 20mm;
            page-break-after: always;
            position: relative;
          }
          .page:last-child {
            page-break-after: auto;
          }

          /* Header */
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 15px;
          }
          .header-left {
            flex: 1;
          }
          .logo {
            max-width: 180px;
            max-height: 60px;
            object-fit: contain;
          }
          .company-name-large {
            font-size: 24px;
            font-weight: bold;
            color: #B8860B;
          }
          .header-right {
            text-align: right;
          }
          .company-name {
            font-size: 14px;
            font-weight: bold;
            color: #333;
          }
          .company-info {
            font-size: 10px;
            color: #666;
            line-height: 1.4;
          }

          /* Invoice Title Bar */
          .invoice-title-bar {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            background: #f5f5f5;
            padding: 12px 15px;
            margin: 15px 0;
          }
          .invoice-label {
            font-size: 18px;
            font-weight: bold;
            color: #333;
          }
          .invoice-number {
            font-size: 22px;
            font-weight: bold;
            color: #B8860B;
          }
          .invoice-date {
            font-size: 10px;
            color: #666;
          }
          .page-number {
            font-size: 10px;
            color: #666;
          }

          .divider {
            height: 3px;
            background: #B8860B;
            margin-bottom: 15px;
          }

          /* Info Section */
          .info-section {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
          }
          .info-box {
            flex: 1;
            border: 1px solid #ddd;
            padding: 12px;
          }
          .info-title {
            font-weight: bold;
            color: #B8860B;
            margin-bottom: 8px;
            font-size: 12px;
          }
          .info-content {
            font-size: 10px;
            line-height: 1.5;
            color: #333;
          }
          .agent-name {
            font-weight: bold;
            margin-bottom: 4px;
          }
          .label {
            color: #B8860B;
            font-weight: 600;
          }

          /* Items Table */
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .items-table th {
            background: #f5f5f5;
            padding: 10px 8px;
            text-align: left;
            font-weight: bold;
            color: #333;
            border-bottom: 2px solid #ddd;
            font-size: 11px;
          }
          .items-table td {
            padding: 10px 8px;
            vertical-align: top;
            border-bottom: 1px solid #eee;
          }
          .col-booking { width: 15%; }
          .col-booking .booking-date {
            font-size: 9px;
            color: #666;
            margin-top: 2px;
          }
          .col-booking .staff-name {
            font-size: 9px;
            color: #666;
            margin-top: 2px;
          }
          .col-details { width: 35%; }
          .col-guest { width: 15%; text-align: center; }
          .col-price { width: 15%; text-align: right; }
          .col-total { width: 20%; text-align: right; }
          .items-table th.col-guest,
          .items-table th.col-price,
          .items-table th.col-total {
            text-align: center;
          }
          .customer-name {
            font-weight: bold;
            margin-bottom: 4px;
          }
          .tour-info {
            font-size: 10px;
            color: #666;
            line-height: 1.4;
          }

          /* Totals Section */
          .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 30px;
          }
          .totals-box {
            width: 250px;
            border: 1px solid #ddd;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 15px;
            border-bottom: 1px solid #eee;
          }
          .total-row:last-child {
            border-bottom: none;
          }
          .total-value {
            font-weight: bold;
          }
          .grand-total {
            background: #f5f5f5;
            font-size: 14px;
            font-weight: bold;
          }
          .grand-total .total-value {
            font-size: 16px;
          }

          /* Footer */
          .footer {
            position: absolute;
            bottom: 15mm;
            left: 20mm;
            right: 20mm;
          }
          .footer-content {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 15px;
          }
          .payment-info {
            border: 1px solid #ddd;
            padding: 12px;
            max-width: 280px;
          }
          .payment-title {
            font-size: 10px;
            color: #666;
            margin-bottom: 4px;
          }
          .payment-content {
            font-size: 10px;
            line-height: 1.5;
          }
          .payment-content strong {
            color: #B8860B;
            font-size: 11px;
          }
          .issued-by {
            text-align: left;
            min-width: 200px;
          }
          .issued-title {
            font-size: 11px;
            color: #333;
            margin-bottom: 8px;
          }
          .signature-space {
            width: 180px;
            height: 60px;
            border-bottom: 1px solid #333;
          }
          .powered-by {
            text-align: right;
          }
          .powered-text {
            font-size: 8px;
            color: #999;
          }
          .powered-brand {
            font-size: 10px;
            color: #B8860B;
          }

          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page { margin: 0; padding: 15mm 20mm; }
          }

          /* ========== RECEIPT STYLES ========== */
          .receipt-page {
            background: white;
          }

          /* Receipt Header */
          .receipt-page .receipt-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
          }
          .receipt-page .header-left {
            flex: 1;
          }
          .receipt-page .receipt-logo {
            max-width: 200px;
            max-height: 70px;
            object-fit: contain;
          }
          .receipt-page .header-right {
            text-align: right;
          }
          .receipt-page .company-name {
            font-size: 14px;
            font-weight: bold;
            color: #333;
            margin-bottom: 4px;
          }
          .receipt-page .company-info {
            font-size: 10px;
            color: #666;
            line-height: 1.4;
          }

          /* Receipt Title Bar */
          .receipt-title-bar {
            background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%);
            color: white;
            padding: 15px 20px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 15px;
          }
          .receipt-title {
            font-size: 18px;
            font-weight: bold;
            letter-spacing: 1px;
          }
          .receipt-doc-number {
            font-size: 16px;
            opacity: 0.9;
          }

          /* Info Cards Row */
          .receipt-info-cards {
            display: flex;
            gap: 12px;
            margin-bottom: 20px;
          }
          .info-card {
            flex: 1;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 12px;
            text-align: center;
          }
          .info-card.highlight {
            background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
            border-color: #10B981;
          }
          .info-card-icon {
            font-size: 20px;
            margin-bottom: 6px;
          }
          .info-card-label {
            font-size: 9px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            line-height: 1.3;
            margin-bottom: 6px;
          }
          .info-card-value {
            font-size: 12px;
            font-weight: 600;
            color: #1f2937;
          }
          .info-card-value.orange {
            color: #f59e0b;
          }
          .info-card-value.large {
            font-size: 18px;
            color: #10B981;
          }

          /* Service Period */
          .service-period {
            text-align: center;
            padding: 10px 0;
            margin-bottom: 20px;
            border-bottom: 1px solid #e5e7eb;
          }
          .service-period .period-label {
            font-size: 11px;
            color: #6b7280;
          }
          .service-period .period-dates {
            font-size: 12px;
            font-weight: 600;
            color: #1f2937;
            margin-left: 8px;
          }

          /* Booking Details Section */
          .booking-details-section {
            margin-bottom: 25px;
          }
          .section-title {
            font-size: 13px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 12px;
          }
          .booking-table {
            width: 100%;
            border-collapse: collapse;
          }
          .booking-table th {
            padding: 10px 8px;
            text-align: left;
            font-size: 9px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 2px solid #e5e7eb;
          }
          .booking-table th .sub {
            display: block;
            font-size: 8px;
            color: #9ca3af;
            font-weight: normal;
          }
          .booking-table th.col-date {
            color: #0891b2;
          }
          .booking-table td {
            padding: 12px 8px;
            font-size: 11px;
            color: #374151;
            border-bottom: 1px solid #f3f4f6;
          }
          .booking-table .booking-num {
            font-family: monospace;
            font-weight: 600;
            color: #f59e0b;
            font-size: 10px;
          }
          .booking-table .col-guests,
          .booking-table .col-amount {
            text-align: center;
          }
          .booking-table td.col-amount {
            font-weight: 600;
            color: #0891b2;
          }

          /* Payment Summary Container */
          .payment-summary-container {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 25px;
          }
          .payment-summary-box {
            width: 280px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
          }
          .payment-summary-box .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 15px;
            font-size: 12px;
            border-bottom: 1px solid #f3f4f6;
          }
          .payment-summary-box .summary-row:last-child {
            border-bottom: none;
          }
          .payment-summary-box .summary-label {
            color: #6b7280;
          }
          .payment-summary-box .summary-value {
            font-weight: 500;
            color: #374151;
          }
          .payment-summary-box .total-row {
            background: #f0fdfa;
            border-bottom: none;
          }
          .payment-summary-box .total-row .summary-label {
            font-weight: 600;
            color: #0891b2;
          }
          .payment-summary-box .total-row .total-value {
            font-size: 16px;
            font-weight: bold;
            color: #0891b2;
          }

          /* Thank You Box */
          .thank-you-box {
            background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
            border-radius: 10px;
            padding: 25px;
            text-align: center;
            margin-bottom: 30px;
          }
          .thank-you-title {
            font-size: 18px;
            font-weight: bold;
            color: #059669;
            margin-bottom: 8px;
          }
          .thank-you-text {
            font-size: 11px;
            color: #6b7280;
          }

          /* Receipt Footer */
          .receipt-page .receipt-footer {
            position: absolute;
            bottom: 15mm;
            left: 20mm;
            right: 20mm;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            padding-top: 15px;
            border-top: 1px solid #e5e7eb;
          }
          .receipt-page .footer-left {
            font-size: 9px;
            color: #9ca3af;
          }
          .receipt-page .receipt-id {
            font-family: monospace;
          }
          .receipt-page .page-info {
            margin-top: 3px;
          }
          .receipt-page .footer-right {
            text-align: right;
          }
          .receipt-page .footer-system {
            font-size: 8px;
            color: #9ca3af;
          }
          .receipt-page .footer-brand {
            font-size: 10px;
            color: #f59e0b;
          }
        </style>
      </head>
      <body>
        ${pagesHtml}
      </body>
      </html>
    `

    // Create a hidden container to render HTML
    const container = document.createElement('div')
    container.innerHTML = html
    container.style.position = 'absolute'
    container.style.left = '-9999px'
    container.style.top = '0'
    document.body.appendChild(container)

    // Wait for all images (including base64) to fully load
    const images = container.querySelectorAll('img')
    await Promise.all(
      Array.from(images).map(img => {
        if (img.complete) return Promise.resolve()
        return new Promise<void>((resolve) => {
          img.onload = () => resolve()
          img.onerror = () => resolve() // Continue even if image fails
          // Fallback timeout in case onload doesn't fire
          setTimeout(() => resolve(), 2000)
        })
      })
    )
    // Additional wait for rendering
    await new Promise(resolve => setTimeout(resolve, 200))

    try {
      // Get all pages
      const pages = container.querySelectorAll('.page')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement
        
        // Render page to canvas
        const canvas = await html2canvas(page, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false
        })

        // Calculate dimensions to fit A4
        const imgWidth = 210 // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width

        // Add new page if not first
        if (i > 0) {
          pdf.addPage()
        }

        // Add image to PDF
        const imgData = canvas.toDataURL('image/jpeg', 0.95)
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight)
      }

      // Get PDF as base64
      const pdfBase64 = pdf.output('datauristring').split(',')[1]
      const filename = isReceipt 
        ? `Receipt-${receiptNumber}.pdf`
        : `Invoice-${docNumber}.pdf`

      return { base64: pdfBase64, filename }
    } finally {
      // Clean up
      document.body.removeChild(container)
    }
  }

  const handleSendEmail = async () => {
    if (!sendEmailInvoice || !emailAddress) {
      toast.error('Please enter an email address')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailAddress)) {
      toast.error('Please enter a valid email address')
      return
    }

    setIsSendingEmail(true)

    try {
      // Generate PDF on client side (same design as download)
      toast.info('Generating PDF...')
      const { base64: pdfBase64, filename: pdfFilename } = await generatePdfBase64(sendEmailInvoice, emailType)

      toast.info('Sending email...')
      const response = await fetch('/api/invoices/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceId: sendEmailInvoice.id,
          emailAddress,
          emailType,
          pdfBase64,
          pdfFilename,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email')
      }

      if (result.mock) {
        toast.success(`${emailType === 'receipt' ? 'Receipt' : 'Invoice'} email simulated (configure RESEND_API_KEY for actual delivery)`)
      } else {
        toast.success(`${emailType === 'receipt' ? 'Receipt' : 'Invoice'} email sent to ${emailAddress}`)
      }
      
      // Refresh invoices to get updated status
      fetchInvoices()

      setSendEmailInvoice(null)
      setEmailAddress('')
    } catch (error) {
      console.error('Error sending email:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send email')
    } finally {
      setIsSendingEmail(false)
    }
  }

  const openSendEmailDialog = (invoice: InvoiceWithDetails, type: 'invoice' | 'receipt') => {
    setEmailType(type)
    setEmailAddress((invoice.agent as any)?.email || '')
    setSendEmailInvoice(invoice)
  }

  const generateInvoiceText = (invoice: InvoiceWithDetails) => {
    const agentName = (invoice.agent as any)?.name || 'Agent'
    const lines = [
      `INVOICE: ${invoice.invoice_number}`,
      `Agent: ${agentName}`,
      `Period: ${formatDate(invoice.date_from)} - ${formatDate(invoice.date_to)}`,
      `Status: ${invoice.status.toUpperCase()}`,
      '',
      'BOOKINGS:',
      '─'.repeat(50),
    ]

    if (invoice.items && invoice.items.length > 0) {
      invoice.items.forEach((item, index) => {
        const booking = item.booking
        if (booking) {
          lines.push(
            `${index + 1}. ${booking.booking_number}`,
            `   Date: ${formatDate(booking.activity_date)}`,
            `   Customer: ${booking.customer_name}`,
            `   Program: ${(booking.program as any)?.name || '-'}`,
            `   Pax: ${booking.adults}A ${booking.children}C`,
            `   Amount: ฿${item.amount.toLocaleString()}`,
            ''
          )
        }
      })
    }

    lines.push(
      '─'.repeat(50),
      `TOTAL: ฿${invoice.total_amount.toLocaleString()}`,
      '',
      invoice.notes ? `Notes: ${invoice.notes}` : '',
      '',
      `Generated: ${new Date().toLocaleString()}`
    )

    return lines.filter(l => l !== undefined).join('\n')
  }

  const handleCopyInvoice = async (invoice: InvoiceWithDetails) => {
    // Fetch details if not already loaded
    if (!invoice.items) {
      const supabase = createClient()
      const { data: items } = await supabase
        .from('invoice_items')
        .select(`
          *,
          booking:bookings(
            id,
            booking_number,
            activity_date,
            customer_name,
            adults,
            children,
            program:programs(name)
          )
        `)
        .eq('invoice_id', invoice.id)

      invoice = { ...invoice, items: items || [] }
    }

    const text = generateInvoiceText(invoice)
    await navigator.clipboard.writeText(text)
    toast.success('Invoice copied to clipboard')
  }

  const generateReceiptText = (invoice: InvoiceWithDetails) => {
    const agentName = (invoice.agent as any)?.name || 'Agent'
    const receiptNumber = `RCP-${invoice.invoice_number.replace('INV-', '')}`
    
    return [
      '═'.repeat(50),
      '                    PAYMENT RECEIPT',
      '═'.repeat(50),
      '',
      `Receipt #: ${receiptNumber}`,
      `Invoice #: ${invoice.invoice_number}`,
      `Agent: ${agentName}`,
      `Period: ${formatDate(invoice.date_from)} - ${formatDate(invoice.date_to)}`,
      '',
      '─'.repeat(50),
      `Amount Paid: ฿${invoice.total_amount.toLocaleString()}`,
      `Payment Date: ${invoice.paid_at ? formatDate(invoice.paid_at) : formatDate(new Date().toISOString())}`,
      '─'.repeat(50),
      '',
      '                      ✓ PAID IN FULL',
      '',
      `Company: ${company?.name || 'TConnext'}`,
      `Generated: ${new Date().toLocaleString()}`,
      '═'.repeat(50),
    ].join('\n')
  }

  const handleCopyReceipt = (invoice: InvoiceWithDetails) => {
    const text = generateReceiptText(invoice)
    navigator.clipboard.writeText(text)
    toast.success('Receipt copied to clipboard')
  }

  const handleDownloadPDF = async (invoice: InvoiceWithDetails, type: 'invoice' | 'receipt') => {
    // Always fetch fresh details for PDF to ensure we have latest data including staff
    const supabase = createClient()
    const { data: freshItems } = await supabase
      .from('invoice_items')
      .select(`
        *,
        booking:bookings(
          id,
          booking_number,
          activity_date,
          customer_name,
          adults,
          children,
          infants,
          voucher_number,
          program:programs(name),
          agent_staff:agent_staff(full_name, nickname)
        )
      `)
      .eq('invoice_id', invoice.id)

    invoice = { ...invoice, items: freshItems || [] }

    // Get company settings for invoice
    const settings = company?.settings as any || {}
    const invoiceSettings = settings.invoice || {}
    // Use company logo from settings
    let logoUrl = settings.logo_url || ''
    // Convert logo URL to base64 if it's an external URL (to avoid CORS issues)
    if (logoUrl && !logoUrl.startsWith('data:')) {
      logoUrl = await urlToBase64(logoUrl)
    }
    const paymentFooter = invoiceSettings.payment_footer || ''
    
    // Agent details
    const agent = invoice.agent as any
    const agentName = agent?.name || 'Agent'
    const agentAddress = agent?.address || ''
    const agentPhone = agent?.phone || ''
    
    // Check if tax should be applied for this agent
    const isTaxApplied = agent?.tax_applied !== false
    
    // Only show tax info if tax is applied
    const taxPercentage = isTaxApplied ? (invoiceSettings.tax_percentage ?? 7) : 0
    const agentTaxId = isTaxApplied ? (agent?.tax_id || '') : ''

    // Calculate totals
    const subtotal = invoice.total_amount
    const taxAmount = taxPercentage > 0 ? Math.round(subtotal * taxPercentage / 100) : 0
    const grandTotal = subtotal + taxAmount

    // Company details
    const companyName = company?.name || 'TConnext'
    const companyAddress = company?.address || ''
    const companyPhone = company?.phone || ''
    // Only show company tax ID if tax is applied
    const companyTaxId = isTaxApplied ? (company?.tax_id || '') : ''

    const isReceipt = type === 'receipt'
    const docNumber = invoice.invoice_number
    const receiptNumber = `RCP-${docNumber.replace('INV-', '')}`
    const dueDate = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null
    const invoiceDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    const paidDate = invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : invoiceDate

    // Calculate pagination - approximately 8 items per page for A4
    const itemsPerPage = 8
    const items = invoice.items || []
    const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage))

    // Generate RECEIPT pages (matching the provided design)
    const generateReceiptPage = (pageNum: number, pageItems: any[]) => {
      const isFirstPage = pageNum === 1
      const isLastPage = pageNum === totalPages

      return `
        <div class="page receipt-page">
          <!-- Receipt Header -->
          <div class="receipt-header">
            <div class="header-left">
              ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="receipt-logo" />` : `<div class="company-name-large">${companyName}</div>`}
            </div>
            <div class="header-right">
              <div class="company-name">${companyName}</div>
              <div class="company-info">${companyAddress.replace(/\n/g, '<br/>')}</div>
              ${companyPhone ? `<div class="company-info">Tel: ${companyPhone}</div>` : ''}
            </div>
          </div>

          <!-- Receipt Title -->
          <div class="receipt-title-bar">
            <span class="receipt-title">PAYMENT RECEIPT</span>
            <span class="receipt-doc-number">#${docNumber}</span>
          </div>

          ${isFirstPage ? `
          <!-- Info Cards Row -->
          <div class="receipt-info-cards">
            <div class="info-card">
              <div class="info-card-icon">📋</div>
              <div class="info-card-label">INVOICE<br/>REFERENCE</div>
              <div class="info-card-value orange">${docNumber}</div>
            </div>
            <div class="info-card">
              <div class="info-card-icon">📅</div>
              <div class="info-card-label">PAYMENT<br/>DATE</div>
              <div class="info-card-value">${paidDate}</div>
            </div>
            <div class="info-card">
              <div class="info-card-icon">🏢</div>
              <div class="info-card-label">RECEIVED<br/>FROM</div>
              <div class="info-card-value">${agentName}</div>
            </div>
            <div class="info-card highlight">
              <div class="info-card-icon">💰</div>
              <div class="info-card-label">AMOUNT PAID</div>
              <div class="info-card-value large">฿${grandTotal.toLocaleString()}</div>
            </div>
          </div>

          <!-- Service Period -->
          <div class="service-period">
            <span class="period-label">Service Period:</span>
            <span class="period-dates">${formatDate(invoice.date_from)} - ${formatDate(invoice.date_to)}</span>
          </div>
          ` : ''}

          <!-- Booking Details Table -->
          <div class="booking-details-section">
            <div class="section-title">Booking Details</div>
            <table class="booking-table">
              <thead>
                <tr>
                  <th class="col-booking">BOOKING #</th>
                  <th class="col-customer">CUSTOMER</th>
                  <th class="col-program">PROGRAM</th>
                  <th class="col-date">TOUR DATE<br/><span class="sub">DATE</span></th>
                  <th class="col-guests">GUESTS</th>
                  <th class="col-amount">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                ${pageItems.map(item => {
                  const booking = item.booking
                  if (!booking) return ''
                  const programName = (booking.program as any)?.name || '-'
                  const tourDate = formatDate(booking.activity_date)
                  const totalGuests = booking.adults + booking.children + booking.infants
                  
                  return `
                    <tr>
                      <td class="col-booking"><span class="booking-num">${booking.booking_number}</span></td>
                      <td class="col-customer">${booking.customer_name}</td>
                      <td class="col-program">${programName}</td>
                      <td class="col-date">${tourDate}</td>
                      <td class="col-guests">${totalGuests}</td>
                      <td class="col-amount">฿${item.amount.toLocaleString()}</td>
                    </tr>
                  `
                }).join('')}
              </tbody>
            </table>
          </div>

          ${isLastPage ? `
          <!-- Payment Summary Box -->
          <div class="payment-summary-container">
            <div class="payment-summary-box">
              <div class="summary-row">
                <span class="summary-label">Subtotal</span>
                <span class="summary-value">฿${subtotal.toLocaleString()}</span>
              </div>
              ${taxPercentage > 0 ? `
              <div class="summary-row">
                <span class="summary-label">Tax (${taxPercentage}%)</span>
                <span class="summary-value">฿${taxAmount.toLocaleString()}</span>
              </div>
              ` : ''}
              <div class="summary-row total-row">
                <span class="summary-label">Total Paid</span>
                <span class="summary-value total-value">฿${grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <!-- Thank You Section -->
          <div class="thank-you-box">
            <div class="thank-you-title">Thank you for your payment!</div>
            <div class="thank-you-text">This receipt confirms that payment has been received in full.</div>
          </div>
          ` : ''}

          <!-- Receipt Footer -->
          <div class="receipt-footer">
            <div class="footer-left">
              <div class="receipt-id">Receipt ID: ${receiptNumber}</div>
              <div class="page-info">Page ${pageNum} of ${totalPages}</div>
            </div>
            <div class="footer-right">
              <div class="footer-system">INVOICING & BOOKING SYSTEM</div>
              <div class="footer-brand">POWERED BY <strong>TCONNEXT</strong></div>
            </div>
          </div>
        </div>
      `
    }

    // Generate INVOICE pages (original design)
    const generateInvoicePage = (pageNum: number, pageItems: any[]) => {
      const isFirstPage = pageNum === 1
      const isLastPage = pageNum === totalPages

      return `
        <div class="page invoice-page">
          <!-- Header -->
          <div class="header">
            <div class="header-left">
              ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="logo" />` : `<div class="company-name-large">${companyName}</div>`}
            </div>
            <div class="header-right">
              <div class="company-name">${companyName}</div>
              <div class="company-info">${companyAddress.replace(/\n/g, '<br/>')}</div>
              ${companyPhone ? `<div class="company-info">Tel: ${companyPhone}</div>` : ''}
              ${companyTaxId ? `<div class="company-info">TAX ID: ${companyTaxId}</div>` : ''}
            </div>
          </div>

          <!-- Invoice Title Bar -->
          <div class="invoice-title-bar">
            <div class="invoice-title">
              <div class="invoice-label">INVOICE</div>
              <div class="invoice-number">#${docNumber}</div>
              <div class="invoice-date">Invoice Date: ${invoiceDate}</div>
            </div>
            <div class="page-number">Page <strong>${pageNum}</strong> of ${totalPages}</div>
          </div>

          <div class="divider"></div>

          ${isFirstPage ? `
          <!-- Bill To / Invoice Details -->
          <div class="info-section">
            <div class="info-box bill-to">
              <div class="info-title">Bill To</div>
              <div class="info-content">
                <div class="agent-name">${agentName}</div>
                ${agentAddress ? `<div>${agentAddress.replace(/\n/g, '<br/>')}</div>` : ''}
                ${agentPhone ? `<div>Tel: ${agentPhone}</div>` : ''}
                ${agentTaxId ? `<div>TAX ID: ${agentTaxId}</div>` : ''}
              </div>
            </div>
            <div class="info-box invoice-details">
              <div class="info-title">Invoice Details</div>
              <div class="info-content">
                <div><span class="label">Invoice #:</span> ${docNumber}</div>
                <div><span class="label">Period:</span> ${formatDate(invoice.date_from)} - ${formatDate(invoice.date_to)}</div>
                ${dueDate ? `<div><span class="label">Due Date:</span> <strong>${dueDate}</strong></div>` : ''}
              </div>
            </div>
          </div>
          ` : ''}

          <!-- Items Table -->
          <table class="items-table">
            <thead>
              <tr>
                <th class="col-booking">Booking #</th>
                <th class="col-details">Details</th>
                <th class="col-guest">Guest</th>
                <th class="col-price">Price</th>
                <th class="col-total">Total</th>
              </tr>
            </thead>
            <tbody>
              ${pageItems.map(item => {
                const booking = item.booking
                if (!booking) return ''
                const programName = (booking.program as any)?.name || '-'
                const tourDate = formatDate(booking.activity_date)
                const voucherNum = booking.voucher_number || '-'
                const agentStaff = (booking as any).agent_staff
                const staffName = agentStaff?.nickname || agentStaff?.full_name || ''
                
                // Calculate individual prices (simplified - using total / pax)
                const totalPax = booking.adults + booking.children
                const pricePerPerson = totalPax > 0 ? Math.round(item.amount / totalPax) : item.amount
                const adultTotal = booking.adults * pricePerPerson
                const childTotal = booking.children * pricePerPerson
                
                const bookingDate = new Date(booking.created_at || booking.activity_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                
                return `
                  <tr>
                    <td class="col-booking">
                      <div>${booking.booking_number}</div>
                      <div class="booking-date">${bookingDate}</div>
                      ${staffName ? `<div class="staff-name">${staffName}</div>` : ''}
                    </td>
                    <td class="col-details">
                      <div class="customer-name">${booking.customer_name}</div>
                      <div class="tour-info">Tour Date: ${tourDate}</div>
                      <div class="tour-info">${programName}</div>
                      <div class="tour-info">Voucher: ${voucherNum}</div>
                    </td>
                    <td class="col-guest">
                      ${booking.adults > 0 ? `<div>${booking.adults} Adult</div>` : ''}
                      ${booking.children > 0 ? `<div>${booking.children} Children</div>` : ''}
                      ${booking.infants > 0 ? `<div>${booking.infants} Infant</div>` : ''}
                    </td>
                    <td class="col-price">
                      ${booking.adults > 0 ? `<div>${pricePerPerson.toLocaleString()}</div>` : ''}
                      ${booking.children > 0 ? `<div>${pricePerPerson.toLocaleString()}</div>` : ''}
                      ${booking.infants > 0 ? `<div>0</div>` : ''}
                    </td>
                    <td class="col-total">
                      ${booking.adults > 0 ? `<div>${adultTotal.toLocaleString()}</div>` : ''}
                      ${booking.children > 0 ? `<div>${childTotal.toLocaleString()}</div>` : ''}
                      ${booking.infants > 0 ? `<div>0</div>` : ''}
                    </td>
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>

          ${isLastPage ? `
          <!-- Totals Section -->
          <div class="totals-section">
            <div class="totals-box">
              <div class="total-row">
                <span>TOTAL</span>
                <span class="total-value">${subtotal.toLocaleString()}</span>
              </div>
              ${taxPercentage > 0 ? `
              <div class="total-row">
                <span>Gov. Tax ${taxPercentage}%</span>
                <span class="total-value">${taxAmount.toLocaleString()}</span>
              </div>
              ` : ''}
              <div class="total-row grand-total">
                <span>GRAND TOTAL</span>
                <span class="total-value">${grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>
          ` : ''}

          <!-- Footer -->
          <div class="footer">
            ${isLastPage ? `
            <div class="footer-content">
              ${paymentFooter ? `
              <div class="payment-info">
                <div class="payment-title">Payment to:</div>
                <div class="payment-content">${paymentFooter.replace(/\n/g, '<br/>')}</div>
              </div>
              ` : '<div></div>'}
              <div class="issued-by">
                <div class="issued-title">Invoice Issued by.</div>
                <div class="signature-space"></div>
              </div>
            </div>
            ` : ''}
            <div class="powered-by">
              <div class="powered-text">INVOICING & BOOKING SYSTEM</div>
              <div class="powered-brand">POWERED BY. <strong>TCONNEXT</strong></div>
            </div>
          </div>
        </div>
      `
    }

    // Generate all pages based on type
    let pagesHtml = ''
    for (let i = 0; i < totalPages; i++) {
      const startIdx = i * itemsPerPage
      const pageItems = items.slice(startIdx, startIdx + itemsPerPage)
      if (isReceipt) {
        pagesHtml += generateReceiptPage(i + 1, pageItems)
      } else {
        pagesHtml += generateInvoicePage(i + 1, pageItems)
      }
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${isReceipt ? 'RECEIPT' : 'INVOICE'} ${isReceipt ? receiptNumber : docNumber}</title>
        <style>
          @page {
            size: A4;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 11px;
            color: #333;
            background: white;
          }
          .page {
            width: 210mm;
            min-height: 297mm;
            padding: 15mm 20mm;
            page-break-after: always;
            position: relative;
          }
          .page:last-child {
            page-break-after: auto;
          }

          /* Header */
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 15px;
          }
          .header-left {
            flex: 1;
          }
          .logo {
            max-width: 180px;
            max-height: 60px;
            object-fit: contain;
          }
          .company-name-large {
            font-size: 24px;
            font-weight: bold;
            color: #B8860B;
          }
          .header-right {
            text-align: right;
          }
          .company-name {
            font-size: 14px;
            font-weight: bold;
            color: #333;
          }
          .company-info {
            font-size: 10px;
            color: #666;
            line-height: 1.4;
          }

          /* Invoice Title Bar */
          .invoice-title-bar {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            background: #f5f5f5;
            padding: 12px 15px;
            margin: 15px 0;
          }
          .invoice-label {
            font-size: 18px;
            font-weight: bold;
            color: #333;
          }
          .invoice-number {
            font-size: 22px;
            font-weight: bold;
            color: #B8860B;
          }
          .invoice-date {
            font-size: 10px;
            color: #666;
          }
          .page-number {
            font-size: 10px;
            color: #666;
          }

          .divider {
            height: 3px;
            background: #B8860B;
            margin-bottom: 15px;
          }

          /* Info Section */
          .info-section {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
          }
          .info-box {
            flex: 1;
            border: 1px solid #ddd;
            padding: 12px;
          }
          .info-title {
            font-weight: bold;
            color: #B8860B;
            margin-bottom: 8px;
            font-size: 12px;
          }
          .info-content {
            font-size: 10px;
            line-height: 1.5;
            color: #333;
          }
          .agent-name {
            font-weight: bold;
            margin-bottom: 4px;
          }
          .label {
            color: #B8860B;
            font-weight: 600;
          }

          /* Items Table */
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .items-table th {
            background: #f5f5f5;
            padding: 10px 8px;
            text-align: left;
            font-weight: bold;
            color: #333;
            border-bottom: 2px solid #ddd;
            font-size: 11px;
          }
          .items-table td {
            padding: 10px 8px;
            vertical-align: top;
            border-bottom: 1px solid #eee;
          }
          .col-booking { width: 15%; }
          .col-booking .booking-date {
            font-size: 9px;
            color: #666;
            margin-top: 2px;
          }
          .col-booking .staff-name {
            font-size: 9px;
            color: #666;
            margin-top: 2px;
          }
          .col-details { width: 35%; }
          .col-guest { width: 15%; text-align: center; }
          .col-price { width: 15%; text-align: right; }
          .col-total { width: 20%; text-align: right; }
          .items-table th.col-guest,
          .items-table th.col-price,
          .items-table th.col-total {
            text-align: center;
          }
          .customer-name {
            font-weight: bold;
            margin-bottom: 4px;
          }
          .tour-info {
            font-size: 10px;
            color: #666;
            line-height: 1.4;
          }

          /* Totals Section */
          .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 30px;
          }
          .totals-box {
            width: 250px;
            border: 1px solid #ddd;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 15px;
            border-bottom: 1px solid #eee;
          }
          .total-row:last-child {
            border-bottom: none;
          }
          .total-value {
            font-weight: bold;
          }
          .grand-total {
            background: #f5f5f5;
            font-size: 14px;
            font-weight: bold;
          }
          .grand-total .total-value {
            font-size: 16px;
          }

          /* Footer */
          .footer {
            position: absolute;
            bottom: 15mm;
            left: 20mm;
            right: 20mm;
          }
          .footer-content {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 15px;
          }
          .payment-info {
            border: 1px solid #ddd;
            padding: 12px;
            max-width: 280px;
          }
          .payment-title {
            font-size: 10px;
            color: #666;
            margin-bottom: 4px;
          }
          .payment-content {
            font-size: 10px;
            line-height: 1.5;
          }
          .payment-content strong {
            color: #B8860B;
            font-size: 11px;
          }
          .issued-by {
            text-align: left;
            min-width: 200px;
          }
          .issued-title {
            font-size: 11px;
            color: #333;
            margin-bottom: 8px;
          }
          .signature-space {
            width: 180px;
            height: 60px;
            border-bottom: 1px solid #333;
          }
          .powered-by {
            text-align: right;
          }
          .powered-text {
            font-size: 8px;
            color: #999;
          }
          .powered-brand {
            font-size: 10px;
            color: #B8860B;
          }

          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page { margin: 0; padding: 15mm 20mm; }
          }

          /* ========== RECEIPT STYLES ========== */
          .receipt-page {
            background: white;
          }

          /* Receipt Header */
          .receipt-page .receipt-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
          }
          .receipt-page .header-left {
            flex: 1;
          }
          .receipt-page .receipt-logo {
            max-width: 200px;
            max-height: 70px;
            object-fit: contain;
          }
          .receipt-page .header-right {
            text-align: right;
          }
          .receipt-page .company-name {
            font-size: 14px;
            font-weight: bold;
            color: #333;
            margin-bottom: 4px;
          }
          .receipt-page .company-info {
            font-size: 10px;
            color: #666;
            line-height: 1.4;
          }

          /* Receipt Title Bar */
          .receipt-title-bar {
            background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%);
            color: white;
            padding: 15px 20px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 15px;
          }
          .receipt-title {
            font-size: 18px;
            font-weight: bold;
            letter-spacing: 1px;
          }
          .receipt-doc-number {
            font-size: 16px;
            opacity: 0.9;
          }

          /* Info Cards Row */
          .receipt-info-cards {
            display: flex;
            gap: 12px;
            margin-bottom: 20px;
          }
          .info-card {
            flex: 1;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 12px;
            text-align: center;
          }
          .info-card.highlight {
            background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
            border-color: #10B981;
          }
          .info-card-icon {
            font-size: 20px;
            margin-bottom: 6px;
          }
          .info-card-label {
            font-size: 9px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            line-height: 1.3;
            margin-bottom: 6px;
          }
          .info-card-value {
            font-size: 12px;
            font-weight: 600;
            color: #1f2937;
          }
          .info-card-value.orange {
            color: #f59e0b;
          }
          .info-card-value.large {
            font-size: 18px;
            color: #10B981;
          }

          /* Service Period */
          .service-period {
            text-align: center;
            padding: 10px 0;
            margin-bottom: 20px;
            border-bottom: 1px solid #e5e7eb;
          }
          .service-period .period-label {
            font-size: 11px;
            color: #6b7280;
          }
          .service-period .period-dates {
            font-size: 12px;
            font-weight: 600;
            color: #1f2937;
            margin-left: 8px;
          }

          /* Booking Details Section */
          .booking-details-section {
            margin-bottom: 25px;
          }
          .section-title {
            font-size: 13px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 12px;
          }
          .booking-table {
            width: 100%;
            border-collapse: collapse;
          }
          .booking-table th {
            padding: 10px 8px;
            text-align: left;
            font-size: 9px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 2px solid #e5e7eb;
          }
          .booking-table th .sub {
            display: block;
            font-size: 8px;
            color: #9ca3af;
            font-weight: normal;
          }
          .booking-table th.col-date {
            color: #0891b2;
          }
          .booking-table td {
            padding: 12px 8px;
            font-size: 11px;
            color: #374151;
            border-bottom: 1px solid #f3f4f6;
          }
          .booking-table .booking-num {
            font-family: monospace;
            font-weight: 600;
            color: #f59e0b;
            font-size: 10px;
          }
          .booking-table .col-guests,
          .booking-table .col-amount {
            text-align: center;
          }
          .booking-table td.col-amount {
            font-weight: 600;
            color: #0891b2;
          }

          /* Payment Summary Container */
          .payment-summary-container {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 25px;
          }
          .payment-summary-box {
            width: 280px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
          }
          .payment-summary-box .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 15px;
            font-size: 12px;
            border-bottom: 1px solid #f3f4f6;
          }
          .payment-summary-box .summary-row:last-child {
            border-bottom: none;
          }
          .payment-summary-box .summary-label {
            color: #6b7280;
          }
          .payment-summary-box .summary-value {
            font-weight: 500;
            color: #374151;
          }
          .payment-summary-box .total-row {
            background: #f0fdfa;
            border-bottom: none;
          }
          .payment-summary-box .total-row .summary-label {
            font-weight: 600;
            color: #0891b2;
          }
          .payment-summary-box .total-row .total-value {
            font-size: 16px;
            font-weight: bold;
            color: #0891b2;
          }

          /* Thank You Box */
          .thank-you-box {
            background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
            border-radius: 10px;
            padding: 25px;
            text-align: center;
            margin-bottom: 30px;
          }
          .thank-you-title {
            font-size: 18px;
            font-weight: bold;
            color: #059669;
            margin-bottom: 8px;
          }
          .thank-you-text {
            font-size: 11px;
            color: #6b7280;
          }

          /* Receipt Footer */
          .receipt-page .receipt-footer {
            position: absolute;
            bottom: 15mm;
            left: 20mm;
            right: 20mm;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            padding-top: 15px;
            border-top: 1px solid #e5e7eb;
          }
          .receipt-page .footer-left {
            font-size: 9px;
            color: #9ca3af;
          }
          .receipt-page .receipt-id {
            font-family: monospace;
          }
          .receipt-page .page-info {
            margin-top: 3px;
          }
          .receipt-page .footer-right {
            text-align: right;
          }
          .receipt-page .footer-system {
            font-size: 8px;
            color: #9ca3af;
          }
          .receipt-page .footer-brand {
            font-size: 10px;
            color: #f59e0b;
          }

          /* Legacy receipt styles - keep for backward compatibility */
          .payment-summary {
            max-width: 300px;
            margin-left: auto;
            background: #f8fafc;
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 25px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 12px;
            color: #64748b;
            border-bottom: 1px solid #e2e8f0;
          }
          .summary-row:last-child {
            border-bottom: none;
          }
          .summary-row.total {
            font-size: 16px;
            font-weight: bold;
            color: #10B981;
            padding-top: 12px;
            margin-top: 5px;
            border-top: 2px solid #10B981;
            border-bottom: none;
          }

          /* Thank You Section */
          .thank-you-section {
            text-align: center;
            padding: 25px;
            background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
            border-radius: 12px;
            margin-bottom: 20px;
          }
          .thank-you-text {
            font-size: 18px;
            font-weight: bold;
            color: #059669;
            margin-bottom: 8px;
          }
          .thank-you-subtext {
            font-size: 11px;
            color: #64748b;
          }

          /* Receipt Footer */
          .receipt-footer {
            position: absolute;
            bottom: 15mm;
            left: 20mm;
            right: 20mm;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            padding-top: 15px;
            border-top: 1px solid #e2e8f0;
          }
          .footer-left {
            font-size: 10px;
            color: #94a3b8;
          }
          .receipt-id {
            font-family: monospace;
          }
          .page-info {
            margin-top: 3px;
          }
          .footer-right {
            text-align: right;
          }
        </style>
      </head>
      <body>
        ${pagesHtml}
      </body>
      </html>
    `

    // Create a hidden container to render HTML
    const container = document.createElement('div')
    container.innerHTML = html
    container.style.position = 'absolute'
    container.style.left = '-9999px'
    container.style.top = '0'
    document.body.appendChild(container)

    // Wait for all images (including base64) to fully load
    const images = container.querySelectorAll('img')
    await Promise.all(
      Array.from(images).map(img => {
        if (img.complete) return Promise.resolve()
        return new Promise<void>((resolve) => {
          img.onload = () => resolve()
          img.onerror = () => resolve() // Continue even if image fails
          // Fallback timeout in case onload doesn't fire
          setTimeout(() => resolve(), 2000)
        })
      })
    )
    // Additional wait for rendering
    await new Promise(resolve => setTimeout(resolve, 200))

    try {
      // Get all pages
      const pages = container.querySelectorAll('.page')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement
        
        // Render page to canvas
        const canvas = await html2canvas(page, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false
        })

        // Calculate dimensions to fit A4
        const imgWidth = 210 // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width

        // Add new page if not first
        if (i > 0) {
          pdf.addPage()
        }

        // Add image to PDF
        const imgData = canvas.toDataURL('image/jpeg', 0.95)
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight)
      }

      // Download PDF
      const filename = isReceipt 
        ? `Receipt-${receiptNumber}.pdf`
        : `Invoice-${docNumber}.pdf`
      pdf.save(filename)
      
      toast.success(`${isReceipt ? 'Receipt' : 'Invoice'} downloaded successfully`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Failed to generate PDF')
    } finally {
      // Clean up
      document.body.removeChild(container)
    }
  }

  // Agent options for combobox
  const agentOptions: ComboboxOption[] = useMemo(() => {
    const options: ComboboxOption[] = [{ value: 'all', label: 'All Agents' }]
    const seenNames = new Set<string>()
    agents.forEach((agent) => {
      if (!seenNames.has(agent.name)) {
        seenNames.add(agent.name)
        options.push({ value: agent.id, label: agent.name })
      }
    })
    return options
  }, [agents])

  // Handle sort
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Filter and sort invoices
  const filteredInvoices = useMemo(() => {
    let result = invoices.filter(inv => {
      // Status filter
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false
      
      // Agent filter
      if (agentFilter !== 'all' && inv.agent_id !== agentFilter) return false
      
      // Date range filter (on period dates)
      if (dateRange) {
        const invDateFrom = new Date(inv.date_from)
        const invDateTo = new Date(inv.date_to)
        const filterStart = new Date(dateRange.start.toString())
        const filterEnd = new Date(dateRange.end.toString())
        // Invoice period should overlap with filter range
        if (invDateTo < filterStart || invDateFrom > filterEnd) return false
      }
      
      return true
    })

    // Sort
    result.sort((a, b) => {
      let aVal: any, bVal: any
      switch (sortColumn) {
        case 'invoice_number':
          aVal = a.invoice_number
          bVal = b.invoice_number
          break
        case 'agent':
          aVal = (a.agent as any)?.name?.toLowerCase() || ''
          bVal = (b.agent as any)?.name?.toLowerCase() || ''
          break
        case 'date_from':
          aVal = new Date(a.date_from).getTime()
          bVal = new Date(b.date_from).getTime()
          break
        case 'total_amount':
          aVal = a.total_amount
          bVal = b.total_amount
          break
        case 'status':
          aVal = a.status
          bVal = b.status
          break
        case 'created_at':
          aVal = new Date(a.created_at).getTime()
          bVal = new Date(b.created_at).getTime()
          break
        case 'updated_at':
          aVal = new Date(a.updated_at).getTime()
          bVal = new Date(b.updated_at).getTime()
          break
        default:
          return 0
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [invoices, statusFilter, agentFilter, dateRange, sortColumn, sortDirection])

  // Pagination calculations
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage)
  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredInvoices.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredInvoices, currentPage, itemsPerPage])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, agentFilter, dateRange, sortColumn, sortDirection])

  // Clear filters
  const clearFilters = () => {
    setStatusFilter('all')
    setAgentFilter('all')
    setDateRange(null)
    setCurrentPage(1)
  }

  const activeFiltersCount = [
    statusFilter !== 'all',
    agentFilter !== 'all',
    dateRange !== null
  ].filter(Boolean).length

  // Sortable header component
  const SortableHeader = ({ column, children }: { column: SortColumn; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortColumn === column ? (
          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
        ) : (
          <ArrowUpDown className="h-4 w-4 opacity-30" />
        )}
      </div>
    </TableHead>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Manage invoices for agents. Create invoices from the Bookings page by selecting bookings and clicking 'Create Invoice'."
      />

      {/* Filters - Always visible */}
      <div className="p-4 border rounded-xl bg-muted/30 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          {/* Date Range */}
          <DateRangePicker
            label="Period"
            aria-label="Invoice Period"
            shouldCloseOnSelect={false}
            value={dateRange}
            onChange={setDateRange}
          />

          {/* Status */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 w-auto min-w-[130px] text-sm rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Agent */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Agent</label>
            <Combobox
              options={agentOptions}
              value={agentFilter}
              onValueChange={setAgentFilter}
              placeholder="All Agents"
              searchPlaceholder="Search agents..."
              emptyText="No agents found"
              className="h-10 min-w-[300px] text-sm rounded-md"
            />
          </div>

          {/* Clear */}
          {activeFiltersCount > 0 && (
            <>
              <div className="h-10 w-px bg-border" />
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-10 text-sm px-3 rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1.5" />
                Clear all
              </Button>
            </>
          )}

          {/* Invoice count */}
          <div className="ml-auto">
            <span className="text-sm text-muted-foreground">
              {filteredInvoices.length} invoice(s)
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : filteredInvoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No invoices yet</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-md">
              To create invoices, go to the Bookings page, select the bookings you want to invoice, 
              and click the "Create Invoice" button. Bookings from the same agent will be grouped into one invoice.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader column="invoice_number">Invoice #</SortableHeader>
                  <SortableHeader column="agent">Agent</SortableHeader>
                  <SortableHeader column="date_from">Period</SortableHeader>
                  <TableHead className="text-center">NOB</TableHead>
                  <SortableHeader column="total_amount">Amount</SortableHeader>
                  <SortableHeader column="status">Status</SortableHeader>
                  <SortableHeader column="due_date">Due Date</SortableHeader>
                  <TableHead>Payment Method</TableHead>
                  <SortableHeader column="created_at">Created</SortableHeader>
                  <SortableHeader column="updated_at">Modified</SortableHeader>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedInvoices.map((invoice) => {
                  const overdue = isInvoiceOverdue(invoice)
                  const displayStatus = getDisplayStatus(invoice)
                  
                  return (
                  <TableRow 
                    key={invoice.id}
                    className={overdue ? 'bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20' : ''}
                  >
                    <TableCell>
                      <button
                        onClick={() => fetchInvoiceDetails(invoice)}
                        className={`font-mono cursor-pointer text-left px-2.5 py-1.5 rounded-md transition-colors ${
                          invoice.status === 'paid' 
                            ? 'bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50' 
                            : overdue
                              ? 'bg-red-200 dark:bg-red-900/50 hover:bg-red-300 dark:hover:bg-red-900/70'
                              : 'bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50'
                        }`}
                      >
                        <span className={`block text-xs ${
                          invoice.status === 'paid' 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {invoice.invoice_number.split('-').slice(0, 2).join('-')}-
                        </span>
                        <span className={`block font-semibold ${
                          invoice.status === 'paid' 
                            ? 'text-green-700 dark:text-green-300' 
                            : 'text-red-700 dark:text-red-300'
                        }`}>
                          {invoice.invoice_number.split('-')[2]}
                        </span>
                      </button>
                    </TableCell>
                    <TableCell>
                      {(invoice.agent as { name: string })?.name || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="block">{formatDate(invoice.date_from)}</span>
                        <span className="block text-muted-foreground">- {formatDate(invoice.date_to)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {(invoice.invoice_items as { id: string }[])?.length || 0}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(invoice.total_amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[displayStatus]}>
                        {displayStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {invoice.due_date ? (
                        <span className={`text-sm ${overdue ? 'text-red-600 dark:text-red-400 font-semibold' : ''}`}>
                          {formatDate(invoice.due_date)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {invoice.status === 'paid' && invoice.payment_type ? (
                        <span className="text-sm">
                          {(invoice.payment_type as { name: string })?.name || '-'}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">-</span>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(invoice.created_at)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-muted-foreground text-sm">
                          {formatDate(invoice.updated_at)}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {new Date(invoice.updated_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                          {(invoice as any).last_modified_by_name && (
                            <span> / {(invoice as any).last_modified_by_name}</span>
                          )}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[150px]">
                      {invoice.internal_notes ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-sm text-muted-foreground truncate block cursor-help">
                                {invoice.internal_notes.length > 30 
                                  ? invoice.internal_notes.substring(0, 30) + '...' 
                                  : invoice.internal_notes}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="whitespace-pre-wrap">{invoice.internal_notes}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-muted-foreground/50">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {/* View */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => fetchInvoiceDetails(invoice)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {/* Edit */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => handleEditInvoice(invoice)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {/* Copy */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => handleCopyInvoice(invoice)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {/* Download */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => handleDownloadPDF(invoice, 'invoice')}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Download PDF</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {/* Send Email */}
                        {invoice.status !== 'paid' && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={() => openSendEmailDialog(invoice, 'invoice')}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Send Email</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}

                        {/* More actions dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {invoice.status !== 'paid' && (
                              <DropdownMenuItem onClick={() => handleOpenMarkPaid(invoice)}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Mark as Paid
                              </DropdownMenuItem>
                            )}
                          {invoice.status === 'paid' && (
                            <>
                              <DropdownMenuItem onClick={() => handleCopyReceipt(invoice)}>
                                <Receipt className="mr-2 h-4 w-4" />
                                Copy Receipt
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownloadPDF(invoice, 'receipt')}>
                                <Download className="mr-2 h-4 w-4" />
                                Download Receipt PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openSendEmailDialog(invoice, 'receipt')}>
                                <Mail className="mr-2 h-4 w-4" />
                                Send Receipt Email
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => setDeleteInvoice(invoice)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Invoice
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
          
          {/* Pagination */}
          {filteredInvoices.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Rows per page:</span>
                <Select value={itemsPerPage.toString()} onValueChange={(value) => { setItemsPerPage(Number(value)); setCurrentPage(1); }}>
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="70">70</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages} ({filteredInvoices.length} items)
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* View Invoice Details Dialog */}
      <Dialog open={!!viewInvoice} onOpenChange={(open) => !open && setViewInvoice(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Invoice {viewInvoice?.invoice_number}
              <Badge variant={statusColors[viewInvoice ? getDisplayStatus(viewInvoice) : 'draft']}>
                {viewInvoice ? getDisplayStatus(viewInvoice) : 'draft'}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {(viewInvoice?.agent as any)?.name} • {formatDate(viewInvoice?.date_from || '')} - {formatDate(viewInvoice?.date_to || '')}
              {viewInvoice?.due_date && (
                <span className={`ml-2 ${viewInvoice && isInvoiceOverdue(viewInvoice) ? 'text-red-600 dark:text-red-400 font-semibold' : ''}`}>
                  • Due: {formatDate(viewInvoice.due_date)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            {loadingDetails ? (
              <div className="flex items-center justify-center py-8">
                <Spinner size="lg" />
              </div>
            ) : (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booking #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>Pax</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewInvoice?.items?.map((item) => {
                      const booking = item.booking
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">
                            {booking?.booking_number || '-'}
                          </TableCell>
                          <TableCell>
                            {booking ? formatDate(booking.activity_date) : '-'}
                          </TableCell>
                          <TableCell>{booking?.customer_name || '-'}</TableCell>
                          <TableCell>{(booking?.program as any)?.name || '-'}</TableCell>
                          <TableCell>
                            {booking ? `${booking.adults}A ${booking.children}C` : '-'}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(item.amount)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    <TableRow className="bg-muted/50">
                      <TableCell colSpan={5} className="font-semibold">
                        Total ({viewInvoice?.items?.length || 0} bookings)
                      </TableCell>
                      <TableCell className="text-right font-bold text-lg">
                        {formatCurrency(viewInvoice?.total_amount || 0)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                {viewInvoice?.notes && (
                  <div className="p-3 bg-muted rounded-lg">
                    <Label className="text-sm font-medium">Notes</Label>
                    <p className="text-sm text-muted-foreground mt-1">{viewInvoice.notes}</p>
                  </div>
                )}

                {viewInvoice?.paid_at && (
                  <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      <CheckCircle className="inline-block w-4 h-4 mr-1" />
                      Paid on {formatDate(viewInvoice.paid_at)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => handleCopyInvoice(viewInvoice!)}>
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
            <Button variant="outline" onClick={() => handleDownloadPDF(viewInvoice!, viewInvoice?.status === 'paid' ? 'receipt' : 'invoice')}>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            {viewInvoice?.status !== 'paid' && (
              <Button onClick={() => { setViewInvoice(null); handleOpenMarkPaid(viewInvoice!) }}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark as Paid
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Invoice Dialog */}
      <Dialog open={!!editInvoice} onOpenChange={(open) => !open && setEditInvoice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Invoice</DialogTitle>
            <DialogDescription>
              Update invoice {editInvoice?.invoice_number}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              {editForm.status === 'paid' && editInvoice?.status !== 'paid' && (
                <p className="text-xs text-muted-foreground">
                  Clicking Save will open the payment confirmation dialog
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Notes (visible on invoice)</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Add notes visible on the invoice..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Internal Notes (not visible on invoice/receipt)</Label>
              <Textarea
                value={editForm.internal_notes}
                onChange={(e) => setEditForm({ ...editForm, internal_notes: e.target.value })}
                placeholder="Add internal notes for your team..."
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                These notes are for internal use only and will not appear on invoices or receipts
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditInvoice(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? <Spinner size="sm" className="mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Invoice Confirmation */}
      <AlertDialog open={!!deleteInvoice} onOpenChange={(open) => !open && setDeleteInvoice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice <strong>{deleteInvoice?.invoice_number}</strong>? 
              This will also unlink all associated bookings from this invoice. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteInvoice}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? <Spinner size="sm" className="mr-2" /> : null}
              Delete Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send Email Dialog */}
      <Dialog open={!!sendEmailInvoice} onOpenChange={(open) => {
        if (!open) {
          setSendEmailInvoice(null)
          setEmailAddress('')
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Send {emailType === 'receipt' ? 'Receipt' : 'Invoice'} Email
            </DialogTitle>
            <DialogDescription>
              Send {emailType === 'receipt' ? 'payment receipt' : 'invoice'} for {sendEmailInvoice?.invoice_number} via email
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="Enter email address"
              />
              {(sendEmailInvoice?.agent as any)?.email && (
                <p className="text-xs text-muted-foreground">
                  Agent email: {(sendEmailInvoice?.agent as any)?.email}
                </p>
              )}
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>Agent:</strong> {(sendEmailInvoice?.agent as any)?.name}
              </p>
              <p className="text-sm">
                <strong>Amount:</strong> {formatCurrency(sendEmailInvoice?.total_amount || 0)}
              </p>
              <p className="text-sm">
                <strong>Period:</strong> {formatDate(sendEmailInvoice?.date_from || '')} - {formatDate(sendEmailInvoice?.date_to || '')}
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              Note: Configure RESEND_API_KEY environment variable to enable email delivery. Without it, emails will be simulated.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setSendEmailInvoice(null); setEmailAddress('') }}>
              Cancel
            </Button>
            <Button onClick={handleSendEmail} disabled={isSendingEmail || !emailAddress}>
              {isSendingEmail ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Paid Dialog */}
      <Dialog open={!!markPaidInvoice} onOpenChange={(open) => !open && setMarkPaidInvoice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Invoice as Paid</DialogTitle>
            <DialogDescription>
              Confirm payment details for invoice {markPaidInvoice?.invoice_number}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>Agent:</strong> {(markPaidInvoice?.agent as any)?.name}
              </p>
              <p className="text-sm">
                <strong>Amount:</strong> {formatCurrency(markPaidInvoice?.total_amount || 0)}
              </p>
              <p className="text-sm">
                <strong>Period:</strong> {formatDate(markPaidInvoice?.date_from || '')} - {formatDate(markPaidInvoice?.date_to || '')}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Payment Type *</Label>
              <Select 
                value={markPaidForm.payment_type_id} 
                onValueChange={(v) => setMarkPaidForm({ ...markPaidForm, payment_type_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment type" />
                </SelectTrigger>
                <SelectContent>
                  {paymentTypes.length === 0 ? (
                    <SelectItem value="" disabled>
                      No payment types configured. Add them in Settings.
                    </SelectItem>
                  ) : (
                    paymentTypes.map((pt) => (
                      <SelectItem key={pt.id} value={pt.id}>
                        {pt.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {paymentTypes.length === 0 && (
                <p className="text-xs text-amber-600">
                  Please configure payment types in Settings → Invoice tab first
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Internal Notes (optional)</Label>
              <Textarea
                value={markPaidForm.internal_notes}
                onChange={(e) => setMarkPaidForm({ ...markPaidForm, internal_notes: e.target.value })}
                placeholder="Add internal notes about this payment..."
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                These notes are for internal use only and will not appear on receipts
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkPaidInvoice(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleMarkPaid} 
              disabled={isMarkingPaid || !markPaidForm.payment_type_id}
            >
              {isMarkingPaid ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
