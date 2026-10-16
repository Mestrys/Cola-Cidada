// Fotos dos eleitos que vêm do TSE (governadores, prefeitos, deputados estaduais, vereadores e o presidente).
// Os CSVs de candidatos do TSE não trazem foto; o TSE publica as fotos em zips por estado e eleição (dados abertos):
//   https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes{ano}/fotos/foto_cand{ano}_{UF}_div.zip
// Este script lê desses zips, por HTTP Range, só as fotos de quem está nos dados do app (sem baixar os zips, que chegam a
// 2 GB), reduz cada uma (96×134, JPEG, ~3 KB) e grava em fotos/tse/{ano}/{sq}.jpg, servida do próprio app (a CSP já
// aceita 'self'). Depois escreve `photo` em cada pessoa dos arquivos de src/data.
//
// Uso: node scripts/build-fotos.mjs        (rode depois dos scripts que geram os dados do TSE; é idempotente)
// Precisa do ImageMagick (`convert`).
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openRemoteZip, readEntry } from './lib/remote-zip.mjs';
import { norm, parseCsvText } from './lib/tse.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = join(root, 'src', 'data');
const outDir = join(root, 'fotos', 'tse');
const CDN = 'https://cdn.tse.jus.br/estatistica/sead/eleicoes';
const CAND = 'https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand';
export const WIDTH = 96;
export const HEIGHT = 134;
export const photoPath = (year, sq) => `/fotos/tse/${year}/${sq}.jpg`;

/** Lê um JSON e devolve também como ele estava formatado, para gravar de volta sem mexer em mais nada. */
export function readJson(path) {
  const text = readFileSync(path, 'utf8');
  const obj = JSON.parse(text);
  for (const indent of [0, 1, 2]) {
    for (const nl of ['', '\n']) {
      if (JSON.stringify(obj, null, indent || undefined) + nl === text) return { obj, indent: indent || undefined, nl };
    }
  }
  throw new Error(`${path}: formatação não reconhecida (esperava JSON com 0, 1 ou 2 espaços)`);
}
const writeJson = (path, { obj, indent, nl }) => writeFileSync(path, JSON.stringify(obj, null, indent) + nl);

/** Todas as pessoas com ficha do TSE, nos arquivos de dados, junto do arquivo e do vetor onde elas moram. */
export function collectPeople() {
  const files = [];
  const add = (path, pick) => {
    const doc = readJson(path);
    files.push({ path, doc, people: pick(doc.obj) });
  };
  add(join(data, 'executivo.json'), (o) => [...o.presidente, ...o.governadores, ...o.prefeitos]);
  add(join(data, 'prefeitos-cidades.json'), (o) => o);
  for (const dir of ['states', 'capitais', 'cidades']) {
    for (const f of readdirSync(join(data, dir)).sort()) add(join(data, dir, f), (o) => o);
  }
  return files;
}

const words = (s) => norm(s).replace(/[^A-Z ]/g, ' ').split(/\s+/).filter((w) => w.length > 2);

/**
 * Quem assumiu no lugar de um eleito (e por isso não tem ficha do TSE) quase sempre também foi candidato: vice, ou o presidente da
 * Assembleia ou da Câmara. Acha o registro dele pelo nome (todas as palavras do nome que o app tem aparecem no nome completo do TSE,
 * no mesmo estado e, para prefeitos, na mesma cidade). Só vale se o nome apontar para uma pessoa só; se ela tiver mais de um
 * registro (candidatura substituída), fica o de vice.
 */
export function matchSubstitute(rows, person) {
  const want = words(person.fullName || '');
  if (want.length < 2) return null;
  const city = person.roleKey === 'prefeito' ? norm(person.city || '') : null;
  const hits = rows.filter((r) => {
    if (city && norm(r.NM_UE) !== city) return false;
    const have = new Set(words(r.NM_CANDIDATO));
    return want.every((w) => have.has(w));
  });
  if (!hits.length || new Set(hits.map((r) => norm(r.NM_CANDIDATO))).size !== 1) return null;
  hits.sort((a, b) => Number(!a.DS_CARGO.startsWith('VICE')) - Number(!b.DS_CARGO.startsWith('VICE')));
  return hits[0].SQ_CANDIDATO;
}

