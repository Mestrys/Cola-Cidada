// Gera src/data/poderes.json: a despesa com pessoal de cada Poder (Executivo, Legislativo e Judiciário) em cada ente
// monitorado (União, estados, capitais e cidades-polo), a partir do RGF (Anexo 01) que o ente entrega ao Tesouro
// Nacional (Siconfi). O app lê este resumo em vez de paginar o Siconfi no aparelho (o Judiciário da União tem milhares
// de linhas). Município não tem Judiciário próprio.
//
// Também grava, por ente, a despesa liquidada por função de governo (DCA, Anexo I-E): Legislativa, Judiciária, Essencial à
// Justiça, Encargos Especiais e as demais. É o gasto total (não só pessoal), mas por função, que não coincide com o Poder:
// aposentadorias e outros gastos de um Poder podem estar em outras funções.
//
// Uso: node scripts/build-poderes.mjs
// Por Poder: soma dos órgãos (ex.: Assembleia + Tribunal de Contas no Legislativo estadual; todos os tribunais na União).
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SICONFI = 'https://apidatalake.tesouro.gov.br/ords/siconfi/tt';
export const PODERES = ['E', 'L', 'J'];
const KEEP_ORGAOS = 6;
// O RGF do Executivo federal no Siconfi traz uma parcela pequena da despesa com pessoal da União (cerca de R$ 640 mi,
// frente a centenas de bilhões do Poder): não dá para compará-lo aos demais, então o app mostra só esta nota.
const NOTA_UNIAO_EXECUTIVO =
  'O relatório do Executivo federal no Siconfi cobre só uma parcela da despesa com pessoal da União e não é comparável ao dos demais Poderes. Veja a despesa completa no Portal da Transparência.';
const round = (v) => Math.round(v * 100) / 100;

/** Períodos do mais recente para trás (RGF é quadrimestral): o relatório sai até 30 dias depois de o período fechar. */
export function recentPeriods(now = new Date()) {
  const y = now.getUTCFullYear();
  const closed = Math.floor(now.getUTCMonth() / 4);
  const list = [];
  for (let p = Math.min(closed, 3); p >= 1; p--) list.push([y, p]);
  list.push([y - 1, 3], [y - 1, 2]);
  return list;
}

// o Siconfi escreve a coluna ora como "Valor", ora como "VALOR"
const pick = (items, conta, coluna) => items.find((i) => i.cod_conta === conta && i.coluna.toUpperCase().startsWith(coluna.toUpperCase()))?.valor ?? null;

/** Lê as linhas de um órgão (já filtradas por `instituicao`) do RGF-Anexo 01. */
export function readOrgao(items) {
  const liquida = pick(items, 'DespesaComPessoalLiquida', 'TOTAL') ?? pick(items, 'DespesaComPessoalTotal', 'Valor');
  return {
    nome: items[0].instituicao,
    bruta: pick(items, 'DespesaComPessoalBruta', 'TOTAL'),
    liquida,
    limite: pick(items, 'LimiteMaximoDespesaComPessoalTotal', 'Valor'),
    rcl: pick(items, 'ReceitaCorrenteLiquidaAjustada', 'Valor') ?? pick(items, 'ReceitaCorrenteLiquida', 'Valor') ?? pick(items, 'ReceitaCorrenteLiquidaLimiteLegal', 'Valor'),
  };
}

/** Soma os órgãos de um Poder. `uso` = quanto do limite legal já foi gasto (0 a 1+), nulo se o limite não veio. */
export function sumPoder(orgaos) {
  const sum = (k) => {
    const vs = orgaos.map((o) => o[k]).filter((v) => typeof v === 'number');
    return vs.length ? round(vs.reduce((a, b) => a + b, 0)) : null;
  };
  const liquida = sum('liquida');
  const limite = orgaos.every((o) => typeof o.limite === 'number') ? sum('limite') : null;
  const rcl = orgaos.map((o) => o.rcl).find((v) => typeof v === 'number') ?? null;
  return {
    liquida,
    bruta: sum('bruta'),
    limite,
    pctRcl: liquida != null && rcl ? Math.round((liquida / rcl) * 1e4) / 100 : null,
    uso: liquida != null && limite ? Math.round((liquida / limite) * 1e3) / 1e3 : null,
    orgaosTotal: orgaos.length,
    orgaos: [...orgaos]
      .sort((a, b) => (b.liquida ?? 0) - (a.liquida ?? 0))
      .slice(0, KEEP_ORGAOS)
      .map((o) => ({ nome: o.nome, liquida: o.liquida, limite: o.limite })),
  };
}

/** Agrupa as linhas do RGF por órgão e resume o Poder. */
export function summarizePoder(items) {
  const by = new Map();
  for (const i of items) (by.get(i.instituicao) ?? by.set(i.instituicao, []).get(i.instituicao)).push(i);
  const orgaos = [...by.values()].map(readOrgao).filter((o) => typeof o.liquida === 'number');
  return orgaos.length ? { ...sumPoder(orgaos), rcl: orgaos.map((o) => o.rcl).find((v) => typeof v === 'number') ?? null } : null;
}

async function getJson(url) {
  let last;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 1000 * attempt));
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
      if (!res.ok) throw new Error(`Siconfi respondeu ${res.status}`);
      return await res.json();
    } catch (err) {
      last = err;
    }
  }
  throw last;
}

