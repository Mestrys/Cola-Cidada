import { z } from 'zod'

/**
 * Validação centralizada de variáveis de ambiente com Zod.
 * - `publicEnv`: seguro para o browser (apenas NEXT_PUBLIC_*).
 * - `serverEnv`: inclui secrets; só pode ser usado em código server-side.
 *
 * O parse é eager no carregamento do módulo. No build (`next build`),
 * a ausência ou formato inválido de qualquer variável faz o processo falhar.
 */

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({
    message: 'NEXT_PUBLIC_SUPABASE_URL deve ser uma URL válida',
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, {
    message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY é obrigatória',
  }),
})

const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, {
    message: 'SUPABASE_SERVICE_ROLE_KEY é obrigatória (apenas server-side)',
  }),
})

export type PublicEnv = z.infer<typeof publicEnvSchema>
export type ServerEnv = z.infer<typeof serverEnvSchema>

function readPublicEnv(): PublicEnv {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })
}

function readServerEnv(): ServerEnv {
  return serverEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  })
}

export const publicEnv: PublicEnv = readPublicEnv()

/**
 * Secrets e config server-only. Em contexto de browser, o acesso lança erro
 * para evitar vazamento acidental da service role key.
 */
export const serverEnv: ServerEnv =
  typeof window === 'undefined'
    ? readServerEnv()
    : new Proxy({} as ServerEnv, {
        get() {
          throw new Error(
            'serverEnv só pode ser acessado em código server-side. Use publicEnv no client.',
          )
        },
      })
