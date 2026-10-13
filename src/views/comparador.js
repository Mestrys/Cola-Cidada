import { store } from '../store.js';
import { recentProvisionalMeasures, getParliamentaryAttendance, getPartyFidelity } from '../api.js';
import { loadComparison, loadSenateComparison } from '../votes.js';
import { avatar, esc, fmtDate, VOTE_CLASS, brl, toast, $ } from '../ui.js';
import { openPoliticianModal } from './addPolitician.js';
import { openGlossaryModal } from '../glossary.js';
import { openShareModal } from '../share.js';
import { openAnalysisModal } from '../analysis.js';

function renderExplanationBox(exp) {
  if (!exp) return '';
  return `
  <div class="simple-language-box" style="margin:8px 0">
    <div class="box-header">
      <span class="mi" style="font-size:16px">translate</span>
      <span>Linguagem Cidadã: O que significou este voto?</span>
    </div>
    <p style="font-size:13px; line-height:1.45; margin-bottom:8px">${esc(exp.summary || exp.title)}</p>
    <div class="stack xs" style="gap:4px">
      <div style="color:var(--primary)"><b>Quem votou SIM:</b> ${esc(exp.yes)}</div>
      <div style="color:var(--error)"><b>Quem votou NÃO:</b> ${esc(exp.no)}</div>
    </div>
  </div>`;
}

function camaraVotingCard(v, deputies) {
  const total = (v.tally.Sim || 0) + (v.tally.Não || 0) + (v.tally.Outros || 0) || 1;
  const pctSim = (((v.tally.Sim || 0) / total) * 100).toFixed(1);
  const pctNao = (((v.tally.Não || 0) / total) * 100).toFixed(1);
  const isAprov = v.aprovacao === 1;

  return `
  <article class="card stack" data-text="${esc((v.descricao || '').toLowerCase())}" data-category="${v.category || 'geral'}" style="gap:14px">
    <div class="row between">
      <div class="row" style="gap:8px">
        <span class="chip blue">${esc(v.siglaOrgao || 'Câmara dos Deputados')}</span>
        <span class="chip ${isAprov ? 'green' : 'red'}">${isAprov ? 'Aprovada' : 'Rejeitada'}</span>
        <span class="chip xs">Quórum Nominal Oficial</span>
      </div>
      <span class="xs muted">${fmtDate(v.data)}</span>
    </div>

    <div>
      <h3 style="font-size:16px; font-weight:700; line-height:1.35">${esc(v.descricao || 'Votação nominal no Plenário')}</h3>
    </div>
    
    ${renderExplanationBox(v.explanation)}

    <!-- Barra de Quórum Oficial MD3 -->
    <div class="card soft stack" style="gap:6px; padding:12px">
      <div class="row between xs" style="font-weight:700">
        <span style="color:var(--primary)">SIM: ${v.tally.Sim || 0} (${pctSim}%)</span>
        <span style="color:var(--error)">NÃO: ${v.tally.Não || 0} (${pctNao}%)</span>
        <span class="muted">Outros / Abstenção: ${v.tally.Outros || 0}</span>
      </div>
      <div class="quorum-bar">
        <i class="sim-part" style="width:${pctSim}%"></i>
        <i class="nao-part" style="width:${pctNao}%"></i>
        <i class="abs-part" style="width:${(100 - pctSim - pctNao).toFixed(1)}%"></i>
      </div>
    </div>

    ${
      deputies.length
        ? `
      <div class="stack" style="gap:8px">
        <span class="xs muted" style="font-weight:700; text-transform:uppercase">Posicionamento da sua Bancada Monitorada:</span>
        <div class="grid" style="grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:8px">
          ${deputies
            .map((p) => {
              const t = v.byPol[p.id];
              const isSim = t && t.toLowerCase() === 'sim';
              const isNao = t && t.toLowerCase() === 'não';
              const voteCls = isSim ? 'sim' : isNao ? 'nao' : 'abstencao';
              const fid = getPartyFidelity(p);

              return `
              <div class="card soft row between sm" style="padding:10px 12px; border-radius:var(--r-md); background:var(--s2)">
                <div class="row nowrap" style="gap:10px">
                  ${avatar(p, 'sm')}
                  <div>
                    <b style="font-size:13px">${esc(p.name.split(' ').slice(0, 2).join(' '))}</b><br>
                    <span class="xs muted">${esc(p.party)}/${esc(p.uf)} • ${fid.alignmentRate}% fiel</span>
                  </div>
                </div>
                <div style="text-align:right">
                  <span class="vote ${voteCls}">${t ? esc(t) : 'Ausente'}</span>
                </div>
              </div>`;
            })
            .join('')}
        </div>
      </div>`
        : ''
    }
  </article>`;
}

