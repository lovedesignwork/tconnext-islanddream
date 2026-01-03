import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { AuthUser, UserPermissions } from '@/types'
import * as jose from 'jose'
import bcrypt from 'bcryptjs'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-jwt-secret-at-least-32-chars-long'
)

// Service role client for bypassing RLS
const supabaseServiceRole = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createClient()
  
  const { data: { user: authUser } } = await supabase.auth.getUser()
  
  if (!authUser) {
    return null
  }

  // Use service role client to bypass RLS
  // First check the users table
  const { data: userData } = await supabaseServiceRole
    .from('users')
    .select(`
      id,
      email,
      name,
      role,
      company_id,
      permissions,
      companies:company_id (
        slug,
        name
      )
    `)
    .eq('auth_id', authUser.id)
    .single()

  if (userData) {
    const companyData = userData.companies as unknown
    const company = Array.isArray(companyData) 
      ? companyData[0] as { slug: string; name: string } | undefined
      : companyData as { slug: string; name: string } | null

    return {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      company_id: userData.company_id,
      company_slug: company?.slug,
      company_name: company?.name,
      permissions: userData.permissions as UserPermissions,
    }
  }

  // If not found in users, check company_team_members (staff)
  const { data: teamMemberData } = await supabaseServiceRole
    .from('company_team_members')
    .select(`
      id,
      email,
      name,
      company_id,
      permissions,
      companies:company_id (
        slug,
        name
      )
    `)
    .eq('auth_id', authUser.id)
    .single()

  if (teamMemberData) {
    const companyData = teamMemberData.companies as unknown
    const company = Array.isArray(companyData) 
      ? companyData[0] as { slug: string; name: string } | undefined
      : companyData as { slug: string; name: string } | null

    return {
      id: teamMemberData.id,
      email: teamMemberData.email || authUser.email || '',
      name: teamMemberData.name,
      role: 'staff',
      company_id: teamMemberData.company_id,
      company_slug: company?.slug,
      company_name: company?.name,
      permissions: teamMemberData.permissions as UserPermissions,
    }
  }

  return null
}

export async function signIn(email: string, password: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  // Get user data
  const { data: userData } = await supabase
    .from('users')
    .select('id, role, company_id')
    .eq('auth_id', data.user.id)
    .single()

  if (!userData) {
    await supabase.auth.signOut()
    return { error: 'User not found in system' }
  }

  return { data: { user: data.user, userData } }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}

export async function createUserAccount(
  email: string,
  password: string,
  name: string,
  role: 'master_admin' | 'staff',
  companyId: string,
  permissions?: UserPermissions
) {
  const supabase = await createAdminClient()

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    return { error: authError.message }
  }

  // Create user record
  const { data: userData, error: userError } = await supabase
    .from('users')
    .insert({
      auth_id: authData.user.id,
      email,
      name,
      role,
      company_id: companyId,
      permissions: permissions || getDefaultPermissions(role),
    })
    .select()
    .single()

  if (userError) {
    // Rollback: delete auth user
    await supabase.auth.admin.deleteUser(authData.user.id)
    return { error: userError.message }
  }

  return { data: userData }
}

// Client-side utilities are in auth-utils.ts
export { getDefaultPermissions, hasPermission } from './auth-utils'

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10)
}

export async function verifyPin(pin: string, hashedPin: string): Promise<boolean> {
  return bcrypt.compare(pin, hashedPin)
}

export async function createDriverToken(driverId: string, companyId: string): Promise<string> {
  const token = await new jose.SignJWT({ driverId, companyId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET)
  
  return token
}

export async function verifyDriverToken(token: string): Promise<{ driverId: string; companyId: string } | null> {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET)
    return {
      driverId: payload.driverId as string,
      companyId: payload.companyId as string,
    }
  } catch {
    return null
  }
}

