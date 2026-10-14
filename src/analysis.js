// Módulo de Análise Textual Legislativa: Detecção de Jabutis (Contrabando Legislativo) e Sumarização Didática.
// 100% Processado no Navegador (Client-side), sem envio para servidores externos (Conforme LGPD).

import { modal, esc, fmtDate, tablist } from './ui.js';

/* ================= 1. DICIONÁRIO TEMÁTICO & CLASSIFICAÇÃO SEMÂNTICA ================= */

const THEMATIC_DOMAINS = {
  ENERGIA: {
    label: 'Energia & Combustíveis',
    keywords: ['energia', 'eletricidade', 'termeletrica', 'termoeletrica', 'carvao', 'gas natural', 'eletrobras', 'distribuidoras', 'aneel', 'tarifa de energia', 'eolico', 'solar', 'petroleo', 'subsídio'],
  },
  TRIBUTARIO: {
    label: 'Tributário & Fiscal',
    keywords: ['tributo', 'imposto', 'isencao', 'incentivo fiscal', 'icms', 'pis', 'cofins', 'aliquota', 'desoneracao', 'renuncia fiscal', 'irpf', 'irpj', 'refis', 'beneficio fiscal'],
  },
  MEIO_AMBIENTE: {
    label: 'Meio Ambiente & Sustentabilidade',
    keywords: ['meio ambiente', 'floresta', 'desmatamento', 'ibama', 'licenciamento ambiental', 'poluicao', 'residuos solidos', 'reciclagem', 'fauna', 'flora', 'reserva legal', 'biodiversidade', 'carbono', 'saneamento'],
  },
  TRANSPORTES: {
    label: 'Transportes & Logística',
    keywords: ['rodovia', 'pedagio', 'ferrovia', 'aviacao', 'aeroporto', 'porto', 'onibus', 'transito', 'veiculo', 'mobilidade urbana', 'faixa exclusiva', 'frete', 'concessao rodoviaria'],
  },
  COMUNICACOES: {
    label: 'Comunicações & Radiodifusão',
    keywords: ['radiodifusao', 'televisao', 'emissora', 'radio', 'anatel', 'concessao de radio', 'espectro', 'telecomunicacoes', 'satelite', 'antena'],
  },
  ELEITORAL: {
    label: 'Direito Eleitoral & Partidos',
    keywords: ['eleicao', 'partido', 'fundo eleitoral', 'propaganda eleitoral', 'tse', 'coligacao', 'quociente', 'fefc', 'candidatura', 'suplente'],
  },
  SAUDE: {
    label: 'Saúde & Vigilância Sanitária',
    keywords: ['saude', 'sus', 'hospital', 'medicamento', 'anvisa', 'vacina', 'medico', 'enfermagem', 'leito', 'farmacia', 'cirurgia'],
  },
  EDUCACAO: {
    label: 'Educação & Ciência',
    keywords: ['escola', 'ensino', 'universidade', 'professor', 'mec', 'enem', 'fies', 'prouni', 'alfabetizacao', 'bolsa de estudo', 'pesquisa cientifica'],
  },
  CORPORATIVO_CARTORIAL: {
    label: 'Corporações, Cartórios & Carreiras',
    keywords: ['cartorio', 'tabeliao', 'registrador', 'despachante', 'emolumentos', 'honorarios', 'estabilidade', 'gratificacao de cargo', 'concurso', 'titularidade'],
  },
};

function normalizeText(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/gi, ' ');
}

function scoreDomain(text, domainKey) {
  const norm = normalizeText(text);
  const words = THEMATIC_DOMAINS[domainKey].keywords;
  let matches = 0;
  for (const w of words) {
    const cleanWord = normalizeText(w);
    const regex = new RegExp(`\\b${cleanWord}\\b`, 'g');
    const count = (norm.match(regex) || []).length;
    matches += count;
  }
  return matches;
}

export function detectCentralDomain(title, summary) {
  const combined = `${title} ${summary}`;
  let bestDomain = 'OUTROS';
  let bestScore = 0;

  for (const [key] of Object.entries(THEMATIC_DOMAINS)) {
    const score = scoreDomain(combined, key);
    if (score > bestScore) {
      bestScore = score;
      bestDomain = key;
    }
  }

  return { domain: bestDomain, score: bestScore };
}

/* ================= 2. DETECTOR DE JABUTIS (MATÉRIA ESTRANHA) ================= */

