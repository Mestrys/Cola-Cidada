// Gera src/data/states/{uf}.json e src/data/capitais/{uf}.json a partir dos
// dados abertos do TSE (consulta_cand e bem_candidato de 2022 e 2024).
//
// Uso:
//   node scripts/build-regional-data.mjs <dir-consulta-cand-2022> <dir-consulta-cand-2024> <dir-bem-2022> <dir-bem-2024>
// Os zips ficam em https://cdn.tse.jus.br/estatistica/sead/odsele/{consulta_cand,bem_candidato}/*_{2022,2024}.zip
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FEDERATION_UNITS } from '../src/data/federation.js';

const [cand22, cand24, bem22, bem24] = process.argv.slice(2);
if (!bem24) {
  console.error('Uso: build-regional-data.mjs <cand2022> <cand2024> <bem2022> <bem2024>');
  process.exit(1);
}
const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');

function parseCsv(path) {
  const text = new TextDecoder('latin1').decode(readFileSync(path));
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ';') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const head = rows.shift();
  return rows.filter((r) => r.length === head.length).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

const norm = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().trim();
const titleCase = (s) =>
  s.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase())
    .replace(/\b(Da|De|Do|Das|Dos|E)\b/g, (m) => m.toLowerCase());
const isElected = (r) => /^ELEITO/.test(r.DS_SIT_TOT_TURNO) && !/N[ÃA]O ELEITO/.test(r.DS_SIT_TOT_TURNO);

function assetsBySq(path) {
  const m = new Map();
  if (!existsSync(path)) return m;
  for (const r of parseCsv(path)) {
    const v = parseFloat((r.VR_BEM_CANDIDATO || '0').replace(',', '.')) || 0;
    m.set(r.SQ_CANDIDATO, (m.get(r.SQ_CANDIDATO) || 0) + v);
  }
  return m;
}

function build(r, assets, extra) {
  const urna = r.NM_URNA_CANDIDATO && !r.NM_URNA_CANDIDATO.startsWith('#') ? r.NM_URNA_CANDIDATO : r.NM_CANDIDATO;
  const fed = r.SG_FEDERACAO && !r.SG_FEDERACAO.startsWith('#') ? r.SG_FEDERACAO : null;
  return {
    name: `${extra.prefix} ${titleCase(urna)}`,
    fullName: titleCase(r.NM_CANDIDATO),
    party: r.SG_PARTIDO,
    role: extra.role,
    house: extra.house,
    source: extra.source,
    state: r.SG_UF,
    ...(extra.city ? { city: extra.city } : {}),
    situacao: extra.situacao,
    tse: {
      year: Number(r.ANO_ELEICAO),
      sq: r.SQ_CANDIDATO,
      ballotNumber: r.NR_CANDIDATO,
      coalition: fed || (r.NM_COLIGACAO && !r.NM_COLIGACAO.startsWith('#') ? r.NM_COLIGACAO : null),
      declaredAssets: assets.has(r.SQ_CANDIDATO) ? assets.get(r.SQ_CANDIDATO) : null,
      status: r.DS_SIT_TOT_TURNO,
    },
  };
}

const bySort = (a, b) => a.name.localeCompare(b.name, 'pt-BR');
mkdirSync(join(root, 'states'), { recursive: true });
mkdirSync(join(root, 'capitais'), { recursive: true });

for (const u of FEDERATION_UNITS) {
  const uf = u.uf, lc = uf.toLowerCase();

  // Deputados estaduais / distritais (eleição de 2022, mandato 2023-2027)
  const f22 = join(cand22, `consulta_cand_2022_${uf}.csv`);
  const a22 = assetsBySq(join(bem22, `bem_candidato_2022_${uf}.csv`));
  const cargo = uf === 'DF' ? 'DEPUTADO DISTRITAL' : 'DEPUTADO ESTADUAL';
  const seen = new Set();
  const deps = parseCsv(f22)
    .filter((r) => r.DS_CARGO === cargo && isElected(r) && !seen.has(r.SQ_CANDIDATO) && seen.add(r.SQ_CANDIDATO))
    .map((r, i) => ({
      id: `${lc}-${r.SQ_CANDIDATO}`,
      ...build(r, a22, {
        prefix: 'Dep.', role: uf === 'DF' ? 'Deputado Distrital' : 'Deputado Estadual',
        house: `${u.house} (${u.assembly})`, source: `al-${lc}`,
        situacao: 'Eleito(a) em 2022 · mandato 2023–2027 (TSE)',
      }),
      pageUrl: `https://divulgacandcontas.tse.jus.br/divulga/#/candidato/2022/${r.CD_ELEICAO}/${uf}/${r.SQ_CANDIDATO}`,
    }))
    .sort(bySort);
  writeFileSync(join(root, 'states', `${lc}.json`), JSON.stringify(deps, null, 1));

  // Vereadores da capital (eleição de 2024, mandato 2025-2028)
  if (u.hasCouncil) {
    const f24 = join(cand24, `consulta_cand_2024_${uf}.csv`);
    const a24 = assetsBySq(join(bem24, `bem_candidato_2024_${uf}.csv`));
    const cap = norm(u.capital);
    const seen2 = new Set();
    const vers = parseCsv(f24)
      .filter((r) => r.DS_CARGO === 'VEREADOR' && norm(r.NM_UE) === cap && isElected(r) && !seen2.has(r.SQ_CANDIDATO) && seen2.add(r.SQ_CANDIDATO))
      .map((r) => ({
        id: `cm-${lc}-${r.SQ_CANDIDATO}`,
        ...build(r, a24, {
          prefix: 'Ver.', role: 'Vereador', house: `${u.councilName} (${u.council})`, source: `cm-${lc}`,
          city: u.capital, situacao: 'Eleito(a) em 2024 · mandato 2025–2028 (TSE)',
        }),
        pageUrl: `https://divulgacandcontas.tse.jus.br/divulga/#/candidato/2024/${r.CD_ELEICAO}/${r.SG_UE}/${r.SQ_CANDIDATO}`,
      }))
      .sort(bySort);
    writeFileSync(join(root, 'capitais', `${lc}.json`), JSON.stringify(vers, null, 1));
    console.log(uf, 'deputados:', deps.length, '/', u.totalDep, ' vereadores:', vers.length, '/', u.councilDep);
  } else console.log(uf, 'deputados:', deps.length, '/', u.totalDep, ' (sem câmara de capital)');
}
