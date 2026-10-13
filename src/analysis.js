// Módulo de Análise Textual Legislativa: Detecção de Jabutis (Contrabando Legislativo) e Sumarização Didática.
// 100% Processado no Navegador (Client-side), sem envio para servidores externos (Conforme LGPD).

import { modal, esc } from './ui.js';

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

  // Geração de síntese explicativa e impactos práticos
  let practicalEffect = `Estabelece diretrizes e normas legais no âmbito de ${THEMATIC_DOMAINS[central.domain]?.label || 'administração pública'}.`;
  let financialEffect = 'Sem previsão imediata de novos custos tributários diretos ao consumidor.';
  let winnersAndLosers = 'Regulamenta relações entre o poder público e os setores afetados pela proposta.';

  if (summary.toLowerCase().includes('imposto') || summary.toLowerCase().includes('tribut') || summary.toLowerCase().includes('fiscal')) {
    practicalEffect = 'Altera regras fiscais ou tributárias, impactando alíquotas ou critérios de arrecadação do Estado.';
    financialEffect = 'Pode gerar impacto direto no preço de mercadorias, serviços ou no orçamento público.';
    winnersAndLosers = 'Beneficia setores contemplados com desoneração ou reforça o caixa arrecadatório público.';
  } else if (summary.toLowerCase().includes('saude') || summary.toLowerCase().includes('sus') || summary.toLowerCase().includes('medicamento')) {
    practicalEffect = 'Cria ou aperfeiçoa programas de assistência, fornecimento de tratamentos ou infraestrutura de saúde pública.';
    financialEffect = 'Gera demandas orçamentárias de custeio para o Sistema Único de Saúde (SUS) e entes federativos.';
    winnersAndLosers = 'Beneficia pacientes e usuários da rede pública; requer gestão orçamentária dos governos.';
  } else if (summary.toLowerCase().includes('internet') || summary.toLowerCase().includes('redes') || summary.toLowerCase().includes('digital')) {
    practicalEffect = 'Regula responsabilidades de plataformas digitais, direitos de usuários e transparência na internet.';
    financialEffect = 'Custos de conformidade técnica para grandes empresas de tecnologia (Big Techs).';
    winnersAndLosers = 'Usuários ganham salvaguardas contra abusos; plataformas enfrentam maiores exigências legais.';
  } else if (summary.toLowerCase().includes('mobilidade') || summary.toLowerCase().includes('transito') || summary.toLowerCase().includes('transporte')) {
    practicalEffect = 'Organiza a malha de transportes, tarifas ou regulamentação de vias e concessões.';
    financialEffect = 'Afeta tarifas de transporte ou subsídios públicos a operadores de trânsito.';
    winnersAndLosers = 'Usuários do transporte público ganham previsibilidade; operadores têm fiscalização ampliada.';
  }

  const analysis = detectJabuti(code, summary, summary);

  return {
    code,
    summary,
    centralDomain: central.domain,
    centralLabel: THEMATIC_DOMAINS[central.domain]?.label || 'Matéria Geral',
    practicalEffect,
    financialEffect,
    winnersAndLosers,
    analysis,
  };
}

/* ================= 4. MODAL INTERATIVO: SCANNER DE JABUTIS & SUMARIZADOR ================= */

