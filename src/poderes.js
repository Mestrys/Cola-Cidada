// Gastos por Poder (Executivo, Legislativo e Judiciário): o que cada ente monitorado gasta com pessoal em cada Poder,
// e quanto do limite da Lei de Responsabilidade Fiscal (LRF, art. 20) isso representa. Os números vêm do instantâneo
// src/data/poderes.json (scripts/build-poderes.mjs), feito do RGF que cada ente entrega ao Tesouro Nacional (Siconfi).

export const POWERS = [
  { key: 'E', name: 'Executivo', icon: 'flag', who: 'governo ou prefeitura' },
  { key: 'L', name: 'Legislativo', icon: 'apartment', who: 'casa legislativa e tribunal de contas' },
  { key: 'J', name: 'Judiciário', icon: 'gavel', who: 'tribunais' },
];

// Teto da despesa com pessoal de cada Poder nos estados, em % da receita corrente líquida (LRF, art. 20, II), somando todos
// os órgãos do Poder. Só para o texto de ajuda: o limite usado nas contas é o que o próprio ente informou no relatório.
export const STATE_LIMITS = { E: 49, L: 3, J: 6 };

// A LRF dá o alerta aos 90% do limite, veda novas despesas aos 95% (limite prudencial) e fixa o teto aos 100%.
export function status(uso, atipico = false) {
  if (atipico) return { key: 'atipico', label: 'valor atípico no relatório', tone: '' };
  if (uso == null) return { key: 'sem', label: 'limite não informado', tone: '' };
  if (uso > 1) return { key: 'acima', label: 'acima do limite informado', tone: 'red' };
  if (uso >= 0.95) return { key: 'prudencial', label: 'acima do limite prudencial', tone: 'red' };
  if (uso >= 0.9) return { key: 'alerta', label: 'em alerta', tone: 'gold' };
  return { key: 'dentro', label: 'dentro do limite', tone: 'green' };
}

export const kindLabel = (e) => ({ uniao: 'União', estado: 'Estado', capital: 'Capital', polo: 'Cidade-polo' })[e.tipo];

/** Entes de um estado, na ordem em que aparecem: governo do estado, capital e as duas cidades-polo. */
export function entesOfState(data, uf) {
  const order = { estado: 0, capital: 1, polo: 2 };
  return data.entes.filter((e) => e.uf === uf).sort((a, b) => order[a.tipo] - order[b.tipo] || (a.nome).localeCompare(b.nome, 'pt-BR'));
}

/** Estados do mais para o menos pesado de um Poder (% da receita corrente líquida). Sem dados vão ao fim. */
export function rankStates(data, poder) {
  return data.entes
    .filter((e) => e.tipo === 'estado')
    .map((e) => ({ ente: e, p: e.poderes[poder] || null }))
    .sort((a, b) => (b.p?.pctRcl ?? -1) - (a.p?.pctRcl ?? -1));
}

// Despesa liquidada por função de governo (DCA, Anexo I-E): o gasto total, não só pessoal. Função não é Poder: aposentadorias
// e outros gastos de um Poder podem estar em outras funções, então estes valores são "o que foi gasto nessa função".
export const FUNCTIONS = [
  { key: 'legislativa', name: 'Legislativa', hint: 'casas legislativas e tribunais de contas' },
  { key: 'judiciaria', name: 'Judiciária', hint: 'tribunais e justiça' },
  { key: 'essencial', name: 'Essencial à Justiça', hint: 'Ministério Público e Defensoria' },
  { key: 'encargos', name: 'Encargos especiais', hint: 'dívida e transferências' },
  { key: 'demais', name: 'Demais funções', hint: 'saúde, educação, segurança, administração… (o Executivo)' },
];

/** Linhas de um ente: valor e fatia do total de cada função (só as que têm gasto). */
export function functionRows(f) {
  if (!f?.total) return [];
  return FUNCTIONS.map((fn) => ({ ...fn, valor: f[fn.key], pct: f[fn.key] / f.total })).filter((r) => r.valor > 0);
}

/** Estados pela fatia da despesa total que vai a uma função, da maior para a menor. */
export function rankFunction(data, key) {
  return data.entes
    .filter((e) => e.tipo === 'estado')
    .map((e) => ({ ente: e, f: e.funcoes || null, valor: e.funcoes?.[key] ?? null, pct: e.funcoes?.total ? e.funcoes[key] / e.funcoes.total : null }))
    .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
}