function resize(jpeg) {
  const r = spawnSync(
    'convert',
    ['jpg:-', '-resize', `${WIDTH}x${HEIGHT}^`, '-gravity', 'north', '-extent', `${WIDTH}x${HEIGHT}`, '-strip', '-interlace', 'Plane', '-sampling-factor', '4:2:0', '-quality', '60', 'jpg:-'],
    { input: jpeg, maxBuffer: 16 << 20 }
  );
  if (r.error) throw new Error(`ImageMagick (convert) não encontrado: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`convert falhou: ${r.stderr}`);
  return r.stdout;
}

async function mapLimit(list, n, fn) {
  let next = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (next < list.length) { const i = next++; await fn(list[i], i); } }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = collectPeople();
  // (ano, UF do zip) -> sqs de que preciso
  const wanted = new Map();
  for (const { people } of files) {
    for (const p of people) {
      if (!p.tse?.sq) continue;
      const key = `${p.tse.year}/${p.state}`;
      (wanted.get(key) ?? wanted.set(key, new Set()).get(key)).add(String(p.tse.sq));
    }
  }
  console.log([...wanted.entries()].reduce((n, [, s]) => n + s.size, 0), 'pessoas com ficha do TSE em', wanted.size, 'zips');

  // quem assumiu no lugar de um eleito: governadores (candidatos de 2022) e prefeitos (de 2024)
  const subs = files.flatMap((f) => f.people).filter((p) => p.eleitoPeloTse && !p.tse && !p.photo && (p.roleKey === 'governador' || p.roleKey === 'prefeito'));
  const matched = [];
  const csvZips = new Map();
  for (const p of subs) {
    const year = p.roleKey === 'governador' ? 2022 : 2024;
    const zip = csvZips.get(year) ?? csvZips.set(year, await openRemoteZip(`${CAND}/consulta_cand_${year}.zip`)).get(year);
    const e = zip.entries.get(`consulta_cand_${year}_${p.state}.csv`);
    if (!e) continue;
    csvZips.set(`${year}/${p.state}`, csvZips.get(`${year}/${p.state}`) ?? parseCsvText(new TextDecoder('latin1').decode(await readEntry(zip, e))));
    const sq = matchSubstitute(csvZips.get(`${year}/${p.state}`), p);
    if (sq) {
      matched.push({ p, year, sq });
      (wanted.get(`${year}/${p.state}`) ?? wanted.set(`${year}/${p.state}`, new Set()).get(`${year}/${p.state}`)).add(sq);
    }
  }
  console.log(`${matched.length} de ${subs.length} substitutos têm registro de candidato no TSE`);

  let baixadas = 0, jaTinha = 0;
  const semFoto = [];
  const zips = [...wanted.entries()].sort();
  // vários zips ao mesmo tempo: o tempo é quase todo de espera pela rede
  await mapLimit(zips, 4, async ([key, sqs]) => {
    const [year, uf] = key.split('/');
    mkdirSync(join(outDir, year), { recursive: true });
    const todo = [...sqs].filter((sq) => !existsSync(join(outDir, year, `${sq}.jpg`)));
    jaTinha += sqs.size - todo.length;
    if (!todo.length) return;
    const zip = await openRemoteZip(`${CDN}/eleicoes${year}/fotos/foto_cand${year}_${uf}_div.zip`);
    const bySq = new Map();
    for (const e of zip.entries.values()) {
      const m = e.name.match(/^F[A-Z]{2}(\d+)_div\.(?:jpe?g|png)$/i);
      if (m) bySq.set(m[1], e);
    }
    let faltou = 0;
    await mapLimit(todo, 6, async (sq) => {
      const e = bySq.get(sq);
      if (!e) { semFoto.push(`${year}/${uf}/${sq}`); faltou++; return; }
      writeFileSync(join(outDir, year, `${sq}.jpg`), resize(await readEntry(zip, e)));
      baixadas++;
    });
    console.log(`${key}: ${todo.length} pedidas, ${todo.length - faltou} gravadas`);
  });

  // escreve `photo` em quem tem foto gravada
  let comFoto = 0, total = 0;
  for (const f of files) {
    let mudou = false;
    for (const p of f.people) {
      if (!p.tse?.sq) continue;
      total++;
      const rel = photoPath(p.tse.year, p.tse.sq);
      if (existsSync(join(root, rel))) {
        comFoto++;
        if (p.photo !== rel) { p.photo = rel; mudou = true; }
      } else if (p.photo) { delete p.photo; mudou = true; }
    }
    if (mudou) writeJson(f.path, f.doc);
  }
  for (const { p, year, sq } of matched) {
    const rel = photoPath(year, sq);
    if (existsSync(join(root, rel))) {
      p.photo = rel;
      comFoto++;
      total++;
      const f = files.find((x) => x.people.includes(p));
      f.mudou = true;
    }
  }
  for (const f of files) if (f.mudou) writeJson(f.path, f.doc);
  let bytes = 0, n = 0;
  for (const y of readdirSync(outDir)) for (const f of readdirSync(join(outDir, y))) { bytes += statSync(join(outDir, y, f)).size; n++; }
  console.log(`${comFoto} de ${total} com foto (${baixadas} baixadas agora, ${jaTinha} já estavam); ${n} arquivos, ${(bytes / 1e6).toFixed(1)} MB`);
  if (semFoto.length) console.log('sem foto no zip:', semFoto.length, semFoto.slice(0, 10).join(' '));
}
