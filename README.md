# Cola-Cidada · Monitor Cidadão

Sua cola eleitoral vira controle do mandato.

Aplicação web que permite ao cidadão cadastrar em quem votou e acompanhar votações nominais, mandato e alertas, usando a **API de Dados Abertos da Câmara dos Deputados**.

## Rodando

Requer apenas Node 18+ (sem dependências):

```bash
npm run dev   # http://localhost:5173
```

## Testes

```bash
npm install
npm test            # unitários (node:test) + navegador (Playwright, desktop e celular)
npm run test:unit   # só lógica, dados e verificações estáticas
```

Os testes de navegador bloqueiam as APIs públicas, então rodam offline e não dependem da Câmara ou do Senado. Com Chromium já instalado, use `PW_CHROMIUM_PATH=/caminho/do/chrome`. O CI (`.github/workflows/ci.yml`) roda tudo a cada PR.

## Arquitetura

- `index.html` + módulos ES nativos (sem bundler) e CSS próprio com tema claro/escuro.
- `src/store.js` — estado no `localStorage`. **Nada é enviado a servidores** (opinião política é dado sensível, LGPD art. 5º, II).
- `src/api.js` / `src/votes.js` — cliente da API da Câmara e cruzamento de votos nominais.
- `src/views/` — Início, Meus Políticos, Comparador, Alertas, Perfil.

## Decisões vs. protótipo original

- Sem dados fictícios: tudo vem do usuário ou da API oficial.
- Sem promessas falsas de criptografia: "Apagar tudo" e "Exportar" funcionam de verdade.
- Datas de mandato corrigidas (deputados até jan/2027; senadores até jan/2027 ou jan/2031).

## Fontes e Integrações Ativas

- **Câmara dos Deputados (`dadosabertos.camara.leg.br`):**
  - Busca oficial e fotos de todos os 513 deputados federais.
  - Votações nominais no Plenário com placar oficial (Sim / Não / Obstrução / Abstenção).
  - Projetos de Lei (PLs) e PECs de autoria do parlamentar, com link direto para a ficha de tramitação.
  - **Auditoria Financeira da Cota Parlamentar (CEAP):** Total acumulado no mandato, maiores categorias de gastos e links diretos para as notas fiscais e comprovantes eletrônicos (DANFE/PDF).
- **Senado Federal (`legis.senado.leg.br`):**
  - Busca oficial e fotos dos 81 senadores da República em exercício por nome ou UF.
  - Votações nominais do Plenário do Senado com resultado oficial e voto individual.
  - Cálculo exato de término do mandato de 8 anos a partir dos dados do Senado.
- **Linguagem Cidadã & Filtros Temáticos:**
  - Síntese descomplicada do impacto das principais votações ("O que significou este voto: Quem votou SIM... Quem votou NÃO...").
  - Filtros temáticos por área (Economia, Tecnologia, Social/Saúde, Meio Ambiente, Segurança).
- **PWA & Funcionamento Offline:**
  - Instalável como aplicativo no celular e desktop (`manifest.webmanifest` e `icon.svg`).
  - `sw.js` (Service Worker) ativo com cache do app shell e estratégia de fallback para dados consultados offline.
  - Botão automático para adicionar à tela inicial no navegador.
- **Alertas Locais no Dispositivo (Push Local):**
  - Integração com a *Web Notifications API* para disparar avisos nativos na barra de notificações quando novas votações nominais forem registradas.
- **Gabinete & Perfil Institucional:**
  - Consulta de nome civil, condição eleitoral (Titular/Suplente), naturalidade e canais de contato público (sala, anexo, telefone e e-mail).
- **Backup & Restauração Local (LGPD):**
  - Exportação e restauração completa de backup em formato JSON para migração entre dispositivos.
  - Expurgo irreversível dos dados locais sob demanda do usuário.
- **Atos do Poder Executivo (Medidas Provisórias):**
  - Radar em tempo real de Medidas Provisórias (MPVs) apresentadas pela Presidência da República que tramitam no Congresso Nacional com força de lei.
  - Esclarecimento cívico sobre os prazos constitucionais de 60 + 60 dias (Art. 62 da CF/88) e links oficiais para acompanhamento.