function senadoVotingCard(v, senators) {
  const isAprov = (v.result || '').toLowerCase().includes('aprov');

  return `
  <article class="card stack" data-text="${esc((v.matter + ' ' + v.summary).toLowerCase())}" data-category="${v.category || 'geral'}" style="gap:14px">
    <div class="row between">
      <div class="row" style="gap:8px">
        <span class="chip blue">${esc(v.matter)}</span>
        <span class="chip ${isAprov ? 'green' : 'gold'}">${esc(v.result || 'Deliberado')}</span>
        <span class="chip xs">Senado Federal</span>
      </div>
      <span class="xs muted">${fmtDate(v.date)}</span>
    </div>

    <div>
      <h3 style="font-size:16px; font-weight:700; line-height:1.35">${esc(v.summary || 'Deliberação no Senado Federal')}</h3>
    </div>
    
    ${renderExplanationBox(v.explanation)}

    ${
      v.yes > 0 || v.no > 0
        ? `
      <div class="card soft stack" style="gap:6px; padding:12px">
        <div class="row between xs" style="font-weight:700">
          <span style="color:var(--primary)">SIM: ${v.yes}</span>
          <span style="color:var(--error)">NÃO: ${v.no}</span>
          <span class="muted">Resultado: ${esc(v.result || 'Concluído')}</span>
        </div>
        <div class="quorum-bar">
          <i class="sim-part" style="width:${Math.round((v.yes / (v.yes + v.no || 1)) * 100)}%"></i>
          <i class="nao-part" style="width:${Math.round((v.no / (v.yes + v.no || 1)) * 100)}%"></i>
        </div>
      </div>`
        : ''
    }

    <div class="stack" style="gap:8px">
      <span class="xs muted" style="font-weight:700; text-transform:uppercase">Voto dos Senadores Monitorados:</span>
      <div class="grid" style="grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:8px">
        ${senators
          .map((s) => {
            const vote = v.bySenator[s.id];
            const isSim = vote && vote.toLowerCase() === 'sim';
            const isNao = vote && vote.toLowerCase() === 'não';
            const voteCls = isSim ? 'sim' : isNao ? 'nao' : 'abstencao';

            return `
            <div class="card soft row between sm" style="padding:10px 12px; border-radius:var(--r-md); background:var(--s2)">
              <div class="row nowrap" style="gap:10px">
                ${avatar(s, 'sm')}
                <div>
                  <b style="font-size:13px">${esc(s.name.split(' ').slice(0, 2).join(' '))}</b><br>
                  <span class="xs muted">${esc(s.party)}/${esc(s.uf)} • Senador</span>
                </div>
              </div>
              <span class="vote ${voteCls}">${vote ? esc(vote) : 'Ausente'}</span>
            </div>`;
          })
          .join('')}
      </div>
    </div>
  </article>`;
}

function mpvCard(m) {
  return `
  <article class="card stack" data-text="${esc((m.number + ' ' + m.summary).toLowerCase())}" data-category="executivo" style="gap:12px">
    <div class="row between">
      <div class="row" style="gap:8px">
        <span class="chip gold">Medida Provisória (Executivo)</span>
        <span class="chip blue">MPV ${esc(m.number)}/${esc(m.year)}</span>
      </div>
      <span class="xs muted">${m.date ? fmtDate(m.date) : ''}</span>
    </div>
    <h3 style="font-weight:700; font-size:14.5px; line-height:1.4">${esc(m.summary)}</h3>
    
    <div class="card soft stack" style="gap:6px; padding:12px; background:var(--s2)">
      <div class="row between xs">
        <span class="muted">Competência:</span>
        <b>Presidência da República (Art. 62 da CF/88)</b>
      </div>
      <div class="row between xs">
        <span class="muted">Prazo Constitucional:</span>
        <span>Vigência de 60 dias (prorrogável por mais 60 dias)</span>
      </div>
    </div>

    <div class="row">
      <a href="${esc(m.url)}" target="_blank" rel="noopener noreferrer" class="btn primary sm" style="font-weight:600">
        <span>Acompanhar Tramitação na Câmara</span><span class="mi" style="font-size:14px">open_in_new</span>
      </a>
    </div>
  </article>`;
}

