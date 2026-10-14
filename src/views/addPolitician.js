import { store } from '../store.js';
import {
  searchDeputies,
  searchSenators,
  searchStateDeputies,
  searchCapitalCouncilors,
  FEDERATION_UNITS,
} from '../api.js';
import { modal, esc, avatar, ROLES, defaultMandate, toast, tablist, $ } from '../ui.js';

// Modal de Cadastro Cívico e Seleção de Representantes (Inspirado no Stitch)
export function openPoliticianModal({ replaceId } = {}) {
  const currentCount = store.get().politicians.length;
  const targetTotal = 5;
  const userDomicile = store.get().domicile || { state: 'SP', city: 'São Paulo' };
  const initialUf = (userDomicile.state || userDomicile.uf || 'SP').toUpperCase();
  const initialCouncilUf = FEDERATION_UNITS.some((u) => u.uf === initialUf && u.hasCouncil) ? initialUf : 'SP';

  const { el, close } = modal(`
    <!-- Header do Cadastro Cívico (Stitch) -->
    <div class="stack u-gap-12">
      <div class="row between nowrap">
        <div class="row nowrap u-gap-10">
          <div class="u-width-36 u-height-36 u-br-10 u-bg-primary-soft u-c-primary u-d-grid u-place-items-center">
            <span class="mi u-fs-22" aria-hidden="true">how_to_vote</span>
          </div>
          <div>
            <span class="xs muted u-tt-uppercase u-fw-700">Configuração Cívica Personalizada</span>
            <h3 class="h2 u-fs-18 u-fw-800">${replaceId ? 'Substituir Representante' : 'Cadastro do Voto & Monitoramento'}</h3>
          </div>
        </div>
        <button class="btn icon ghost" data-close aria-label="Fechar"><span class="mi" aria-hidden="true">close</span></button>
      </div>

      <!-- Barra de Progresso do Cadastro Cívico (Stitch) -->
      <div class="card soft stack u-gap-6 u-p-12">
        <div class="row between xs u-fw-700">
          <div class="row u-gap-6 u-c-primary">
            <span class="mi u-fs-16" aria-hidden="true">assignment_turned_in</span>
            <span>Progresso do Cadastro: ${currentCount} de ${targetTotal} preenchidos</span>
          </div>
          <span class="muted">${Math.min(100, Math.round((currentCount / targetTotal) * 100))}%</span>
        </div>
        <div class="bar u-height-6">
          <i data-w="${Math.min(100, Math.round((currentCount / targetTotal) * 100))}"></i>
        </div>
      </div>

      <!-- Banner de Sigilo Constitucional (Stitch) -->
      <div class="row sm u-bg-secondary-soft u-c-on-secondary-soft u-p-10-14 u-br-r-md u-gap-10">
        <span class="mi u-fs-20 u-c-secondary" aria-hidden="true">lock</span>
        <div class="u-flex-1">
          <b class="u-d-block u-fs-12_5">Sigilo Constitucional do Voto</b>
          <span class="xs u-lh-1_4">Estes dados ficam salvos exclusivamente no seu dispositivo para montar seu feed individual e alertas.</span>
        </div>
      </div>
    </div>

    <!-- Abas Federativas MD3 -->
    <div class="tabs u-ovx-auto u-maxw-100pct u-white-space-nowrap u-p-4" id="tabs" aria-label="Tipo de cargo">
      <button class="on" data-tab="camara">Dep. Federal (Câmara)</button>
      <button data-tab="senado">Senador da República</button>
      <button data-tab="estadual">Dep. Estadual (27 UFs)</button>
      <button data-tab="municipal">Vereador (26 Capitais)</button>
      <button data-tab="manual">Outro Cargo / Executivo</button>
    </div>

    <!-- PANE CÂMARA -->
    <div id="pane-camara" class="stack u-gap-10">
      <div>
        <label class="label" for="q-dep">Nome do Deputado Federal</label>
        <input class="input" id="q-dep" placeholder="Ex.: Tabata Amaral, Nikolas Ferreira, Guilherme Boulos" autocomplete="off">
      </div>
      <div id="results-dep" class="stack u-maxh-340 u-ovy-auto u-pr-4"></div>
      <p class="xs muted">Fonte oficial: API de Dados Abertos da Câmara dos Deputados.</p>
    </div>

    <!-- PANE SENADO -->
    <div id="pane-senado" class="stack hidden u-gap-10">
      <div>
        <label class="label" for="q-sen">Nome ou UF do Senador</label>
        <input class="input" id="q-sen" placeholder="Ex.: Marcos Pontes, Rodrigo Pacheco, SP, MG, BA" autocomplete="off">
      </div>
      <div id="results-sen" class="stack u-maxh-340 u-ovy-auto u-pr-4"></div>
      <p class="xs muted">Fonte oficial: API de Dados Abertos do Senado Federal.</p>
    </div>

    <!-- PANE ESTADUAL (27 ASSEMBLEIAS LEGISLATIVAS) -->
    <div id="pane-estadual" class="stack hidden u-gap-10">
      <div class="row between u-gap-8 u-ai-center u-fwrap-wrap">
        <label class="label u-m-0 u-fw-700" for="sel-state-uf">Assembleia Legislativa:</label>
        <div class="row nowrap u-gap-6 u-flex-1 u-maxw-320">
          <select class="input sm u-fw-700 u-width-100pct" id="sel-state-uf">
            ${FEDERATION_UNITS.map(
              (u) => `<option value="${u.uf}" ${u.uf === initialUf ? 'selected' : ''}>${u.uf} - ${u.assembly} (${u.name})</option>`
            ).join('')}
          </select>
        </div>
      </div>
      <div>
        <label class="label" for="q-est">Nome, partido ou base eleitoral do Deputado Estadual</label>
        <input class="input" id="q-est" placeholder="Ex.: Nome, partido, área de atuação ou cidade" autocomplete="off">
      </div>
      <div id="results-est" class="stack u-maxh-340 u-ovy-auto u-pr-4"></div>
      <p class="xs muted" id="est-source-label">Fonte oficial: Assembleia Legislativa.</p>
    </div>

    <!-- PANE MUNICIPAL (26 CÂMARAS DE CAPITAIS) -->
    <div id="pane-municipal" class="stack hidden u-gap-10">
      <div class="row between u-gap-8 u-ai-center u-fwrap-wrap">
        <div class="row nowrap u-gap-6">
          <span class="chip teal xs">Câmara Municipal</span>
          <span class="xs muted">26 Capitais</span>
        </div>
        <div class="row nowrap u-gap-6 u-flex-1 u-maxw-320">
          <select class="input sm u-fw-700 u-width-100pct" id="sel-council-uf">
            ${FEDERATION_UNITS.filter((u) => u.hasCouncil).map(
              (u) => `<option value="${u.uf}" ${u.uf === initialCouncilUf ? 'selected' : ''}>${u.capital} (${u.uf}) - ${u.council}</option>`
            ).join('')}
          </select>
        </div>
      </div>
      <div>
        <label class="label" for="q-mun">Nome, partido ou bairro do Vereador</label>
        <input class="input" id="q-mun" placeholder="Ex.: Nome, partido, bairro ou área de atuação" autocomplete="off">
      </div>
      <div id="results-mun" class="stack u-maxh-340 u-ovy-auto u-pr-4"></div>
      <p class="xs muted" id="mun-source-label">Fonte oficial: Câmara Municipal da Capital.</p>
    </div>

    <!-- PANE MANUAL / EXECUTIVO -->
    <form id="pane-manual" class="stack hidden u-gap-10">
      <div>
        <label class="label" for="m-name">Nome do Candidato / Representante</label>
        <input class="input" id="m-name" required placeholder="Ex.: Tarcísio de Freitas, Lula">
      </div>
      <div class="grid g2 u-gap-10">
        <div>
          <label class="label" for="m-role">Cargo em Exercício</label>
          <select class="input" id="m-role">
            ${Object.entries(ROLES)
              .filter(([k]) => k !== 'dep-federal' && k !== 'senador')
              .map(([k, r]) => `<option value="${k}">${r.label}</option>`)
              .join('')}
          </select>
        </div>
        <div>
          <label class="label" for="m-uf">UF</label>
          <input class="input" id="m-uf" maxlength="2" placeholder="SP">
        </div>
      </div>
      <div>
        <label class="label" for="m-party">Partido Político</label>
        <input class="input" id="m-party" placeholder="Ex.: REPUBLICANOS, PT, PL">
      </div>
      <button class="btn primary u-mt-6" type="submit">
        <span class="mi" aria-hidden="true">add</span>Salvar e Iniciar Monitoramento
      </button>
    </form>
  `);

  const save = (p) => {
    if (replaceId) {
      store.replacePolitician(replaceId, p);
      toast('Político substituído com sucesso.');
      close();
      return;
    }
    if (!store.addPolitician(p)) {
      return toast('Este político já está na sua lista monitorada.', 'info');
    }
    toast(`${p.name} adicionado ao monitoramento.`);
    close();
  };

  // Alternância de abas
  el.querySelectorAll('#tabs button').forEach((b) => {
    b.onclick = () => {
      el.querySelectorAll('#tabs button').forEach((x) => x.classList.toggle('on', x === b));
      $('#pane-camara', el).classList.toggle('hidden', b.dataset.tab !== 'camara');
      $('#pane-senado', el).classList.toggle('hidden', b.dataset.tab !== 'senado');
      $('#pane-estadual', el).classList.toggle('hidden', b.dataset.tab !== 'estadual');
      $('#pane-municipal', el).classList.toggle('hidden', b.dataset.tab !== 'municipal');
      $('#pane-manual', el).classList.toggle('hidden', b.dataset.tab !== 'manual');
      if (b.dataset.tab === 'senado') loadSenatorsInitial();
      if (b.dataset.tab === 'estadual') {
        updateStateSourceLabel(activeStateUf);
        loadEstadualInitial($('#q-est', el).value);
      }
      if (b.dataset.tab === 'municipal') {
        updateCouncilSourceLabel(activeCouncilUf);
        loadMunicipalInitial($('#q-mun', el).value);
      }
    };
  });
  tablist($('#tabs', el), (b) => $(`#pane-${b.dataset.tab}`, el));

  // 1. Busca Deputados Federais (Câmara)
  let timerDep;
  const resultsDep = $('#results-dep', el);
  $('#q-dep', el).addEventListener('input', (e) => {
    clearTimeout(timerDep);
    const v = e.target.value.trim();
    if (v.length < 2) {
      resultsDep.innerHTML = '';
      return;
    }
    resultsDep.innerHTML = '<div class="card soft row sm u-p-12"><span class="spin"></span><span class="muted">Consultando Câmara dos Deputados…</span></div>';
    timerDep = setTimeout(async () => {
      try {
        const list = await searchDeputies(v);
        resultsDep.innerHTML = list.length
          ? list
              .map(
                (d, i) => `
              <div class="card soft row between sm u-p-10-12 u-br-r-md u-bg-s2">
                <div class="row nowrap u-gap-10">
                  ${avatar(d, 'sm')}
                  <div>
                    <b class="u-fs-13_5">${esc(d.name)}</b><br>
                    <span class="xs muted">${esc(d.party)}/${esc(d.uf)} • Deputado Federal</span>
                  </div>
                </div>
                <button class="btn primary sm btn-select-dep" data-i="${i}">
                  <span class="mi u-fs-14" aria-hidden="true">check</span>Votei nele(a)
                </button>
              </div>`
              )
              .join('')
          : '<p class="muted sm u-p-8">Nenhum deputado federal encontrado.</p>';

        resultsDep.querySelectorAll('.btn-select-dep').forEach((btn) => {
          btn.onclick = () => {
            const d = list[btn.dataset.i];
            save({
              id: `camara-${d.camaraId}`,
              source: 'camara',
              camaraId: d.camaraId,
              name: d.name,
              party: d.party,
              uf: d.uf,
              photo: d.photo,
              roleKey: 'dep-federal',
              mandate: defaultMandate('dep-federal'),
            });
          };
        });
      } catch {
        resultsDep.innerHTML = '<p class="muted sm">Falha na consulta à Câmara. Verifique sua conexão.</p>';
      }
    }, 300);
  });

  // 2. Busca Senadores (Senado)
  let timerSen;
  const resultsSen = $('#results-sen', el);
  async function loadSenatorsInitial(query = '') {
    resultsSen.innerHTML = '<div class="card soft row sm u-p-12"><span class="spin"></span><span class="muted">Consultando Senado Federal…</span></div>';
    try {
      const list = await searchSenators(query);
      resultsSen.innerHTML = list.length
        ? list
            .map(
              (s, i) => `
            <div class="card soft row between sm u-p-10-12 u-br-r-md u-bg-s2">
              <div class="row nowrap u-gap-10">
                ${avatar(s, 'sm')}
                <div>
                  <b class="u-fs-13_5">${esc(s.name)}</b><br>
                  <span class="xs muted">${esc(s.party)}/${esc(s.uf)} • Senador da República</span>
                </div>
              </div>
              <button class="btn primary sm btn-select-sen" data-i="${i}">
                <span class="mi u-fs-14" aria-hidden="true">check</span>Votei nele(a)
              </button>
            </div>`
            )
            .join('')
        : '<p class="muted sm u-p-8">Nenhum senador encontrado.</p>';

      resultsSen.querySelectorAll('.btn-select-sen').forEach((btn) => {
        btn.onclick = () => {
          const s = list[btn.dataset.i];
          save({
            id: `senado-${s.senadoId}`,
            source: 'senado',
            senadoId: s.senadoId,
            name: s.name,
            party: s.party,
            uf: s.uf,
            photo: s.photo,
            roleKey: 'senador',
            mandate: s.mandate || defaultMandate('senador'),
          });
        };
      });
    } catch {
      resultsSen.innerHTML = '<p class="muted sm">Falha na consulta ao Senado Federal.</p>';
    }
  }

  $('#q-sen', el).addEventListener('input', (e) => {
    clearTimeout(timerSen);
    const v = e.target.value.trim();
    timerSen = setTimeout(() => loadSenatorsInitial(v), 250);
  });

  // 3. Busca Deputados Estaduais (27 Assembleias Legislativas)
  let activeStateUf = initialUf;
  let timerEst;
  const resultsEst = $('#results-est', el);
  const estSourceLabel = $('#est-source-label', el);
  const selStateUf = $('#sel-state-uf', el);

  function updateStateSourceLabel(uf) {
    const meta = FEDERATION_UNITS.find((u) => u.uf === uf) || { assembly: 'AL', name: uf, totalDep: 24, domain: '' };
    estSourceLabel.innerText = `Fonte oficial: Repositório de Dados Abertos da ${meta.assembly} (${meta.name}) • ${meta.totalDep} deputados • ${meta.domain || 'Portal Oficial'}.`;
  }

  selStateUf.addEventListener('change', (e) => {
    activeStateUf = e.target.value;
    updateStateSourceLabel(activeStateUf);
    loadEstadualInitial($('#q-est', el).value);
  });

  async function loadEstadualInitial(query = '') {
    resultsEst.innerHTML = '<div class="card soft row sm u-p-12"><span class="spin"></span><span class="muted">Consultando deputados estaduais…</span></div>';
    try {
      const list = await searchStateDeputies(activeStateUf, query);
      resultsEst.innerHTML = list.length
        ? list
            .map(
              (d, i) => `
            <div class="card soft row between sm u-p-10-12 u-br-r-md u-bg-s2">
              <div class="row nowrap u-gap-10 u-flex-1 u-overflow-hidden">
                ${avatar(d, 'sm')}
                <div class="u-flex-1 u-overflow-hidden">
                  <b class="u-fs-13_5">${esc(d.name)}</b>
                  <span class="chip purple xs u-ml-4">${esc(d.party)}/${esc(d.state || activeStateUf)}</span><br>
                  <span class="xs muted truncate u-d-block u-maxw-260">${esc(d.baseEleitoral || d.house || '')}</span>
                </div>
              </div>
              <button class="btn primary sm btn-select-est" data-i="${i}">
                <span class="mi u-fs-14" aria-hidden="true">check</span>Votei
              </button>
            </div>`
            )
            .join('')
        : '<p class="muted sm u-p-8">Nenhum deputado estadual encontrado para essa busca.</p>';

      resultsEst.querySelectorAll('.btn-select-est').forEach((btn) => {
        btn.onclick = () => {
          const d = list[btn.dataset.i];
          save({
            id: d.id,
            source: d.source || `al-${(d.state || activeStateUf).toLowerCase()}`,
            matricula: d.matricula,
            name: d.name,
            fullName: d.fullName,
            party: d.party,
            uf: d.state || activeStateUf,
            house: d.house,
            photo: d.photo,
            roleKey: 'dep-estadual',
            mandate: defaultMandate('dep-estadual', d.state || activeStateUf),
            email: d.email,
            phone: d.phone,
            room: d.room,
            baseEleitoral: d.baseEleitoral,
            areaAtuacao: d.areaAtuacao,
            pageUrl: d.pageUrl,
            tse: d.tse,
          });
        };
      });
    } catch {
      resultsEst.innerHTML = '<p class="muted sm">Falha ao carregar deputados estaduais.</p>';
    }
  }

  $('#q-est', el).addEventListener('input', (e) => {
    clearTimeout(timerEst);
    const v = e.target.value.trim();
    timerEst = setTimeout(() => loadEstadualInitial(v), 150);
  });

  // 4. Busca Vereadores (26 Câmaras de Capitais)
  let activeCouncilUf = initialCouncilUf;
  let timerMun;
  const resultsMun = $('#results-mun', el);
  const munSourceLabel = $('#mun-source-label', el);
  const selCouncilUf = $('#sel-council-uf', el);

  function updateCouncilSourceLabel(uf) {
    const meta = FEDERATION_UNITS.find((u) => u.uf === uf) || { council: 'CM', capital: uf, councilDep: 21, councilName: 'Câmara Municipal' };
    munSourceLabel.innerText = `Fonte oficial: Portal Aberto da ${meta.councilName || 'Câmara Municipal'} (${meta.capital} - ${meta.uf}) • ${meta.councilDep || 21} vereadores.`;
  }

  selCouncilUf.addEventListener('change', (e) => {
    activeCouncilUf = e.target.value;
    updateCouncilSourceLabel(activeCouncilUf);
    loadMunicipalInitial($('#q-mun', el).value);
  });

  async function loadMunicipalInitial(query = '') {
    resultsMun.innerHTML = '<div class="card soft row sm u-p-12"><span class="spin"></span><span class="muted">Consultando vereadores…</span></div>';
    try {
      const list = await searchCapitalCouncilors(activeCouncilUf, query);
      resultsMun.innerHTML = list.length
        ? list
            .map(
              (c, i) => `
            <div class="card soft row between sm u-p-10-12 u-br-r-md u-bg-s2">
              <div class="row nowrap u-gap-10 u-flex-1 u-overflow-hidden">
                ${avatar(c, 'sm')}
                <div class="u-flex-1 u-overflow-hidden">
                  <b class="u-fs-13_5">${esc(c.name)}</b>
                  <span class="chip teal xs u-ml-4">${esc(c.party)}/${esc(c.state || activeCouncilUf)}</span><br>
                  <span class="xs muted truncate u-d-block u-maxw-260">${esc(c.baseEleitoral || c.areaAtuacao || c.city || '')}</span>
                </div>
              </div>
              <button class="btn primary sm btn-select-mun" data-i="${i}">
                <span class="mi u-fs-14" aria-hidden="true">check</span>Votei
              </button>
            </div>`
            )
            .join('')
        : '<p class="muted sm u-p-8">Nenhum vereador encontrado nesta capital.</p>';

      resultsMun.querySelectorAll('.btn-select-mun').forEach((btn) => {
        btn.onclick = () => {
          const c = list[btn.dataset.i];
          save({
            id: c.id,
            source: c.source || `cm-${(c.state || activeCouncilUf).toLowerCase()}`,
            cmId: c.cmId,
            name: c.name,
            fullName: c.fullName,
            party: c.party,
            uf: c.state || activeCouncilUf,
            city: c.city || 'Capital',
            house: c.house,
            photo: c.photo,
            roleKey: 'vereador',
            mandate: defaultMandate('vereador'),
            email: c.email,
            phone: c.phone,
            room: c.room,
            baseEleitoral: c.baseEleitoral,
            areaAtuacao: c.areaAtuacao,
            pageUrl: c.pageUrl,
            tse: c.tse,
          });
        };
      });
    } catch {
      resultsMun.innerHTML = '<p class="muted sm">Falha ao carregar vereadores da capital.</p>';
    }
  }

  $('#q-mun', el).addEventListener('input', (e) => {
    clearTimeout(timerMun);
    const v = e.target.value.trim();
    timerMun = setTimeout(() => loadMunicipalInitial(v), 150);
  });

  // 5. Formulário manual
  $('#pane-manual', el).onsubmit = (e) => {
    e.preventDefault();
    const roleKey = $('#m-role', el).value;
    const name = $('#m-name', el).value.trim();
    save({
      id: `manual-${Date.now()}`,
      source: 'manual',
      name,
      party: $('#m-party', el).value.trim().toUpperCase(),
      uf: $('#m-uf', el).value.trim().toUpperCase(),
      roleKey,
      mandate: defaultMandate(roleKey),
    });
  };

  setTimeout(() => $('#q-dep', el).focus(), 60);
}