- **Fiscalização Cívica de Orçamento & "Emendas Pix":**
  - Guia descomplicado sobre Emendas Individuais de Transferência Especial (Emendas Pix - EC 105/2019) e transferências diretas para prefeituras.
  - Atalhos diretos para fiscalização cidadã no Portal da Transparência da CGU e no Painel Siga Brasil do Senado Federal.
- **Relatório Cívico & Dossiê de Prestação de Contas (PDF):**
  - Emissão instantânea de relatório oficial de mandato diretamente no navegador (`window.print()` e `@media print` otimizado para papel A4 e PDF).
  - Inclui resumo da cota parlamentar (CEAP), notas fiscais recentes, projetos autorais e deliberações em plenário.
  - **Selo Criptográfico SHA-256**: Geração de hash de integridade local via `crypto.subtle.digest` para atestar a fidelidade dos dados abertos na data de emissão.
- **Cards Cívicos para Redes Sociais (Canvas / WhatsApp / Stories):**
  - Geração dinâmica em HTML5 Canvas de cards visuais elegantes (1080x1080) com foto oficial, dados do mandato e posicionamentos de voto.
  - Download em PNG e integração nativa com *Web Share API* para compartilhamento direto no WhatsApp, Telegram e redes sociais.
- **Modo Confronto Direto 1 vs 1:**
  - Matriz de alinhamento entre dois parlamentares quaisquer monitorados.
  - Cálculo automático da taxa de convergência (% de votos coincidentes), matérias onde concordaram vs onde divergiram e geração de card de confronto.
- **Deputados Estaduais/Distritais e Vereadores de Capitais (dados reais do TSE):**
  - Os 27 rosters de assembleias (1.059 eleitos em 2022) e as 26 câmaras de capitais (eleitos em 2024) vêm dos dados abertos do TSE (`consulta_cand` e `bem_candidato`), gerados por `scripts/build-regional-data.mjs`.
  - Cada parlamentar traz número de urna, resultado, coligação/federação, patrimônio declarado e link para a ficha no DivulgaCandContas.
  - Limitações: o roster reflete **quem foi eleito**, não o exercício atual (suplentes que assumiram, cassações e afastamentos não aparecem); não há foto, e-mail ou telefone, pois o TSE não os publica.
  - Dados particionados por UF (`/src/data/states/{uf}.json`, `/src/data/capitais/{uf}.json`) e carregados sob demanda.
- **Presença & Fidelidade (deputados federais, API da Câmara):** `src/plenary.js` calcula, sobre as últimas sessões deliberativas e votações nominais do Plenário:
  - presença registrada (`/eventos/{id}/deputados`) e participação em votações nominais (`/votacoes/{id}/votos`);
  - fidelidade = votos iguais à orientação da bancada (`/votacoes/{id}/orientacoes`; usa o partido ou, se ele não orienta sozinho, o bloco/federação). Votações com bancada liberada ou sem orientação publicada não entram na taxa.
  - Limitações: a presença não distingue falta justificada; o cálculo cobre só uma janela recente; para deputados estaduais e vereadores não há dado equivalente implementado. A resolução de blocos abreviados (`Bl UniPpPsd...`) é heurística.
- **Presença & Fidelidade (senadores, API do Senado):** `senatorPlenaryStats` em `src/plenary.js`, sobre as votações nominais do Plenário dos últimos 180 dias (`/votacao` e `/plenario/votacao/orientacaoBancada`):
  - presença nas votações nominais, separando ausências justificadas (licença, missão, atividade parlamentar) de não comparecimento; votos secretos contam como presença;
  - fidelidade à orientação publicada para o partido (votações com bancada liberada ou sem orientação ficam fora da taxa). Poucas votações têm orientação, então a amostra costuma ser pequena e o painel mostra quantas foram medidas.
- **Agenda Legislativa:** próximos eventos oficiais da Câmara (API `/eventos`) na tela inicial.
- **Detecção Inteligente de "Jabutis" & Sumarizador Cívico (Fase 8):**
  - **Scanner de Jabutis (Contrabando Legislativo):** Algoritmo semântico em linguagem natural (*client-side* no navegador, 100% privado e em conformidade estrita com a LGPD) que audita a coerência temática de emendas e artigos de Medidas Provisórias e Projetos de Lei. Emite alertas de risco (*Baixo, Médio, Alto*) e cita a jurisprudência vinculante do STF (ADI 5127).
  - **Sumarizador Didático de Proposições:** Síntese instantânea em linguagem simples explicando: *O que muda na prática*, *Impacto financeiro e orçamentário*, e *Quem ganha e quem paga*.
  - **Simulador Interativo de Texto:** Ferramenta interativa para o cidadão colar qualquer texto de emenda, parágrafo ou artigo de lei e auditar na hora a presença de temas alheios ao núcleo da matéria.
