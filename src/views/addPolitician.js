import { store } from '../store.js';
import {
  searchDeputies,
  searchSenators,
  searchStateDeputies,
  searchCapitalCouncilors,
  FEDERATION_UNITS,
} from '../api.js';
import { modal, esc, avatar, ROLES, defaultMandate, toast, $ } from '../ui.js';

// Modal de Cadastro Cívico e Seleção de Representantes (Inspirado no Stitch)
export function openPoliticianModal({ replaceId } = {}) {
  const currentCount = store.get().politicians.length;
  const targetTotal = 5;
  const userDomicile = store.get().domicile || { uf: 'SP', city: 'São Paulo' };
  const initialUf = userDomicile.uf?.toUpperCase() || 'SP';
  const initialCouncilUf = FEDERATION_UNITS.some((u) => u.uf === initialUf && u.hasCouncil) ? initialUf : 'SP';

  const { el, close } = modal(`
    <!-- Header do Cadastro Cívico (Stitch) -->
    <div class="stack" style="gap:12px">
      <div class="row between nowrap">
        <div class="row nowrap" style="gap:10px">
          <div style="width:36px; height:36px; border-radius:10px; background:var(--primary-soft); color:var(--primary); display:grid; place-items:center">
            <span class="mi" style="font-size:22px">how_to_vote</span>
          </div>
          <div>
            <span class="xs muted" style="text-transform:uppercase; font-weight:700">Configuração Cívica Personalizada</span>
            <h3 class="h2" style="font-size:18px; font-weight:800">${replaceId ? 'Substituir Representante' : 'Cadastro do Voto & Monitoramento'}</h3>
          </div>
        </div>
        <button class="btn icon ghost" data-close aria-label="Fechar"><span class="mi">close</span></button>
      </div>

      <!-- Barra de Progresso do Cadastro Cívico (Stitch) -->
      <div class="card soft stack" style="gap:6px; padding:12px">
        <div class="row between xs" style="font-weight:700">
          <div class="row" style="gap:6px; color:var(--primary)">
            <span class="mi" style="font-size:16px">assignment_turned_in</span>
            <span>Progresso do Cadastro: ${currentCount} de ${targetTotal} preenchidos</span>
          </div>
          <span class="muted">${Math.min(100, Math.round((currentCount / targetTotal) * 100))}%</span>
        </div>
        <div class="bar" style="height:6px">
          <i style="width:${Math.min(100, Math.round((currentCount / targetTotal) * 100))}%"></i>
        </div>
      </div>

      <!-- Banner de Sigilo Constitucional (Stitch) -->
      <div class="row sm" style="background:var(--secondary-soft); color:var(--on-secondary-soft); padding:10px 14px; border-radius:var(--r-md); gap:10px">
        <span class="mi" style="font-size:20px; color:var(--secondary)">lock</span>
        <div style="flex:1">
          <b style="display:block; font-size:12.5px">Sigilo Constitucional do Voto</b>
          <span class="xs" style="line-height:1.4">Estes dados ficam criptografados exclusivamente no seu dispositivo para montar seu feed individual e alertas.</span>
        </div>
      </div>
    </div>

    <!-- Abas Federativas MD3 -->
    <div class="tabs" id="tabs" style="overflow-x:auto; max-width:100%; white-space:nowrap; padding:4px">
      <button class="on" data-tab="camara">Dep. Federal (Câmara)</button>
      <button data-tab="senado">Senador da República</button>
      <button data-tab="estadual">Dep. Estadual (27 UFs)</button>
      <button data-tab="municipal">Vereador (26 Capitais)</button>
      <button data-tab="manual">Outro Cargo / Executivo</button>
    </div>

    <!-- PANE CÂMARA -->
    <div id="pane-camara" class="stack" style="gap:10px">
      <div>
        <label class="label" for="q-dep">Nome do Deputado Federal</label>
        <input class="input" id="q-dep" placeholder="Ex.: Tabata Amaral, Nikolas Ferreira, Guilherme Boulos" autocomplete="off">
      </div>
      <div id="results-dep" class="stack" style="max-height:340px; overflow-y:auto; padding-right:4px"></div>
      <p class="xs muted">Fonte oficial: API de Dados Abertos da Câmara dos Deputados.</p>
    </div>

    <!-- PANE SENADO -->
    <div id="pane-senado" class="stack hidden" style="gap:10px">
      <div>
        <label class="label" for="q-sen">Nome ou UF do Senador</label>
        <input class="input" id="q-sen" placeholder="Ex.: Marcos Pontes, Rodrigo Pacheco, SP, MG, BA" autocomplete="off">
      </div>
      <div id="results-sen" class="stack" style="max-height:340px; overflow-y:auto; padding-right:4px"></div>
      <p class="xs muted">Fonte oficial: API de Dados Abertos do Senado Federal.</p>
    </div>

    <!-- PANE ESTADUAL (27 ASSEMBLEIAS LEGISLATIVAS) -->
    <div id="pane-estadual" class="stack hidden" style="gap:10px">
      <div class="row between" style="gap:8px; align-items:center; flex-wrap:wrap">
        <label class="label" for="sel-state-uf" style="margin:0; font-weight:700">Assembleia Legislativa:</label>
        <div class="row nowrap" style="gap:6px; flex:1; max-width:320px">
          <select class="input sm" id="sel-state-uf" style="font-weight:700; width:100%">
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
      <div id="results-est" class="stack" style="max-height:340px; overflow-y:auto; padding-right:4px"></div>
      <p class="xs muted" id="est-source-label">Fonte oficial: Assembleia Legislativa.</p>
    </div>

    <!-- PANE MUNICIPAL (26 CÂMARAS DE CAPITAIS) -->
    <div id="pane-municipal" class="stack hidden" style="gap:10px">
      <div class="row between" style="gap:8px; align-items:center; flex-wrap:wrap">
        <div class="row nowrap" style="gap:6px">
          <span class="chip teal xs">Câmara Municipal</span>
          <span class="xs muted">26 Capitais</span>
        </div>
        <div class="row nowrap" style="gap:6px; flex:1; max-width:320px">
          <select class="input sm" id="sel-council-uf" style="font-weight:700; width:100%">
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
      <div id="results-mun" class="stack" style="max-height:340px; overflow-y:auto; padding-right:4px"></div>
      <p class="xs muted" id="mun-source-label">Fonte oficial: Câmara Municipal da Capital.</p>
    </div>

    <!-- PANE MANUAL / EXECUTIVO -->
    <form id="pane-manual" class="stack hidden" style="gap:10px">
      <div>
        <label class="label" for="m-name">Nome do Candidato / Representante</label>
        <input class="input" id="m-name" required placeholder="Ex.: Tarcísio de Freitas, Lula">
      </div>
      <div class="grid g2" style="gap:10px">
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
      <button class="btn primary" type="submit" style="margin-top:6px">
        <span class="mi">add</span>Salvar e Iniciar Monitoramento
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
    resultsDep.innerHTML = '<div class="card soft row sm" style="padding:12px"><span class="spin"></span><span class="muted">Consultando Câmara dos Deputados…</span></div>';
    timerDep = setTimeout(async () => {
      try {
        const list = await searchDeputies(v);
        resultsDep.innerHTML = list.length
          ? list
              .map(
                (d, i) => `
              <div class="card soft row between sm" style="padding:10px 12px; border-radius:var(--r-md); background:var(--s2)">
                <div class="row nowrap" style="gap:10px">
                  ${avatar(d, 'sm')}
                  <div>
                    <b style="font-size:13.5px">${esc(d.name)}</b><br>
                    <span class="xs muted">${esc(d.party)}/${esc(d.uf)} • Deputado Federal</span>
                  </div>
                </div>
                <button class="btn primary sm btn-select-dep" data-i="${i}">
                  <span class="mi" style="font-size:14px">check</span>Votei nele(a)
                </button>
              </div>`
              )
              .join('')
          : '<p class="muted sm" style="padding:8px">Nenhum deputado federal encontrado.</p>';

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
    resultsSen.innerHTML = '<div class="card soft row sm" style="padding:12px"><span class="spin"></span><span class="muted">Consultando Senado Federal…</span></div>';
    try {
      const list = await searchSenators(query);
      resultsSen.innerHTML = list.length
        ? list
            .map(
              (s, i) => `
            <div class="card soft row between sm" style="padding:10px 12px; border-radius:var(--r-md); background:var(--s2)">
              <div class="row nowrap" style="gap:10px">
                ${avatar(s, 'sm')}
                <div>
                  <b style="font-size:13.5px">${esc(s.name)}</b><br>
                  <span class="xs muted">${esc(s.party)}/${esc(s.uf)} • Senador da República</span>
                </div>
              </div>
              <button class="btn primary sm btn-select-sen" data-i="${i}">
                <span class="mi" style="font-size:14px">check</span>Votei nele(a)
              </button>
            </div>`
            )
            .join('')
        : '<p class="muted sm" style="padding:8px">Nenhum senador encontrado.</p>';

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
    resultsEst.innerHTML = '<div class="card soft row sm" style="padding:12px"><span class="spin"></span><span class="muted">Consultando deputados estaduais…</span></div>';
    try {
      const list = await searchStateDeputies(activeStateUf, query);
      resultsEst.innerHTML = list.length
        ? list
            .map(
              (d, i) => `
            <div class="card soft row between sm" style="padding:10px 12px; border-radius:var(--r-md); background:var(--s2)">
              <div class="row nowrap" style="gap:10px; flex:1; overflow:hidden">
                ${avatar(d, 'sm')}
                <div style="flex:1; overflow:hidden">
                  <b style="font-size:13.5px">${esc(d.name)}</b>
                  <span class="chip purple xs" style="margin-left:4px">${esc(d.party)}/${esc(d.state || activeStateUf)}</span><br>
                  <span class="xs muted truncate" style="display:block; max-width:260px">${esc(d.baseEleitoral || d.house || '')}</span>
                </div>
              </div>
              <button class="btn primary sm btn-select-est" data-i="${i}">
                <span class="mi" style="font-size:14px">check</span>Votei
              </button>
            </div>`
            )
            .join('')
        : '<p class="muted sm" style="padding:8px">Nenhum deputado estadual encontrado para essa busca.</p>';

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
            mandate: defaultMandate('dep-estadual'),
            email: d.email,
            phone: d.phone,
            room: d.room,
            baseEleitoral: d.baseEleitoral,
            areaAtuacao: d.areaAtuacao,
            pageUrl: d.pageUrl,
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
    resultsMun.innerHTML = '<div class="card soft row sm" style="padding:12px"><span class="spin"></span><span class="muted">Consultando vereadores…</span></div>';
    try {
      const list = await searchCapitalCouncilors(activeCouncilUf, query);
      resultsMun.innerHTML = list.length
        ? list
            .map(
              (c, i) => `
            <div class="card soft row between sm" style="padding:10px 12px; border-radius:var(--r-md); background:var(--s2)">
              <div class="row nowrap" style="gap:10px; flex:1; overflow:hidden">
                ${avatar(c, 'sm')}
                <div style="flex:1; overflow:hidden">
                  <b style="font-size:13.5px">${esc(c.name)}</b>
                  <span class="chip teal xs" style="margin-left:4px">${esc(c.party)}/${esc(c.state || activeCouncilUf)}</span><br>
                  <span class="xs muted truncate" style="display:block; max-width:260px">${esc(c.baseEleitoral || c.areaAtuacao || c.city || '')}</span>
                </div>
              </div>
              <button class="btn primary sm btn-select-mun" data-i="${i}">
                <span class="mi" style="font-size:14px">check</span>Votei
              </button>
            </div>`
            )
            .join('')
        : '<p class="muted sm" style="padding:8px">Nenhum vereador encontrado nesta capital.</p>';

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

