// Ferramentas das fotos (scripts/build-fotos.mjs e scripts/lib/remote-zip.mjs), sem rede.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchSubstitute, photoPath, readJson } from '../../scripts/build-fotos.mjs';
import { parseCentralDirectory } from '../../scripts/lib/remote-zip.mjs';
import { parseCsvText } from '../../scripts/lib/tse.mjs';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const row = (NM_CANDIDATO, DS_CARGO, SQ_CANDIDATO, NM_UE = 'RIO BRANCO') => ({ NM_CANDIDATO, DS_CARGO, SQ_CANDIDATO, NM_UE });

test('substituto: acha o registro pelo nome completo do TSE, na cidade certa, e só se for uma pessoa', () => {
  const rows = [
    row('MAILZA ASSIS DA SILVA', 'VICE-GOVERNADOR', '1'),
    row('MAILZA FERREIRA', 'DEPUTADO ESTADUAL', '2'),
    row('ÁLVARO DAMIÃO VIEIRA DA PAZ', 'VICE-PREFEITO', '3', 'BELO HORIZONTE'),
    row('ÁLVARO DAMIÃO VIEIRA DA PAZ', 'VICE-PREFEITO', '4', 'CONTAGEM'), // mesmo nome, outra cidade
    row('EVILÁSIO CAVALCANTI NETO', 'VEREADOR', '5', 'JOÃO PESSOA'),
    row('EVILASIO CAVALCANTI NETO', 'VICE-PREFEITO', '6', 'JOÃO PESSOA'), // candidatura substituída: a mesma pessoa
    row('MARIA JOSÉ DA SILVA', 'VEREADOR', '7', 'JOÃO PESSOA'),
    row('MARIA JOSÉ DA SILVA SANTOS', 'VEREADOR', '8', 'JOÃO PESSOA'),
  ];
  assert.equal(matchSubstitute(rows, { roleKey: 'governador', fullName: 'Mailza Assis' }), '1');
  assert.equal(matchSubstitute(rows, { roleKey: 'prefeito', city: 'Belo Horizonte', fullName: 'Álvaro Damião' }), '3');
  assert.equal(matchSubstitute(rows, { roleKey: 'prefeito', city: 'João Pessoa', fullName: 'Evilásio Cavalcanti Neto' }), '6', 'o registro de vice vale');
  assert.equal(matchSubstitute(rows, { roleKey: 'prefeito', city: 'João Pessoa', fullName: 'Maria José Silva' }), null, 'duas pessoas possíveis: não chuta');
  assert.equal(matchSubstitute(rows, { roleKey: 'governador', fullName: 'Soldado Sampaio' }), null);
  assert.equal(matchSubstitute(rows, { roleKey: 'governador', fullName: 'Mailza' }), null, 'um nome só é pouco para afirmar que é a mesma pessoa');
});

test('o caminho da foto segue ano e SQ do TSE', () => {
  assert.equal(photoPath(2024, '250001881806'), '/fotos/tse/2024/250001881806.jpg');
});

test('diretório central do zip: nomes, tamanhos e posição, inclusive os campos em 64 bits (Zip64)', () => {
  const entry = (name, { csize, usize, offset, zip64 = false }) => {
    const n = Buffer.from(name);
    const extra = zip64 ? Buffer.alloc(4 + 24) : Buffer.alloc(0);
    if (zip64) { extra.writeUInt16LE(1, 0); extra.writeUInt16LE(24, 2); extra.writeBigUInt64LE(BigInt(usize), 4); extra.writeBigUInt64LE(BigInt(csize), 12); extra.writeBigUInt64LE(BigInt(offset), 20); }
    const h = Buffer.alloc(46);
    h.writeUInt32LE(0x02014b50, 0);
    h.writeUInt16LE(0, 10); // método: armazenado
    h.writeUInt32LE(zip64 ? 0xffffffff : csize, 20);
    h.writeUInt32LE(zip64 ? 0xffffffff : usize, 24);
    h.writeUInt16LE(n.length, 28);
    h.writeUInt16LE(extra.length, 30);
    h.writeUInt32LE(zip64 ? 0xffffffff : offset, 42);
    return Buffer.concat([h, n, extra]);
  };
  const cd = Buffer.concat([entry('FSP250001881806_div.jpg', { csize: 36632, usize: 36632, offset: 1000 }), entry('FSP250001900000_div.jpg', { csize: 40000, usize: 40000, offset: 1960849668, zip64: true })]);
  const m = parseCentralDirectory(cd);
  assert.equal(m.size, 2);
  assert.deepEqual(m.get('FSP250001881806_div.jpg'), { name: 'FSP250001881806_div.jpg', method: 0, csize: 36632, usize: 36632, offset: 1000 });
  assert.equal(m.get('FSP250001900000_div.jpg').offset, 1960849668);
  assert.equal(m.get('FSP250001900000_div.jpg').csize, 40000);
});

test('CSV do TSE: latin1, ponto e vírgula e aspas', () => {
  const rows = parseCsvText('"A";"B"\n"x;y";"z"\n"ç";"w"\r\n');
  assert.deepEqual(rows, [{ A: 'x;y', B: 'z' }, { A: 'ç', B: 'w' }]);
});

test('JSON de dados: lê e devolve a formatação, para gravar de volta sem mexer em mais nada', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fotos-'));
  for (const [indent, nl] of [[undefined, ''], [1, '\n'], [2, '']]) {
    const f = join(dir, `x${indent}${nl.length}.json`);
    writeFileSync(f, JSON.stringify([{ a: 1, b: ['c'] }], null, indent) + nl);
    const r = readJson(f);
    assert.equal(r.indent, indent);
    assert.equal(r.nl, nl);
  }
  const bad = join(dir, 'bad.json');
  writeFileSync(bad, JSON.stringify({ a: 1 }, null, 4));
  assert.throws(() => readJson(bad), /formatação não reconhecida/);
});