- **Glossário Cívico Interativo:**
  - Dicionário didático embutido com busca rápida para termos legislativos (*Obstrução, Quórum Qualificado, Jabuti, Substitutivo, DVS, MPV, Emendas Pix*).
- **Experiência Cívica & Governança (Fase 9 — Conforme Stitch Design System):**
  - **Onboarding Cívico Interativo:** Fluxo guiado em 3 passos para novos usuários apresentando a privacidade radical da LGPD (Art. 5º, II), a conexão com dados abertos oficiais e o ciclo de auditoria de mandato.
  - **Minha Cola Eleitoral (Cédula Cívica de Mandatos):** Assistente dedicado para preenchimento e vinculação rápida de todos os cargos eletivos (Presidente, Governador, Senadores, Deputados Federais, Estaduais e Vereadores), com visualização do status de preenchimento.
  - **Painel de Governança & Score de Vigilância Cívica:** Termômetro no Perfil que calcula o índice de vigilância do cidadão (0 a 100 pontos) com base na cobertura de mandatos vigiados, deliberações oficiais checadas e auditorias realizadas.
  - **Floating Action Button (FAB MD3):** Botão flutuante de ação rápida posicionado na interface para seguir novos representantes ou auditar votações instantaneamente de qualquer tela.
- **Conformidade 100% Google Material Design 3 (M3) & Tipografia Actor:**
  - **Tipografia Actor (Thomas Junold):** Adoção completa e irrestrita da fonte **Actor** (`https://fonts.googleapis.com/css2?family=Actor&display=swap`) em toda a hierarquia visual (Display, Headline, Title, Body, Label).
  - **Paleta Tonal M3 (`md-sys-color-*`):** Cores tonais dinâmicas adaptativas (Verde Cívico tonal 40/80, Azul Federal tonal 40/80, Ouro República tonal 40/80) com transição fluida entre Tema Claro e Tema Escuro (*Dark Mode*).
  - **Superfícies & Elevações Tonais:** Camadas de superfície escalonadas (`surface-container-lowest` até `highest`) e elevações padronizadas M3 (níveis 0 a 5).
  - **Formas & Raios M3 (`md-sys-shape-*`):** Cantos de 28px para diálogos e modais, 16px para cards e FAB, 8px para inputs e chips, e 9999px (pílula total) para botões e indicadores ativos.
  - **Componentes Nativos M3:** Top App Bar (64px), Extended Floating Action Button (FAB), Navigation Rail no desktop, Navigation Bar em pílula no mobile e Switches com trilho e thumb no padrão Material You.





## Interação e acessibilidade

- **Diálogos:** entram e saem pelo mesmo caminho, fecham com Esc, prendem o foco e devolvem-no ao botão que os abriu. Em telas estreitas viram folha inferior que pode ser arrastada para baixo para fechar (acompanha o dedo, resiste para cima, projeta a inércia e anima com mola — `src/motion.js`).
- **Materiais:** cabeçalho e barra inferior translúcidos, com divisória só quando há conteúdo rolando por baixo.
- **Feedback:** resposta no pressionar; hover só em dispositivos com ponteiro; remover político pode ser desfeito pelo snackbar.
- **Preferências do sistema:** tema segue `prefers-color-scheme` até o usuário escolher; `prefers-reduced-motion` troca deslizamentos por crossfade; `prefers-reduced-transparency` e `prefers-contrast` deixam as superfícies sólidas e com contornos fortes.

## Dados que NÃO são exibidos (por falta de fonte implementada)

Atuação como relator e financiamento de campanha foram removidos: eram valores simulados (fonte possível: prestação de contas do TSE). Presença e fidelidade existem para deputados federais e senadores (não para deputados estaduais e vereadores).

## Atualizando os dados regionais

```bash
# baixar e extrair consulta_cand_{2022,2024}.zip e bem_candidato_{2022,2024}.zip de
# https://cdn.tse.jus.br/estatistica/sead/odsele/{consulta_cand,bem_candidato}/
node scripts/build-regional-data.mjs <cand2022> <cand2024> <bem2022> <bem2024>
```
