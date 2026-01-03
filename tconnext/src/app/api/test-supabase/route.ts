import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function GET() {
  try {
    const supabase = createClient()
    
    // Test basic connection
    const { data, error } = await supabase.from('companies').select('count').limit(1)
    
    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: 'Database connection failed', 
        details: error.message 
      })
    }
    
    // Test auth user lookup
    const { data: authData } = await supabase.auth.getUser()
    
    return NextResponse.json({ 
      success: true, 
      database: 'Connected',
      auth: authData.user ? 'User found' : 'No user',
      env_check: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
        anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'
      }
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Connection failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}











