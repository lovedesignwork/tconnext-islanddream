"use client"

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckCircle, Clock, MessageCircle, Banknote, CreditCard } from 'lucide-react'
import { useSubdomain } from '@/hooks/use-subdomain'
import type { Company } from '@/types'

function BookingSuccessContent() {
  const searchParams = useSearchParams()
  const subdomain = useSubdomain()
  const paymentMethod = searchParams.get('payment') || 'stripe' // 'cash' or 'stripe'
  const bookingRef = searchParams.get('ref') // For cash bookings
  
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)

  const isCashPayment = paymentMethod === 'cash'

  useEffect(() => {
    async function fetchCompany() {
      try {
        // Use public API route to fetch company data (bypasses RLS)
        const url = subdomain 
          ? `/api/booking/public?slug=${subdomain}`
          : '/api/booking/public'
        
        const response = await fetch(url)
        
        if (response.ok) {
          const data = await response.json()
          setCompany(data.company || null)
        }
      } catch (error) {
        console.error('Failed to fetch company:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCompany()
  }, [subdomain])

  const companySettings = company?.settings || {}
  const brandingSettings = companySettings.branding || {}
  const bookingSettings = companySettings.booking || {}
  const availabilitySettings = companySettings.availability || {}
  const primaryColor = brandingSettings.primary_color || '#3B82F6'

  // Different messages for cash vs paid bookings
  const thankYouMessage = isCashPayment 
    ? (bookingSettings.cash_booking_message || 
       "Thank you for your booking request! Your booking is currently pending confirmation. Our team will review your booking and contact you via WhatsApp to confirm the details and pickup time.")
    : (bookingSettings.thank_you_message || 
       "Thank you for your booking! Your payment has been received and your booking is confirmed. We will contact you via WhatsApp with your pickup time details.")

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Skeleton className="h-96 w-full max-w-md rounded-xl" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-xl border-0">
        <CardContent className="pt-8 pb-8 text-center">
          {/* Success/Pending Icon */}
          <div 
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: isCashPayment ? '#FEF3C7' : `${primaryColor}15` }}
          >
            {isCashPayment ? (
              <Clock className="w-12 h-12 text-amber-500" />
            ) : (
              <CheckCircle className="w-12 h-12" style={{ color: primaryColor }} />
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            {isCashPayment ? 'Booking Submitted!' : 'Booking Confirmed!'}
          </h1>

          {/* Status Badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-4 ${
            isCashPayment 
              ? 'bg-amber-100 text-amber-700' 
              : 'bg-green-100 text-green-700'
          }`}>
            {isCashPayment ? (
              <>
                <Banknote className="w-4 h-4" />
                Pending Confirmation
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                Payment Received
              </>
            )}
          </div>

          {/* Booking Reference */}
          {bookingRef && (
            <div className="bg-slate-100 rounded-lg p-3 mb-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Booking Reference</p>
              <p className="text-lg font-mono font-bold text-slate-800">{bookingRef}</p>
            </div>
          )}

          {/* Company Name */}
          {company && (
            <p className="text-slate-500 mb-6">
              {company.name}
            </p>
          )}

          {/* Thank You Message */}
          <div className={`rounded-lg p-4 mb-6 text-left ${
            isCashPayment ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'
          }`}>
            <p className="text-slate-600 text-sm whitespace-pre-line">
              {thankYouMessage}
            </p>
          </div>

          {/* What's Next - Different for cash vs paid */}
          <div className="space-y-3 mb-6 text-left">
            <h3 className="font-semibold text-slate-800">What happens next?</h3>
            
            {isCashPayment ? (
              <>
                <div className="flex items-start gap-3">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold bg-amber-500"
                  >
                    1
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">Booking Review</p>
                    <p className="text-sm text-slate-500">Our team will review your booking</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold bg-amber-500"
                  >
                    2
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">WhatsApp Confirmation</p>
                    <p className="text-sm text-slate-500">We&apos;ll contact you to confirm details & pickup time</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold bg-amber-500"
                  >
                    3
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">Pay on Tour Day</p>
                    <p className="text-sm text-slate-500">Bring cash to pay when you join the tour</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
                    style={{ backgroundColor: primaryColor }}
                  >
                    1
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">Confirmation Email</p>
                    <p className="text-sm text-slate-500">Check your email for booking details</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
                    style={{ backgroundColor: primaryColor }}
                  >
                    2
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">Pickup Time</p>
                    <p className="text-sm text-slate-500">We&apos;ll WhatsApp you your pickup time</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
                    style={{ backgroundColor: primaryColor }}
                  >
                    3
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">Enjoy Your Trip!</p>
                    <p className="text-sm text-slate-500">Be ready at your pickup location</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Contact Options */}
          {availabilitySettings.contact_whatsapp && (
            <div className="border-t pt-6">
              <p className="text-sm text-slate-500 mb-3">Questions? Contact us:</p>
              <a
                href={`https://wa.me/${availabilitySettings.contact_whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#25D366' }}
              >
                <MessageCircle className="w-4 h-4" />
                Chat on WhatsApp
              </a>
            </div>
          )}

          {/* Back to Programs */}
          <div className="mt-6">
            <Link href="/booking">
              <Button variant="outline" className="w-full">
                Book Another Tour
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Skeleton className="h-96 w-full max-w-md rounded-xl" />
      </div>
    }>
      <BookingSuccessContent />
    </Suspense>
  )
}
