import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | null = null

/** Same project as p-Back; use the public anon key only in this internal super-admin bundle. */
export function isAuditRealtimeConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  return Boolean(
    url &&
      key &&
      typeof url === 'string' &&
      typeof key === 'string' &&
      url.startsWith('http'),
  )
}

export function getBrowserSupabase(): SupabaseClient | null {
  if (!isAuditRealtimeConfigured()) return null
  if (!browserClient) {
    browserClient = createClient(
      import.meta.env.VITE_SUPABASE_URL as string,
      import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    )
  }
  return browserClient
}
