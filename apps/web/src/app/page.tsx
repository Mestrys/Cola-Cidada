import { Button } from '@/components/ui/button'

/**
 * Página raiz mínima — valida Tailwind + shadcn/ui (Button).
 * Features de negócio serão implementadas em sessões futuras.
 */
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6">
      <div className="flex max-w-lg flex-col items-center gap-3 text-center">
        <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Fundação do repositório
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">
          Cola Cidadã
        </h1>
        <p className="text-muted-foreground">
          Sua cola eleitoral vira controle do mandato. Stack base pronta —
          Next.js, Supabase, Tailwind e shadcn/ui.
        </p>
      </div>
      <Button type="button">Começar em breve</Button>
    </main>
  )
}