export async function render(root) {
  const { politicians } = store.get();
  const deputies = politicians.filter((p) => p.camaraId);
  const senators = politicians.filter((p) => p.senadoId);

  root.innerHTML = `
    <!-- Top Header do Comparador (Estilo Stitch) -->
    <div class="top">
      <div>
        <div class="row" style="gap:8px; margin-bottom:4px">
          <span class="chip blue xs">AUDITORIA PARLAMENTAR</span>
          <span class="xs muted">Sessões Nominais Auditadas no Plenário</span>
        </div>
        <h1>Comparador Cívico de Votações</h1>
        <p>Analise a postura e fidelidade dos seus parlamentares frente às principais reformas e leis deliberadas no Congresso Nacional.</p>
      </div>
      <div class="row">
        <button class="btn outlined" id="btn-glossary"><span class="mi">menu_book</span>Glossário Cívico</button>
        <button class="btn primary" id="add"><span class="mi">person_add</span>Adicionar Parlamentar</button>
      </div>
    </div>

    <!-- Galeria Horizontal: Bancada Monitorada (Conforme Stitch) -->
    ${
      politicians.length
        ? `
      <div class="card stack" style="gap:12px; margin-bottom:16px; padding:16px">
        <div class="row between">
          <div class="row" style="gap:8px">
            <span class="mi" style="color:var(--primary); font-size:20px">group</span>
            <b style="font-size:14px">Bancada Monitorada (${politicians.length} Representantes)</b>
          </div>
          <span class="chip green xs">Painel Ativo</span>
        </div>

        <div class="row" style="gap:12px; overflow-x:auto; padding-bottom:6px; flex-wrap:nowrap">
          ${politicians
            .map((p) => {
              const att = getParliamentaryAttendance(p);
              return `
              <div class="card soft row nowrap sm" style="padding:8px 12px; border-radius:var(--r-md); min-width:210px; gap:10px">
                ${avatar(p, 'sm')}
                <div style="flex:1; overflow:hidden">
                  <b class="truncate" style="display:block; font-size:12.5px">${esc(p.name)}</b>
                  <span class="xs muted">${esc(p.party)}/${esc(p.uf)}</span>
                  <div class="row between xs" style="margin-top:2px">
                    <span class="muted">Presença:</span>
                    <b style="color:var(--primary)">${att.attendanceRate}%</b>
                  </div>
                </div>
              </div>`;
            })
            .join('')}
        </div>
      </div>`
        : ''
    }

    <!-- Barra de Filtros Legislativos (Stitch) -->
    <div class="card soft stack" style="margin-bottom:18px; padding:16px; gap:12px">
      <div class="row between">
        <div class="tabs" id="house-tabs">
          <button class="${deputies.length || (!deputies.length && !senators.length) ? 'on' : ''}" data-house="camara">
            Câmara dos Deputados (${deputies.length})
          </button>
          <button class="${!deputies.length && senators.length ? 'on' : ''}" data-house="senado">
            Senado Federal (${senators.length})
          </button>
          <button data-house="executivo">Atos do Executivo & Emendas</button>
          <button data-house="confronto">Confronto 1 vs 1</button>
        </div>
        <div style="flex:1; max-width:320px">
          <input class="input" id="search-filter" placeholder="Buscar por palavra-chave ou tema…" style="padding:8px 12px; font-size:13px">
        </div>
      </div>

      <!-- Chips Temáticos -->
      <div class="row" id="theme-chips" style="gap:6px">
        <button class="chip green" data-filter="all" style="cursor:pointer">Todas as Matérias</button>
        <button class="chip" data-filter="economia" style="cursor:pointer">Economia & Tributos</button>
        <button class="chip" data-filter="tecnologia" style="cursor:pointer">Tecnologia & Dados</button>
        <button class="chip" data-filter="social-saude" style="cursor:pointer">Social & Saúde</button>
        <button class="chip" data-filter="meio-ambiente" style="cursor:pointer">Meio Ambiente & Terras</button>
        <button class="chip" data-filter="seguranca" style="cursor:pointer">Segurança</button>
      </div>
    </div>

    <!-- PANE CÂMARA -->
    <div id="camara-pane" class="stack ${deputies.length || (!deputies.length && !senators.length) ? '' : 'hidden'}">
      ${
        deputies.length
          ? '<div id="camara-list" class="stack"><div class="card soft row" style="padding:16px"><span class="spin"></span><span class="muted">Auditando votações da Câmara dos Deputados…</span></div></div>'
          : `
        <div class="card empty">
          <span class="mi">how_to_vote</span>
          <h3>Nenhum deputado federal cadastrado</h3>
          <p>Adicione deputados federais à sua lista para cruzar como votaram em cada matéria do Plenário.</p>
        </div>`
      }
    </div>

    <!-- PANE SENADO -->
    <div id="senado-pane" class="stack ${!deputies.length && senators.length ? '' : 'hidden'}">
      ${
        senators.length
          ? '<div id="senado-list" class="stack"><div class="card soft row" style="padding:16px"><span class="spin"></span><span class="muted">Auditando votações do Senado Federal…</span></div></div>'
          : `
        <div class="card empty">
          <span class="mi">account_balance</span>
          <h3>Nenhum senador monitorado</h3>
          <p>Adicione senadores da República para acompanhar suas deliberações em Plenário.</p>
        </div>`
      }
    </div>

    <!-- PANE EXECUTIVO & EMENDAS PIX -->
    <div id="executivo-pane" class="stack hidden">
      <!-- Guia de Emendas Pix -->
      <div class="card stack" style="gap:14px; padding:20px; border-left:4px solid var(--primary)">
        <div class="row between">
          <div class="row" style="gap:10px">
            <span class="mi" style="color:var(--primary); font-size:26px">account_balance_wallet</span>
            <div>
              <h3 class="h2" style="font-size:16px">Guia Cívico: Emendas Orçamentárias & "Emendas Pix"</h3>
              <span class="xs muted">Emenda Constitucional 105/2019 • Transferências Especiais</span>
            </div>
          </div>
          <span class="chip green">Orçamento da União</span>
        </div>
        <p style="font-size:13.5px; line-height:1.55">
          As <b>Emendas Parlamentares</b> permitem que deputados e senadores direcionem fatias do Orçamento Geral da União (OGU) diretamente para seus municípios de base. Nas <b>Emendas Pix</b>, os recursos caem direto na conta corrente municipal sem celebração prévia de convênio formal, exigindo controle social rigoroso dos tribunais de contas (TCU e TCEs) e dos cidadãos locais.
        </p>
        
        <div class="grid g3" style="gap:10px">
          <div class="stat" style="padding:12px">
            <span>Agilidade vs Controle</span>
            <b style="font-size:14px">Sem Convênio Prévio</b>
            <span class="xs muted">O recurso cai direto na conta corrente municipal</span>
          </div>
          <div class="stat" style="padding:12px">
            <span>Fiscalização</span>
            <b style="font-size:14px">TCU, CGU & TCEs</b>
            <span class="xs muted">Obrigação de plano de trabalho e transparência ativa</span>
          </div>
          <div class="stat" style="padding:12px">
            <span>Destinação Vedada</span>
            <b style="font-size:14px">Proibido Pessoal & Dívida</b>
            <span class="xs muted">Mínimo de 70% em investimento público estruturante</span>
          </div>
        </div>

        <div class="row between" style="background:var(--s1); padding:12px 16px; border-radius:var(--r-md); margin-top:4px">
          <div>
            <b style="font-size:13px">Como fiscalizar as emendas enviadas à sua cidade?</b>
            <p class="xs muted">Consulte os portais oficiais de transparência orçamentária do Governo Federal e do Congresso:</p>
          </div>
          <div class="row" style="gap:8px">
            <a href="https://portaldatransparencia.gov.br/emendas" target="_blank" rel="noopener noreferrer" class="btn sm primary">
              <span>Portal da Transparência</span><span class="mi" style="font-size:13px">open_in_new</span>
            </a>
            <a href="https://www12.senado.leg.br/orcamento/sigabrasil" target="_blank" rel="noopener noreferrer" class="btn sm outlined">
              <span>Siga Brasil (Senado)</span><span class="mi" style="font-size:13px">open_in_new</span>
            </a>
          </div>
        </div>
      </div>

      <div class="row between" style="margin-top:10px">
        <h3 class="h2" style="font-size:16px">Medidas Provisórias em Tramitação (Atos do Poder Executivo)</h3>
        <span class="xs muted">Fonte: API de Dados Abertos da Câmara dos Deputados</span>
      </div>

      <div id="mpv-list" class="stack">
        <div class="card soft row" style="padding:16px"><span class="spin"></span><span class="muted">Carregando Medidas Provisórias…</span></div>
      </div>
    </div>

    <!-- PANE CONFRONTO 1 VS 1 -->
    <div id="confronto-pane" class="stack hidden">
      <div class="card stack" style="gap:16px; padding:20px">
        <div class="row between">
          <div>
            <h3 class="h2" style="font-size:16px">Matriz de Convergência & Confronto Direto 1 vs 1</h3>
            <p class="sm muted">Selecione dois parlamentares para comparar seus votos nominais lado a lado e calcular o grau de alinhamento político.</p>
          </div>
          <span class="chip blue">Inteligência Cívica</span>
        </div>

        ${
          politicians.length < 2
            ? `
          <div class="card empty" style="padding:28px">
            <span class="mi">compare_arrows</span>
            <h3>Necessário ao menos 2 parlamentares</h3>
            <p>Cadastre ao menos dois políticos na sua lista para calcular a matriz de convergência de votos.</p>
          </div>`
            : `
          <div class="grid g2" style="gap:14px">
            <div>
              <label class="label" for="sel-pol-a">Parlamentar A</label>
              <select class="input" id="sel-pol-a">
                ${politicians
                  .map(
                    (p, idx) =>
                      `<option value="${p.id}" ${idx === 0 ? 'selected' : ''}>${esc(p.name)} (${esc(p.party || '—')}/${esc(p.uf || '')})</option>`
                  )
                  .join('')}
              </select>
            </div>
            <div>
              <label class="label" for="sel-pol-b">Parlamentar B</label>
              <select class="input" id="sel-pol-b">
                ${politicians
                  .map(
                    (p, idx) =>
                      `<option value="${p.id}" ${idx === 1 ? 'selected' : ''}>${esc(p.name)} (${esc(p.party || '—')}/${esc(p.uf || '')})</option>`
                  )
                  .join('')}
              </select>
            </div>
          </div>

          <div id="confronto-results" class="stack" style="margin-top:8px">
            <div class="card soft row" style="padding:14px"><span class="spin"></span><span class="muted">Calculando convergência de votos nominais…</span></div>
          </div>`
        }
      </div>
    </div>
  `;

  $('#add', root).onclick = () => openPoliticianModal();
  $('#btn-glossary', root).onclick = () => openGlossaryModal();

  // Tabs do Comparador
  const tabButtons = root.querySelectorAll('#house-tabs button');
  const camaraPane = $('#camara-pane', root);
  const senadoPane = $('#senado-pane', root);
  const executivoPane = $('#executivo-pane', root);
  const confrontoPane = $('#confronto-pane', root);

  let mpvLoaded = false;
  let camaraRowsCache = null;

  async function loadMpvList() {
    if (mpvLoaded) return;
    const mpvContainer = $('#mpv-list', root);
    try {
      const mpvs = await recentProvisionalMeasures(10);
      mpvContainer.innerHTML = mpvs.length
        ? mpvs.map(mpvCard).join('')
        : '<div class="card empty"><p class="muted">Nenhuma Medida Provisória recente encontrada.</p></div>';
      mpvLoaded = true;
    } catch {
      mpvContainer.innerHTML =
        '<div class="card empty"><span class="mi">cloud_off</span><p class="muted">Falha temporária ao consultar Medidas Provisórias.</p></div>';
    }
  }

  async function computeConfrontation() {
    const resEl = $('#confronto-results', root);
    if (!resEl) return;
    const selA = $('#sel-pol-a', root)?.value;
    const selB = $('#sel-pol-b', root)?.value;
    if (!selA || !selB || selA === selB) {
      resEl.innerHTML = '<div class="card soft sm" style="padding:14px"><span class="mi" style="color:var(--secondary); font-size:18px">info</span> Selecione dois parlamentares diferentes para comparar.</div>';
      return;
    }

    const polA = politicians.find((p) => p.id === selA);
    const polB = politicians.find((p) => p.id === selB);
    if (!polA || !polB) return;

    resEl.innerHTML = '<div class="card soft row" style="padding:14px"><span class="spin"></span><span class="muted">Cruzando histórico de votações nominais…</span></div>';

    try {
      if (!camaraRowsCache) {
        camaraRowsCache = await loadComparison(politicians, 16);
      }

      let matches = 0;
      let diffs = 0;
      const commonVotes = [];

      for (const row of camaraRowsCache) {
        const vA = row.byPol[polA.id];
        const vB = row.byPol[polB.id];
        if (vA && vB) {
          const isSame = vA.toLowerCase() === vB.toLowerCase();
          if (isSame) matches++;
          else diffs++;
          commonVotes.push({
            matter: row.descricao || 'Votação no Plenário',
            date: row.data,
            voteA: vA,
            voteB: vB,
            isSame,
          });
        }
      }

      const total = matches + diffs;
      const pct = total > 0 ? Math.round((matches / total) * 100) : 0;

      resEl.innerHTML = `
        <div class="card soft stack" style="gap:12px; padding:18px; background:var(--primary-soft)">
          <div class="row between">
            <div>
              <span class="xs muted" style="text-transform:uppercase; font-weight:700">Taxa de Convergência Cívica</span>
              <h2 style="font-size:28px; color:var(--primary); font-weight:800; margin-top:2px">${pct}% de Alinhamento</h2>
              <span class="xs muted">Base: ${total} votações simultâneas (${matches} votos iguais, ${diffs} divergentes)</span>
            </div>
            <button class="btn primary sm" id="btn-share-confronto"><span class="mi">share</span>Card Social</button>
          </div>
          <div class="bar" style="height:10px; margin:4px 0"><i style="width:${pct}%"></i></div>
        </div>

        <div class="stack" style="gap:8px; margin-top:10px">
          <h4 class="xs muted" style="text-transform:uppercase; font-weight:700">Histórico de Votos Lado a Lado:</h4>
          ${
            commonVotes.length
              ? commonVotes
                  .map(
                    (cv) => `
            <div class="card soft stack" style="gap:6px; padding:12px; border-left:3px solid ${
              cv.isSame ? 'var(--primary)' : 'var(--error)'
            }">
              <div class="row between xs">
                <span class="chip ${cv.isSame ? 'green' : 'red'}">${cv.isSame ? 'Votos Coincidentes' : 'Divergência'}</span>
                <span class="muted">${fmtDate(cv.date)}</span>
              </div>
              <p style="font-size:13.5px; font-weight:600">${esc(cv.matter)}</p>
              <div class="grid" style="grid-template-columns:1fr 1fr; gap:8px; margin-top:4px">
                <div class="row between sm" style="background:var(--s2); padding:6px 12px; border-radius:var(--r-sm)">
                  <span class="truncate" style="max-width:140px"><b>${esc(polA.name.split(' ')[0])}:</b></span>
                  <span class="vote ${VOTE_CLASS[cv.voteA] || ''}">${esc(cv.voteA)}</span>
                </div>
                <div class="row between sm" style="background:var(--s2); padding:6px 12px; border-radius:var(--r-sm)">
                  <span class="truncate" style="max-width:140px"><b>${esc(polB.name.split(' ')[0])}:</b></span>
                  <span class="vote ${VOTE_CLASS[cv.voteB] || ''}">${esc(cv.voteB)}</span>
                </div>
              </div>
            </div>`
                  )
                  .join('')
              : '<p class="muted">Nenhuma votação simultânea recente localizada para esses parlamentares.</p>'
          }
        </div>
      `;

      const btnShareConf = $('#btn-share-confronto', resEl);
      if (btnShareConf) {
        btnShareConf.onclick = () => {
          openShareModal({
            politician: polA,
            title: 'Confronto Cívico 1 vs 1',
            highlight: `${polA.name} vs ${polB.name}: ${pct}% de alinhamento em votações`,
            badge: `${pct}% CONVERGÊNCIA`,
            badgeColor: pct >= 50 ? '#008732' : '#ba1a1a',
            detailText: `${matches} votos coincidentes • ${diffs} divergentes`,
          });
        };
      }
    } catch (err) {
      resEl.innerHTML = `<p class="muted">Erro no cálculo de confronto: ${esc(err.message)}</p>`;
    }
  }

  const selAEl = $('#sel-pol-a', root);
  const selBEl = $('#sel-pol-b', root);
  if (selAEl && selBEl) {
    selAEl.onchange = computeConfrontation;
    selBEl.onchange = computeConfrontation;
  }

  tabButtons.forEach((btn) => {
    btn.onclick = () => {
      tabButtons.forEach((b) => b.classList.remove('on'));
      btn.classList.add('on');
      const house = btn.dataset.house;
      camaraPane.classList.toggle('hidden', house !== 'camara');
      senadoPane.classList.toggle('hidden', house !== 'senado');
      executivoPane.classList.toggle('hidden', house !== 'executivo');
      confrontoPane.classList.toggle('hidden', house !== 'confronto');
      if (house === 'executivo') loadMpvList();
      if (house === 'confronto') computeConfrontation();
    };
  });

  // Filtros combinados
  let activeTheme = 'all';
  const filterInput = $('#search-filter', root);

  function applyFilters() {
    const q = filterInput.value.toLowerCase().trim();
    root.querySelectorAll('#camara-list article, #senado-list article, #mpv-list article').forEach((card) => {
      const txt = card.dataset.text || '';
      const cat = card.dataset.category || 'geral';
      const matchText = !q || txt.includes(q);
      const matchTheme = activeTheme === 'all' || cat === activeTheme;
      card.style.display = matchText && matchTheme ? '' : 'none';
    });
  }

  filterInput.oninput = applyFilters;

  root.querySelectorAll('#theme-chips button').forEach((btn) => {
    btn.onclick = () => {
      root.querySelectorAll('#theme-chips button').forEach((b) => b.classList.remove('green'));
      btn.classList.add('green');
      activeTheme = btn.dataset.filter;
      applyFilters();
    };
  });

  // Carrega Câmara
  if (deputies.length) {
    const camaraList = $('#camara-list', root);
    try {
      const rows = await loadComparison(politicians, 14);
      camaraRowsCache = rows;
      camaraList.innerHTML = rows.length
        ? rows.map((v) => camaraVotingCard(v, deputies)).join('')
        : '<div class="card empty"><p class="muted">Sem votações nominais recentes na Câmara.</p></div>';
    } catch {
      camaraList.innerHTML =
        '<div class="card empty"><span class="mi">cloud_off</span><p class="muted">Falha temporária ao consultar a Câmara dos Deputados.</p></div>';
    }
  }

  // Carrega Senado
  if (senators.length) {
    const senadoList = $('#senado-list', root);
    try {
      const rows = await loadSenateComparison(politicians, 14);
      senadoList.innerHTML = rows.length
        ? rows.map((v) => senadoVotingCard(v, senators)).join('')
        : '<div class="card empty"><p class="muted">Sem registros de votação recente para os senadores selecionados.</p></div>';
    } catch {
      senadoList.innerHTML =
        '<div class="card empty"><span class="mi">cloud_off</span><p class="muted">Falha temporária ao consultar o Senado Federal.</p></div>';
    }
  }
}
