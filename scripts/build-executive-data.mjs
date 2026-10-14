// Gera src/data/executivo.json (Presidente, 27 Governadores e 26 Prefeitos de capitais, com seus vices)
// a partir dos dados abertos do TSE (consulta_cand de 2022 e 2024).
//
// Uso:
//   node scripts/build-executive-data.mjs <dir-consulta-cand-2022> <dir-consulta-cand-2024>
// Os zips ficam em https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_{2022,2024}.zip
//
// O TSE registra quem foi eleito, não quem ocupa o cargo hoje. Renúncias e afastamentos entram em
// src/data/titulares.json (aplicado por cima, com fonte e data), nunca editando o arquivo gerado.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FEDERATION_UNITS } from '../src/data/federation.js';

const [cand22, cand24] = process.argv.slice(2);
if (!cand24) {
  console.error('Uso: build-executive-data.mjs <cand2022> <cand2024>');
  process.exit(1);
}
const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');
const out = join(dataDir, 'executivo.json');
const titulares = JSON.parse(readFileSync(join(dataDir, 'titulares.json'), 'utf8'));

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
const clean = (v) => (v && !v.startsWith('#') ? v : null);
const urna = (r) => titleCase(clean(r.NM_URNA_CANDIDATO) || r.NM_CANDIDATO);

// Chapa eleita: mesma SQ do titular não serve para o vice, então casamos pela coligação/partido e UE.
function elected(rows, cargo, ue) {
  const seen = new Set();
  return rows.filter(
    (r) => r.DS_CARGO === cargo && (!ue || r.SG_UE === ue) && isElected(r) && !seen.has(r.SQ_CANDIDATO) && seen.add(r.SQ_CANDIDATO)
  );
}

function entry(r, vice, { id, role, roleKey, prefix, house, source, city, year, mandate }) {
  const ue = r.SG_UE;
  return {
    id,
    name: `${prefix} ${urna(r)}`,
    fullName: titleCase(r.NM_CANDIDATO),
    party: r.SG_PARTIDO,
    role,
    roleKey,
    house,
    source,
    state: r.SG_UF === 'BR' ? 'BR' : r.SG_UF,
    ...(city ? { city } : {}),
    situacao: `Eleito(a) em ${year} · mandato ${mandate[0].slice(0, 4)}–${mandate[1].slice(0, 4)} (TSE)`,
    mandate,
    ...(vice ? { vice: { name: urna(vice), fullName: titleCase(vice.NM_CANDIDATO), party: vice.SG_PARTIDO } } : {}),
    tse: {
      year,
      sq: r.SQ_CANDIDATO,
      ballotNumber: r.NR_CANDIDATO,
      coalition: clean(r.SG_FEDERACAO) || clean(r.NM_COLIGACAO),
      declaredAssets: null,
      status: r.DS_SIT_TOT_TURNO,
    },
    pageUrl: `https://divulgacandcontas.tse.jus.br/divulga/#/candidato/${year}/${r.CD_ELEICAO}/${ue}/${r.SQ_CANDIDATO}`,
  };
}

// O vice da chapa é o candidato do mesmo cargo-vice, na mesma UE, com a mesma coligação.
const viceOf = (rows, viceCargo, r) =>
  elected(rows, viceCargo, r.SG_UE).find((v) => v.SQ_COLIGACAO === r.SQ_COLIGACAO && v.NR_PARTIDO !== undefined) ||
  elected(rows, viceCargo, r.SG_UE)[0] ||
  null;

