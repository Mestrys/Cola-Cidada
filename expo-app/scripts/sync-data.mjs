// Copia os dados públicos do PWA (../src/data) e as imagens (../fotos, ../partidos, ../bandeiras) para o app nativo, que
// não enxerga arquivos fora de expo-app/. Rode depois de atualizar os dados do PWA, e antes de abrir ou compilar o app:
//   node scripts/sync-data.mjs
// Os dados e o índice das imagens (src/data) vão para o git; as cópias das imagens (assets/fotos e assets/simbolos) não:
// são geradas aqui a cada rodada (o EAS roda este script antes de compilar).
// O teste src/lib/__tests__/data.test.ts falha se as cópias ficarem diferentes das originais.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..');
const assets = join(here, '..', 'assets');
const from = join(here, '..', '..', 'src', 'data');
const to = join(here, '..', 'src', 'data');

rmSync(to, { recursive: true, force: true });
mkdirSync(to, { recursive: true });
for (const f of ['executivo.json', 'stf.json', 'entes.json', 'cidades.json', 'prefeitos-cidades.json', 'ceaps.json', 'poderes.json', 'emendas.json', 'cnpjs.json']) cpSync(join(from, f), join(to, f));
cpSync(join(from, 'states'), join(to, 'states'), { recursive: true });
cpSync(join(from, 'capitais'), join(to, 'capitais'), { recursive: true });
cpSync(join(from, 'cidades'), join(to, 'cidades'), { recursive: true });

// federation.js é um módulo do PWA; aqui vira JSON
const { FEDERATION_UNITS } = await import(join(from, 'federation.js'));
writeFileSync(join(to, 'federation.json'), JSON.stringify(FEDERATION_UNITS, null, 1));

// Metro só empacota o que é importado de forma estática: um índice com um require por UF
const ufs = FEDERATION_UNITS.map((u) => u.uf.toLowerCase());
const caps = FEDERATION_UNITS.filter((u) => u.hasCouncil).map((u) => u.uf.toLowerCase());
writeFileSync(
  join(to, 'index.ts'),
  `// Gerado por scripts/sync-data.mjs: não edite à mão.\n` +
    `export const STATES: Record<string, () => any[]> = {\n${ufs.map((u) => `  ${u}: () => require('./states/${u}.json'),`).join('\n')}\n};\n\n` +
    `export const CAPITALS: Record<string, () => any[]> = {\n${caps.map((u) => `  ${u}: () => require('./capitais/${u}.json'),`).join('\n')}\n};\n\n` +
    `// vereadores das cidades-polo (as duas maiores economias de cada estado, fora a capital)\n` +
    `export const POLOS: Record<string, () => any[]> = {\n${caps.map((u) => `  ${u}: () => require('./cidades/${u}.json'),`).join('\n')}\n};\n`
);
// bandeiras dos partidos e dos estados (com licença e autoria, em simbolos.json)
const { PARTIDOS, BANDEIRAS } = await import(join(from, 'simbolos.js'));
writeFileSync(join(to, 'simbolos.json'), JSON.stringify({ PARTIDOS, BANDEIRAS }, null, 1));

// imagens: copia para assets/ e gera, em src/data/imagens.ts, um require por arquivo (Metro só empacota o que é estático)
for (const d of ['fotos', 'simbolos']) rmSync(join(assets, d), { recursive: true, force: true });
cpSync(join(repo, 'fotos'), join(assets, 'fotos'), { recursive: true });
cpSync(join(repo, 'partidos'), join(assets, 'simbolos', 'partidos'), { recursive: true });
cpSync(join(repo, 'bandeiras'), join(assets, 'simbolos', 'bandeiras'), { recursive: true });
const list = (dir) => (existsSync(join(assets, dir)) ? readdirSync(join(assets, dir)).sort() : []);
const req = (rel) => `() => require('../../assets/${rel}')`;
const photos = [];
for (const f of list('fotos/stf')) photos.push(`fotos/stf/${f}`);
for (const y of list('fotos/tse')) for (const f of list(`fotos/tse/${y}`)) photos.push(`fotos/tse/${y}/${f}`);
const byFile = (dir) => list(dir).map((f) => `  ${JSON.stringify(f.replace(/\.png$/, ''))}: ${req(`${dir}/${f}`)},`).join('\n');
writeFileSync(
  join(to, 'imagens.ts'),
  `// Gerado por scripts/sync-data.mjs: não edite à mão.\n` +
    `// Fotos (chave = o caminho do PWA, sem a barra inicial, como em \`photo\`) e bandeiras. As cópias ficam em assets/ e não vão para o git.\n` +
    `export const PHOTOS: Record<string, () => number> = {\n${photos.map((rel) => `  ${JSON.stringify(rel)}: ${req(rel)},`).join('\n')}\n};\n\n` +
    `export const PARTY_IMAGES: Record<string, () => number> = {\n${byFile('simbolos/partidos')}\n};\n\n` +
    `export const STATE_IMAGES: Record<string, () => number> = {\n${byFile('simbolos/bandeiras')}\n};\n`
);
console.log(`dados copiados: ${ufs.length} assembleias, ${caps.length} câmaras de capitais e de cidades-polo, executivo, STF, entes e cidades; ${photos.length} fotos, ${list('simbolos/partidos').length} bandeiras de partidos e ${list('simbolos/bandeiras').length} de estados`);
