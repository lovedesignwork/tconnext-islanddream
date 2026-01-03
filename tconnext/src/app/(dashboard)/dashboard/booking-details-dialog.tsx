"use client"

import { useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatTime, formatCurrency } from '@/lib/utils'
import { 
  Download, 
  Phone, 
  Mail, 
  MapPin, 
  User, 
  Calendar, 
  Clock, 
  Loader2,
  Building2,
  CreditCard,
  FileText,
  FileImage,
  ExternalLink,
  StickyNote,
  AlertCircle,
  Copy,
  Check,
  Send
} from 'lucide-react'
import { toast } from 'sonner'
import type { BookingWithRelations } from '@/types'

interface BookingDetailsDialogProps {
  booking: BookingWithRelations | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const statusConfig = {
  confirmed: { bg: 'bg-emerald-500', text: 'text-white', label: 'Confirmed' },
  pending: { bg: 'bg-amber-500', text: 'text-white', label: 'Pending' },
  cancelled: { bg: 'bg-red-500', text: 'text-white', label: 'Cancelled' },
  completed: { bg: 'bg-sky-500', text: 'text-white', label: 'Completed' },
  void: { bg: 'bg-slate-400', text: 'text-white', label: 'Void' },
} as const

// Helper function to format pickup time with 15-minute buffer
function formatPickupTimeRange(pickupTime: string | null): string {
  if (!pickupTime) return '—'
  
  // Parse the time (handles formats like "08:00:00" or "08:00")
  const timeParts = pickupTime.split(':')
  if (timeParts.length < 2) return pickupTime
  
  const hours = parseInt(timeParts[0], 10)
  const minutes = parseInt(timeParts[1], 10)
  
  if (isNaN(hours) || isNaN(minutes)) return pickupTime
  
  // Calculate end time (15 minutes later)
  let endMinutes = minutes + 15
  let endHours = hours
  
  if (endMinutes >= 60) {
    endMinutes -= 60
    endHours += 1
  }
  if (endHours >= 24) {
    endHours = 0
  }
  
  // Format as HH:MM - HH:MM
  const startTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`
  
  return `${startTime} - ${endTime}`
}

export function BookingDetailsDialog({ booking, open, onOpenChange }: BookingDetailsDialogProps) {
  const pdfContentRef = useRef<HTMLDivElement>(null)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [copiedPhone, setCopiedPhone] = useState(false)
  const [copiedAll, setCopiedAll] = useState(false)

  if (!booking) return null

  const totalGuests = (booking.adults || 0) + (booking.children || 0) + (booking.infants || 0)
  const isPdf = booking.voucher_image_url?.toLowerCase().endsWith('.pdf')
  const hasPaymentRequired = booking.collect_money > 0
  const hasVoucher = !!booking.voucher_image_url
  const programName = (booking.program as { name: string } | undefined)?.name || '—'
  const programColor = (booking.program as { color?: string } | undefined)?.color || '#3B82F6'

  const handleDownloadPDF = async () => {
    if (!pdfContentRef.current) return

    setIsGeneratingPDF(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const jsPDF = (await import('jspdf')).default

      const canvas = await html2canvas(pdfContentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const imgWidth = 210
      const pageHeight = 297
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      pdf.save(`booking-${booking.booking_number}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const handleCopyEmail = async () => {
    if (!booking.customer_email) return
    await navigator.clipboard.writeText(booking.customer_email)
    setCopiedEmail(true)
    toast.success('Email copied to clipboard')
    setTimeout(() => setCopiedEmail(false), 2000)
  }

  const handleCopyPhone = async () => {
    if (!booking.customer_whatsapp) return
    await navigator.clipboard.writeText(booking.customer_whatsapp)
    setCopiedPhone(true)
    toast.success('Phone number copied to clipboard')
    setTimeout(() => setCopiedPhone(false), 2000)
  }

  const handleCopyAll = async () => {
    const hotelName = booking.custom_pickup_location || 
      (booking.hotel as { name: string } | undefined)?.name || 'Not specified'
    const hotelArea = (booking.hotel as { area: string } | undefined)?.area || ''
    const agentName = booking.is_direct_booking 
      ? 'Direct Website' 
      : (booking.agent as { name: string } | undefined)?.name || '—'
    const staffName = booking.is_direct_booking 
      ? 'Online Booking' 
      : (booking.agent_staff as { nickname: string } | undefined)?.nickname || 'Company'

    const text = `
Booking: ${booking.booking_number}
Status: ${statusConfig[booking.status]?.label || booking.status}
Program: ${programName}

Activity Date: ${formatDate(booking.activity_date)}
Pickup Time: ${formatPickupTimeRange(booking.pickup_time)}

Customer: ${booking.customer_name}
Email: ${booking.customer_email || 'N/A'}
Phone: ${booking.customer_whatsapp || 'N/A'}

Guests: ${totalGuests} Total (${booking.adults || 0} Adults, ${booking.children || 0} Children, ${booking.infants || 0} Infants)

Pickup Location: ${hotelName}${hotelArea ? ` (${hotelArea})` : ''}${booking.room_number ? ` - Room ${booking.room_number}` : ''}

Agent: ${agentName} (${staffName})
${hasPaymentRequired ? `\nPayment Required: ${formatCurrency(booking.collect_money)}` : ''}
${booking.voucher_number ? `\nVoucher: ${booking.voucher_number}` : ''}
${booking.notes ? `\nNotes: ${booking.notes}` : ''}
${booking.internal_remarks ? `\nInternal Remarks: ${booking.internal_remarks}` : ''}
`.trim()

    await navigator.clipboard.writeText(text)
    setCopiedAll(true)
    toast.success('Booking details copied to clipboard')
    setTimeout(() => setCopiedAll(false), 2000)
  }

  const handleDownloadVoucher = () => {
    if (!booking.voucher_image_url) return
    window.open(booking.voucher_image_url, '_blank')
  }

  const handleSendToEmail = () => {
    if (!booking.customer_email) {
      toast.error('No customer email available')
      return
    }
    // UI only for now - will be implemented later
    toast.info('Send to email feature coming soon')
  }

  const status = statusConfig[booking.status] || statusConfig.pending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0">
        <div className="bg-white">
          {/* PDF Content Area - This is what gets exported */}
          <div ref={pdfContentRef} className="bg-white">
            {/* Header Section - Light grey background */}
            <div className="bg-slate-100 border-b border-slate-200 p-5">
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <DialogTitle className="text-xl font-bold text-slate-900 tracking-wide">
                    {booking.booking_number}
                  </DialogTitle>
                  <Badge className={`${status.bg} ${status.text} border-0 text-xs px-2.5 py-1`}>
                    {status.label}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Created {formatDate(booking.created_at)} • {formatTime(booking.created_at)}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span 
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: programColor }}
                  />
                  <span className="text-xl font-semibold text-slate-800">{programName}</span>
                </div>
              </DialogHeader>
            </div>

            {/* Void Reason Alert */}
            {booking.status === 'void' && booking.void_reason && (
              <div className="mx-5 mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">
                  <span className="font-medium">Void Reason:</span> {booking.void_reason}
                </p>
              </div>
            )}

            {/* Main Content */}
            <div className="p-5 space-y-4">
              {/* Date, Pickup Time & Guest Count Row */}
              <div className="grid grid-cols-[auto_auto_1fr] gap-3 items-stretch">
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-[11px] uppercase tracking-wide font-medium">Date</span>
                  </div>
                  <p className="text-base font-semibold text-slate-900 whitespace-nowrap">{formatDate(booking.activity_date)}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-[11px] uppercase tracking-wide font-medium">Pickup</span>
                  </div>
                  <p className="text-base font-semibold text-slate-900 whitespace-nowrap">
                    {formatPickupTimeRange(booking.pickup_time)}
                  </p>
                </div>
                {/* Guest Count Badges */}
                <div className="flex gap-2 justify-end">
                  <div className="bg-blue-600 text-white rounded-lg px-4 py-2 text-center min-w-[56px]">
                    <p className="text-2xl font-bold leading-tight">{totalGuests}</p>
                    <p className="text-[10px] opacity-90 font-medium">Total</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-center min-w-[48px]">
                    <p className="text-xl font-semibold text-slate-700 leading-tight">{booking.adults || 0}</p>
                    <p className="text-[10px] text-slate-500 font-medium">Adult</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-center min-w-[48px]">
                    <p className="text-xl font-semibold text-slate-700 leading-tight">{booking.children || 0}</p>
                    <p className="text-[10px] text-slate-500 font-medium">Child</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-center min-w-[48px]">
                    <p className="text-xl font-semibold text-slate-700 leading-tight">{booking.infants || 0}</p>
                    <p className="text-[10px] text-slate-500 font-medium">Infant</p>
                  </div>
                </div>
              </div>

              {/* Customer */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-500 mb-2">
                  <User className="w-4 h-4" />
                  <span className="text-[11px] uppercase tracking-wide font-medium">Customer</span>
                </div>
                <p className="text-base font-semibold text-slate-900">{booking.customer_name}</p>
                <div className="flex flex-col gap-1.5 mt-2">
                  {booking.customer_email && (
                    <div className="flex items-center gap-1.5 text-sm text-blue-600">
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{booking.customer_email}</span>
                    </div>
                  )}
                  {booking.customer_whatsapp && (
                    <div className="flex items-center gap-1.5 text-sm text-green-600">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{booking.customer_whatsapp}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Hotel & Agent Row */}
              <div className="grid grid-cols-2 gap-3">
                {/* Hotel/Pickup Location */}
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-500 mb-2">
                    <MapPin className="w-4 h-4" />
                    <span className="text-[11px] uppercase tracking-wide font-medium">Pickup Location</span>
                  </div>
                  {booking.custom_pickup_location ? (
                    <>
                      <p className="text-sm font-semibold text-slate-900">{booking.custom_pickup_location}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Custom Location</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-slate-900">
                        {(booking.hotel as { name: string } | undefined)?.name || 'Not specified'}
                      </p>
                      {(booking.hotel as { area: string } | undefined)?.area && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {(booking.hotel as { area: string }).area}
                        </p>
                      )}
                    </>
                  )}
                  {booking.room_number && (
                    <p className="text-sm text-slate-600 mt-1.5">
                      Room: <span className="font-medium">{booking.room_number}</span>
                    </p>
                  )}
                </div>

                {/* Agent */}
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-500 mb-2">
                    <Building2 className="w-4 h-4" />
                    <span className="text-[11px] uppercase tracking-wide font-medium">Agent</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    {booking.is_direct_booking
                      ? 'Direct Website'
                      : (booking.agent as { name: string } | undefined)?.name || '—'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {booking.is_direct_booking
                      ? 'Online Booking'
                      : (booking.agent_staff as { nickname: string } | undefined)?.nickname || 'Company'}
                  </p>
                </div>
              </div>

              {/* Payment Required - Only show if there's money to collect */}
              {hasPaymentRequired && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-orange-600">
                      <CreditCard className="w-4 h-4" />
                      <span className="text-[11px] uppercase tracking-wide font-medium">Payment Required</span>
                    </div>
                    <p className="text-xl font-bold text-orange-600">
                      {formatCurrency(booking.collect_money)}
                    </p>
                  </div>
                </div>
              )}

              {/* Notes Section */}
              {(booking.notes || booking.internal_remarks) && (
                <div className="space-y-3">
                  {booking.notes && (
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                      <div className="flex items-center gap-1.5 text-slate-500 mb-1.5">
                        <StickyNote className="w-4 h-4" />
                        <span className="text-[11px] uppercase tracking-wide font-medium">Notes</span>
                      </div>
                      <p className="text-sm text-slate-700">{booking.notes}</p>
                    </div>
                  )}
                  {booking.internal_remarks && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-amber-600 mb-1.5">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-[11px] uppercase tracking-wide font-medium">Internal Remarks</span>
                      </div>
                      <p className="text-sm text-amber-800">{booking.internal_remarks}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Voucher Section */}
              {booking.voucher_number && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-blue-600 mb-1.5">
                    <FileText className="w-4 h-4" />
                    <span className="text-[11px] uppercase tracking-wide font-medium">Voucher Number</span>
                  </div>
                  <p className="text-base font-mono font-medium text-blue-800">
                    {booking.voucher_number}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-400">
                TConnext Booking System • {new Date().toLocaleString()}
              </p>
            </div>
          </div>

          {/* Interactive Elements - Outside PDF area */}
          <div className="p-4 border-t border-slate-200 bg-white space-y-3">
            {/* Customer Contact with Copy Buttons */}
            <div className="flex flex-wrap gap-3">
              {booking.customer_email && (
                <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                  <a 
                    href={`mailto:${booking.customer_email}`} 
                    className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                  >
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span>{booking.customer_email}</span>
                  </a>
                  <button
                    onClick={handleCopyEmail}
                    className="p-1.5 hover:bg-slate-200 rounded transition-colors"
                    title="Copy email"
                  >
                    {copiedEmail ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </div>
              )}
              {booking.customer_whatsapp && (
                <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                  <a 
                    href={`https://wa.me/${booking.customer_whatsapp.replace(/\D/g, '')}`} 
                    className="flex items-center gap-1.5 text-sm text-green-600 hover:underline"
                  >
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>{booking.customer_whatsapp}</span>
                  </a>
                  <button
                    onClick={handleCopyPhone}
                    className="p-1.5 hover:bg-slate-200 rounded transition-colors"
                    title="Copy phone"
                  >
                    {copiedPhone ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Voucher Image Preview - Interactive */}
            {booking.voucher_image_url && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <a 
                  href={booking.voucher_image_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  {isPdf ? (
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileImage className="w-6 h-6 text-red-600" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={booking.voucher_image_url} 
                        alt="Voucher" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          target.parentElement!.innerHTML = '<svg class="w-6 h-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>'
                        }}
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-blue-700">
                      {isPdf ? 'View PDF Voucher' : 'View Voucher Image'}
                    </p>
                    <p className="text-xs text-blue-500">Click to open in new tab</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-blue-400 flex-shrink-0" />
                </a>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
              {hasVoucher && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadVoucher}
                    className="h-9 text-sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Voucher
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSendToEmail}
                    className="h-9 text-sm"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send to Email
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                className="h-9 text-sm"
              >
                {isGeneratingPDF ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyAll}
                className="h-9 text-sm"
              >
                {copiedAll ? (
                  <Check className="w-4 h-4 mr-2 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 mr-2" />
                )}
                {copiedAll ? 'Copied!' : 'Copy All'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
