// Naturalidade e foto dos ministros do STF (src/data/stf.json).
// Ministros do STF não têm vínculo partidário: no app, no lugar do partido aparece o estado onde nasceram.
//
// Naturalidade: Wikidata (CC0). Só vale se a data de nascimento do Wikidata for a mesma que já está em stf.json
// (é o que garante que é a mesma pessoa). Foto: Wikimedia Commons (arquivo escolhido em scripts/stf-fontes.json, com o recorte
// do rosto quando a foto original é larga), reduzida para 96×134 e gravada em fotos/stf/{nome}.jpg; autoria e licença de cada
// uma ficam em `fotoCredito`. O portal do STF não deixa consulta automática, por isso as fontes são o Wikidata e o Commons.
//
// Uso: node scripts/build-stf.mjs      Precisa do ImageMagick (`convert`).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { commonsInfo, download } from './lib/commons.mjs';
import { readJson } from './build-fotos.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const UA = { 'User-Agent': 'MonitorCidadao/1.0 (https://github.com/Mestrys/Cola-Cidada; devops@mestrys.com.br)' };
const entity = async (id) => (await (await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${id}.json`, { headers: UA, signal: AbortSignal.timeout(60000) })).json()).entities[id];
const claim = (e, p) => e.claims?.[p]?.[0]?.mainsnak?.datavalue?.value;
const label = (e) => e.labels?.pt?.value || e.labels?.en?.value;

/** Cidade e UF de nascimento: P19 (local de nascimento) e, subindo por P131, o estado (o que tem código ISO "BR-XX"). */
export async function birthplace(person) {
  const place = claim(person, 'P19')?.id;
  if (!place) return null;
  const city = await entity(place);
  let cur = city;
  for (let i = 0; i < 4; i++) {
    const iso = claim(cur, 'P300');
    if (typeof iso === 'string' && /^BR-[A-Z]{2}$/.test(iso)) return { cidade: label(city), uf: iso.slice(3) };
    const up = claim(cur, 'P131')?.id;
    if (!up) break;
    cur = await entity(up);
  }
  return null;
}

function toPortrait(jpeg, recorte) {
  const args = ['-', ...(recorte ? ['-crop', recorte, '+repage'] : []), '-resize', '96x134^', '-gravity', 'north', '-extent', '96x134', '-strip', '-interlace', 'Plane', '-sampling-factor', '4:2:0', '-quality', '60', 'jpg:-'];
  const r = spawnSync('convert', args, { input: jpeg, maxBuffer: 32 << 20 });
  if (r.error) throw new Error(`ImageMagick (convert) não encontrado: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`convert falhou: ${r.stderr}`);
  return r.stdout;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const path = join(root, 'src', 'data', 'stf.json');
  const doc = readJson(path);
  const fontes = JSON.parse(readFileSync(join(root, 'scripts', 'stf-fontes.json'), 'utf8'));
  mkdirSync(join(root, 'fotos', 'stf'), { recursive: true });
  for (const m of doc.obj.ministros) {
    const f = fontes[m.id];
    if (!f) throw new Error(`${m.id}: sem fonte em scripts/stf-fontes.json`);
    const person = await entity(f.qid);
    const born = claim(person, 'P569')?.time?.slice(1, 11);
    if (born !== m.nascimento) throw new Error(`${m.id}: nascimento ${born} no Wikidata, ${m.nascimento} em stf.json: não é a mesma pessoa`);
    const nat = await birthplace(person);
    if (!nat) throw new Error(`${m.id}: sem local de nascimento no Wikidata`);
    m.naturalidade = nat;

    const info = await commonsInfo(f.arquivo, 1280);
    if (!/^(Public domain|CC0|CC BY(-SA)?|Attribution)/i.test(info.licenca)) throw new Error(`${m.id}: licença "${info.licenca}" não aceita`);
    const rel = `/fotos/stf/${m.id.replace(/^stf-/, '')}.jpg`;
    writeFileSync(join(root, rel), toPortrait(await download(info.miniatura), f.recorte));
    m.photo = rel;
    m.fotoCredito = { autor: info.autor, licenca: info.licenca, url: info.pagina };
    console.log(m.name.padEnd(26), `${nat.cidade}/${nat.uf}`.padEnd(26), info.licenca, '|', info.autor);
  }
  doc.obj.fonteNaturalidade = 'Wikidata (CC0), conferida pela data de nascimento; fotos do Wikimedia Commons (créditos em cada ministro)';
  writeFileSync(path, JSON.stringify(doc.obj, null, doc.indent) + doc.nl);
}
