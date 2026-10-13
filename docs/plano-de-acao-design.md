# Plano de ação — design, conteúdo e qualidade

Pendências levantadas na varredura de design (outubro/2026). As que já foram feitas estão no PR #3; este plano cobre o que ficou.

Ordem sugerida: **P0** antes do deploy, **P1** logo em seguida, **P2** quando houver tempo.

## P0 — antes do deploy

### 1. Confirmar os dados da empresa no rodapé
- **Problema:** o rodapé mostra CNPJ 68.027.889/0001-34 (dígitos verificadores válidos), endereço na Rua Pais Leme, 215, dois telefones e `contato@mestrys.com.br`. Não há como confirmar daqui se são os dados reais da Mestry's Tecnologia.
- **Ação:** a empresa confirma cada dado. O que não for real sai do rodapé.
- **Esforço:** minutos. **Quem decide:** a empresa.

### 2. Conteúdo editorial gerado por palavras-chave
- **Problema:** dois recursos geram textos que parecem análise do caso específico, mas são frases prontas escolhidas por palavras-chave.
  - `src/analysis.js` (Sumário, "Impacto financeiro", "Quem ganha e quem paga", Scanner de Jabutis): o mesmo parágrafo genérico aparece para qualquer proposição do mesmo tema. Já ganhou um aviso de "estimativa automática".
  - `src/votes.js` (`getCitizenExplanation`, "Linguagem Cidadã"): textos fixos de "Votou SIM para…/Votou NÃO…" que atribuem motivações ao voto. Num app apartidário, isso é posicionamento editorial.
- **Opções:**
  - (a) Manter, com o aviso visível também na Linguagem Cidadã e redação revisada por alguém com critério editorial.
  - (b) Trocar as frases por dados oficiais (ementa, situação da tramitação, link do inteiro teor).
  - (c) Remover os quadros.
- **Recomendação:** (b) para "Impacto/Quem ganha" e (a) para a Linguagem Cidadã, com revisão de cada texto.
- **Esforço:** (a) 1–2 h de código, mais a revisão; (b) cerca de 1 dia.

### 3. Data de início do mandato estadual
- **Problema:** `defaultMandate('dep-estadual')` usa 15/03/2023 a 14/03/2027, que é a regra da ALESP, para todas as assembleias. A maioria começa em 01/02/2023.
- **Efeito:** o percentual cumprido e os dias restantes aparecem errados fora de SP.
- **Ação:** data por UF (SP em 15/03; demais em 01/02), conferida nos regimentos.
- **Esforço:** 1–2 h.

### 4. Domicílio eleitoral ignorado no cadastro
- **Problema:** o store grava `domicile.state`, mas `addPolitician.js` lê `domicile.uf`. O cadastro sempre abre em SP, mesmo com outro estado configurado no Perfil.
- **Ação:** ler `domicile.state`.
- **Esforço:** minutos, mais um teste.

## P1 — logo após o deploy

### 5. Fonte Actor sem negrito real
- **Problema:** a Actor só tem peso 400. Todo `font-weight: 600/700/800` é negrito sintético, borrado e mais largo. Também não há itálico real.
- **Opções:**
  - (a) Actor só em títulos e marca, e uma fonte com pesos reais no corpo (fonte do sistema, Inter, Atkinson Hyperlegible).
  - (b) Manter a Actor e trocar o negrito por tamanho e cor na hierarquia.
- **Recomendação:** (a) com a fonte do sistema no corpo: zero download e melhor legibilidade em textos densos.
- **Esforço:** meio dia, mais revisão visual das telas. **Quem decide:** design/marca.

### 6. Fonte de ícones de cerca de 1 MB
- **Problema:** a Material Symbols é baixada inteira (woff2 de cerca de 975 KB, com quatro eixos variáveis) para uns 60 ícones.
- **Ação:**
  - Listar os ícones usados, inclusive os dinâmicos (`routes`, `TOAST_ICONS`, ícones montados por expressão).
  - Pedir o subconjunto com `&icon_names=` e fixar só os eixos usados (FILL 0..1, wght 400..500).
  - Criar um teste que falha se aparecer um ícone fora da lista.
