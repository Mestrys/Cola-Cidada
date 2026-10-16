// Bandeiras dos partidos, estado de nascimento dos magistrados e fotos: lógica (src/simbolos.js, src/ui.js) e dados gerados.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { partyKey, isMagistrate, partyName, partyFlag, stateFlag, birthplace, partyOrBirth, photoCredit } from '../../src/simbolos.js';
import { partyChip } from '../../src/ui.js';
import { PARTIDOS, BANDEIRAS } from '../../src/data/simbolos.js';
import { FEDERATION_UNITS } from '../../src/data/federation.js';

const root = new URL('../../', import.meta.url).pathname;
const J = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const stf = J('src/data/stf.json');
const gilmar = stf.ministros.find((m) => m.id === 'stf-gilmar-mendes');

test('a chave da sigla ignora acento, espaço e pontuação', () => {
  assert.equal(partyKey('PC do B'), 'PCDOB');
  assert.equal(partyKey('PCdoB'), 'PCDOB');
  assert.equal(partyKey('UNIÃO'), 'UNIAO');
  assert.equal(partyKey('S/Partido'), 'SPARTIDO');
});

test('ministro do STF não tem partido: some a bandeira do partido e entra o estado de nascimento', () => {
  assert.ok(isMagistrate(gilmar));
  assert.equal(partyName(gilmar), '');
  assert.equal(partyName({ ...gilmar, party: 'PT' }), '', 'mesmo que o dado trouxesse um partido, magistrado não mostra partido');
  const chip = partyChip(gilmar, 'green');
  assert.match(chip, /Natural de MT/);
  assert.match(chip, /src="\/bandeiras\/MT\.png"/);
  assert.match(chip, /title="Natural de Diamantino, Mato Grosso"/);
  assert.doesNotMatch(chip, /\/partidos\//);
  assert.equal(partyChip({ ...gilmar, naturalidade: undefined }), '', 'sem naturalidade conhecida, nada (nunca um "—")');
  assert.equal(partyOrBirth(gilmar), 'natural de Diamantino/MT');
});

test('quem tem partido mostra a bandeira e a sigla; sem partido ou sem bandeira, só o que houver', () => {
  const pt = partyChip({ roleKey: 'dep-federal', party: 'PT', uf: 'SP' });
  assert.match(pt, /src="\/partidos\/PT\.png"/);
  assert.match(pt, /alt=""/, 'a bandeira é decorativa: o nome do partido está escrito ao lado');
  assert.match(pt, />PT<\/span>$/);
  assert.match(partyChip({ roleKey: 'vereador', party: 'PC do B' }), /\/partidos\/PCDOB\.png/);
  assert.equal(partyChip({ roleKey: 'vereador', party: 'S/PARTIDO' }), '');
  assert.equal(partyChip({ roleKey: 'vereador', party: '—' }), '');
  assert.equal(partyChip({ roleKey: 'vereador', party: 'XYZ' }), '<span class="chip xs ">XYZ</span>', 'sigla sem bandeira cadastrada: só o texto');
  assert.equal(partyOrBirth({ roleKey: 'dep-federal', party: 'PT', uf: 'SP' }), 'PT/SP');
});

test('toda sigla dos dados e dos partidos da Câmara e do Senado tem bandeira (ou é "sem partido")', () => {
  const siglas = new Set();
  const add = (list) => list.forEach((p) => p.party && siglas.add(p.party));
  const ex = J('src/data/executivo.json');
  add([...ex.presidente, ...ex.governadores, ...ex.prefeitos]);
  add(J('src/data/prefeitos-cidades.json'));
  for (const d of ['states', 'capitais', 'cidades']) for (const f of readdirSync(join(root, 'src/data', d))) add(J(`src/data/${d}/${f}`));
  // partidos em exercício na Câmara e no Senado (2026)
  for (const s of ['AVANTE', 'CIDADANIA', 'DC', 'MDB', 'MISSÃO', 'NOVO', 'PCdoB', 'PDT', 'PL', 'PODE', 'PP', 'PRD', 'PSB', 'PSD', 'PSDB', 'PSOL', 'PT', 'PV', 'REDE', 'REPUBLICANOS', 'SOLIDARIEDADE', 'UNIÃO']) siglas.add(s);
  const sem = [...siglas].filter((s) => !partyFlag(s) && partyName({ roleKey: 'vereador', party: s }));
  assert.deepEqual(sem, [], 'siglas com partido e sem bandeira');
});

test('arquivos de bandeira: existem, são pequenos, têm licença livre e os 27 estados estão lá', () => {
  assert.equal(Object.keys(BANDEIRAS).length, 27);
  for (const u of FEDERATION_UNITS) assert.ok(stateFlag(u.uf), `sem bandeira de ${u.uf}`);
  for (const [k, v] of [...Object.entries(PARTIDOS), ...Object.entries(BANDEIRAS)]) {
    assert.ok(existsSync(join(root, v.arquivo)), `${k}: ${v.arquivo} não existe`);
    assert.ok(statSync(join(root, v.arquivo)).size < 12_000, `${k} pesa demais`);
    assert.match(v.licenca, /^(Public domain|CC0|CC BY)/, `${k}: licença ${v.licenca}`);
    assert.match(v.pagina, /^https:\/\/commons\.wikimedia\.org\//, k);
  }
});

test('stf.json: todo ministro tem estado de nascimento, foto no próprio app e o crédito da foto', () => {
  assert.equal(stf.ministros.length, 10);
  for (const m of stf.ministros) {
    assert.match(m.naturalidade?.uf ?? '', /^[A-Z]{2}$/, m.id);
    assert.ok(stateFlag(m.naturalidade.uf), `${m.id}: sem bandeira de ${m.naturalidade.uf}`);
    assert.ok(m.naturalidade.cidade, m.id);
    assert.match(m.photo, /^\/fotos\/stf\/[a-z-]+\.jpg$/, m.id);
    assert.ok(existsSync(join(root, m.photo)), `${m.id}: ${m.photo} não existe`);
    assert.ok(m.fotoCredito.autor && m.fotoCredito.licenca && /^https:\/\/commons\.wikimedia\.org\//.test(m.fotoCredito.url), m.id);
    assert.equal(m.party, '—', 'o magistrado segue sem partido no dado');
  }
  // conferidos à mão contra o que se sabe de cada um
  const nat = Object.fromEntries(stf.ministros.map((m) => [m.id.replace('stf-', ''), `${m.naturalidade.cidade}/${m.naturalidade.uf}`]));
  assert.equal(nat['gilmar-mendes'], 'Diamantino/MT');
  assert.equal(nat['edson-fachin'], 'Rondinha/RS');
  assert.equal(nat['nunes-marques'], 'Teresina/PI');
  assert.equal(nat['flavio-dino'], 'São Luís/MA');
});

test('crédito da foto: o TSE para as dos eleitos, e quem tirou e a licença para as do STF', () => {
  assert.match(photoCredit({ photo: '/fotos/tse/2024/250001881806.jpg' }).texto, /Tribunal Superior Eleitoral/);
  assert.match(photoCredit(gilmar).texto, /Fabio Rodrigues Pozzebom\/ABr · CC BY 3\.0 br/);
  assert.match(photoCredit({ photo: 'https://www.camara.leg.br/internet/deputado/bandep/1.jpg' }).texto, /Câmara dos Deputados/);
  assert.equal(photoCredit({}), null);
});

test('fotos dos eleitos: cada photo aponta para um arquivo do app, pequeno, JPEG, e quase todos têm foto', () => {
  const people = [];
  const ex = J('src/data/executivo.json');
  people.push(...ex.presidente, ...ex.governadores, ...ex.prefeitos, ...J('src/data/prefeitos-cidades.json'));
  for (const d of ['states', 'capitais', 'cidades']) for (const f of readdirSync(join(root, 'src/data', d))) people.push(...J(`src/data/${d}/${f}`));
  const comFicha = people.filter((p) => p.tse?.sq);
  const comFoto = comFicha.filter((p) => p.photo);
  for (const p of comFoto) {
    assert.equal(p.photo, `/fotos/tse/${p.tse.year}/${p.tse.sq}.jpg`, p.id);
    const abs = join(root, p.photo);
    assert.ok(existsSync(abs), `${p.id}: ${p.photo} não existe`);
    assert.ok(statSync(abs).size < 8_000, `${p.id}: foto de ${statSync(abs).size} bytes`);
    assert.equal(readFileSync(abs).subarray(0, 3).toString('hex'), 'ffd8ff', `${p.id} não é JPEG`);
  }
  assert.ok(comFoto.length / comFicha.length > 0.97, `só ${comFoto.length} de ${comFicha.length} com foto`);
  // quem entrou no lugar de um eleito não tem ficha do TSE: só tem foto quando o nome dele aparece como candidato (vice, por exemplo)
  const substitutos = people.filter((p) => p.eleitoPeloTse);
  assert.equal(substitutos.length, 27);
  assert.ok(substitutos.filter((p) => p.photo).length >= 18, 'a maioria dos substitutos foi candidato (vice) e tem foto');
  for (const p of substitutos.filter((p) => p.photo)) {
    assert.match(p.photo, /^\/fotos\/tse\/(2022|2024)\/\d+\.jpg$/, p.id);
    assert.ok(existsSync(join(root, p.photo)), p.id);
  }
});
