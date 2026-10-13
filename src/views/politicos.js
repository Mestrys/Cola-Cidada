import { store } from '../store.js';
import {
  deputyPropositions,
  deputyExpenses,
  deputyProfile,
  senatorVotes,
  getTseElectoralProfile,
  getParliamentaryAttendance,
  getPartyFidelity,
  getRelatorMatters,
} from '../api.js';
import { ROLES, avatar, esc, mandateProgress, modal, fmtDate, VOTE_CLASS, brl, toast } from '../ui.js';
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

  const att = getParliamentaryAttendance(p);
  const fid = getPartyFidelity(p);

  return `
  <article class="card stack" style="gap:14px; position:relative">
    <!-- Header do Card com Avatar e Dados -->
    <div class="row between nowrap">
      <div class="row nowrap" style="gap:12px">
        <div class="avatar-wrap">
          ${avatar(p)}
          <span class="avatar-badge-icon" title="Mandato Monitorado">
            <span class="mi" style="font-size:11px">check</span>
          </span>
        </div>
        <div>
          <div class="row" style="gap:6px">
            <h3 class="h2" style="font-size:15.5px; font-weight:700">${esc(p.name)}</h3>
            <span class="chip ${sourceChipClass} xs">${esc(p.party || '—')}</span>
          </div>
          <span class="sm muted" style="display:block; margin-top:2px">
            ${ROLES[p.roleKey]?.label || 'Parlamentar'} • ${esc(p.uf || 'BR')}
          </span>
        </div>
      </div>
      <span class="chip ${sourceChipClass}">${sourceLabel}</span>
    </div>

    <!-- Barra de Mandato com Anos e Percentual -->
    <div>
      <div class="row between xs muted" style="font-weight:600">
        <span>Mandato: ${m.end ? `Término em ${m.end}` : 'Em curso'}</span>
        <b style="color:var(--text)">${m.pct}% cumprido</b>
      </div>
      <div class="bar" style="margin:6px 0; height:7px">
        <i style="width:${m.pct}%"></i>
      </div>
      <div class="row between xs muted">
        <span>${m.label}</span>
        <span class="chip ${att.statusClass} xs">${att.attendanceRate}% Assiduidade</span>
      </div>
    </div>

    <!-- Mini-Grid de Métricas Típicas do Stitch -->
    <div class="grid" style="grid-template-columns:1fr 1fr 1fr; gap:8px">
      <div class="stat" style="padding:8px 10px">
        <span style="font-size:10px">Fidelidade</span>
        <b style="font-size:15px; color:var(--primary)">${fid.alignmentRate}%</b>
        <span class="xs muted" style="text-transform:none">com a bancada</span>
      </div>
      <div class="stat" style="padding:8px 10px">
        <span style="font-size:10px">Presença</span>
        <b style="font-size:15px; color:var(--text)">${att.attendanceRate}%</b>
        <span class="xs muted" style="text-transform:none">${att.presences} sessões</span>
      </div>
      <div class="stat" style="padding:8px 10px">
        <span style="font-size:10px">Auditoria</span>
        <b style="font-size:15px; color:var(--text)">${isDeputy ? 'CEAP' : isSenator ? 'CEAPS' : 'Gabinete'}</b>
        <span class="xs muted" style="text-transform:none">Notas ativas</span>
      </div>
    </div>

    <!-- Ações do Card -->
    <div class="row" style="gap:8px; border-top:1px solid var(--line); padding-top:10px">
      <button class="btn primary sm" data-details="${p.id}" style="flex:1">
        <span class="mi" style="font-size:16px">analytics</span>
        <span>Auditar Mandato</span>
      </button>
      <button class="btn outlined sm icon" data-dossier="${p.id}" title="Gerar Dossiê Oficial em PDF" aria-label="Relatório PDF">
        <span class="mi" style="font-size:16px">description</span>
      </button>
      <button class="btn outlined sm icon" data-share="${p.id}" title="Gerar Card Visual para WhatsApp / Redes" aria-label="Card para Redes">
        <span class="mi" style="font-size:16px">share</span>
      </button>
      <button class="btn outlined sm icon" data-replace="${p.id}" title="Substituir político" aria-label="Substituir">
        <span class="mi" style="font-size:16px">swap_horiz</span>
      </button>
      <button class="btn danger sm icon" data-remove="${p.id}" title="Parar de monitorar" aria-label="Remover">
        <span class="mi" style="font-size:16px">delete</span>
      </button>
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
  const att = getParliamentaryAttendance(p);
  const fid = getPartyFidelity(p);
  const relators = getRelatorMatters(p);
  const m = mandateProgress(p);

  const { el, close } = modal(`
    <!-- Cabeçalho do Modal no Estilo Stitch -->
    <div class="stack" style="gap:14px">
      <div class="row between nowrap">
        <div class="row nowrap" style="gap:14px">
          <div class="avatar-wrap">
            ${avatar(p)}
            <span class="avatar-badge-icon">
              <span class="mi" style="font-size:11px">verified</span>
            </span>
          </div>
          <div>
            <div class="row" style="gap:6px">
              <h3 class="h2" style="font-size:18px; font-weight:800">${esc(p.name)}</h3>
              <span class="chip green xs">${esc(p.party || '—')}</span>
            </div>
            <span class="sm muted">${ROLES[p.roleKey]?.label || ''} • ${esc(p.uf || 'BR')}</span>
          </div>
        </div>
        <button class="btn icon ghost" data-close aria-label="Fechar"><span class="mi">close</span></button>
      </div>

      <!-- Barra de Mandato & Badges Superiores -->
      <div class="card soft stack" style="gap:8px; padding:12px">
        <div class="row between sm">
          <span>Mandato: <b>${m.end || 'Em exercício'}</b></span>
          <b style="color:var(--primary)">${m.pct}% concluído</b>
        </div>
        <div class="bar" style="height:7px"><i style="width:${m.pct}%"></i></div>
        <div class="row" style="gap:8px; margin-top:4px">
          <span class="chip green xs"><span class="mi" style="font-size:13px">trending_down</span>Gasto auditado em conformidade</span>
          <span class="chip blue xs"><span class="mi" style="font-size:13px">event_available</span>${att.attendanceRate}% Assiduidade em Plenário</span>
        </div>
      </div>
    </div>

    <!-- Navegação de Abas MD3 -->
    <div class="tabs" id="pol-tabs" style="overflow-x:auto; max-width:100%; white-space:nowrap; padding:4px">
      ${
        isDeputy
          ? `
        <button class="on" data-tab="gastos">Auditoria CEAP (Gastos)</button>
        <button data-tab="projetos">Projetos de Lei (PLs)</button>
        <button data-tab="perfil">Gabinete Oficial</button>
      `
          : isSenator
          ? `
        <button class="on" data-tab="senado">Votações no Senado</button>
      `
          : `
        <button class="on" data-tab="local">${isCouncilor ? 'Mandato Municipal' : 'Mandato Estadual'}</button>
      `
      }
      <button data-tab="attendance">Assiduidade & Fidelidade</button>
      <button data-tab="tse">Ficha Eleitoral & TSE</button>
    </div>

    <!-- ABA 1: Gastos CEAP (Deputados) -->
    ${
      isDeputy
        ? `
      <div id="tab-gastos" class="stack pol-pane" style="margin-top:4px">
        <div class="row"><span class="spin"></span><span class="muted">Auditando cota parlamentar (CEAP)…</span></div>
      </div>
      <div id="tab-projetos" class="stack pol-pane hidden" style="margin-top:4px">
        <div class="row"><span class="spin"></span><span class="muted">Consultando projetos de lei…</span></div>
      </div>
      <div id="tab-perfil" class="stack pol-pane hidden" style="margin-top:4px">
        <div class="row"><span class="spin"></span><span class="muted">Consultando dados do gabinete oficial…</span></div>
      </div>
    `
        : isSenator
        ? `
      <div id="tab-senado" class="stack pol-pane" style="margin-top:4px">
        <div class="row"><span class="spin"></span><span class="muted">Carregando votações nominais no Senado…</span></div>
      </div>
    `
        : `
      <div id="tab-local" class="stack pol-pane" style="margin-top:4px">
        <div class="card soft stack" style="gap:10px; padding:14px">
          <div class="row between">
            <span class="chip ${isCouncilor ? 'teal' : 'purple'}">${esc(p.house || 'Casa Legislativa')}</span>
            <span class="sm muted">Situação: ${esc(p.situacao || 'Em Exercício')}</span>
          </div>
          <div>
            <span class="xs muted" style="text-transform:uppercase; font-weight:700">Nome Parlamentar</span>
            <p style="font-weight:700; font-size:15px">${esc(p.name)}</p>
          </div>
          ${
            p.baseEleitoral
              ? `<div>
                <span class="xs muted" style="text-transform:uppercase; font-weight:700">Base Eleitoral & Cidades / Bairros</span>
                <p style="font-size:13px; line-height:1.4">${esc(p.baseEleitoral)}</p>
              </div>`
              : ''
          }
          ${
            p.areaAtuacao
              ? `<div>
                <span class="xs muted" style="text-transform:uppercase; font-weight:700">Áreas de Atuação Principal</span>
                <p style="font-size:13px; line-height:1.4">${esc(p.areaAtuacao)}</p>
              </div>`
              : ''
          }
        </div>

        <div class="card soft stack" style="gap:10px; padding:14px">
          <span class="sm muted" style="font-weight:600">Gabinete Oficial e Contatos:</span>
          <div class="grid" style="grid-template-columns:1fr 1fr; gap:8px">
            <div class="stat" style="padding:10px">
              <span>Localização</span>
              <b style="font-size:13px">${esc(p.room || 'Gabinete')}</b>
              <span class="xs muted">${esc(p.house || '')}</span>
            </div>
            <div class="stat" style="padding:10px">
              <span>Telefone</span>
              <b style="font-size:13px">${esc(p.phone || 'Contato')}</b>
              <span class="xs muted">Canal aberto ao cidadão</span>
            </div>
          </div>
          ${
            p.email
              ? `
            <div class="row between sm" style="background:var(--s2); padding:8px 12px; border-radius:var(--r-sm)">
              <span class="muted">E-mail Parlamentar:</span>
              <a href="mailto:${esc(p.email)}" style="font-weight:600">${esc(p.email)}</a>
            </div>`
              : ''
          }
          ${
            p.pageUrl
              ? `
            <div class="row" style="margin-top:4px">
              <a href="${esc(p.pageUrl)}" target="_blank" rel="noopener noreferrer" class="btn primary sm" style="width:100%; justify-content:center">
                <span>Página Oficial na Casa Legislativa</span><span class="mi" style="font-size:15px">open_in_new</span>
              </a>
            </div>`
              : ''
          }
        </div>
      </div>
    `
    }

    <!-- ABA TSE & ELEITORAL -->
    <div id="tab-tse" class="stack pol-pane hidden" style="margin-top:4px">
      <div class="card soft stack" style="gap:12px; padding:16px">
        <div class="row between">
          <span class="chip green">Registro Eleitoral Oficial no TSE (DivulgaCandContas)</span>
          <span class="xs muted">${esc(tse.status)}</span>
        </div>
        <div class="grid" style="grid-template-columns:1fr 1fr; gap:8px">
          <div class="stat" style="padding:10px">
            <span>Número na Urna</span>
            <b style="font-size:20px; color:var(--primary)">${esc(tse.ballotNumber)}</b>
            <span class="xs muted">Eleição de ${tse.electionYear} • ${esc(p.party || '')}</span>
          </div>
          <div class="stat" style="padding:10px">
            <span>Patrimônio Declarado</span>
            <b style="font-size:18px">${brl(tse.declaredAssets)}</b>
            <span class="xs muted">Bens declarados na posse</span>
          </div>
        </div>

        <div class="stat" style="padding:12px">
          <div class="row between">
            <span style="font-weight:600">Arrecadação e Prestação de Contas</span>
            <b style="font-size:17px; color:var(--primary)">${brl(tse.totalRaised)}</b>
          </div>
          <div class="bar" style="height:8px; margin:8px 0; display:flex">
            <i style="width:${tse.publicFundPct}%; background:var(--primary)" title="Fundo Eleitoral: ${tse.publicFundPct}%"></i>
            <i style="width:${tse.privateDonationsPct}%; background:var(--secondary)" title="Doações Privadas: ${tse.privateDonationsPct}%"></i>
          </div>
          <div class="row between xs muted">
            <span>Fundo Público (FEFC): <b>${tse.publicFundPct}%</b></span>
            <span>Doações Privadas / PIX: <b>${tse.privateDonationsPct}%</b></span>
          </div>
        </div>

        <div class="row between sm" style="background:var(--s2); padding:8px 12px; border-radius:var(--r-sm)">
          <span class="muted">Coligação / Federação:</span>
          <b>${esc(tse.electoralCoalition)}</b>
        </div>

        <div class="row" style="margin-top:4px">
          <a href="${esc(tse.tseUrl)}" target="_blank" rel="noopener noreferrer" class="btn primary sm" style="width:100%; justify-content:center">
            <span>Consultar Ficha Eleitoral no TSE (DivulgaCandContas)</span><span class="mi" style="font-size:15px">open_in_new</span>
          </a>
        </div>
      </div>
    </div>

    <!-- ABA ASSIDUIDADE & FIDELIDADE -->
    <div id="tab-attendance" class="stack pol-pane hidden" style="margin-top:4px">
      <!-- 1. Presença em Plenário -->
      <div class="card soft stack" style="gap:12px; padding:16px">
        <div class="row between">
          <span class="chip ${att.statusClass}">Presença em Plenário & Comissões</span>
          <span class="sm" style="font-weight:700">${esc(att.status)}</span>
        </div>

        <div class="grid" style="grid-template-columns:1fr 1fr; gap:8px">
          <div class="stat" style="padding:10px">
            <span>Taxa de Presença</span>
            <b style="font-size:22px; color:var(--primary)">${att.attendanceRate}%</b>
            <span class="xs muted">${att.presences} de ${att.totalSessions} sessões</span>
          </div>
          <div class="stat" style="padding:10px">
            <span>Faltas Justificadas</span>
            <b style="font-size:20px">${att.justifiedAbsences}</b>
            <span class="xs muted">Com atestado / missão oficial</span>
          </div>
        </div>

        <div class="stat" style="padding:12px">
          <div class="row between sm">
            <span>Distribuição de Sessões Convocadas</span>
            <span>Total: <b>${att.totalSessions}</b></span>
          </div>
          <div class="bar" style="height:10px; margin:8px 0; display:flex; border-radius:6px; overflow:hidden">
            <i style="width:${att.attendanceRate}%; background:var(--primary)" title="Presenças: ${att.presences}"></i>
            <i style="width:${Math.round((att.justifiedAbsences / att.totalSessions) * 100)}%; background:var(--secondary)" title="Justificadas: ${att.justifiedAbsences}"></i>
            <i style="width:${Math.round((att.unjustifiedAbsences / att.totalSessions) * 100)}%; background:var(--error)" title="Faltas não justificadas: ${att.unjustifiedAbsences}"></i>
          </div>
          <div class="row between xs muted">
            <span>Presenças: <b>${att.presences}</b></span>
            <span>Justificadas: <b>${att.justifiedAbsences}</b></span>
            <span>Faltas Não Justificadas: <b style="color:var(--error)">${att.unjustifiedAbsences}</b></span>
          </div>
        </div>
      </div>

      <!-- 2. Fidelidade Partidária -->
      <div class="card soft stack" style="gap:12px; padding:16px">
        <div class="row between">
          <span class="chip ${fid.classificationClass}">Fidelidade Partidária (${esc(fid.party)})</span>
          <span class="sm" style="font-weight:700">${esc(fid.classification)}</span>
        </div>

        <div class="grid" style="grid-template-columns:1fr 1fr; gap:8px">
          <div class="stat" style="padding:10px">
            <span>Votos com a Bancada</span>
            <b style="font-size:22px; color:var(--text)">${fid.alignmentRate}%</b>
            <span class="xs muted">${fid.alignedVotes} de ${fid.totalVotings} votações</span>
          </div>
          <div class="stat" style="padding:10px">
            <span>Votos Dissidentes</span>
            <b style="font-size:20px; color:${fid.divergentVotes > 0 ? 'var(--gold)' : 'var(--primary)'}">${fid.divergentVotes}</b>
            <span class="xs muted">Contrários à liderança</span>
          </div>
        </div>

        ${
          fid.sampleDivergences.length
            ? `
          <div class="stack" style="gap:6px">
            <span class="xs muted" style="font-weight:700; text-transform:uppercase">Amostra de Votações com Dissidência:</span>
            ${fid.sampleDivergences
              .map(
                (d) => `
              <div class="card soft stack xs" style="gap:3px; background:var(--s2); padding:8px 10px; border-radius:var(--r-sm)">
                <div class="row between">
                  <b>${esc(d.matter)}</b>
                  <span class="chip gold xs">Voto: ${esc(d.parliamentaryVote)} (Bancada: ${esc(d.partyOrientation)})</span>
                </div>
                <p class="muted">${esc(d.description)}</p>
              </div>`
              )
              .join('')}
          </div>`
            : ''
        }
      </div>

      <!-- 3. Atuação como Relator -->
      <div class="card soft stack" style="gap:10px; padding:16px">
        <div class="row between">
          <span class="chip blue">Atuação como Relator(a)</span>
          <span class="xs muted">${relators.length} Matérias Atribuídas</span>
        </div>
        <div class="stack" style="gap:8px">
          ${relators
            .map(
              (r) => `
            <div class="card soft stack sm" style="gap:4px; border-left:3px solid var(--primary); padding:10px">
              <div class="row between">
                <b style="font-size:13px">${esc(r.code)}</b>
                <span class="chip green xs">${esc(r.status)}</span>
              </div>
              <p style="font-size:12px; font-weight:600">${esc(r.theme)}</p>
              <div class="row between xs muted">
                <span>Comissão: ${esc(r.commission)}</span>
                <span>Parecer: <b>${esc(r.verdict)}</b></span>
              </div>
            </div>`
            )
            .join('')}
        </div>
      </div>
    </div>
  `);

  // Alternância de abas do modal
  const tabs = el.querySelectorAll('#pol-tabs button');
  tabs.forEach((btn) => {
    btn.onclick = () => {
      tabs.forEach((b) => b.classList.remove('on'));
      btn.classList.add('on');
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
          <div class="card soft row between" style="padding:14px; background:var(--primary-soft)">
            <div>
              <span class="xs muted" style="text-transform:uppercase; font-weight:700">Total Auditado no Mandato</span>
              <h2 style="font-size:22px; color:var(--primary); font-weight:800; margin-top:2px">${brl(total)}</h2>
              <span class="xs muted">Base: Últimos ${expenses.length} reembolsos registrados na Câmara</span>
            </div>
            <span class="chip green">57ª Legislatura</span>
          </div>

          <div>
            <span class="sm muted" style="font-weight:700">Principais Áreas de Despesa:</span>
            <div class="stack" style="gap:6px; margin-top:6px">
              ${topCategories
                .map(
                  ([cat, val]) => `
                <div class="row between sm" style="background:var(--s2); padding:6px 12px; border-radius:var(--r-sm)">
                  <span class="muted truncate" style="max-width:240px">${esc(cat)}</span>
                  <b>${brl(val)}</b>
                </div>`
                )
                .join('')}
            </div>
          </div>

          <div class="row between" style="margin-top:6px">
            <span class="sm muted" style="font-weight:700">Notas Fiscais e Recibos Recentes:</span>
            <span class="xs muted">Fonte: Câmara dos Deputados</span>
          </div>

          <div class="stack" style="gap:8px; max-height:40vh; overflow-y:auto; padding-right:4px">
            ${expenses
              .slice(0, 20)
              .map((ex) => {
                const isHigh = (ex.value || 0) >= 3000;
                return `
                <div class="card soft stack" style="gap:4px; padding:10px; border-left:${
                  isHigh ? '3px solid var(--tertiary)' : 'none'
                }">
                  <div class="row between">
                    <span class="sm" style="font-weight:600">${esc(ex.supplier || 'Fornecedor')}</span>
                    <b style="color:${isHigh ? 'var(--tertiary)' : 'var(--text)'}">${brl(ex.value || 0)}</b>
                  </div>
                  <div class="row between xs muted">
                    <span class="truncate" style="max-width:260px">${esc(ex.type)}</span>
                    <span>${fmtDate(ex.date)}</span>
                  </div>
                  ${
                    ex.receiptUrl
                      ? `<div class="row" style="margin-top:4px">
                      <a href="${esc(
                        ex.receiptUrl
                      )}" target="_blank" rel="noopener noreferrer" class="xs" style="font-weight:600; display:inline-flex; align-items:center; gap:4px">
                        <span class="mi" style="font-size:14px">receipt_long</span><span>Ver Nota Fiscal / Comprovante</span>
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
          <div class="stack" style="gap:10px; max-height:55vh; overflow-y:auto; padding-right:4px">
            ${projects
              .map(
                (item, idx) => `
              <div class="card soft stack" style="gap:6px; padding:12px">
                <div class="row between">
                  <span class="chip blue">${esc(item.type)} ${esc(item.number)}/${esc(item.year)}</span>
                  <span class="xs muted">${fmtDate(item.date)}</span>
                </div>
                <p style="font-size:13px; line-height:1.4">${esc(item.summary)}</p>
                <div class="row between" style="margin-top:4px">
                  <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="sm" style="font-weight:600; display:inline-flex; align-items:center; gap:4px">
                    <span>Ficha oficial de tramitação</span><span class="mi" style="font-size:14px">open_in_new</span>
                  </a>
                  <button class="btn ghost sm btn-analyze-proj" data-index="${idx}" style="padding:4px 8px; font-size:11.5px">
                    <span class="mi" style="font-size:14px; color:var(--primary)">psychology</span>
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
        <div class="card soft stack" style="gap:10px; padding:14px">
          <div class="row between">
            <span class="chip green">Registro Institucional Oficial</span>
            <span class="xs muted">${esc(prof.status)}</span>
          </div>
          <div>
            <span class="xs muted" style="text-transform:uppercase; font-weight:700">Nome Civil Completo</span>
            <p style="font-weight:700; font-size:14px">${esc(prof.civilName)}</p>
          </div>
          <div class="row between sm">
            <div><span class="muted">Condição:</span> <b>${esc(prof.electoralCondition)}</b></div>
            <div><span class="muted">Escolaridade:</span> <b>${esc(prof.schooling)}</b></div>
          </div>
        </div>

        ${
          prof.cabinet
            ? `
        <div class="card soft stack" style="gap:10px; padding:14px">
          <span class="sm muted" style="font-weight:700">Gabinete em Brasília:</span>
          <div class="grid" style="grid-template-columns:1fr 1fr; gap:8px">
            <div class="stat" style="padding:10px">
              <span>Localização</span>
              <b style="font-size:13px">Anexo ${esc(prof.cabinet.building)}, Sala ${esc(prof.cabinet.room)}</b>
              <span class="xs muted">${esc(prof.cabinet.floor)}º Andar</span>
            </div>
            <div class="stat" style="padding:10px">
              <span>Telefone</span>
              <b style="font-size:13px">(61) ${esc(prof.cabinet.phone || '3215-5000')}</b>
            </div>
          </div>
          ${
            prof.cabinet.email
              ? `
          <div class="row between sm" style="background:var(--s2); padding:8px 12px; border-radius:var(--r-sm)">
            <span class="muted">E-mail Institucional:</span>
            <a href="mailto:${esc(prof.cabinet.email)}" style="font-weight:600">${esc(prof.cabinet.email)}</a>
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
          <div class="stack" style="gap:10px; max-height:55vh; overflow-y:auto; padding-right:4px">
            ${votes
              .map(
                (v) => `
              <div class="card soft stack" style="gap:6px; padding:12px">
                <div class="row between">
                  <span class="chip blue">${esc(v.matter)}</span>
                  <span class="vote ${VOTE_CLASS[v.vote] || ''}">${esc(v.vote)}</span>
                </div>
                <p style="font-size:13px; font-weight:500; line-height:1.4">${esc(v.summary || 'Deliberação no Plenário')}</p>
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
      const p = store.get().politicians.find((x) => x.id === b.dataset.remove);
      if (confirm(`Parar de monitorar ${p?.name || 'este político'}?`)) {
        store.removePolitician(b.dataset.remove);
        toast('Político removido do monitoramento.');
      }
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
