import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import { serverEnv } from '@/lib/env'

/**
 * Cliente Supabase com service_role.
 * SOMENTE para Route Handlers, Server Actions ou scripts server-side.
 * Nunca importar em Client Components.
 */
export function createAdminClient() {
  const serviceRoleKey = serverEnv.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY não está definida. O cliente admin exige a service role key.',
    )
  }

  return createSupabaseClient(
    serverEnv.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}
