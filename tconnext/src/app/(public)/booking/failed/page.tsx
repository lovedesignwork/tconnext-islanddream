"use client"

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { XCircle, MessageCircle, Phone, Mail, ChevronLeft } from 'lucide-react'
import { useSubdomain } from '@/hooks/use-subdomain'
import type { Company } from '@/types'

function BookingFailedContent() {
  const searchParams = useSearchParams()
  const subdomain = useSubdomain()
  const errorMessage = searchParams.get('error')
  
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)

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

  const failedMessage = bookingSettings.failed_payment_message || 
    "We're sorry, but your payment could not be processed. Please try again or contact us directly to complete your booking."

  const contactInfo = bookingSettings.contact_for_manual_booking ||
    "Our team is ready to help you complete your booking manually."

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
          {/* Failed Icon */}
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-12 h-12 text-red-500" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Payment Failed
          </h1>

          {/* Company Name */}
          {company && (
            <p className="text-slate-500 mb-6">
              {company.name}
            </p>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-4 text-left">
              <p className="text-red-700 text-sm">
                {errorMessage}
              </p>
            </div>
          )}

          {/* Failed Message */}
          <div className="bg-slate-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-slate-600 text-sm whitespace-pre-line">
              {failedMessage}
            </p>
          </div>

          {/* Contact Info */}
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-amber-800 mb-2">Need Help?</h3>
            <p className="text-amber-700 text-sm mb-3">
              {contactInfo}
            </p>
            
            {/* Contact Options */}
            <div className="space-y-2">
              {availabilitySettings.contact_whatsapp && (
                <a
                  href={`https://wa.me/${availabilitySettings.contact_whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-amber-800 hover:text-amber-900"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp: {availabilitySettings.contact_whatsapp}
                </a>
              )}
              {availabilitySettings.contact_phone && (
                <a
                  href={`tel:${availabilitySettings.contact_phone}`}
                  className="flex items-center gap-2 text-sm text-amber-800 hover:text-amber-900"
                >
                  <Phone className="w-4 h-4" />
                  Phone: {availabilitySettings.contact_phone}
                </a>
              )}
              {availabilitySettings.contact_email && (
                <a
                  href={`mailto:${availabilitySettings.contact_email}`}
                  className="flex items-center gap-2 text-sm text-amber-800 hover:text-amber-900"
                >
                  <Mail className="w-4 h-4" />
                  Email: {availabilitySettings.contact_email}
                </a>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link href="/booking">
              <Button 
                className="w-full"
                style={{ backgroundColor: primaryColor }}
              >
                Try Again
              </Button>
            </Link>

            {availabilitySettings.contact_whatsapp && (
              <a
                href={`https://wa.me/${availabilitySettings.contact_whatsapp.replace(/\D/g, '')}?text=Hi, I had trouble completing my online booking. Can you help me?`}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button variant="outline" className="w-full">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Contact via WhatsApp
                </Button>
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function BookingFailedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Skeleton className="h-96 w-full max-w-md rounded-xl" />
      </div>
    }>
      <BookingFailedContent />
    </Suspense>
  )
}

