// Copia os dados públicos do PWA (../src/data) para o app nativo, que não enxerga arquivos fora de expo-app/.
// Rode depois de atualizar os dados do PWA:  node scripts/sync-data.mjs
// O teste src/lib/__tests__/data.test.ts falha se as cópias ficarem diferentes das originais.
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const from = join(here, '..', '..', 'src', 'data');
const to = join(here, '..', 'src', 'data');

rmSync(to, { recursive: true, force: true });
mkdirSync(to, { recursive: true });
for (const f of ['executivo.json', 'stf.json', 'entes.json']) cpSync(join(from, f), join(to, f));
cpSync(join(from, 'states'), join(to, 'states'), { recursive: true });
cpSync(join(from, 'capitais'), join(to, 'capitais'), { recursive: true });

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
    `export const CAPITALS: Record<string, () => any[]> = {\n${caps.map((u) => `  ${u}: () => require('./capitais/${u}.json'),`).join('\n')}\n};\n`
);
console.log(`dados copiados: ${ufs.length} assembleias, ${caps.length} câmaras de capitais, executivo, STF e entes`);
