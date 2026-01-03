import { createBrowserClient, type SupabaseClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

let browserClient: SupabaseClient<Database> | null = null

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          // COMPLETELY disable auto-refresh to prevent ANY activity when switching tabs
          // This stops Supabase from calling startAutoRefresh() on visibility change
          autoRefreshToken: false,
          persistSession: true,
          detectSessionInUrl: false,
        },
      }
    )
  }

  return browserClient
}

