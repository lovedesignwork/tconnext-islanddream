import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

// Use service role client for signup (no auth context)
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Generate unique company code between 30000-99999
async function generateCompanyCode(supabase: SupabaseClient): Promise<number> {
  let code: number
  let exists = true
  
  while (exists) {
    code = Math.floor(Math.random() * (99999 - 30000 + 1)) + 30000
    const { data } = await supabase
      .from('companies')
      .select('id')
      .eq('company_code', code)
      .single()
    exists = !!data
  }
  
  return code!
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyName, companySlug, fullName, email, password, phone } = body

    // Validate required fields
    if (!companyName || !companySlug || !fullName || !email || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/
    if (!slugRegex.test(companySlug)) {
      return NextResponse.json(
        { error: 'Subdomain can only contain lowercase letters, numbers, and hyphens' },
        { status: 400 }
      )
    }

    // Check for reserved subdomains
    const reservedSubdomains = ['admin', 'superadmin', 'buy', 'www', 'api', 'app', 'dashboard', 'login', 'signup', 'mail', 'email', 'support', 'help', 'docs', 'blog']
    if (reservedSubdomains.includes(companySlug)) {
      return NextResponse.json(
        { error: 'This subdomain is reserved. Please choose another.' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    // Check if slug is already taken
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('slug', companySlug)
      .single()

    if (existingCompany) {
      return NextResponse.json(
        { error: 'This subdomain is already taken. Please choose another.' },
        { status: 400 }
      )
    }

    // Check if email is already registered
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Generate unique company code
    const companyCode = await generateCompanyCode(supabase)

    // Create company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: companyName,
        slug: companySlug,
        company_code: companyCode,
        staff_sequence: 0,
        region: 'Phuket', // Default region
        settings: {
          branding: {
            primary_color: '#3B82F6'
          }
        }
      })
      .select()
      .single()

    if (companyError) {
      console.error('Company creation error:', companyError)
      return NextResponse.json(
        { error: 'Failed to create company. Please try again.' },
        { status: 500 }
      )
    }

    // Create user with owner role
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        name: fullName,
        phone: phone || null,
        company_id: company.id,
        role: 'owner',
        is_active: true
      })
      .select()
      .single()

    if (userError) {
      console.error('User creation error:', userError)
      // Rollback: delete the company if user creation fails
      await supabase.from('companies').delete().eq('id', company.id)
      return NextResponse.json(
        { error: 'Failed to create user account. Please try again.' },
        { status: 500 }
      )
    }

    // Create default settings for the company
    // This could include creating default programs, settings, etc.

    return NextResponse.json({
      success: true,
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        company_code: company.company_code
      },
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      loginUrl: `https://${companySlug}.tconnext.com/login`
    })

  } catch (error: any) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}






