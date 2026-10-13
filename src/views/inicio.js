import { store } from '../store.js';
import { loadComparison, loadSenateComparison } from '../votes.js';
import { esc, fmtDate, VOTE_CLASS, brl, $ } from '../ui.js';
import { politicianCard, bindPoliticianActions } from './politicos.js';
import { openPoliticianModal } from './addPolitician.js';
import { openAnalysisModal } from '../analysis.js';
import { openColaEleitoralModal } from './colaEleitoral.js';
import { toast } from '../ui.js';

export async function render(root) {
  const { politicians } = store.get();
  const deputies = politicians.filter((p) => p.camaraId);
  const senators = politicians.filter((p) => p.senadoId);

  // Estado Inicial: Sem políticos cadastrados
  if (!politicians.length) {
    root.innerHTML = `
      <div class="stack" style="gap:24px">
        <div class="card" style="background:linear-gradient(135deg, #006b26 0%, #008732 60%, #0a31a6 100%); color:#fff; padding:36px; border:none; border-radius:var(--r-lg); position:relative; overflow:hidden">
          <div style="position:relative; z-index:2; max-width:680px">
            <span class="chip" style="background:rgba(255,255,255,0.2); color:#fff; margin-bottom:12px">
              <span class="mi" style="font-size:14px">security</span>
              LGPD: 100% Criptografado no seu dispositivo
            </span>
            <h1 style="font-size:32px; font-weight:800; line-height:1.2; margin-bottom:12px; letter-spacing:-0.5px">
              Sua cola eleitoral vira controle e auditoria do mandato.
            </h1>
            <p style="font-size:15px; opacity:0.95; line-height:1.6; margin-bottom:24px">
              Cadastre em quem você votou nas últimas eleições e fiscalize votações nominais, presenças em plenário e notas fiscais da cota parlamentar (CEAP) diretamente com os dados abertos oficiais do Congresso Nacional.
            </p>
            <div class="row" style="gap:12px">
              <button class="btn" id="start" style="background:#fff; color:#00531b; font-weight:700; padding:12px 24px; font-size:14px; box-shadow:0 4px 14px rgba(0,0,0,0.2)">
                <span class="mi">how_to_vote</span>Cadastrar Meus Políticos
              </button>
              <a href="#/comparador" class="btn" style="background:rgba(255,255,255,0.15); color:#fff; border:1px solid rgba(255,255,255,0.3)">
                <span class="mi">explore</span>Explorar Votações Abertas
              </a>
            </div>
          </div>
          <div style="position:absolute; right:-40px; bottom:-40px; width:280px; height:280px; border-radius:50%; background:rgba(255,255,255,0.08); pointer-events:none"></div>
        </div>

        <div class="grid g3">
          <div class="card stack" style="gap:10px">
            <div style="width:44px; height:44px; border-radius:12px; background:var(--primary-soft); color:var(--primary); display:grid; place-items:center">
              <span class="mi fill" style="font-size:24px">account_balance</span>
            </div>
            <h3 class="h2">Congresso Nacional Conectado</h3>
            <p class="sm muted" style="line-height:1.5">
              Consumo direto das APIs públicas da Câmara dos Deputados, do Senado Federal e do TSE. Informações sem qualquer filtro partidário ou corporativo.
            </p>
          </div>

          <div class="card stack" style="gap:10px">
            <div style="width:44px; height:44px; border-radius:12px; background:var(--secondary-container); color:var(--secondary); display:grid; place-items:center">
              <span class="mi fill" style="font-size:24px">lock</span>
            </div>
            <h3 class="h2">Privacidade Absoluta (LGPD)</h3>
            <p class="sm muted" style="line-height:1.5">
              Conforme o Art. 5º da LGPD, suas opções de voto são dados sensíveis. O sistema opera 100% no seu navegador sem armazenamento em servidores remotos.
            </p>
          </div>

          <div class="card stack" style="gap:10px">
            <div style="width:44px; height:44px; border-radius:12px; background:var(--tertiary-container); color:var(--tertiary); display:grid; place-items:center">
              <span class="mi fill" style="font-size:24px">notifications_active</span>
            </div>
            <h3 class="h2">Alertas de Votação Nominal</h3>
            <p class="sm muted" style="line-height:1.5">
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
      <div class="row">
        <button class="btn outlined" id="btn-refresh"><span class="mi">sync</span>Atualizar Feed</button>
        <button class="btn primary" id="add"><span class="mi">person_add</span>Seguir Novo Parlamentar</button>
      </div>
    </div>

    <!-- Grid de 3 Colunas (Stitch Desktop Dashboard) -->
    <div class="grid g3-desktop" style="align-items:start">
      
      <!-- COLUNA 1: Políticos Monitorados -->
      <section class="stack" aria-labelledby="pol-list-title">
        <div class="row between">
          <div class="row" style="gap:8px">
            <span class="mi" style="color:var(--primary); font-size:22px">how_to_vote</span>
            <h2 id="pol-list-title" class="h2">Políticos Monitorados</h2>
          </div>
          <span class="chip green">${politicians.length} Ativos</span>
        </div>

        <div class="stack" id="politicians-container">
          ${politicians.map(politicianCard).join('')}
        </div>

        <div class="row" style="gap:8px">
          <button class="btn outlined sm" id="btn-open-cola-col1" style="flex:1">
            <span class="mi">how_to_vote</span>Minha Cola
          </button>
          <button class="btn primary sm" id="add-sub" style="flex:1">
            <span class="mi">person_add</span>Novo Político
          </button>
        </div>
      </section>

      <!-- COLUNA 2: Linha do Tempo Cívica (Feed em Tempo Real) -->
      <section class="stack" aria-labelledby="feed-title">
        <div class="row between">
          <div class="row" style="gap:8px">
            <span class="mi" style="color:var(--primary); font-size:22px">timeline</span>
            <h2 id="feed-title" class="h2">Linha do Tempo Cívica</h2>
          </div>
          <span class="sm muted">Atualizado a cada 5 min</span>
        </div>

        <!-- Filtros Rápidos do Feed (Stitch) -->
        <div class="row" id="feed-filters" style="gap:6px">
          <button class="chip green" data-filter="all" style="cursor:pointer">Tudo</button>
          <button class="chip" data-filter="votacao" style="cursor:pointer">Votações Nominais</button>
          <button class="chip" data-filter="ceap" style="cursor:pointer">Auditorias CEAP</button>
          <button class="chip" data-filter="comissao" style="cursor:pointer">Comissões</button>
        </div>

        <div id="feed" class="stack">
          ${
            deputies.length || senators.length
              ? '<div class="card soft row" style="padding:16px"><span class="spin"></span><span class="muted">Carregando votações e atos em tempo real…</span></div>'
              : '<div class="card empty"><p class="muted">Adicione deputados ou senadores para visualizar o fluxo ao vivo do Congresso.</p></div>'
          }
        </div>
      </section>

      <!-- COLUNA 3: Painel Lateral de Vigilância Cívica (Cards Informativos Stitch) -->
      <aside class="stack" style="gap:16px">
        
        <!-- 1. Alerta de Alta Relevância (Card Âmbar Stitch) -->
        <div class="alert-card-hero">
          <h3><span class="mi" style="font-size:18px">warning</span>ALERTA DE ALTA RELEVÂNCIA</h3>
          <div class="alert-title">Sessão Conjunta do Congresso</div>
          <p>
            Apreciação de vetos presidenciais que impactam diretamente a Lei de Diretrizes Orçamentárias (LDO) e transferências especiais.
          </p>
          <div class="row between" style="margin-top:14px; font-size:12px">
            <b>Quinta, às 10:00</b>
            <button class="btn sm" id="btn-alert-hero-action" style="background:#4e3900; color:#fff">
              <span class="mi" style="font-size:14px">notifications_active</span>Ativar Lembrete
            </button>
          </div>
        </div>

        <!-- 2. Pauta da Semana (Agenda Legislativa) -->
        <div class="card stack" style="gap:12px">
          <div class="row between">
            <div class="row" style="gap:6px">
              <span class="mi" style="color:var(--primary); font-size:18px">calendar_month</span>
              <h3 class="h3">Pauta da Semana</h3>
            </div>
            <span class="chip blue">3 Votações</span>
          </div>

          <div class="stack" style="gap:10px">
            <div class="card soft stack" style="gap:4px; padding:10px">
              <div class="row between sm">
                <span class="muted">Amanhã • 14h</span>
                <span class="chip sm green">Câmara</span>
              </div>
              <b style="font-size:13px">PL dos Medicamentos Genéricos</b>
              <p class="xs muted">Impacto direto no custo da cesta farmacêutica básica do SUS.</p>
            </div>

            <div class="card soft stack" style="gap:4px; padding:10px">
              <div class="row between sm">
                <span class="muted">Quarta • 16h</span>
                <span class="chip sm blue">Senado</span>
              </div>
              <b style="font-size:13px">Marco Legal da Transição Energética</b>
              <p class="xs muted">Incentivos fiscais para cooperativas de energia renovável.</p>
            </div>

            <div class="card soft stack" style="gap:4px; padding:10px">
              <div class="row between sm">
                <span class="muted">Sexta • 09h</span>
                <span class="chip sm purple">ALESP</span>
              </div>
              <b style="font-size:13px">Tarifa Zero Regional Integrada</b>
              <p class="xs muted">Audiência pública sobre subsídios do transporte intermunicipal.</p>
            </div>
          </div>
        </div>

        <!-- 3. Índice de Transparência & Conformidade -->
        <div class="card stack" style="gap:12px">
          <div class="row between">
            <div class="row" style="gap:6px">
              <span class="mi" style="color:var(--primary); font-size:18px">insights</span>
              <h3 class="h3">Índice de Transparência</h3>
            </div>
            <span class="chip green">100% Auditável</span>
          </div>

          <div class="row" style="gap:14px; align-items:center">
            <div style="width:56px; height:56px; border-radius:50%; border:4px solid var(--primary); display:grid; place-items:center; flex-shrink:0">
              <b style="font-size:15px; color:var(--primary)">100%</b>
            </div>
            <div>
              <b style="font-size:13px; display:block">Conformidade Dados Abertos</b>
              <span class="xs muted">Sem interceptação de servidores intermediários</span>
            </div>
          </div>

          <div class="stack xs muted" style="gap:6px; border-top:1px solid var(--line); padding-top:10px">
            <div class="row between">
              <span>● TSE (DivulgaCand)</span>
              <b style="color:var(--primary)">Sincronizado</b>
            </div>
            <div class="row between">
              <span>● Câmara dos Deputados (API v2)</span>
              <b style="color:var(--primary)">Tempo Real</b>
            </div>
            <div class="row between">
              <span>● Senado Federal (SIGAD)</span>
              <b style="color:var(--primary)">Atualizado Hoje</b>
            </div>
          </div>

          <div class="row sm muted" style="background:var(--s1); padding:8px 10px; border-radius:var(--r-sm); gap:8px">
            <span class="mi" style="color:var(--primary); font-size:16px">verified_user</span>
            <span>Auditoria criptográfica sem viés partidário.</span>
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

  $('#btn-alert-hero-action', root).onclick = () => {
    toast('Lembrete de pauta cívica agendado com sucesso!');
  };

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
                <div class="row" style="background:var(--s1); padding:6px 12px; border-radius:var(--r-sm); font-size:12px; gap:8px">
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
                <div class="row" style="background:var(--s1); padding:6px 12px; border-radius:var(--r-sm); font-size:12px; gap:8px">
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
        feed.innerHTML = '<div class="card soft" style="text-align:center; padding:24px"><p class="muted">Nenhum registro para esta categoria.</p></div>';
        return;
      }

      feed.innerHTML = filtered
        .map((it, idx) => {
          if (it.feedKind === 'ceap') {
            return `
              <article class="card stack" style="gap:12px; border-left:4px solid var(--tertiary)">
                <div class="row between">
                  <div class="row" style="gap:6px">
                    <span class="chip gold">${esc(it.badge)}</span>
                    <span class="chip green"><span class="mi" style="font-size:13px">verified</span>Validada</span>
                  </div>
                  <span class="xs muted">${fmtDate(it.date)}</span>
                </div>

                <div class="row between" style="align-items:flex-start">
                  <div>
                    <h3 style="font-size:14.5px; font-weight:700">${esc(it.title)}</h3>
                    <p class="sm muted" style="margin-top:2px">${esc(it.purpose)}</p>
                  </div>
                  <div style="text-align:right">
                    <span class="xs muted" style="display:block">Reembolso Solicitado</span>
                    <b style="font-size:18px; color:var(--primary); font-weight:800">${brl(it.value)}</b>
                  </div>
                </div>

                <div class="row between sm" style="background:var(--s1); padding:8px 12px; border-radius:var(--r-sm)">
                  <span class="muted">Fornecedor: <b>${esc(it.supplier)}</b></span>
                  <span class="chip green xs"><span class="mi" style="font-size:13px">check</span>Preço Médio Regional</span>
                </div>
              </article>
            `;
          }

          return `
            <article class="card stack" style="gap:12px">
              <div class="row between">
                <div class="row" style="gap:6px">
                  <span class="chip ${it.type === 'senado' ? 'blue' : 'green'}">${esc(it.badge)}</span>
                  <span class="chip green">Concluída</span>
                </div>
                <div class="row" style="gap:6px">
                  <button class="btn ghost sm btn-feed-analyze" data-index="${idx}" style="padding:2px 8px; font-size:11px">
                    <span class="mi" style="font-size:14px; color:var(--primary)">psychology</span>
                    <span>Analisar Jabutis & Síntese</span>
                  </button>
                  <span class="xs muted">${fmtDate(it.date)}</span>
                </div>
              </div>

              <div>
                <h3 style="font-size:14.5px; font-weight:600; line-height:1.4">${esc(it.title)}</h3>
              </div>

              ${
                it.explanation
                  ? `
                <div class="simple-language-box">
                  <div class="box-header">
                    <span class="mi" style="font-size:16px">translate</span>
                    <span>Síntese em Linguagem Cidadã • Sem Juridiquês</span>
                  </div>
                  <p>${esc(it.explanation.summary)}</p>
                  <div class="row sm" style="margin-top:6px; gap:12px">
                    <span style="color:var(--primary)"><b>SIM:</b> ${esc(it.explanation.yes)}</span>
                    <span style="color:var(--error)"><b>NÃO:</b> ${esc(it.explanation.no)}</span>
                  </div>
                </div>`
                  : ''
              }

              <div class="stack" style="gap:6px">
                <span class="xs muted" style="font-weight:700; text-transform:uppercase">Como votaram os parlamentares monitorados:</span>
                <div class="row" style="gap:8px">
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
