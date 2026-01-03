import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createClient } from '@supabase/supabase-js'

// Service role client for middleware user lookups (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Public routes that don't require authentication
const publicRoutes = ['/login', '/forgot-password', '/direct', '/slot', '/driver', '/booking', '/guide', '/availability']
const publicApiRoutes = ['/api/public', '/api/auth/login', '/api/auth/forgot-password', '/api/auth/me', '/api/driver-portal', '/api/driver/', '/api/guide/', '/api/booking/', '/api/stripe/', '/api/branding']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  const isPublicApiRoute = publicApiRoutes.some(route => pathname.startsWith(route))
  const isStaticAsset = pathname.startsWith('/_next') || 
                        pathname.startsWith('/favicon') || 
                        pathname.includes('.')

  if (isStaticAsset) {
    return NextResponse.next()
  }

  const { supabaseResponse, user } = await updateSession(request)

  // Allow public routes without authentication
  if (isPublicRoute || isPublicApiRoute) {
    return supabaseResponse
  }

  // Redirect root to dashboard
  if (pathname === '/' || pathname === '') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Require authentication for protected routes
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Verify user exists and has valid role (use admin client to bypass RLS)
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('company_id, role')
    .eq('auth_id', user.id)
    .single()

  // If no user record found, check company_team_members (staff)
  if (!userData) {
    const { data: teamMemberData } = await supabaseAdmin
      .from('company_team_members')
      .select('company_id, status')
      .eq('auth_id', user.id)
      .single()

    if (!teamMemberData || teamMemberData.status !== 'active') {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'unauthorized')
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
