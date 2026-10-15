// Gera os dados das cidades-polo: as duas maiores cidades de cada estado por PIB, fora a capital.
//   src/data/cidades.json            catálogo (capitais e polos) com PIB, população e posição no estado
//   src/data/cidades/{uf}.json       vereadores dos polos (TSE 2024)
//   src/data/prefeitos-cidades.json  prefeitos dos polos (TSE 2024)
// As capitais continuam nos arquivos de sempre (capitais/*.json e executivo.json); aqui só entram no catálogo,
// para mostrar PIB e população ao lado das outras cidades.
//
// Uso: node scripts/build-cidades.mjs <dir-consulta-cand-2024> <dir-bem-2024>
// PIB: IBGE, Produto Interno Bruto dos Municípios (SIDRA tabela 5938). População: Censo 2022 (SIDRA tabela 4709).
// Município do Siconfi = código IBGE de 7 dígitos, o mesmo do SIDRA.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FEDERATION_UNITS } from '../src/data/federation.js';
import { parseCsv, norm, titleCase, isElected, clean } from './lib/tse.mjs';

const [cand24, bem24] = process.argv.slice(2);
if (!bem24) {
  console.error('Uso: build-cidades.mjs <cand2024> <bem2024>');
  process.exit(1);
}
const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');
const entes = JSON.parse(readFileSync(join(root, 'entes.json'), 'utf8'));

async function sidra(path) {
  const r = await fetch(`https://apisidra.ibge.gov.br/values/${path}`, { signal: AbortSignal.timeout(180000) });
  if (!r.ok) throw new Error(`SIDRA ${r.status}: ${path}`);
  const rows = (await r.json()).slice(1);
  return rows;
}
const [pibRows, popRows] = await Promise.all([sidra('t/5938/n6/all/v/37/p/last'), sidra('t/4709/n6/all/v/93/p/last')]);
const pibAno = Number(pibRows[0].D3C);
const popAno = Number(popRows[0].D3C);
const pop = new Map(popRows.map((r) => [r.D1C, Number(r.V) || null]));

const byUf = new Map();
for (const r of pibRows) {
  const uf = r.D1N.match(/ - (\w\w)$/)?.[1];
  const v = Number(r.V);
  if (!uf || !Number.isFinite(v)) continue;
  (byUf.get(uf) ?? byUf.set(uf, []).get(uf)).push({ ibge: Number(r.D1C), nome: r.D1N.replace(/ - \w\w$/, ''), uf, pib: v * 1000 });
}

const cidades = [];
const polos = [];
for (const u of FEDERATION_UNITS) {
  if (!u.hasCouncil) continue; // o DF é uma só cidade-estado
  const capIbge = entes.ufs[u.uf].capital;
  const ranked = byUf.get(u.uf).sort((a, b) => b.pib - a.pib).map((c, i) => ({ ...c, rankPib: i + 1 }));
  const withPop = (c, kind) => ({
    ibge: c.ibge, nome: c.nome, uf: c.uf, kind, rankPib: c.rankPib, pib: c.pib,
    populacao: pop.get(String(c.ibge)) ?? null,
    pibPerCapita: pop.get(String(c.ibge)) ? Math.round(c.pib / pop.get(String(c.ibge))) : null,
  });
  cidades.push(withPop(ranked.find((c) => c.ibge === capIbge), 'capital'));
  for (const c of ranked.filter((c) => c.ibge !== capIbge).slice(0, 2)) {
    const row = withPop(c, 'polo');
    cidades.push(row);
    polos.push({ unit: u, city: row });
  }
}

const assetsBySq = (path) => {
  const m = new Map();
  if (!existsSync(path)) return m;
  for (const r of parseCsv(path)) {
    const v = parseFloat((r.VR_BEM_CANDIDATO || '0').replace(',', '.')) || 0;
    m.set(r.SQ_CANDIDATO, (m.get(r.SQ_CANDIDATO) || 0) + v);
  }
  return m;
};
const urna = (r) => titleCase(clean(r.NM_URNA_CANDIDATO) || r.NM_CANDIDATO);
const tse = (r, assets) => ({
  year: 2024,
  sq: r.SQ_CANDIDATO,
  ballotNumber: r.NR_CANDIDATO,
  coalition: clean(r.SG_FEDERACAO) || clean(r.NM_COLIGACAO),
  declaredAssets: assets.has(r.SQ_CANDIDATO) ? Math.round(assets.get(r.SQ_CANDIDATO) * 100) / 100 : null,
  status: r.DS_SIT_TOT_TURNO,
});
const dedupe = (rows) => {
  const seen = new Set();
  return rows.filter((r) => !seen.has(r.SQ_CANDIDATO) && seen.add(r.SQ_CANDIDATO));
};
const bySort = (a, b) => a.name.localeCompare(b.name, 'pt-BR');