export function detectJabuti(title, summary, bodyText = '') {
  const central = detectCentralDomain(title, summary);
  const fullText = `${summary} ${bodyText}`;
  const centralKey = central.domain;

  const foreignMatches = [];

  for (const [key, config] of Object.entries(THEMATIC_DOMAINS)) {
    if (key === centralKey) continue;
    const score = scoreDomain(fullText, key);

    // Se houver presença marcante de domínio não relacionado
    if (score >= 2) {
      // Extrair trecho representativo
      const normText = normalizeText(fullText);
      const matchedKeyword = config.keywords.find((k) => normText.includes(normalizeText(k)));

      foreignMatches.push({
        foreignDomain: key,
        domainLabel: config.label,
        keyword: matchedKeyword || 'Termos específicos',
        intensity: score,
        reason: `A matéria original versa sobre ${THEMATIC_DOMAINS[centralKey]?.label || 'tema específico'}, mas foram identificados dispositivos regulando "${config.label}".`,
      });
    }
  }

  const hasJabuti = foreignMatches.length > 0;
  const highestIntensity = foreignMatches.reduce((max, m) => Math.max(max, m.intensity), 0);
  const risk = highestIntensity >= 4 ? 'ALTO' : highestIntensity >= 2 ? 'MÉDIO' : 'BAIXO';

  return {
    hasJabuti,
    risk: hasJabuti ? risk : 'BAIXO',
    centralDomain: centralKey,
    centralLabel: THEMATIC_DOMAINS[centralKey]?.label || 'Matéria Geral',
    foreignMatches,
    stfSummary:
      'STF - ADI 5127: O Supremo Tribunal Federal fixou a tese de inconstitucionalidade material para a inclusão de emendas sem pertinência temática ("jabutis" ou contrabando legislativo) em matérias legislativas.',
  };
}

/* ================= 3. SUMARIZADOR DIDÁTICO DE PROPOSIÇÕES (LINGUAGEM CIDADÃ) ================= */

export function summarizeProposition(p) {
  const code = `${p.type || 'Proposição'} ${p.number || ''}/${p.year || ''}`.trim();
  const summary = p.summary || p.theme || 'Sem ementa disponível.';
  const central = detectCentralDomain(code, summary);

  const analysis = detectJabuti(code, summary, summary);

  return {
    code,
    summary,
    centralDomain: central.domain,
    centralLabel: THEMATIC_DOMAINS[central.domain]?.label || 'Matéria Geral',
    date: p.date || '',
    url: /^https:\/\/(www\.)?(camara|senado)\.leg\.br\//.test(p.url || '') ? p.url : '',
    analysis,
  };
}

/* ================= 4. MODAL INTERATIVO: SCANNER DE JABUTIS & SUMARIZADOR ================= */

