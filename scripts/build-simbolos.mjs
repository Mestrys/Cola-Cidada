// Bandeiras e símbolos usados no app: dos partidos (ao lado da sigla de quem tem partido) e dos estados (no lugar do partido
// para os ministros do STF, que não têm vínculo partidário: mostra o estado onde nasceram).
//
// Os arquivos vêm do Wikimedia Commons, que só hospeda conteúdo livre; scripts/simbolos-fontes.json diz qual arquivo vale para
// cada partido e estado. O script baixa a miniatura, confere a licença (só domínio público, CC0, CC BY e CC BY-SA), reduz
// para caber em 72×48 e grava em partidos/{CHAVE}.png e bandeiras/{UF}.png, mais src/data/simbolos.js com o caminho, a
// licença e a autoria de cada um (aparecem em "Créditos das imagens").
//
// Uso: node scripts/build-simbolos.mjs     Precisa do ImageMagick (`convert`).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { commonsInfo, download } from './lib/commons.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const BOX = '72x48';
const ALLOWED = /^(Public domain|CC0|CC BY(-SA)?( \d(\.\d)?)?( \w+)?)$/i;

/** Chave de busca de uma sigla: sem acento, espaço nem pontuação ("PC do B" e "PCdoB" dão PCDOB). */
export const partyKey = (sigla = '') => String(sigla).normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();

function shrink(img) {
  const r = spawnSync('convert', ['-background', 'none', '-', '-resize', `${BOX}>`, '-strip', '-define', 'png:compression-level=9', 'png:-'], { input: img, maxBuffer: 16 << 20 });
  if (r.error) throw new Error(`ImageMagick (convert) não encontrado: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`convert falhou: ${r.stderr}`);
  return r.stdout;
}

async function build(kind, dir, entries, keyOf) {
  mkdirSync(join(root, dir), { recursive: true });
  const out = {};
  for (const [id, { nome, arquivo }] of Object.entries(entries)) {
    const info = await commonsInfo(arquivo, 160);
    if (!ALLOWED.test(info.licenca)) throw new Error(`${kind} ${id}: licença "${info.licenca}" não aceita (${arquivo})`);
    const key = keyOf(id);
    writeFileSync(join(root, dir, `${key}.png`), shrink(await download(info.miniatura)));
    out[key] = { sigla: id, nome, arquivo: `/${dir}/${key}.png`, licenca: info.licenca, autor: info.autor, pagina: info.pagina, restricoes: info.restricoes || undefined };
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const fontes = JSON.parse(readFileSync(join(root, 'scripts', 'simbolos-fontes.json'), 'utf8'));
  const partidos = await build('partido', 'partidos', fontes.partidos, partyKey);
  const estados = await build('estado', 'bandeiras', fontes.estados, (uf) => uf);
  const body =
    `// Gerado por scripts/build-simbolos.mjs: não edite à mão.\n` +
    `// Bandeiras e símbolos do Wikimedia Commons, com a licença e a autoria de cada arquivo.\n` +
    `export const PARTIDOS = ${JSON.stringify(partidos, null, 1)};\n\n` +
    `export const BANDEIRAS = ${JSON.stringify(estados, null, 1)};\n`;
  writeFileSync(join(root, 'src', 'data', 'simbolos.js'), body);
  console.log(Object.keys(partidos).length, 'partidos,', Object.keys(estados).length, 'estados');
}