const prefeitos = [];
const vereadoresPorUf = new Map();
const problemas = [];
for (const { unit: u, city } of polos) {
  const lc = u.uf.toLowerCase();
  const rows = parseCsv(join(cand24, `consulta_cand_2024_${u.uf}.csv`)).filter((r) => norm(r.NM_UE) === norm(city.nome));
  const assets = assetsBySq(join(bem24, `bem_candidato_2024_${u.uf}.csv`));
  const eleitos = (cargo) => dedupe(rows.filter((r) => r.DS_CARGO === cargo && isElected(r)));

  const pref = eleitos('PREFEITO');
  const vices = eleitos('VICE-PREFEITO');
  if (pref.length !== 1) problemas.push(`${city.nome}/${u.uf}: ${pref.length} prefeitos eleitos`);
  for (const r of pref) {
    const v = vices.find((x) => x.SQ_COLIGACAO === r.SQ_COLIGACAO) || vices[0];
    prefeitos.push({
      id: `exe-pref-${lc}-${city.ibge}`,
      name: `Pref. ${urna(r)}`,
      fullName: titleCase(r.NM_CANDIDATO),
      party: r.SG_PARTIDO,
      role: 'Prefeito',
      roleKey: 'prefeito',
      house: `Prefeitura de ${city.nome}`,
      source: 'executivo',
      state: u.uf,
      city: city.nome,
      ibge: city.ibge,
      situacao: 'Eleito(a) em 2024 · mandato 2025–2028 (TSE)',
      mandate: ['2025-01-01', '2028-12-31'],
      ...(v ? { vice: { name: urna(v), fullName: titleCase(v.NM_CANDIDATO), party: v.SG_PARTIDO } } : {}),
      tse: tse(r, assets),
      pageUrl: `https://divulgacandcontas.tse.jus.br/divulga/#/candidato/2024/${r.CD_ELEICAO}/${r.SG_UE}/${r.SQ_CANDIDATO}`,
    });
  }

  const vers = eleitos('VEREADOR').map((r) => ({
    id: `cm-${lc}-${r.SQ_CANDIDATO}`,
    name: `Ver. ${urna(r)}`,
    fullName: titleCase(r.NM_CANDIDATO),
    party: r.SG_PARTIDO,
    role: 'Vereador',
    house: `Câmara Municipal de ${city.nome}`,
    source: `cm-${lc}`,
    state: u.uf,
    city: city.nome,
    ibge: city.ibge,
    situacao: 'Eleito(a) em 2024 · mandato 2025–2028 (TSE)',
    tse: tse(r, assets),
    pageUrl: `https://divulgacandcontas.tse.jus.br/divulga/#/candidato/2024/${r.CD_ELEICAO}/${r.SG_UE}/${r.SQ_CANDIDATO}`,
  }));
  if (!vers.length) problemas.push(`${city.nome}/${u.uf}: sem vereadores`);
  (vereadoresPorUf.get(lc) ?? vereadoresPorUf.set(lc, []).get(lc)).push(...vers);
}
if (problemas.length) throw new Error(problemas.join('\n'));

mkdirSync(join(root, 'cidades'), { recursive: true });
for (const [lc, list] of vereadoresPorUf) {
  list.sort((a, b) => a.city.localeCompare(b.city, 'pt-BR') || bySort(a, b));
  writeFileSync(join(root, 'cidades', `${lc}.json`), JSON.stringify(list, null, 1));
}
prefeitos.sort(bySort);
writeFileSync(join(root, 'prefeitos-cidades.json'), JSON.stringify(prefeitos, null, 1));
writeFileSync(
  join(root, 'cidades.json'),
  JSON.stringify(
    {
      pibAno, populacaoAno: popAno,
      fonte: 'IBGE — PIB dos Municípios (SIDRA 5938) e Censo 2022 (SIDRA 4709)',
      criterio: 'Cidades-polo: as duas maiores de cada estado por PIB, fora a capital. O DF não tem outras cidades.',
      cidades,
    },
    null, 1
  )
);
console.log('cidades', cidades.length, 'polos', polos.length, 'prefeitos', prefeitos.length, 'vereadores', [...vereadoresPorUf.values()].flat().length);