// Quem ocupa o cargo hoje (titulares.json) vale mais do que quem foi eleito (TSE). Se for a mesma pessoa,
// a ficha do TSE continua valendo; se não for, a ficha fica com o eleito e o ocupante aparece sem ela.
const words = (s) => norm(s).replace(/[^A-Z ]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
function samePerson(current, e) {
  const known = new Set([...words(e.name), ...words(e.fullName)]);
  const w = words(current);
  return w.length > 0 && w.every((x) => known.has(x));
}
function applyHolder(e, h, label) {
  const same = samePerson(h.name, e);
  const since = h.desde ? new Date(`${h.desde}T12:00:00`).toLocaleDateString('pt-BR') : null;
  const prefix = e.name.split(' ')[0];
  const out = {
    ...e,
    // nome e partido de hoje: o nome de urna do TSE é curto ("Clécio") e o partido muda
    name: `${prefix} ${h.name}`,
    fullName: same ? e.fullName : h.name,
    party: h.party,
    ...(h.condicao && h.condicao !== 'titular' ? { condicao: h.condicao } : {}),
    ...(h.desde ? { desde: h.desde } : {}),
    ...(h.nota ? { nota: h.nota } : {}),
  };
  // o vice do TSE só vale para quem foi eleito; um sucessor assume sem vice, salvo informação em contrário
  if (h.vice) out.vice = { name: h.vice };
  else if (!same) delete out.vice;
  if (!same) {
    out.eleitoPeloTse = { name: e.name.replace(/^\S+ /, ''), party: e.party, year: e.tse.year };
    out.situacao = `${label} desde ${since ?? 'data não informada'} (substituiu quem foi eleito em ${e.tse.year})`;
    out.id = `${e.id}-${norm(h.name).toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '')}`;
    if (h.desde) out.mandate = [h.desde, e.mandate[1]];
    delete out.tse;
    out.pageUrl = 'https://divulgacandcontas.tse.jus.br/divulga/';
  } else if (since && h.desde > `${e.tse.year + 1}-01-01`) {
    out.situacao = `${label} desde ${since}`;
  }
  return out;
}

const bySort = (a, b) => a.name.localeCompare(b.name, 'pt-BR');
const result = { consultadoEm: titulares.consultadoEm, fonteOcupantes: titulares.fonte, presidente: [], governadores: [], prefeitos: [] };

const br = parseCsv(join(cand22, 'consulta_cand_2022_BR.csv'));
for (const r of elected(br, 'PRESIDENTE')) {
  result.presidente.push(
    entry(r, viceOf(br, 'VICE-PRESIDENTE', r), {
      id: 'exe-presidente', role: 'Presidente da República', roleKey: 'presidente', prefix: 'Presidente',
      house: 'Presidência da República', source: 'executivo', year: 2022, mandate: ['2023-01-01', '2027-01-05'],
    })
  );
}

for (const u of FEDERATION_UNITS) {
  const rows22 = parseCsv(join(cand22, `consulta_cand_2022_${u.uf}.csv`));
  for (const r of elected(rows22, 'GOVERNADOR')) {
    result.governadores.push(
      entry(r, viceOf(rows22, 'VICE-GOVERNADOR', r), {
        id: `exe-gov-${u.uf.toLowerCase()}`, role: 'Governador', roleKey: 'governador', prefix: 'Gov.',
        house: `Governo do Estado — ${u.name}`, source: 'executivo', year: 2022, mandate: ['2023-01-01', '2027-01-05'],
      })
    );
  }
  if (!u.hasCouncil) continue; // o DF não elege prefeito
  const rows24 = parseCsv(join(cand24, `consulta_cand_2024_${u.uf}.csv`));
  const cap = norm(u.capital);
  const capRows = rows24.filter((r) => norm(r.NM_UE) === cap);
  for (const r of elected(capRows, 'PREFEITO')) {
    result.prefeitos.push(
      entry(r, viceOf(capRows, 'VICE-PREFEITO', r), {
        id: `exe-pref-${u.uf.toLowerCase()}`, role: 'Prefeito', roleKey: 'prefeito', prefix: 'Pref.',
        house: `Prefeitura de ${u.capital}`, source: 'executivo', city: u.capital, year: 2024,
        mandate: ['2025-01-01', '2028-12-31'],
      })
    );
  }
}
result.governadores = result.governadores.map((e) => {
  const h = titulares.governadores[e.state];
  if (!h) throw new Error(`Sem titular para o governo de ${e.state}`);
  return applyHolder(e, h, h.condicao === 'interino' ? 'Governador(a) interino(a)' : 'Governador(a)');
});
result.prefeitos = result.prefeitos.map((e) => {
  const h = titulares.prefeitos[e.state];
  if (!h) throw new Error(`Sem titular para a prefeitura de ${e.state}`);
  return applyHolder(e, h, 'Prefeito(a)');
});
for (const k of ['presidente', 'governadores', 'prefeitos']) result[k].sort(bySort);
console.log('presidente', result.presidente.length, 'governadores', result.governadores.length, 'prefeitos', result.prefeitos.length);
writeFileSync(out, JSON.stringify(result, null, 1));