async function rgfItems(esfera, ibge, poder, ano, periodo) {
  const all = [];
  for (let offset = 0; ; offset += 5000) {
    const q = { an_exercicio: ano, in_periodicidade: 'Q', nr_periodo: periodo, co_tipo_demonstrativo: 'RGF', no_anexo: 'RGF-Anexo 01', co_esfera: esfera, co_poder: poder, id_ente: ibge, ...(offset ? { offset } : {}) };
    const query = Object.entries(q).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    const page = await getJson(`${SICONFI}/rgf?${query}&origem=node`);
    all.push(...(page.items || []));
    if (!page.hasMore) return all;
  }
}

const FUNCOES_ANOS = (now = new Date()) => [now.getUTCFullYear() - 1, now.getUTCFullYear() - 2];

/** Despesa liquidada (exceto intraorçamentária) por função, do DCA-Anexo I-E: o que vai para cada grupo de funções. */
export function summarizeFuncoes(items) {
  const rows = items.filter((i) => i.coluna === 'Despesas Liquidadas' && i.rotulo?.startsWith('Total Geral'));
  const fn = rows.filter((i) => /^\d\d - /.test(i.conta));
  if (!fn.length) return null;
  const of = (code) => round(fn.filter((i) => i.conta.startsWith(`${code} - `)).reduce((a, i) => a + i.valor, 0));
  const total = round(fn.reduce((a, i) => a + i.valor, 0));
  const legislativa = of('01'), judiciaria = of('02'), essencial = of('03'), encargos = of('28');
  return { total, legislativa, judiciaria, essencial, encargos, demais: round(total - legislativa - judiciaria - essencial - encargos) };
}

async function funcoesOf(ente) {
  for (const ano of FUNCOES_ANOS()) {
    const q = `an_exercicio=${ano}&id_ente=${ente.ibge}&no_anexo=${encodeURIComponent('DCA-Anexo I-E')}`;
    const page = await getJson(`${SICONFI}/dca?${q}&origem=node`);
    const s = page.items?.length ? summarizeFuncoes(page.items) : null;
    if (s) return { ano, ...s };
  }
  return null;
}

/**
 * Despesa com pessoal maior que a receita corrente líquida do próprio ente é inconsistência do relatório (a receita informada
 * pode estar errada): marca todos os Poderes do ente como `atipico`, porque o limite e o % de cada um saem dessa mesma receita.
 */
export function flagAtipicos(poderes) {
  const lista = Object.values(poderes).filter(Boolean);
  if (!lista.some((p) => p.pctRcl != null && p.pctRcl > 100)) return poderes;
  for (const p of lista) p.atipico = true;
  return poderes;
}

async function poderOf(ente, poder, periods) {
  for (const [ano, periodo] of periods) {
    const items = await rgfItems(ente.esfera, ente.ibge, poder, ano, periodo);
    const s = items.length ? summarizePoder(items) : null;
    if (s) return { ano, periodo, ...s, ...(ente.esfera === 'U' && poder === 'E' ? { nota: NOTA_UNIAO_EXECUTIVO } : {}) };
  }
  return null;
}

async function mapLimit(list, n, fn) {
  const out = new Array(list.length);
  let next = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (next < list.length) { const i = next++; out[i] = await fn(list[i], i); } }));
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');
  const entes = JSON.parse(readFileSync(join(root, 'entes.json'), 'utf8'));
  const { cidades } = JSON.parse(readFileSync(join(root, 'cidades.json'), 'utf8'));
  const { FEDERATION_UNITS } = await import(join(root, 'federation.js'));
  const nameOf = (uf) => FEDERATION_UNITS.find((u) => u.uf === uf)?.name || uf;

  const lista = [{ chave: 'uniao', tipo: 'uniao', nome: 'União (Governo Federal)', uf: null, ibge: entes.uniao, esfera: 'U' }];
  for (const [uf, ids] of Object.entries(entes.ufs)) lista.push({ chave: uf, tipo: 'estado', nome: uf === 'DF' ? 'Distrito Federal' : nameOf(uf), uf, ibge: ids.estado, esfera: 'E' });
  for (const c of cidades) lista.push({ chave: String(c.ibge), tipo: c.kind === 'capital' ? 'capital' : 'polo', nome: c.nome, uf: c.uf, ibge: c.ibge, esfera: 'M' });

  const periods = recentPeriods();
  const geradoEm = new Date().toISOString().slice(0, 10);
  const result = await mapLimit(lista, 3, async (ente) => {
    const poderes = {};
    for (const p of ente.esfera === 'M' ? ['E', 'L'] : PODERES) poderes[p] = await poderOf(ente, p, periods);
    process.stdout.write('.');
    const funcoes = await funcoesOf(ente);
    const { esfera, ...rest } = ente;
    return { ...rest, poderes: flagAtipicos(poderes), funcoes };
  });
  console.log();

  const faltas = result.flatMap((e) => [...Object.entries(e.poderes).filter(([, v]) => !v).map(([p]) => `${e.nome}/${p}`), ...(e.funcoes ? [] : [`${e.nome}/funções`])]);
  if (faltas.length) console.log('sem relatório:', faltas.join(', '));
  const out = {
    geradoEm,
    fonte: 'Tesouro Nacional — Siconfi: RGF (Anexo 01) para pessoal por Poder e DCA (Anexo I-E) para despesa por função',
    entes: result,
  };
  writeFileSync(join(root, 'poderes.json'), JSON.stringify(out));
  console.log('entes', result.length, 'com dados', result.filter((e) => Object.values(e.poderes).some(Boolean)).length);
}