- **Ganho estimado:** de cerca de 1 MB para menos de 50 KB no primeiro acesso, o que pesa nos dados móveis.
- **Esforço:** meio dia.

### 7. Testes automatizados e CI
- **Problema:** não há testes nem workflow de CI. As verificações deste PR foram scripts manuais em Playwright.
- **Ação:**
  - Versionar os testes de fumaça: abrir cada tela, abas da ficha, folha arrastável, Esc e foco, Desfazer, CSP sem violações.
  - Validar o formato dos JSON de `src/data`.
  - Rodar tudo em GitHub Actions a cada PR.
- **Esforço:** 1 dia.

### 8. Auditoria de contraste (WCAG AA)
- **Problema:** não fiz medição sistemática. Pontos suspeitos:
  - texto `on-surface-variant` sobre `surface-container`;
  - chips roxo e verde-azulado no escuro;
  - textos de 10–11 px.
- **Ação:** rodar axe-core nas cinco telas, nos dois temas, e corrigir os tokens reprovados.
- **Esforço:** meio dia.

## P2 — quando houver tempo

### 9. Tamanhos fixos e 617 estilos inline
- **Problema:** tipografia e espaçamentos em `px` e 617 atributos `style=` espalhados pelas views.
- **Efeitos:**
  - o app ignora o tamanho de fonte configurado no aparelho;
  - a CSP precisa de `'unsafe-inline'` em `style-src`;
  - qualquer ajuste visual vira caça a ocorrências.
- **Ação, por etapas:**
  1. Converter a escala tipográfica e os espaçamentos de `styles.css` para `rem`.
  2. Extrair os padrões repetidos dos `style=` para classes utilitárias (`.stack-sm`, `.label-upper`, `.icon-16`…), uma view por PR, começando por `politicos.js` (109) e `comparador.js` (106).
  3. Quando não sobrar `style=`, tirar `'unsafe-inline'` da CSP.
- **Esforço:** 3–5 dias, em PRs pequenos.

### 10. Cache das estatísticas de presença
- **Problema:** `plenaryDataset()` e `senateDataset()` guardam a promessa pela sessão inteira. As respostas HTTP já expiram em 5 min, mas o conjunto calculado não.
- **Ação:** mesma validade de 5 min, ou recálculo ao tocar em atualizar.
- **Esforço:** 1 h.

### 11. Foto do deputado no card de compartilhamento
- **Problema:** o servidor de fotos da Câmara não envia CORS. O canvas não pode usar a imagem sem ficar bloqueado para exportar, e o card sai sem foto (os senadores funcionam).
- **Opções:**
  - (a) Aceitar e manter as iniciais.
  - (b) Um proxy de imagem próprio, por exemplo uma função no Vercel. Contraria a proposta de não ter servidor.
- **Recomendação:** (a), salvo pedido explícito.

### 12. Atraso no onboarding
- **Problema:** o onboarding abre com `setTimeout(500)` depois da tela. É meio segundo de espera e uma tela que "pula".
- **Ação:** abrir junto da primeira renderização.
- **Esforço:** minutos.

## Resumo

| # | Item | Prioridade | Esforço | Precisa de decisão? |
|---|------|-----------|---------|---------------------|
| 1 | Dados da empresa no rodapé | P0 | minutos | Sim (empresa) |
| 2 | Conteúdo por palavras-chave | P0 | 2 h – 1 dia | Sim (editorial) |
| 3 | Mandato estadual por UF | P0 | 1–2 h | Não |
| 4 | Domicílio no cadastro | P0 | minutos | Não |
| 5 | Fonte com pesos reais | P1 | meio dia | Sim (marca) |
| 6 | Subconjunto da fonte de ícones | P1 | meio dia | Não |
| 7 | Testes e CI | P1 | 1 dia | Não |
| 8 | Contraste WCAG AA | P1 | meio dia | Não |
| 9 | `rem` e fim dos estilos inline | P2 | 3–5 dias | Não |
| 10 | Validade do cache de presença | P2 | 1 h | Não |
| 11 | Foto no card de compartilhamento | P2 | — | Sim |
| 12 | Atraso no onboarding | P2 | minutos | Não |
