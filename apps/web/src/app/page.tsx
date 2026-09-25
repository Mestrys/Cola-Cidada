import { Button } from '@/components/ui/button'

/**
 * Página raiz mínima — valida Material Design 3 + Google Sans Flex + Button.
 */
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-16">
      <div className="flex max-w-lg flex-col items-center gap-4 text-center">
        <h1 className="md-display-small text-md-on-surface text-balance">
          Cola Cidadã
        </h1>
        <p className="md-title-large text-md-on-surface text-pretty">
          Sua cola eleitoral vira controle do mandato
        </p>
        <p className="md-body-large text-md-on-surface-variant text-pretty">
          Fundação do repositório com Material Design 3 e tipografia Google Sans
          Flex. Features de negócio vêm nas próximas sessões.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button type="button">Começar em breve</Button>
        <Button type="button" variant="outline">
          Saiba mais
        </Button>
        <Button type="button" variant="tonal">
          Material 3
        </Button>
      </div>
    </main>
  )
}