export function openAnalysisModal(item) {
  const s = summarizeProposition(item);

  const { el } = modal(`
    <div class="row between no-print">
      <div class="row">
        <span class="mi u-c-primary u-fs-24" aria-hidden="true">psychology</span>
        <div>
          <h3 class="h2 u-fs-16">Inteligência Cívica & Análise Textual</h3>
          <span class="sm muted">${esc(s.code)}</span>
        </div>
      </div>
      <button class="btn icon ghost" data-close aria-label="Fechar"><span class="mi" aria-hidden="true">close</span></button>
    </div>

    <!-- Navegação de Abas -->
    <div class="row u-gap-8 u-mt-12 u-bb-1-solid-line u-pb-8" id="analysis-tabs" aria-label="Seções da análise">
      <button class="btn sm active" id="tab-summary-btn"><span class="mi" aria-hidden="true">menu_book</span>Resumo Oficial</button>
      <button class="btn sm ghost" id="tab-jabuti-btn"><span class="mi" aria-hidden="true">pest_control</span>Scanner de Jabutis</button>
      <button class="btn sm ghost" id="tab-simulator-btn"><span class="mi" aria-hidden="true">tune</span>Simulador de Texto</button>
    </div>

    <!-- Conteúdo da Aba 1: Sumário Didático -->
    <div id="tab-summary-content" class="stack u-gap-14 u-mt-14">
      <div class="card stack u-gap-8 u-bl-4-solid-primary">
        <span class="sm muted u-fw-700 u-tt-uppercase">Ementa Oficial</span>
        <p class="sm u-lh-1_4">${esc(s.summary)}</p>
        <div class="row sm u-mt-4">
          <span class="chip blue" title="Estimado por palavras-chave da ementa">Tema estimado: ${esc(s.centralLabel)}</span>
        </div>
      </div>

      <div class="card stack u-gap-6">
        <div class="row">
          <span class="mi u-c-primary" aria-hidden="true">description</span>
          <b>Dados oficiais da proposição</b>
        </div>
        <p class="sm muted">${esc(s.code)}${s.date ? ` • apresentada em ${esc(fmtDate(s.date))}` : ''}</p>
        ${
          s.url
            ? `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" class="sm u-fw-600 u-d-inline-flex u-ai-center u-gap-4">
                <span>Ficha de tramitação e inteiro teor</span><span class="mi u-fs-14" aria-hidden="true">open_in_new</span>
              </a>`
            : '<p class="sm muted">Abra a ficha oficial no site da Câmara ou do Senado para ver a tramitação e o inteiro teor.</p>'
        }
      </div>
    </div>

    <!-- Conteúdo da Aba 2: Scanner de Jabutis -->
    <div id="tab-jabuti-content" class="stack u-gap-14 u-mt-14 u-d-none">
      <p class="xs muted u-d-flex u-gap-6 u-ai-flex-start">
        <span class="mi u-fs-16" aria-hidden="true">info</span>
        <span>Estimativa automática por palavras-chave, não uma análise do texto da proposição. Confira a ficha oficial antes de tirar conclusões.</span>
      </p>
      <div class="card stack verdict${s.analysis.hasJabuti ? ' bad' : ''}">
        <div class="row between">
          <div class="row">
            <span class="mi u-fs-24 ${s.analysis.hasJabuti ? 'u-c-red' : 'u-c-green'}" aria-hidden="true">
              ${s.analysis.hasJabuti ? 'warning' : 'check_circle'}
            </span>
            <h4 class="u-fs-15 u-fw-700">
              ${s.analysis.hasJabuti ? `Alerta de Potencial Jabuti (${s.analysis.risk} Risco)` : 'Nenhuma Matéria Estranha Detectada'}
            </h4>
          </div>
          <span class="chip ${s.analysis.hasJabuti ? (s.analysis.risk === 'ALTO' ? 'red' : 'gold') : 'green'}">
            ${s.analysis.hasJabuti ? `Risco ${s.analysis.risk}` : 'Texto Íntegro'}
          </span>
        </div>

        <p class="sm u-c-text u-lh-1_4">
          ${
            s.analysis.hasJabuti
              ? `O algoritmo identificou termos que destoam do núcleo temático ("${esc(s.centralLabel)}").`
              : `A redação analisada mantém coerência temática estrita com o objeto central da matéria ("${esc(s.centralLabel)}").`
          }
        </p>
      </div>

      ${
        s.analysis.foreignMatches.length
          ? `
        <div class="stack u-gap-8">
          <h4 class="h2 u-fs-14">Dispositivos / Desvios Temáticos Identificados:</h4>
          ${s.analysis.foreignMatches
            .map(
              (m) => `
            <div class="card stack u-gap-4 u-bl-3-solid-red">
              <div class="row between sm">
                <b>Núcleo Alheio: ${esc(m.domainLabel)}</b>
                <span class="chip red sm">Intensidade: ${m.intensity}</span>
              </div>
              <p class="sm muted">${esc(m.reason)}</p>
              <span class="sm u-fs-11 u-c-muted">Termo disparador: <code>${esc(m.keyword)}</code></span>
            </div>`
            )
            .join('')}
        </div>`
          : ''
      }

      <div class="card stack u-gap-6 u-bg-s1">
        <div class="row sm">
          <span class="mi u-c-primary" aria-hidden="true">gavel</span>
          <b>Entendimento Constitucional (STF)</b>
        </div>
        <p class="sm muted u-fs-12 u-lh-1_4">
          ${esc(s.analysis.stfSummary)}
        </p>
      </div>
    </div>

    <!-- Conteúdo da Aba 3: Simulador de Texto -->
    <div id="tab-simulator-content" class="stack u-gap-12 u-mt-14 u-d-none">
      <p class="sm muted">Cole qualquer parágrafo de projeto de lei, emenda ou artigo de medida provisória para auditar a coerência temática na hora (100% privado no seu navegador):</p>
      
      <div class="stack u-gap-4">
        <label class="sm u-fw-700">Tema Principal do Projeto:</label>
        <input type="text" class="input sm" id="sim-main-theme" value="${esc(s.centralLabel)}" placeholder="Ex: Saneamento Básico, Meio Ambiente">
      </div>

      <div class="stack u-gap-4">
        <label class="sm u-fw-700">Texto da Emenda / Artigo para Escanear:</label>
        <textarea class="input" id="sim-text-input" rows="4" placeholder="Cole aqui o texto do artigo ou emenda legislativa..."></textarea>
      </div>

      <div class="row">
        <button class="btn primary sm" id="btn-run-sim"><span class="mi" aria-hidden="true">radar</span>Escanear Discrepância Temática</button>
        <button class="btn ghost sm" id="btn-sample-jabuti"><span class="mi" aria-hidden="true">lightbulb</span>Carregar Exemplo Real de Jabuti</button>
      </div>

      <div id="sim-result-container" class="u-d-none u-mt-8"></div>
    </div>
  `);

  // Gestão de Abas
  const tabSummaryBtn = el.querySelector('#tab-summary-btn');
  const tabJabutiBtn = el.querySelector('#tab-jabuti-btn');
  const tabSimulatorBtn = el.querySelector('#tab-simulator-btn');

  const contentSummary = el.querySelector('#tab-summary-content');
  const contentJabuti = el.querySelector('#tab-jabuti-content');
  const contentSimulator = el.querySelector('#tab-simulator-content');

  function showTab(which) {
    tabSummaryBtn.classList.toggle('active', which === 'summary');
    tabSummaryBtn.classList.toggle('ghost', which !== 'summary');
    tabJabutiBtn.classList.toggle('active', which === 'jabuti');
    tabJabutiBtn.classList.toggle('ghost', which !== 'jabuti');
    tabSimulatorBtn.classList.toggle('active', which === 'simulator');
    tabSimulatorBtn.classList.toggle('ghost', which !== 'simulator');

    contentSummary.classList.toggle('u-d-none', which !== 'summary');
    contentJabuti.classList.toggle('u-d-none', which !== 'jabuti');
    contentSimulator.classList.toggle('u-d-none', which !== 'simulator');
  }

  tabSummaryBtn.onclick = () => showTab('summary');
  tabJabutiBtn.onclick = () => showTab('jabuti');
  tabSimulatorBtn.onclick = () => showTab('simulator');
  tablist(el.querySelector('#analysis-tabs'), (b) => el.querySelector('#' + b.id.replace('-btn', '-content')));

  // Simulador de Jabutis
  const btnRunSim = el.querySelector('#btn-run-sim');
  const btnSample = el.querySelector('#btn-sample-jabuti');
  const inputMainTheme = el.querySelector('#sim-main-theme');
  const inputSimText = el.querySelector('#sim-text-input');
  const simResult = el.querySelector('#sim-result-container');

  btnSample.onclick = () => {
    inputMainTheme.value = 'Saneamento Básico e Meio Ambiente';
    inputSimText.value =
      'Art. 42-A. Fica prorrogada a outorga e o subsídio tarifário da usina termelétrica a carvão mineral até 2050, com repasse integral aos consumidores de energia elétrica.';
  };

  btnRunSim.onclick = () => {
    const mainTheme = inputMainTheme.value.trim() || 'Geral';
    const text = inputSimText.value.trim();

    if (!text) {
      simResult.classList.remove('u-d-none');
      simResult.innerHTML = '<p class="sm u-c-red">Por favor, insira algum texto para escanear.</p>';
      return;
    }

    const testRes = detectJabuti(mainTheme, mainTheme, text);
    simResult.classList.remove('u-d-none');
    simResult.innerHTML = `
      <div class="card stack verdict faint${testRes.hasJabuti ? ' bad' : ''}">
        <div class="row between">
          <b>${testRes.hasJabuti ? `🚨 Jabuti Identificado! Risco ${testRes.risk}` : '✅ Texto Coerente (Sem Matéria Estranha)'}</b>
          <span class="chip ${testRes.hasJabuti ? 'red' : 'green'} sm">${testRes.hasJabuti ? 'Discrepância Alta' : 'Sem Anomalia'}</span>
        </div>
        <p class="sm">${
          testRes.hasJabuti
            ? `O texto inserido contém fortes traços de <b>${testRes.foreignMatches.map((m) => m.domainLabel).join(', ')}</b>, totalmente alheio a <b>${esc(mainTheme)}</b>.`
            : `O vocabulário se mantém dentro do escopo esperado para <b>${esc(mainTheme)}</b>.`
        }</p>
      </div>
    `;
  };
}
