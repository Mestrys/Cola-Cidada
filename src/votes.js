import { recentRollCalls, votesOf, senatorVotes } from './api.js';

// Retorna votações nominais recentes da Câmara com o voto de cada deputado monitorado.
export async function loadComparison(politicians, limit = 8) {
  const deputies = politicians.filter((p) => p.camaraId);
  const votings = await recentRollCalls(limit * 2);
  const rows = await Promise.all(
    votings.map(async (v) => {
      try {
        const votos = await votesOf(v.id);
        if (!votos.length) return null;
        const tally = { Sim: 0, Não: 0, Outros: 0 };
        for (const x of votos) tally[x.tipoVoto === 'Sim' || x.tipoVoto === 'Não' ? x.tipoVoto : 'Outros']++;
        const byPol = {};
        for (const d of deputies) {
          const hit = votos.find((x) => x.deputado_?.id === d.camaraId);
          byPol[d.id] = hit ? hit.tipoVoto : null;
        }
        return {
          ...v,
          tally,
          byPol,
          category: getThematicCategory(v.descricao || ''),
          explanation: getCitizenExplanation(v.descricao || ''),
        };
      } catch {
        return null;
      }
    })
  );
  return rows.filter(Boolean).slice(0, limit);
}

// Retorna votações nominais consolidadas do Senado Federal para os senadores monitorados.
export async function loadSenateComparison(politicians, limit = 10) {
  const senators = politicians.filter((p) => p.senadoId);
  if (!senators.length) return [];

  const results = await Promise.all(
    senators.map(async (s) => {
      const votes = await senatorVotes(s.senadoId, limit);
      return { senator: s, votes };
    })
  );

  const map = new Map();
  for (const { senator, votes } of results) {
    for (const v of votes) {
      const key = v.matter || v.summary || v.code;
      if (!map.has(key)) {
        map.set(key, {
          matter: v.matter,
          summary: v.summary,
          date: v.date,
          result: v.result,
          yes: v.yes,
          no: v.no,
          category: getThematicCategory(`${v.matter} ${v.summary}`),
          explanation: getCitizenExplanation(`${v.matter} ${v.summary}`),
          bySenator: {},
        });
      }
      map.get(key).bySenator[senator.id] = v.vote;
    }
  }

  return Array.from(map.values()).slice(0, limit);
}

// Categorizador temático de matérias
export function getThematicCategory(text = '') {
  const t = text.toLowerCase();
  if (
    t.includes('tribut') ||
    t.includes('impost') ||
    t.includes('financ') ||
    t.includes('orçament') ||
    t.includes('fiscal') ||
    t.includes('receita') ||
    t.includes('ldo') ||
    t.includes('loa')
  ) {
    return 'economia';
  }
  if (
    t.includes('inteligência') ||
    t.includes('ia') ||
    t.includes('tecnolog') ||
    t.includes('digital') ||
    t.includes('internet') ||
    t.includes('dado') ||
    t.includes('software')
  ) {
    return 'tecnologia';
  }
  if (
    t.includes('indígen') ||
    t.includes('terra') ||
    t.includes('ambient') ||
    t.includes('florest') ||
    t.includes('clima') ||
    t.includes('carbon') ||
    t.includes('solar')
  ) {
    return 'meio-ambiente';
  }
  if (
    t.includes('saúde') ||
    t.includes('medicament') ||
    t.includes('hospital') ||
    t.includes('sus') ||
    t.includes('educa') ||
    t.includes('escola') ||
    t.includes('criança') ||
    t.includes('idoso')
  ) {
    return 'social-saude';
  }
  if (t.includes('seguran') || t.includes('penal') || t.includes('crime') || t.includes('polícia') || t.includes('arm')) {
    return 'seguranca';
  }
  return 'geral';
}

// Aviso exibido junto da síntese: o texto é fixo por tema, não vem da votação nem dos parlamentares.
export const EXPLANATION_NOTE =
  'Texto editorial fixo sobre o tema, com os argumentos mais citados de cada lado. Não é declaração do parlamentar; confira o inteiro teor da proposição.';

// Síntese didática ("Linguagem Cidadã") para descomplicar atas legislativas
export function getCitizenExplanation(text = '') {
  const t = text.toLowerCase();

  if (
    t.includes('reforma tributária') ||
    t.includes('pec 45') ||
    t.includes('plp 68') ||
    (t.includes('ibs') && t.includes('cbs'))
  ) {
    return {
      title: 'Linguagem Cidadã: Reforma Tributária',
      summary:
        'Unificação de 5 tributos sobre o consumo em um modelo de IVA Dual (IBS e CBS), com cesta básica nacional isenta e devolução de imposto (cashback) a famílias de baixa renda.',
      yes: 'Votou SIM para simplificar a cobrança, eliminar impostos cumulativos e desonerar alimentos da cesta básica.',
      no: 'Votou NÃO alegando risco de aumento de alíquota para serviços ou redução da autonomia de governadores e prefeitos.',
    };
  }

  if (t.includes('inteligência artificial') || t.includes('pl 2338')) {
    return {
      title: 'Linguagem Cidadã: Marco Legal da Inteligência Artificial',
      summary:
        'Estabelece regras e responsabilidades para o uso de IA no país, exigindo auditoria de algoritmos de alto risco e proibindo deepfakes eleitorais sem aviso prévio.',
      yes: 'Votou SIM para proteger direitos dos cidadãos, dados biométricos e evitar fraudes algorítmicas.',
      no: 'Votou NÃO apontando risco de burocracia excessiva e perda de competitividade para startups de tecnologia.',
    };
  }

  if (t.includes('marco temporal') || t.includes('pl 2903')) {
    return {
      title: 'Linguagem Cidadã: Marco Temporal de Terras Indígenas',
      summary:
        'Tese jurídica que estabelece a data de 5 de outubro de 1988 (promulgação da CF/88) como marco final para comprovação da posse tradicional de terras indígenas.',
      yes: 'Votou SIM para conferir segurança jurídica à propriedade rural e conter expansões territoriais indefinidas.',
      no: 'Votou NÃO em defesa dos direitos originários constitucionais de povos expulsos de suas terras antes de 1988.',
    };
  }

  if (t.includes('urgência')) {
    return {
      title: 'Linguagem Cidadã: Regime de Urgência Plenária',
      summary:
        'Dispensa prazos regimentais e pareceres de comissões temáticas para que a proposta seja votada imediatamente no Plenário.',
      yes: 'Votou SIM para acelerar a aprovação rápida da pauta.',
      no: 'Votou NÃO para manter o debate prévio detalhado nas comissões antes do voto definitivo.',
    };
  }

  return null;
}
