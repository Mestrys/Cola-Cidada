# Contribuindo com o Cola Cidadã

Obrigado pelo interesse em contribuir. Este projeto é apartidário e open source: priorizamos clareza, segurança e uso exclusivo de dados públicos oficiais.

## Como abrir um PR

1. Faça um fork (ou clone) e crie um branch a partir de `main`:
   ```bash
   git checkout -b feat/minha-mudanca
   ```
2. Implemente com TypeScript strict, sem `any`.
3. Garanta RLS + policies em qualquer migration nova.
4. Valide inputs com Zod nas fronteiras (API, Server Action, formulário).
5. Rode localmente:
   ```bash
   pnpm install
   pnpm lint
   pnpm test
   pnpm build
   ```
6. Abra o PR com Conventional Commits no título (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).
7. Descreva o problema, a solução e como testar. Mencione impacto em segurança/RLS se houver.

## Padrões de código

- TypeScript `strict`, sem `any`.
- Arquivos em kebab-case; componentes em PascalCase.
- Cliente `admin.ts` (service_role) só em server-side.
- Nunca commitar `.env*`; use `apps/web/.env.example`.
- Siga as regras em `.cursor/rules/` (`security`, `architecture`, `conventions`).

## Testes

```bash
# Suite unitária (Vitest)
pnpm test

# Watch mode (no app web)
pnpm --filter @cola-cidada/web test:watch
```

Coloque testes ao lado do arquivo: `meu-modulo.test.ts`.

## Escopo

Nesta fase o repositório contém apenas a fundação (Next.js, Supabase clients, RLS inicial, tooling). Features de negócio (listagem de políticos, cola, alertas, sync de APIs) entram em PRs dedicados.
