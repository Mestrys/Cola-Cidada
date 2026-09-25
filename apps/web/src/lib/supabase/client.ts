import { createBrowserClient } from '@supabase/ssr'

import { publicEnv } from '@/lib/env'

/**
 * Cliente Supabase para o browser (Client Components).
 * Usa apenas a anon key — nunca a service role.
 */
export function createClient() {
  return createBrowserClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}