export function openAnalysisModal(item) {
  const s = summarizeProposition(item);

  const { el } = modal(`
    <div class="row between no-print">
      <div class="row">
        <span class="mi" style="color:var(--primary); font-size:24px">psychology</span>
        <div>
          <h3 class="h2" style="font-size:16px">Inteligência Cívica & Análise Textual</h3>
          <span class="sm muted">${esc(s.code)}</span>
        </div>
      </div>
      <button class="btn icon ghost" data-close aria-label="Fechar"><span class="mi">close</span></button>
    </div>

    <!-- Navegação de Abas -->
    <div class="row" style="gap:8px; margin-top:12px; border-bottom:1px solid var(--line); padding-bottom:8px">
      <button class="btn sm active" id="tab-summary-btn"><span class="mi">menu_book</span>Sumário Didático</button>
      <button class="btn sm ghost" id="tab-jabuti-btn"><span class="mi">pest_control</span>Scanner de Jabutis</button>
      <button class="btn sm ghost" id="tab-simulator-btn"><span class="mi">tune</span>Simulador de Texto</button>
    </div>

    <!-- Conteúdo da Aba 1: Sumário Didático -->
    <div id="tab-summary-content" class="stack" style="gap:14px; margin-top:14px">
      <div class="card stack" style="gap:8px; border-left:4px solid var(--primary)">
        <span class="sm muted" style="font-weight:700; text-transform:uppercase">Ementa Oficial</span>
        <p class="sm" style="line-height:1.4">${esc(s.summary)}</p>
        <div class="row sm" style="margin-top:4px">
          <span class="chip blue">Tema: ${esc(s.centralLabel)}</span>
        </div>
      </div>

      <p class="xs muted" style="display:flex; gap:6px; align-items:flex-start">
        <span class="mi" style="font-size:16px">info</span>
        <span>Os quadros abaixo são uma estimativa automática a partir de palavras-chave da ementa, não uma análise do texto da proposição. Confira a ficha oficial antes de tirar conclusões.</span>
      </p>

      <div class="grid" style="grid-template-columns:1fr; gap:10px">
        <div class="card stack" style="gap:6px">
          <div class="row">
            <span class="mi" style="color:var(--primary)">lightbulb</span>
            <b>O que muda na prática (Linguagem Cidadã)</b>
          </div>
          <p class="sm muted">${esc(s.practicalEffect)}</p>
        </div>

        <div class="card stack" style="gap:6px">
          <div class="row">
            <span class="mi" style="color:var(--gold)">payments</span>
            <b>Impacto Financeiro & Orçamentário</b>
          </div>
          <p class="sm muted">${esc(s.financialEffect)}</p>
        </div>

        <div class="card stack" style="gap:6px">
          <div class="row">
            <span class="mi" style="color:var(--green)">balance</span>
            <b>Quem Ganha e Quem Paga</b>
          </div>
          <p class="sm muted">${esc(s.winnersAndLosers)}</p>
        </div>
      </div>
    </div>

    <!-- Conteúdo da Aba 2: Scanner de Jabutis -->
    <div id="tab-jabuti-content" class="stack" style="gap:14px; margin-top:14px; display:none">
      <div class="card stack" style="gap:8px; background:${s.analysis.hasJabuti ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)'}; border:1px solid ${s.analysis.hasJabuti ? 'var(--red)' : 'var(--green)'}">
        <div class="row between">
          <div class="row">
            <span class="mi" style="color:${s.analysis.hasJabuti ? 'var(--red)' : 'var(--green)'}; font-size:24px">
              ${s.analysis.hasJabuti ? 'warning' : 'check_circle'}
            </span>
            <h4 style="font-size:15px; font-weight:700">
              ${s.analysis.hasJabuti ? `Alerta de Potencial Jabuti (${s.analysis.risk} Risco)` : 'Nenhuma Matéria Estranha Detectada'}
            </h4>
          </div>
          <span class="chip ${s.analysis.hasJabuti ? (s.analysis.risk === 'ALTO' ? 'red' : 'gold') : 'green'}">
            ${s.analysis.hasJabuti ? `Risco ${s.analysis.risk}` : 'Texto Íntegro'}
          </span>
        </div>

        <p class="sm" style="color:var(--text); line-height:1.4">
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
        <div class="stack" style="gap:8px">
          <h4 class="h2" style="font-size:14px">Dispositivos / Desvios Temáticos Identificados:</h4>
          ${s.analysis.foreignMatches
            .map(
              (m) => `
            <div class="card stack" style="gap:4px; border-left:3px solid var(--red)">
              <div class="row between sm">
                <b>Núcleo Alheio: ${esc(m.domainLabel)}</b>
                <span class="chip red sm">Intensidade: ${m.intensity}</span>
              </div>
              <p class="sm muted">${esc(m.reason)}</p>
              <span class="sm" style="font-size:11px; color:var(--muted)">Termo disparador: <code>${esc(m.keyword)}</code></span>
            </div>`
            )
            .join('')}
        </div>`
          : ''
      }

      <div class="card stack" style="gap:6px; background:var(--s1)">
        <div class="row sm">
          <span class="mi" style="color:var(--primary)">gavel</span>
          <b>Entendimento Constitucional (STF)</b>
        </div>
        <p class="sm muted" style="font-size:12px; line-height:1.4">
          ${esc(s.analysis.stfSummary)}
        </p>
      </div>
    </div>

    <!-- Conteúdo da Aba 3: Simulador de Texto -->
    <div id="tab-simulator-content" class="stack" style="gap:12px; margin-top:14px; display:none">
      <p class="sm muted">Cole qualquer parágrafo de projeto de lei, emenda ou artigo de medida provisória para auditar a coerência temática na hora (100% privado no seu navegador):</p>
      
      <div class="stack" style="gap:4px">
        <label class="sm" style="font-weight:700">Tema Principal do Projeto:</label>
        <input type="text" class="input sm" id="sim-main-theme" value="${esc(s.centralLabel)}" placeholder="Ex: Saneamento Básico, Meio Ambiente">
      </div>

      <div class="stack" style="gap:4px">
        <label class="sm" style="font-weight:700">Texto da Emenda / Artigo para Escanear:</label>
        <textarea class="input" id="sim-text-input" rows="4" placeholder="Cole aqui o texto do artigo ou emenda legislativa..."></textarea>
      </div>

      <div class="row">
        <button class="btn primary sm" id="btn-run-sim"><span class="mi">radar</span>Escanear Discrepância Temática</button>
        <button class="btn ghost sm" id="btn-sample-jabuti"><span class="mi">lightbulb</span>Carregar Exemplo Real de Jabuti</button>
      </div>

      <div id="sim-result-container" style="display:none; margin-top:8px"></div>
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

    contentSummary.style.display = which === 'summary' ? 'flex' : 'none';
    contentJabuti.style.display = which === 'jabuti' ? 'flex' : 'none';
    contentSimulator.style.display = which === 'simulator' ? 'flex' : 'none';
  }

  tabSummaryBtn.onclick = () => showTab('summary');
  tabJabutiBtn.onclick = () => showTab('jabuti');
  tabSimulatorBtn.onclick = () => showTab('simulator');

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
      simResult.style.display = 'block';
      simResult.innerHTML = '<p class="sm" style="color:var(--red)">Por favor, insira algum texto para escanear.</p>';
      return;
    }

    const testRes = detectJabuti(mainTheme, mainTheme, text);
    simResult.style.display = 'block';
    simResult.innerHTML = `
      <div class="card stack" style="gap:8px; border:1px solid ${testRes.hasJabuti ? 'var(--red)' : 'var(--green)'}; background:${testRes.hasJabuti ? 'rgba(239,68,68,0.06)' : 'rgba(16,185,129,0.06)'}">
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
