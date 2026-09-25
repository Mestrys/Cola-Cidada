# Cola Cidadã

Sua cola eleitoral vira controle do mandato.

Aplicativo web cívico, **apartidário** e **open source**, que permite ao eleitor registrar em quem votou ("cola eleitoral") e acompanhar, de forma contínua, os atos públicos dos políticos eleitos — votações, proposições, gastos e atos oficiais.

Usa **apenas dados públicos oficiais**. Não há coleta de dados sensíveis do eleitor.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Framework | Next.js 15 (App Router) + TypeScript strict |
| UI | Tailwind CSS + shadcn/ui |
| Banco + Auth | Supabase (Postgres + RLS + Auth email/senha) |
| Validação | Zod |
| Qualidade | ESLint + Prettier + Vitest |
| Deploy | Vercel (CI a partir do GitHub) |
| Pacotes | pnpm workspaces |

## Como rodar localmente

### Pré-requisitos

- Node.js 22+
- [pnpm](https://pnpm.io/) 9+
- [Docker](https://www.docker.com/) (para o Supabase local)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

### Passos

```bash
# 1. Instalar dependências
pnpm install

# 2. Configurar variáveis de ambiente
cp apps/web/.env.example apps/web/.env.local
# Edite apps/web/.env.local com as chaves do `supabase start` (ou do projeto na nuvem)

# 3. Subir o Supabase local (Postgres, Auth, Studio)
supabase start

# 4. Aplicar migrations
pnpm db:reset

# 5. Rodar o app web
pnpm dev
```

App em [http://localhost:3000](http://localhost:3000). Studio do Supabase em geral em [http://localhost:54323](http://localhost:54323).

### Scripts úteis

| Script | Descrição |
| --- | --- |
| `pnpm dev` | Next.js em desenvolvimento |
| `pnpm build` | Build de produção |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier |
| `pnpm test` | Vitest |
| `pnpm db:reset` | `supabase db reset` |
| `pnpm db:push` | `supabase db push` |

## Estrutura de pastas

```
cola-cidada/
├── apps/
│   └── web/                 # Next.js App Router
│       └── src/
│           ├── app/         # rotas (public), (auth), api/
│           ├── components/  # UI (shadcn em components/ui)
│           ├── lib/         # supabase, env, utils
│           └── middleware.ts
├── supabase/
│   ├── migrations/          # SQL versionado
│   ├── seed.sql
│   └── config.toml
├── .cursor/rules/           # regras de segurança e arquitetura
├── package.json             # workspaces + scripts raiz
└── README.md
```

## APIs oficiais (fontes de dados)

- [API Dados Abertos — Câmara dos Deputados](https://dadosabertos.camara.leg.br/swagger/api.html)
- [Dados Abertos — Senado Federal](https://www12.senado.leg.br/dados-abertos)
- [Portal da Transparência — API](https://api.portaldatransparencia.gov.br/)

## Licença

MIT — veja [LICENSE](./LICENSE).

## Contribuindo

Veja [CONTRIBUTING.md](./CONTRIBUTING.md).
