import { store } from '../store.js';
import {
  deputyPropositions,
  deputyExpenses,
  deputyProfile,
  senatorVotes,
  getTseElectoralProfile,
} from '../api.js';
import { ROLES, avatar, esc, mandateProgress, modal, fmtDate, VOTE_CLASS, brl, toast } from '../ui.js';
import { deputyPlenaryStats, senatorPlenaryStats } from '../plenary.js';
import { plenaryPanelHtml } from './plenaryPanel.js';
import { openPoliticianModal } from './addPolitician.js';
import { openDossierModal } from '../dossier.js';
import { openShareModal } from '../share.js';
import { openAnalysisModal } from '../analysis.js';
import { openColaEleitoralModal } from './colaEleitoral.js';

export function politicianCard(p) {
  const isState =
    p.source === 'alesp' ||
    p.source === 'alerj' ||
    p.source === 'almg' ||
    p.roleKey === 'dep-estadual' ||
    (typeof p.source === 'string' && p.source.startsWith('al-'));
  const isCouncilor =
    p.source === 'cmsp' ||
    p.roleKey === 'vereador' ||
    (typeof p.source === 'string' && p.source.startsWith('cm-'));
  const isSenator = p.source === 'senado' || p.roleKey === 'senador';
  const isDeputy = p.source === 'camara' || p.roleKey === 'dep-federal';

  const sourceLabel =
    p.source === 'camara'
      ? 'Câmara Federal'
      : p.source === 'senado'
      ? 'Senado Federal'
      : isState
      ? (p.house ? p.house.split('(')[0].trim() : `AL (${p.uf || 'Est.'})`)
      : isCouncilor
      ? (p.house ? (p.house.includes('(') ? p.house.split('(')[0].trim() : p.house) : `Câmara (${p.city || p.uf || 'Mun.'})`)
      : 'Executivo / Outro';

  const sourceChipClass =
    p.source === 'camara'
      ? 'green'
      : p.source === 'senado'
      ? 'blue'
      : isState
      ? 'purple'
      : isCouncilor
      ? 'teal'
      : 'gold';

  const m = mandateProgress(p);

  return `
  <article class="card stack pol-card u-gap-14 u-position-relative">
    <!-- Header do Card com Avatar e Dados -->
    <div class="pol-head">
      <div class="avatar-wrap">
        ${avatar(p)}
        <span class="avatar-badge-icon" title="Mandato Monitorado">
          <span class="mi u-fs-11">check</span>
        </span>
      </div>
      <div class="pol-head-text">
        <h3 class="h2 u-fs-15_5 u-fw-700">${esc(p.name)}</h3>
        <span class="sm muted u-d-block u-mt-2">
          ${ROLES[p.roleKey]?.label || 'Parlamentar'} • ${esc(p.uf || 'BR')}
        </span>
        <div class="row u-gap-6 u-mt-8">
          <span class="chip ${sourceChipClass} xs">${esc(p.party || '—')}</span>
          <span class="chip ${sourceChipClass} xs">${sourceLabel}</span>
        </div>
      </div>
    </div>

    <!-- Barra de Mandato com Anos e Percentual -->
    <div>
      <div class="row between xs muted u-fw-600">
        <span>Mandato: ${m.end ? `Término em ${m.end}` : 'Em curso'}</span>
        <b class="u-c-text">${m.pct}% cumprido</b>
      </div>
      <div class="bar u-m-6-0 u-height-7">
        <i data-w="${m.pct}"></i>
      </div>
      <div class="row between xs muted">
        <span>${m.label}</span>
      </div>
    </div>

    <!-- Ações do Card -->
    <div class="card-actions">
      <button class="btn primary sm" data-details="${p.id}">
        <span class="mi u-fs-16">analytics</span>
        <span>Auditar Mandato</span>
      </button>
      <div class="icon-group">
      <button class="btn outlined sm icon" data-dossier="${p.id}" title="Gerar Dossiê Oficial em PDF" aria-label="Relatório PDF">
        <span class="mi u-fs-16">description</span>
      </button>
      <button class="btn outlined sm icon" data-share="${p.id}" title="Gerar Card Visual para WhatsApp / Redes" aria-label="Card para Redes">
        <span class="mi u-fs-16">share</span>
      </button>
      <button class="btn outlined sm icon" data-replace="${p.id}" title="Substituir político" aria-label="Substituir">
        <span class="mi u-fs-16">swap_horiz</span>
      </button>
      <button class="btn danger sm icon" data-remove="${p.id}" title="Parar de monitorar" aria-label="Remover">
        <span class="mi u-fs-16">delete</span>
      </button>
      </div>
    </div>
  </article>`;
}

