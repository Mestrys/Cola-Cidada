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
