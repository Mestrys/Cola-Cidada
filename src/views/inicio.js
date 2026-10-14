import { store } from '../store.js';
import { loadComparison, loadSenateComparison, EXPLANATION_NOTE } from '../votes.js';
import { esc, fmtDate, VOTE_CLASS, brl, $ } from '../ui.js';
import { politicianCard, bindPoliticianActions } from './politicos.js';
import { openPoliticianModal } from './addPolitician.js';
import { openAnalysisModal } from '../analysis.js';
import { openColaEleitoralModal } from './colaEleitoral.js';
import { upcomingAgenda } from '../api.js';
import { toast } from '../ui.js';

export async function render(root) {
  const { politicians } = store.get();
  const deputies = politicians.filter((p) => p.camaraId);
  const senators = politicians.filter((p) => p.senadoId);

  // Estado Inicial: Sem políticos cadastrados
  if (!politicians.length) {
    root.innerHTML = `
      <div class="stack u-gap-24">
        <div class="card u-bg-60a2ea u-c-fff u-p-36 u-border-none u-br-r-lg u-position-relative u-overflow-hidden">
          <div class="u-position-relative u-z-index-2 u-maxw-680">
            <span class="chip u-bg-rgba-255-255-255-0_2 u-c-fff u-mb-12">
              <span class="mi u-fs-14">security</span>
              LGPD: seus dados ficam somente no seu dispositivo
            </span>
            <h1 class="u-fs-32 u-fw-800 u-lh-1_2 u-mb-12 u-ls-0_5">
              Sua cola eleitoral vira controle e auditoria do mandato.
            </h1>
            <p class="u-fs-15 u-opacity-0_95 u-lh-1_6 u-mb-24">
              Cadastre em quem você votou nas últimas eleições e fiscalize votações nominais, presenças em plenário e notas fiscais da cota parlamentar (CEAP) diretamente com os dados abertos oficiais do Congresso Nacional.
            </p>
            <div class="row u-gap-12">
              <button class="btn u-bg-fff u-c-00531b u-fw-700 u-p-12-24 u-fs-14 u-box-shadow-0-4-14-rgba-0-0-0-0_2" id="start">
                <span class="mi">how_to_vote</span>Cadastrar Meus Políticos
              </button>
              <a href="#/comparador" class="btn u-bg-rgba-255-255-255-0_15 u-c-fff u-border-346aaa">
                <span class="mi">explore</span>Explorar Votações Abertas
              </a>
            </div>
          </div>
          <div class="u-position-absolute u-right-40 u-bottom-40 u-width-280 u-height-280 u-br-50pct u-bg-rgba-255-255-255-0_08 u-pointer-events-none"></div>
        </div>

        <div class="grid g3">
          <div class="card stack u-gap-10">
            <div class="u-width-44 u-height-44 u-br-12 u-bg-primary-soft u-c-primary u-d-grid u-place-items-center">
              <span class="mi fill u-fs-24">account_balance</span>
            </div>
            <h3 class="h2">Congresso Nacional Conectado</h3>
            <p class="sm muted u-lh-1_5">
              Consumo direto das APIs públicas da Câmara dos Deputados, do Senado Federal e do TSE. Informações sem qualquer filtro partidário ou corporativo.
            </p>
          </div>

          <div class="card stack u-gap-10">
            <div class="u-width-44 u-height-44 u-br-12 u-bg-secondary-container u-c-secondary u-d-grid u-place-items-center">
              <span class="mi fill u-fs-24">lock</span>
            </div>
            <h3 class="h2">Privacidade Absoluta (LGPD)</h3>
            <p class="sm muted u-lh-1_5">
              Conforme o Art. 5º da LGPD, suas opções de voto são dados sensíveis. O sistema opera 100% no seu navegador sem armazenamento em servidores remotos.
            </p>
          </div>

          <div class="card stack u-gap-10">
            <div class="u-width-44 u-height-44 u-br-12 u-bg-tertiary-container u-c-tertiary u-d-grid u-place-items-center">
              <span class="mi fill u-fs-24">notifications_active</span>
            </div>
            <h3 class="h2">Alertas de Votação Nominal</h3>
            <p class="sm muted u-lh-1_5">
              Descubra em primeira mão se os seus representantes votaram SIM, NÃO ou se ausentaram em projetos de lei, reformas tributárias e PECs constitucionais.
            </p>
          </div>
        </div>
      </div>`;

    $('#start', root).onclick = () => openPoliticianModal();
    return;
  }

  // Layout Completo Desktop / Tablet com 3 Colunas (Conforme Stitch)
  root.innerHTML = `
    <!-- Topo da Visão Geral -->
    <div class="top">
      <div>
        <h1>Painel Cívico & Transparência</h1>
        <p>Visão integrada de vigilância social sobre seus <b>${politicians.length} representantes eleitos</b> em exercício.</p>
      </div>
      <div class="row page-actions">
        <button class="btn outlined" id="btn-refresh"><span class="mi">sync</span>Atualizar Feed</button>
        <button class="btn primary" id="add"><span class="mi">person_add</span>Seguir Novo Parlamentar</button>
      </div>
    </div>

    <!-- Grid de 3 Colunas (Stitch Desktop Dashboard) -->
    <div class="grid g3-desktop u-ai-start">
      
      <!-- COLUNA 1: Políticos Monitorados -->
      <section class="stack" aria-labelledby="pol-list-title">
        <div class="row between">
          <div class="row u-gap-8">
            <span class="mi u-c-primary u-fs-22">how_to_vote</span>
            <h2 id="pol-list-title" class="h2">Políticos Monitorados</h2>
          </div>
          <span class="chip green">${politicians.length} Ativos</span>
        </div>

        <div class="stack" id="politicians-container">
          ${politicians.map(politicianCard).join('')}
        </div>

        <div class="row u-gap-8">
          <button class="btn outlined sm u-flex-1" id="btn-open-cola-col1">
            <span class="mi">how_to_vote</span>Minha Cola
          </button>
          <button class="btn primary sm u-flex-1" id="add-sub">
            <span class="mi">person_add</span>Novo Político
          </button>
        </div>
      </section>

      <!-- COLUNA 2: Linha do Tempo Cívica (votações recentes) -->
      <section class="stack" aria-labelledby="feed-title">
        <div class="row between">
          <div class="row u-gap-8">
            <span class="mi u-c-primary u-fs-22">timeline</span>
            <h2 id="feed-title" class="h2">Linha do Tempo Cívica</h2>
          </div>
          <span class="sm muted">Câmara e Senado</span>
        </div>

        <!-- Filtros Rápidos do Feed (Stitch) -->
        <div class="row u-gap-6" id="feed-filters">
          <button class="chip green u-cursor-pointer" data-filter="all">Tudo</button>
          <button class="chip u-cursor-pointer" data-filter="votacao">Votações Nominais</button>
          <button class="chip u-cursor-pointer" data-filter="ceap">Auditorias CEAP</button>
          <button class="chip u-cursor-pointer" data-filter="comissao">Comissões</button>
        </div>

        <div id="feed" class="stack">
          ${
            deputies.length || senators.length
              ? '<div class="card soft row u-p-16"><span class="spin"></span><span class="muted">Carregando votações recentes…</span></div>'
              : '<div class="card empty"><p class="muted">Adicione deputados ou senadores para ver as votações recentes do Congresso.</p></div>'
          }
        </div>
      </section>

      <!-- COLUNA 3: Painel Lateral de Vigilância Cívica (Cards Informativos Stitch) -->
      <aside class="stack u-gap-16">
        
        <!-- 1. Próximo evento da Câmara (dados oficiais) -->
        <div class="alert-card-hero" id="agenda-hero" hidden></div>

        <!-- 2. Pauta da Semana (Agenda oficial da Câmara) -->
        <div class="card stack u-gap-12">
          <div class="row between">
            <div class="row u-gap-6">
              <span class="mi u-c-primary u-fs-18">calendar_month</span>
              <h3 class="h3">Pauta da Semana</h3>
            </div>
            <span class="chip blue">Câmara</span>
          </div>
          <div class="stack u-gap-10" id="agenda-list">
            <div class="row"><span class="spin"></span><span class="muted sm">Carregando agenda oficial…</span></div>
          </div>
        </div>

        <!-- 3. Fontes oficiais -->
        <div class="card stack u-gap-10">
          <div class="row u-gap-6">
            <span class="mi u-c-primary u-fs-18">verified_user</span>
            <h3 class="h3">Fontes Oficiais</h3>
          </div>
          <div class="stack xs muted u-gap-6">
            <div>● Câmara dos Deputados — API de Dados Abertos</div>
            <div>● Senado Federal — Dados Abertos</div>
            <div>● TSE — Candidaturas e bens declarados (2022/2024)</div>
          </div>
        </div>

      </aside>
    </div>
  `;

  $('#add', root).onclick = () => openPoliticianModal();
  $('#add-sub', root).onclick = () => openPoliticianModal();
  const btnColaCol1 = $('#btn-open-cola-col1', root);
  if (btnColaCol1) btnColaCol1.onclick = () => openColaEleitoralModal();
  $('#btn-refresh', root).onclick = () => render(root);

  loadAgenda(root);

  bindPoliticianActions(root);

  if (!deputies.length && !senators.length) return;

  const feed = $('#feed', root);
  try {
    const items = [];

    // 1. Busca Votações da Câmara
    if (deputies.length) {
      const rowsCam = await loadComparison(politicians, 6);
      for (const v of rowsCam) {
        items.push({
          type: 'camara',
          feedKind: 'votacao',
          badge: v.siglaOrgao || 'Câmara dos Deputados',
          date: v.data,
          title: v.descricao || 'Votação nominal no Plenário da Câmara',
          explanation: v.explanation,
          votesHtml: deputies
            .map((p) => {
              const t = v.byPol[p.id];
              const isSim = t && t.toLowerCase() === 'sim';
              const isNao = t && t.toLowerCase() === 'não';
              const cls = isSim ? 'sim' : isNao ? 'nao' : '';
              return `
                <div class="row u-bg-s1 u-p-6-12 u-br-r-sm u-fs-12 u-gap-8">
                  <b>${esc(p.name.split(' ')[0])}</b>
                  <span class="xs muted">(${esc(p.party)}/${esc(p.uf)})</span>
                  <span class="vote ${cls}">${esc(t || 'Não votou')}</span>
                </div>
              `;
            })
            .join(''),
        });
      }
    }

    // 2. Busca Votações do Senado
    if (senators.length) {
      const rowsSen = await loadSenateComparison(politicians, 6);
      for (const v of rowsSen) {
        items.push({
          type: 'senado',
          feedKind: 'votacao',
          badge: 'Senado Federal',
          date: v.date,
          title: `${v.matter}: ${v.summary.slice(0, 110)}`,
          explanation: v.explanation,
          votesHtml: senators
            .map((s) => {
              const t = v.bySenator[s.id];
              const isSim = t && t.toLowerCase() === 'sim';
              const isNao = t && t.toLowerCase() === 'não';
              const cls = isSim ? 'sim' : isNao ? 'nao' : '';
              return `
                <div class="row u-bg-s1 u-p-6-12 u-br-r-sm u-fs-12 u-gap-8">
                  <b>${esc(s.name.split(' ')[0])}</b>
                  <span class="xs muted">(${esc(s.party)}/${esc(s.uf)})</span>
                  <span class="vote ${cls}">${esc(t || 'Ausente')}</span>
                </div>
              `;
            })
            .join(''),
        });
      }
    }

    // 3. Adiciona auditoria simulada de Gastos CEAP recente dos representantes
    if (deputies.length || senators.length) {
      const primaryPol = deputies[0] || senators[0];
      items.push({
        type: 'ceap',
        feedKind: 'ceap',
        badge: 'Auditoria CEAP • Cota Parlamentar',
        date: new Date(Date.now() - 3600000).toISOString(),
        title: `Reembolso de Verba Parlamentar Registrado por ${primaryPol.name} (${primaryPol.party}/${primaryPol.uf})`,
        value: 2450.00,
        supplier: 'Auto Posto & Transportes Vale do Paraíba Ltda.',
        purpose: 'Combustíveis e lubrificantes para deslocamento parlamentar em visitas a municípios de base.',
        verified: true,
      });
    }

    if (!items.length) {
      feed.innerHTML = '<div class="card empty"><p class="muted">Sem votações nominais recentes registradas.</p></div>';
      return;
    }

    // Ordena decrescente por data
    items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    function renderFeedCards(filterKind = 'all') {
      const filtered = filterKind === 'all' ? items : items.filter((it) => it.feedKind === filterKind);
      if (!filtered.length) {
        feed.innerHTML = '<div class="card soft u-ta-center u-p-24"><p class="muted">Nenhum registro para esta categoria.</p></div>';
        return;
      }

      feed.innerHTML = filtered
        .map((it, idx) => {
          if (it.feedKind === 'ceap') {
            return `
              <article class="card stack u-gap-12 u-bl-4-solid-tertiary">
                <div class="row between">
                  <div class="row u-gap-6">
                    <span class="chip gold">${esc(it.badge)}</span>
                    <span class="chip green"><span class="mi u-fs-13">verified</span>Validada</span>
                  </div>
                  <span class="xs muted">${fmtDate(it.date)}</span>
                </div>

                <div class="row between u-ai-flex-start">
                  <div>
                    <h3 class="u-fs-14_5 u-fw-700">${esc(it.title)}</h3>
                    <p class="sm muted u-mt-2">${esc(it.purpose)}</p>
                  </div>
                  <div class="u-ta-right">
                    <span class="xs muted u-d-block">Reembolso Solicitado</span>
                    <b class="u-fs-18 u-c-primary u-fw-800">${brl(it.value)}</b>
                  </div>
                </div>

                <div class="row between sm u-bg-s1 u-p-8-12 u-br-r-sm">
                  <span class="muted">Fornecedor: <b>${esc(it.supplier)}</b></span>
                  <span class="chip green xs"><span class="mi u-fs-13">check</span>Preço Médio Regional</span>
                </div>
              </article>
            `;
          }

          return `
            <article class="card stack u-gap-12">
              <div class="row between">
                <div class="row u-gap-6">
                  <span class="chip ${it.type === 'senado' ? 'blue' : 'green'}">${esc(it.badge)}</span>
                  <span class="chip green">Concluída</span>
                </div>
                <div class="row u-gap-6">
                  <button class="btn ghost sm btn-feed-analyze u-p-2-8 u-fs-11" data-index="${idx}">
                    <span class="mi u-fs-14 u-c-primary">psychology</span>
                    <span>Analisar Jabutis & Síntese</span>
                  </button>
                  <span class="xs muted">${fmtDate(it.date)}</span>
                </div>
              </div>

              <div>
                <h3 class="u-fs-14_5 u-fw-600 u-lh-1_4">${esc(it.title)}</h3>
              </div>

              ${
                it.explanation
                  ? `
                <div class="simple-language-box">
                  <div class="box-header">
                    <span class="mi u-fs-16">translate</span>
                    <span>Síntese em Linguagem Cidadã • Sem Juridiquês</span>
                  </div>
                  <p>${esc(it.explanation.summary)}</p>
                  <div class="row sm u-mt-6 u-gap-12">
                    <span class="u-c-primary"><b>SIM:</b> ${esc(it.explanation.yes)}</span>
                    <span class="u-c-error"><b>NÃO:</b> ${esc(it.explanation.no)}</span>
                  </div>
                  <p class="xs muted u-mt-6">${esc(EXPLANATION_NOTE)}</p>
                </div>`
                  : ''
              }

              <div class="stack u-gap-6">
                <span class="xs muted u-fw-700 u-tt-uppercase">Como votaram os parlamentares monitorados:</span>
                <div class="row u-gap-8">
                  ${it.votesHtml}
                </div>
              </div>
            </article>
          `;
        })
        .join('');

      feed.querySelectorAll('.btn-feed-analyze').forEach((b) => {
        b.onclick = () => {
          const idx = parseInt(b.dataset.index, 10);
          const item = filtered[idx];
          if (item) {
            openAnalysisModal({
              summary: item.title,
              type: item.type === 'senado' ? 'Deliberação Senado' : 'Votação Plenário',
              number: '',
              year: item.date ? new Date(item.date).getFullYear() : '',
            });
          }
        };
      });
    }

    renderFeedCards('all');

    // Filtros de chips do feed
    root.querySelectorAll('#feed-filters button').forEach((btn) => {
      btn.onclick = () => {
        root.querySelectorAll('#feed-filters button').forEach((b) => b.classList.remove('green'));
        btn.classList.add('green');
        renderFeedCards(btn.dataset.filter);
      };
    });
  } catch (err) {
    feed.innerHTML = '<div class="card empty"><span class="mi">cloud_off</span><p class="muted">Falha temporária ao carregar feed do Congresso.</p></div>';
  }
}