async function openPoliticianDetails(p) {
  const isDeputy = p.source === 'camara' || p.roleKey === 'dep-federal';
  const isSenator = p.source === 'senado' || p.roleKey === 'senador';
  const isCouncilor =
    p.source === 'cmsp' ||
    p.roleKey === 'vereador' ||
    (typeof p.source === 'string' && p.source.startsWith('cm-'));
  const isState =
    p.source === 'alesp' ||
    p.source === 'alerj' ||
    p.source === 'almg' ||
    p.roleKey === 'dep-estadual' ||
    (typeof p.source === 'string' && p.source.startsWith('al-'));
  const tse = getTseElectoralProfile(p);
  const m = mandateProgress(p);

  const { el, close } = modal(`
    <!-- Cabeçalho do Modal no Estilo Stitch -->
    <div class="stack u-gap-14">
      <div class="row between nowrap">
        <div class="row nowrap u-gap-14">
          <div class="avatar-wrap">
            ${avatar(p)}
            <span class="avatar-badge-icon">
              <span class="mi u-fs-11">verified</span>
            </span>
          </div>
          <div>
            <div class="row u-gap-6">
              <h3 class="h2 u-fs-18 u-fw-800">${esc(p.name)}</h3>
              <span class="chip green xs">${esc(p.party || '—')}</span>
            </div>
            <span class="sm muted">${ROLES[p.roleKey]?.label || ''} • ${esc(p.uf || 'BR')}</span>
          </div>
        </div>
        <button class="btn icon ghost" data-close aria-label="Fechar"><span class="mi">close</span></button>
      </div>

      <!-- Barra de Mandato & Badges Superiores -->
      <div class="card soft stack u-gap-8 u-p-12">
        <div class="row between sm">
          <span>Mandato: <b>${m.end || 'Em exercício'}</b></span>
          <b class="u-c-primary">${m.pct}% concluído</b>
        </div>
        <div class="bar u-height-7"><i data-w="${m.pct}"></i></div>
        <div class="row u-gap-8 u-mt-4">
        </div>
      </div>
    </div>

    <!-- Navegação de Abas MD3 -->
    <div class="tabs u-ovx-auto u-maxw-100pct u-white-space-nowrap u-p-4" id="pol-tabs">
      ${
        isDeputy
          ? `
        <button class="on" data-tab="gastos">Auditoria CEAP (Gastos)</button>
        <button data-tab="projetos">Projetos de Lei (PLs)</button>
        <button data-tab="perfil">Gabinete Oficial</button>
        <button data-tab="plenario">Presença & Fidelidade</button>
      `
          : isSenator
          ? `
        <button class="on" data-tab="senado">Votações no Senado</button>
        <button data-tab="plenario">Presença & Fidelidade</button>
      `
          : `
        <button class="on" data-tab="local">${isCouncilor ? 'Mandato Municipal' : 'Mandato Estadual'}</button>
      `
      }
      <button data-tab="tse">Ficha Eleitoral & TSE</button>
    </div>

    <!-- ABA 1: Gastos CEAP (Deputados) -->
    ${
      isDeputy
        ? `
      <div id="tab-gastos" class="stack pol-pane u-mt-4">
        <div class="row"><span class="spin"></span><span class="muted">Auditando cota parlamentar (CEAP)…</span></div>
      </div>
      <div id="tab-projetos" class="stack pol-pane hidden u-mt-4">
        <div class="row"><span class="spin"></span><span class="muted">Consultando projetos de lei…</span></div>
      </div>
      <div id="tab-perfil" class="stack pol-pane hidden u-mt-4">
        <div class="row"><span class="spin"></span><span class="muted">Consultando dados do gabinete oficial…</span></div>
      </div>
      <div id="tab-plenario" class="stack pol-pane hidden u-mt-4">
        <div class="row"><span class="spin"></span><span class="muted">Calculando presença e fidelidade a partir das sessões e votações oficiais…</span></div>
      </div>
    `
        : isSenator
        ? `
      <div id="tab-senado" class="stack pol-pane u-mt-4">
        <div class="row"><span class="spin"></span><span class="muted">Carregando votações nominais no Senado…</span></div>
      </div>
      <div id="tab-plenario" class="stack pol-pane hidden u-mt-4">
        <div class="row"><span class="spin"></span><span class="muted">Calculando presença e fidelidade a partir das votações oficiais do Senado…</span></div>
      </div>
    `
        : `
      <div id="tab-local" class="stack pol-pane u-mt-4">
        <div class="card soft stack u-gap-10 u-p-14">
          <div class="row between">
            <span class="chip ${isCouncilor ? 'teal' : 'purple'}">${esc(p.house || 'Casa Legislativa')}</span>
            <span class="sm muted">Situação: ${esc(p.situacao || 'Em Exercício')}</span>
          </div>
          <div>
            <span class="xs muted u-tt-uppercase u-fw-700">Nome Parlamentar</span>
            <p class="u-fw-700 u-fs-15">${esc(p.name)}</p>
          </div>
          ${
            p.baseEleitoral
              ? `<div>
                <span class="xs muted u-tt-uppercase u-fw-700">Base Eleitoral & Cidades / Bairros</span>
                <p class="u-fs-13 u-lh-1_4">${esc(p.baseEleitoral)}</p>
              </div>`
              : ''
          }
          ${
            p.areaAtuacao
              ? `<div>
                <span class="xs muted u-tt-uppercase u-fw-700">Áreas de Atuação Principal</span>
                <p class="u-fs-13 u-lh-1_4">${esc(p.areaAtuacao)}</p>
              </div>`
              : ''
          }
        </div>

        <div class="card soft stack u-gap-10 u-p-14">
          <span class="sm muted u-fw-600">Gabinete Oficial e Contatos:</span>
          <div class="grid u-cols-1fr-1fr u-gap-8">
            <div class="stat u-p-10">
              <span>Localização</span>
              <b class="u-fs-13">${esc(p.room || 'Gabinete')}</b>
              <span class="xs muted">${esc(p.house || '')}</span>
            </div>
            <div class="stat u-p-10">
              <span>Telefone</span>
              <b class="u-fs-13">${esc(p.phone || 'Contato')}</b>
              <span class="xs muted">Canal aberto ao cidadão</span>
            </div>
          </div>
          ${
            p.email
              ? `
            <div class="row between sm u-bg-s2 u-p-8-12 u-br-r-sm">
              <span class="muted">E-mail Parlamentar:</span>
              <a href="mailto:${esc(p.email)}" class="u-fw-600">${esc(p.email)}</a>
            </div>`
              : ''
          }
          ${
            p.pageUrl
              ? `
            <div class="row u-mt-4">
              <a href="${esc(p.pageUrl)}" target="_blank" rel="noopener noreferrer" class="btn primary sm u-width-100pct u-jc-center">
                <span>Página Oficial na Casa Legislativa</span><span class="mi u-fs-15">open_in_new</span>
              </a>
            </div>`
              : ''
          }
        </div>
      </div>
    `
    }

    <!-- ABA TSE & ELEITORAL -->
    <div id="tab-tse" class="stack pol-pane hidden u-mt-4">
      <div class="card soft stack u-gap-12 u-p-16">
        <div class="row between">
          <span class="chip green">Registro Eleitoral Oficial no TSE (DivulgaCandContas)</span>
          <span class="xs muted">${esc(tse.status || '')}</span>
        </div>
        ${
          tse.available
            ? `
        <div class="grid u-cols-1fr-1fr u-gap-8">
          <div class="stat u-p-10">
            <span>Número na Urna</span>
            <b class="u-fs-20 u-c-primary">${esc(tse.ballotNumber)}</b>
            <span class="xs muted">Eleição de ${tse.electionYear} • ${esc(p.party || '')}</span>
          </div>
          <div class="stat u-p-10">
            <span>Patrimônio Declarado</span>
            <b class="u-fs-18">${tse.declaredAssets != null ? brl(tse.declaredAssets) : 'Não declarado'}</b>
            <span class="xs muted">Bens declarados no registro de candidatura</span>
          </div>
        </div>
        <div class="row between sm u-bg-s2 u-p-8-12 u-br-r-sm">
          <span class="muted">Coligação / Federação:</span>
          <b>${esc(tse.electoralCoalition || (tse.isolatedParty ? 'Partido isolado' : '—'))}</b>
        </div>`
            : `
        <p class="sm muted">Os dados eleitorais deste mandato não estão carregados localmente. Consulte a ficha oficial no TSE.</p>`
        }
        <p class="xs muted">Prestação de contas de campanha (arrecadação e doadores): consulte a ficha oficial no TSE.</p>
        <div class="row u-mt-4">
          <a href="${esc(tse.tseUrl)}" target="_blank" rel="noopener noreferrer" class="btn primary sm u-width-100pct u-jc-center">
            <span>Consultar Ficha Eleitoral no TSE (DivulgaCandContas)</span><span class="mi u-fs-15">open_in_new</span>
          </a>
        </div>
      </div>
    </div>
  `);

  // Alternância de abas do modal
  const tabs = el.querySelectorAll('#pol-tabs button');
  el.querySelector('#pol-tabs')?.setAttribute('role', 'tablist');
  tabs.forEach((btn) => {
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', String(btn.classList.contains('on')));
    btn.onclick = () => {
      tabs.forEach((b) => {
        b.classList.remove('on');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('on');
      btn.setAttribute('aria-selected', 'true');
      btn.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      const targetTab = btn.dataset.tab;
      el.querySelectorAll('.pol-pane').forEach((p) => p.classList.add('hidden'));
      const activePane = el.querySelector(`#tab-${targetTab}`);
      if (activePane) activePane.classList.remove('hidden');
    };
  });

  if (isDeputy) {
    const paneGastos = el.querySelector('#tab-gastos');
    const paneProjetos = el.querySelector('#tab-projetos');
    const panePerfil = el.querySelector('#tab-perfil');
    const panePlenario = el.querySelector('#tab-plenario');

    // Presença e fidelidade (carrega em paralelo, sem bloquear as demais abas)
    deputyPlenaryStats(p.camaraId)
      .then((stats) => (panePlenario.innerHTML = plenaryPanelHtml(stats)))
      .catch((err) => (panePlenario.innerHTML = `<p class="muted">Não foi possível calcular agora: ${esc(err.message)}</p>`));

    // 1. Carrega Gastos CEAP
    try {
      const expenses = await deputyExpenses(p.camaraId, 80);
      if (!expenses.length) {
        paneGastos.innerHTML = '<p class="muted">Nenhum reembolso da cota parlamentar registrado nesta legislatura.</p>';
      } else {
        const total = expenses.reduce((acc, x) => acc + (x.value || 0), 0);
        const categories = {};
        for (const x of expenses) {
          categories[x.type] = (categories[x.type] || 0) + (x.value || 0);
        }
        const topCategories = Object.entries(categories)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4);

        paneGastos.innerHTML = `
          <div class="card soft row between u-p-14 u-bg-primary-soft">
            <div>
              <span class="xs muted u-tt-uppercase u-fw-700">Soma dos Reembolsos Consultados</span>
              <h2 class="u-fs-22 u-c-primary u-fw-800 u-mt-2">${brl(total)}</h2>
              <span class="xs muted">Base: Últimos ${expenses.length} reembolsos registrados na Câmara</span>
            </div>
            <span class="chip green">57ª Legislatura</span>
          </div>

          <div>
            <span class="sm muted u-fw-700">Principais Áreas de Despesa:</span>
            <div class="stack u-gap-6 u-mt-6">
              ${topCategories
                .map(
                  ([cat, val]) => `
                <div class="row between sm u-bg-s2 u-p-6-12 u-br-r-sm">
                  <span class="muted truncate u-maxw-240">${esc(cat)}</span>
                  <b>${brl(val)}</b>
                </div>`
                )
                .join('')}
            </div>
          </div>

          <div class="row between u-mt-6">
            <span class="sm muted u-fw-700">Notas Fiscais e Recibos Recentes:</span>
            <span class="xs muted">Fonte: Câmara dos Deputados</span>
          </div>

          <div class="stack u-gap-8 u-maxh-40vh u-ovy-auto u-pr-4">
            ${expenses
              .slice(0, 20)
              .map((ex) => {
                const isHigh = (ex.value || 0) >= 3000;
                return `
                <div class="card soft stack u-gap-4 u-p-10 ${isHigh ? 'u-bl-3-solid-tertiary' : 'u-bl-none'}">
                  <div class="row between">
                    <span class="sm u-fw-600">${esc(ex.supplier || 'Fornecedor')}</span>
                    <b class="${isHigh ? 'u-c-tertiary' : 'u-c-text'}">${brl(ex.value || 0)}</b>
                  </div>
                  <div class="row between xs muted">
                    <span class="truncate u-maxw-260">${esc(ex.type)}</span>
                    <span>${fmtDate(ex.date)}</span>
                  </div>
                  ${
                    ex.receiptUrl
                      ? `<div class="row u-mt-4">
                      <a href="${esc(
                        ex.receiptUrl
                      )}" target="_blank" rel="noopener noreferrer" class="xs u-fw-600 u-d-inline-flex u-ai-center u-gap-4">
                        <span class="mi u-fs-14">receipt_long</span><span>Ver Nota Fiscal / Comprovante</span>
                      </a>
                    </div>`
                      : ''
                  }
                </div>`;
              })
              .join('')}
          </div>
        `;
      }
    } catch (err) {
      paneGastos.innerHTML = `<p class="muted">Erro ao carregar despesas CEAP: ${esc(err.message)}</p>`;
    }

    // 2. Carrega Projetos de Lei
    try {
      const projects = await deputyPropositions(p.camaraId, 10);
      if (!projects.length) {
        paneProjetos.innerHTML = '<p class="muted">Nenhuma proposição autoral recente encontrada.</p>';
      } else {
        paneProjetos.innerHTML = `
          <div class="stack u-gap-10 u-maxh-55vh u-ovy-auto u-pr-4">
            ${projects
              .map(
                (item, idx) => `
              <div class="card soft stack u-gap-6 u-p-12">
                <div class="row between">
                  <span class="chip blue">${esc(item.type)} ${esc(item.number)}/${esc(item.year)}</span>
                  <span class="xs muted">${fmtDate(item.date)}</span>
                </div>
                <p class="u-fs-13 u-lh-1_4">${esc(item.summary)}</p>
                <div class="row between u-mt-4">
                  <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="sm u-fw-600 u-d-inline-flex u-ai-center u-gap-4">
                    <span>Ficha oficial de tramitação</span><span class="mi u-fs-14">open_in_new</span>
                  </a>
                  <button class="btn ghost sm btn-analyze-proj u-p-4-8 u-fs-11_5" data-index="${idx}">
                    <span class="mi u-fs-14 u-c-primary">psychology</span>
                    <span>Scanner de Jabutis</span>
                  </button>
                </div>
              </div>`
              )
              .join('')}
          </div>
        `;

        paneProjetos.querySelectorAll('.btn-analyze-proj').forEach((b) => {
          b.onclick = () => {
            const idx = parseInt(b.dataset.index, 10);
            if (projects[idx]) openAnalysisModal(projects[idx]);
          };
        });
      }
    } catch (err) {
      paneProjetos.innerHTML = `<p class="muted">Erro ao carregar projetos: ${esc(err.message)}</p>`;
    }

    // 3. Carrega Perfil e Gabinete Oficial
    try {
      const prof = await deputyProfile(p.camaraId);
      panePerfil.innerHTML = `
        <div class="card soft stack u-gap-10 u-p-14">
          <div class="row between">
            <span class="chip green">Registro Institucional Oficial</span>
            <span class="xs muted">${esc(prof.status)}</span>
          </div>
          <div>
            <span class="xs muted u-tt-uppercase u-fw-700">Nome Civil Completo</span>
            <p class="u-fw-700 u-fs-14">${esc(prof.civilName)}</p>
          </div>
          <div class="row between sm">
            <div><span class="muted">Condição:</span> <b>${esc(prof.electoralCondition)}</b></div>
            <div><span class="muted">Escolaridade:</span> <b>${esc(prof.schooling)}</b></div>
          </div>
        </div>

        ${
          prof.cabinet
            ? `
        <div class="card soft stack u-gap-10 u-p-14">
          <span class="sm muted u-fw-700">Gabinete em Brasília:</span>
          <div class="grid u-cols-1fr-1fr u-gap-8">
            <div class="stat u-p-10">
              <span>Localização</span>
              <b class="u-fs-13">Anexo ${esc(prof.cabinet.building)}, Sala ${esc(prof.cabinet.room)}</b>
              <span class="xs muted">${esc(prof.cabinet.floor)}º Andar</span>
            </div>
            <div class="stat u-p-10">
              <span>Telefone</span>
              <b class="u-fs-13">(61) ${esc(prof.cabinet.phone || '3215-5000')}</b>
            </div>
          </div>
          ${
            prof.cabinet.email
              ? `
          <div class="row between sm u-bg-s2 u-p-8-12 u-br-r-sm">
            <span class="muted">E-mail Institucional:</span>
            <a href="mailto:${esc(prof.cabinet.email)}" class="u-fw-600">${esc(prof.cabinet.email)}</a>
          </div>`
              : ''
          }
        </div>`
            : ''
        }
      `;
    } catch (err) {
      panePerfil.innerHTML = `<p class="muted">Erro ao carregar dados do gabinete: ${esc(err.message)}</p>`;
    }
  } else if (isSenator) {
    const paneSenator = el.querySelector('#tab-senado');
    const panePlenario = el.querySelector('#tab-plenario');
    senatorPlenaryStats(p.senadoId)
      .then((stats) => (panePlenario.innerHTML = plenaryPanelHtml(stats)))
      .catch((err) => (panePlenario.innerHTML = `<p class="muted">Não foi possível calcular agora: ${esc(err.message)}</p>`));
    try {
      const votes = await senatorVotes(p.senadoId, 12);
      if (!votes.length) {
        paneSenator.innerHTML = '<p class="muted">Nenhum registro recente de votação encontrado para este senador.</p>';
      } else {
        paneSenator.innerHTML = `
          <div class="row between">
            <span class="chip blue">Histórico de Votações Nominais</span>
            <span class="xs muted">Fonte: API Senado Federal</span>
          </div>
          <div class="stack u-gap-10 u-maxh-55vh u-ovy-auto u-pr-4">
            ${votes
              .map(
                (v) => `
              <div class="card soft stack u-gap-6 u-p-12">
                <div class="row between">
                  <span class="chip blue">${esc(v.matter)}</span>
                  <span class="vote ${VOTE_CLASS[v.vote] || ''}">${esc(v.vote)}</span>
                </div>
                <p class="u-fs-13 u-fw-500 u-lh-1_4">${esc(v.summary || 'Deliberação no Plenário')}</p>
                <div class="row between xs muted">
                  <span>Resultado: <b>${esc(v.result || 'Concluído')}</b></span>
                  <span>${fmtDate(v.date)}</span>
                </div>
              </div>`
              )
              .join('')}
          </div>
        `;
      }
    } catch (err) {
      paneSenator.innerHTML = `<p class="muted">Erro ao carregar dados do Senado: ${esc(err.message)}</p>`;
    }
  }
}

export function bindPoliticianActions(root) {
  root.querySelectorAll('[data-replace]').forEach((b) => {
    b.onclick = () => openPoliticianModal({ replaceId: b.dataset.replace });
  });

  root.querySelectorAll('[data-remove]').forEach((b) => {
    b.onclick = () => {
      const list = store.get().politicians;
      const index = list.findIndex((x) => x.id === b.dataset.remove);
      if (index < 0) return;
      const removed = list[index];
      store.removePolitician(removed.id);
      toast(`${removed.name} removido do monitoramento.`, 'delete', {
        action: {
          label: 'Desfazer',
          onClick: () => {
            const now = store.get().politicians;
            if (now.some((x) => x.id === removed.id)) return;
            store.set({ politicians: [...now.slice(0, index), removed, ...now.slice(index)] });
          },
        },
      });
    };
  });

  root.querySelectorAll('[data-details]').forEach((b) => {
    b.onclick = () => {
      const p = store.get().politicians.find((x) => x.id === b.dataset.details);
      if (p) openPoliticianDetails(p);
    };
  });

  root.querySelectorAll('[data-dossier]').forEach((b) => {
    b.onclick = () => {
      const p = store.get().politicians.find((x) => x.id === b.dataset.dossier);
      if (p) openDossierModal(p);
    };
  });

  root.querySelectorAll('[data-share]').forEach((b) => {
    b.onclick = () => {
      const p = store.get().politicians.find((x) => x.id === b.dataset.share);
      if (p) {
        const m = mandateProgress(p);
        openShareModal({
          politician: p,
          title: 'Fiscalização de Mandato',
          highlight: `Mandato em exercício • ${p.party || ''}/${p.uf || 'BR'}`,
          badge: 'MONITOR CIDADÃO',
          badgeColor: '#008732',
          detailText: `Término previsto: ${m.end}`,
        });
      }
    };
  });
}

export function render(root) {
  const { politicians } = store.get();
  root.innerHTML = `
    <div class="top">
      <div>
        <h1>Meus Políticos</h1>
        <p>Representantes cadastrados para fiscalização ativa com dados abertos da Câmara dos Deputados, Senado e Assembleias.</p>
      </div>
      <div class="row">
        <button class="btn outlined" id="btn-open-cola-pol"><span class="mi">how_to_vote</span>Minha Cola Eleitoral</button>
        <button class="btn primary" id="add"><span class="mi">person_add</span>Seguir Novo Político</button>
      </div>
    </div>
    ${
      politicians.length
        ? `<div class="grid g3">${politicians.map(politicianCard).join('')}</div>`
        : `
      <div class="card empty">
        <span class="mi">how_to_vote</span>
        <h3>Nenhum representante monitorado</h3>
        <p>Cadastre deputados federais, senadores, deputados estaduais ou governadores para fiscalizar seus mandatos com dados oficiais.</p>
      </div>`
    }
  `;
  root.querySelector('#add').onclick = () => openPoliticianModal();
  const btnCola = root.querySelector('#btn-open-cola-pol');
  if (btnCola) btnCola.onclick = () => openColaEleitoralModal();
  bindPoliticianActions(root);
}
