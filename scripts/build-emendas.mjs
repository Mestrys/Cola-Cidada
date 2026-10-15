// Gera src/data/emendas.json: emendas parlamentares (Portal da Transparência, download aberto, sem chave) desde 2023,
// por parlamentar (emendas individuais) e por cidade monitorada (capitais e cidades-polo).
//
// Uso: node scripts/build-emendas.mjs [dir]
// `dir` = pasta com EmendasParlamentares.csv e EmendasParlamentares_PorFavorecido.csv (o zip do Portal, já extraído).
// Sem `dir`, baixa o zip (~32 MB) e extrai com `unzip` numa pasta temporária.
//
// Valores: "empenhado" = reservado no orçamento; "pago" = o que já saiu do caixa (pago no ano + restos a pagar pagos).
// O parlamentar é ligado pelo nome parlamentar (o dado traz o código SIAFI do autor, não o da Câmara ou do Senado).
import { createReadStream, readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const FROM_YEAR = 2023;
const TOP = 5;
const ZIP_URL = 'https://portaldatransparencia.gov.br/download-de-dados/emendas-parlamentares/UNICO';

export const norm = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().replace(/\s+/g, ' ').trim();
const money = (s) => Number(String(s).replace(/\./g, '').replace(',', '.')) || 0;
const round = (v) => Math.round(v);

/** Lê um CSV do Portal (latin1, ";" e aspas) linha a linha, sem carregar o arquivo todo. */
export async function eachRow(path, fn) {
  const rl = createInterface({ input: createReadStream(path, { encoding: 'latin1' }), crlfDelay: Infinity });
  let first = true;
  for await (const line of rl) {
    if (first) { first = false; continue; }
    if (line.length < 2) continue;
    fn(line.replace(/^"/, '').replace(/"$/, '').split('";"'));
  }
}

const bump = (map, key, init) => map[key] ?? (map[key] = init());
const top = (obj, n, mapFn) => Object.entries(obj).sort((a, b) => b[1].v - a[1].v).slice(0, n).map(([k, x]) => mapFn(k, x));

/** Resume as linhas das duas planilhas. `cidades` = ibge -> nome (as monitoradas). */
export function summarize(emendas, favorecidos, cidades, geradoEm) {
  const autores = {};
  const cidadesOut = {};
  const anos = {};
  const codeToAutor = new Map();

  for (const c of emendas) {
    const ano = Number(c[1]);
    if (ano < FROM_YEAR) continue;
    const tipo = c[2];
    const empenhado = money(c[22]);
    const pago = money(c[24]) + money(c[27]);
    const individual = tipo.startsWith('Emenda Individual');
    const especial = tipo.includes('Transferências Especiais');
    const a = bump(anos, ano, () => ({ empenhado: 0, pago: 0, n: new Set() }));
    a.empenhado += empenhado; a.pago += pago; a.n.add(c[0]);

    const nome = c[4];
    const key = norm(nome);
    const ibge = c[7];
    const autorLabel = individual ? nome : `${nome} (${tipo.replace('Emenda de ', '').toLowerCase()})`;

    if (individual) {
      const au = bump(autores, key, () => ({ nome, anos: {}, especial: 0, destinos: {}, favorecidos: {}, emendas: new Set() }));
      const y = bump(au.anos, ano, () => ({ e: 0, p: 0 }));
      y.e += empenhado; y.p += pago;
      if (especial) au.especial += empenhado;
      au.emendas.add(c[0]);
      if (/^\d{7}$/.test(ibge)) {
        const d = bump(au.destinos, ibge, () => ({ v: 0, nome: c[8], uf: c[10].length === 2 ? c[10] : (c[6].match(/ - (\w\w)$/)?.[1] ?? '') }));
        d.v += empenhado;
      }
      codeToAutor.set(c[0], key);
    }

    if (cidades.has(ibge)) {
      const ci = bump(cidadesOut, ibge, () => ({ anos: {}, autores: {}, emendas: new Set() }));
      const y = bump(ci.anos, ano, () => ({ e: 0, p: 0 }));
      y.e += empenhado; y.p += pago;
      bump(ci.autores, autorLabel, () => ({ v: 0 })).v += empenhado;
      ci.emendas.add(c[0]);
    }
  }

  for (const f of favorecidos) {
    const key = codeToAutor.get(f[0]);
    if (!key) continue;
    const fav = bump(autores[key].favorecidos, f[6], () => ({ v: 0, nome: f[7] }));
    fav.v += money(f[12]);
  }

  const outAutores = {};
  for (const [key, au] of Object.entries(autores)) {
    const anosOut = Object.fromEntries(Object.entries(au.anos).map(([y, v]) => [y, { empenhado: round(v.e), pago: round(v.p) }]));
    outAutores[key] = {
      nome: au.nome,
      emendas: au.emendas.size,
      anos: anosOut,
      especial: round(au.especial),
      destinos: top(au.destinos, TOP, (ibge, d) => ({ ibge: Number(ibge), nome: d.nome, uf: d.uf, valor: round(d.v) })),
      favorecidos: top(au.favorecidos, TOP, (_, f) => ({ nome: f.nome, valor: round(f.v) })),
    };
  }
  const outCidades = {};
  for (const [ibge, ci] of Object.entries(cidadesOut)) {
    outCidades[ibge] = {
      nome: cidades.get(ibge),
      emendas: ci.emendas.size,
      anos: Object.fromEntries(Object.entries(ci.anos).map(([y, v]) => [y, { empenhado: round(v.e), pago: round(v.p) }])),
      autores: top(ci.autores, TOP, (nome, x) => ({ nome, valor: round(x.v) })),
    };
  }
  return {
    geradoEm,
    fonte: 'Portal da Transparência (CGU) — Emendas Parlamentares, download aberto',
    desde: FROM_YEAR,
    anos: Object.fromEntries(Object.entries(anos).map(([y, v]) => [y, { empenhado: round(v.empenhado), pago: round(v.pago), emendas: v.n.size }])),
    autores: outAutores,
    cidades: outCidades,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let dir = process.argv[2];
  if (!dir) {
    dir = mkdtempSync(join(tmpdir(), 'emendas-'));
    const res = await fetch(ZIP_URL, { signal: AbortSignal.timeout(300000) });
    if (!res.ok) throw new Error(`Portal da Transparência: HTTP ${res.status}`);
    writeFileSync(join(dir, 'e.zip'), Buffer.from(await res.arrayBuffer()));
    execFileSync('unzip', ['-o', '-q', join(dir, 'e.zip'), '-d', dir]);
  }
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');
  const { cidades } = JSON.parse(readFileSync(join(root, 'cidades.json'), 'utf8'));
  const monitoradas = new Map(cidades.map((c) => [String(c.ibge), c.nome]));

  const emendas = [];
  await eachRow(join(dir, 'EmendasParlamentares.csv'), (c) => Number(c[1]) >= FROM_YEAR && emendas.push(c));
  // só as emendas individuais interessam à planilha de favorecidos: filtra cedo para não guardar 800 mil linhas
  const codes = new Set(emendas.filter((c) => c[2].startsWith('Emenda Individual')).map((c) => c[0]));
  const favorecidos = [];
  await eachRow(join(dir, 'EmendasParlamentares_PorFavorecido.csv'), (c) => codes.has(c[0]) && favorecidos.push(c));
  console.log('emendas', emendas.length, 'favorecidos', favorecidos.length);

  const out = summarize(emendas, favorecidos, monitoradas, new Date().toISOString().slice(0, 10));
  writeFileSync(join(root, 'emendas.json'), JSON.stringify(out));
  console.log('autores', Object.keys(out.autores).length, 'cidades', Object.keys(out.cidades).length, 'anos', Object.keys(out.anos).join(','));
}