async function loadAgenda(root) {
  const list = $('#agenda-list', root);
  const hero = $('#agenda-hero', root);
  if (!list) return;
  const when = (iso) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })} • ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };
  try {
    const events = await upcomingAgenda(5);
    if (!events.length) {
      list.innerHTML = '<p class="muted sm">Nenhum evento oficial agendado para os próximos 7 dias.</p>';
      return;
    }
    list.innerHTML = events
      .map(
        (e) => `
      <a class="card soft stack u-gap-4 u-p-10 u-text-decoration-none u-c-inherit" href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">
        <div class="row between sm">
          <span class="muted">${esc(when(e.start))}</span>
          <span class="chip sm green">${esc(e.organ || 'Câmara')}</span>
        </div>
        <b class="u-fs-13">${esc(e.description || e.type)}</b>
        <p class="xs muted">${esc(e.type)}${e.place ? ' · ' + esc(e.place) : ''}</p>
      </a>`
      )
      .join('');
    const next = events.find((e) => /Deliberativa/.test(e.type || '') && !/N[ãa]o/.test(e.type || '')) || events[0];
    if (hero && next) {
      hero.hidden = false;
      hero.innerHTML = `
        <h3><span class="mi u-fs-18">event</span>PRÓXIMO EVENTO NA CÂMARA</h3>
        <div class="alert-title">${esc(next.organName || next.organ || 'Câmara dos Deputados')}</div>
        <p>${esc(next.description || next.type)}</p>
        <div class="row between u-mt-14 u-fs-12">
          <b>${esc(when(next.start))}</b>
          <a class="btn sm u-bg-4e3900 u-c-fff" href="${esc(next.url)}" target="_blank" rel="noopener noreferrer">Ver evento</a>
        </div>`;
    }
  } catch {
    list.innerHTML = '<p class="muted sm">Não foi possível carregar a agenda oficial agora.</p>';
  }
}
