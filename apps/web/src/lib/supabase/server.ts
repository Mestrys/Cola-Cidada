import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { publicEnv } from '@/lib/env'

/**
 * Cliente Supabase para Server Components, Route Handlers e Server Actions.
 * Lê/escreve cookies de sessão via next/headers.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // setAll pode falhar em Server Components (read-only).
            // O middleware é responsável pelo refresh da sessão nesses casos.
          }
        },
      },
    },
  )
}
