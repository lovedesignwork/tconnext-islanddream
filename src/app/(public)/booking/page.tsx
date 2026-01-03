"use client"

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { Ship, Clock, ChevronRight } from 'lucide-react'
import { useSubdomain } from '@/hooks/use-subdomain'
import type { Program, Company } from '@/types'

interface ProgramWithBookingFields extends Program {
  slug: string | null
  thumbnail_url: string | null
  direct_booking_enabled: boolean
  short_description: string | null
  adult_selling_price: number
  child_selling_price: number
}

function BookingGalleryContent() {
  const subdomain = useSubdomain()
  
  const [company, setCompany] = useState<Company | null>(null)
  const [programs, setPrograms] = useState<ProgramWithBookingFields[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        // Use public API route to fetch booking data (bypasses RLS)
        const url = subdomain 
          ? `/api/booking/public?slug=${subdomain}`
          : '/api/booking/public'
        
        const response = await fetch(url)
        
        if (!response.ok) {
          setLoading(false)
          return
        }

        const data = await response.json()
        
        if (data.company) {
          setCompany(data.company)
          setPrograms((data.programs || []) as ProgramWithBookingFields[])
        }
      } catch (error) {
        console.error('Failed to fetch booking data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [subdomain])

  const companySettings = company?.settings || {}
  const brandingSettings = companySettings.branding || {}
  const bookingSettings = companySettings.booking || {}
  const primaryColor = brandingSettings.primary_color || '#3B82F6'

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Skeleton className="h-16 w-64 mb-8" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-80 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Ship className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Company Not Found</h2>
            <p className="text-muted-foreground">
              The company you&apos;re looking for doesn&apos;t exist.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if Stripe is connected and enabled (for showing payment method availability info)
  const isStripeReady = company.stripe_connected && 
    company.stripe_onboarding_complete && 
    bookingSettings.stripe_payments_enabled !== false

  if (programs.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Header company={company} primaryColor={primaryColor} />
        <main className="max-w-6xl mx-auto px-4 py-12">
          <Card className="max-w-lg mx-auto">
            <CardContent className="pt-6 text-center">
              <Ship className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Programs Available</h2>
              <p className="text-muted-foreground">
                There are currently no programs available for online booking.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Header company={company} primaryColor={primaryColor} />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Program Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => (
            <ProgramCard 
              key={program.id} 
              program={program} 
              primaryColor={primaryColor}
            />
          ))}
        </div>

        {/* Footer Text */}
        {bookingSettings.page_footer_text && (
          <div className="mt-12 text-center text-sm text-slate-500">
            {bookingSettings.page_footer_text}
          </div>
        )}
      </main>
    </div>
  )
}

function Header({ company, primaryColor }: { company: Company; primaryColor: string }) {
  const logoUrl = (company.settings as any)?.logo_url

  return (
    <header 
      className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10"
      style={{ borderBottomColor: `${primaryColor}20` }}
    >
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
        {logoUrl ? (
          <img 
            src={logoUrl} 
            alt={company.name} 
            className="max-h-[50px] max-w-[200px] object-contain"
          />
        ) : (
          <div 
            className="flex items-center justify-center w-10 h-10 rounded-lg text-white"
            style={{ backgroundColor: primaryColor }}
          >
            <Ship className="w-6 h-6" />
          </div>
        )}
        {!logoUrl && (
          <h1 className="text-xl font-bold text-slate-800">{company.name}</h1>
        )}
      </div>
    </header>
  )
}

function ProgramCard({ 
  program, 
  primaryColor 
}: { 
  program: ProgramWithBookingFields
  primaryColor: string 
}) {
  const programColor = program.color || primaryColor
  const displayPrice = program.adult_selling_price || program.selling_price || program.base_price || 0
  const childPrice = program.child_selling_price || 0

  // Default placeholder image if no thumbnail
  const thumbnailUrl = program.thumbnail_url || `https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=600&fit=crop`

  return (
    <Link 
      href={`/booking/${program.slug}`}
      className="group"
    >
      <Card className="overflow-hidden h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-0 shadow-md">
        {/* Image */}
        <div className="relative overflow-hidden">
          <img
            src={thumbnailUrl}
            alt={program.name}
            className="w-full h-auto transition-transform duration-500 group-hover:scale-110"
          />
        </div>

        {/* Content */}
        <CardContent className="p-4">
          {/* Program Name */}
          <h3 className="font-bold text-lg text-slate-800 mb-2">
            {program.name}
          </h3>
          {/* Description */}
          <p className="text-slate-600 text-sm mb-4 line-clamp-2">
            {program.short_description || program.description || 'Experience an unforgettable adventure with us.'}
          </p>

          {/* Info badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            {program.duration && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {program.duration}
              </Badge>
            )}
          </div>

          {/* Price and CTA */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Starting from</p>
              <p className="text-2xl font-bold" style={{ color: programColor }}>
                {formatCurrency(displayPrice)}
              </p>
              {childPrice > 0 && childPrice !== displayPrice && (
                <p className="text-xs text-slate-500">
                  Child: {formatCurrency(childPrice)}
                </p>
              )}
            </div>
            <div 
              className="flex items-center gap-1 text-sm font-medium transition-all group-hover:gap-2"
              style={{ color: programColor }}
            >
              Book Now
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default function BookingGalleryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Skeleton className="h-16 w-64 mb-8" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-80 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    }>
      <BookingGalleryContent />
    </Suspense>
  )
}

