// Lê arquivos de dentro de um zip remoto sem baixar o zip todo: só o diretório central e os trechos pedidos (HTTP Range).
// Serve para os zips de fotos do TSE (de centenas de MB a alguns GB, com uma foto por candidato). Aceita Zip64.
import { inflateRawSync } from 'node:zlib';

const SIG_EOCD = 0x06054b50;
const SIG_EOCD64 = 0x06064b50;
const SIG_LOC64 = 0x07064b50;
const SIG_CEN = 0x02014b50;
const SIG_LOCAL = 0x04034b50;
const u64 = (buf, o) => Number(buf.readBigUInt64LE(o));

async function range(url, header, tries = 4) {
  let last;
  for (let i = 0; i < tries; i++) {
    if (i) await new Promise((r) => setTimeout(r, 700 * i));
    try {
      const res = await fetch(url, { headers: { Range: header }, signal: AbortSignal.timeout(120000) });
      if (res.status !== 206 && res.status !== 200) throw new Error(`HTTP ${res.status} em ${url} (${header})`);
      if (res.status === 200 && header !== 'bytes=0-') throw new Error(`o servidor ignorou o Range em ${url}`);
      return { buf: Buffer.from(await res.arrayBuffer()), contentRange: res.headers.get('content-range') };
    } catch (err) {
      last = err;
    }
  }
  throw last;
}

/** Lê as entradas do diretório central (nome, método, tamanhos e posição). */
export function parseCentralDirectory(cd) {
  const entries = new Map();
  let p = 0;
  while (p + 46 <= cd.length && cd.readUInt32LE(p) === SIG_CEN) {
    const method = cd.readUInt16LE(p + 10);
    let csize = cd.readUInt32LE(p + 20);
    let usize = cd.readUInt32LE(p + 24);
    const nameLen = cd.readUInt16LE(p + 28);
    const extraLen = cd.readUInt16LE(p + 30);
    const commentLen = cd.readUInt16LE(p + 32);
    let offset = cd.readUInt32LE(p + 42);
    const name = cd.toString('utf8', p + 46, p + 46 + nameLen);
    // Zip64: os campos que não cabem em 32 bits vêm, nesta ordem, no extra de id 1
    let e = p + 46 + nameLen;
    const end = e + extraLen;
    while (e + 4 <= end) {
      const id = cd.readUInt16LE(e);
      const size = cd.readUInt16LE(e + 2);
      if (id === 1) {
        let q = e + 4;
        if (usize === 0xffffffff) { usize = u64(cd, q); q += 8; }
        if (csize === 0xffffffff) { csize = u64(cd, q); q += 8; }
        if (offset === 0xffffffff) { offset = u64(cd, q); q += 8; }
      }
      e += 4 + size;
    }
    entries.set(name, { name, method, csize, usize, offset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

export async function openRemoteZip(url) {
  const tail = await range(url, 'bytes=-65600');
  const total = Number(tail.contentRange?.split('/')[1]);
  if (!total) throw new Error(`sem tamanho do zip em ${url}`);
  const buf = tail.buf;
  let i = buf.length - 22;
  while (i >= 0 && buf.readUInt32LE(i) !== SIG_EOCD) i--;
  if (i < 0) throw new Error(`fim do zip não encontrado em ${url}`);
  let count = buf.readUInt16LE(i + 10);
  let cdSize = buf.readUInt32LE(i + 12);
  let cdOffset = buf.readUInt32LE(i + 16);
  if (count === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) {
    const loc = i - 20;
    if (loc < 0 || buf.readUInt32LE(loc) !== SIG_LOC64) throw new Error(`Zip64 sem localizador em ${url}`);
    const eocd64 = u64(buf, loc + 8);
    const rec = (await range(url, `bytes=${eocd64}-${eocd64 + 55}`)).buf;
    if (rec.readUInt32LE(0) !== SIG_EOCD64) throw new Error(`Zip64 inválido em ${url}`);
    count = u64(rec, 32);
    cdSize = u64(rec, 40);
    cdOffset = u64(rec, 48);
  }
  const cd = (await range(url, `bytes=${cdOffset}-${cdOffset + cdSize - 1}`)).buf;
  const entries = parseCentralDirectory(cd);
  if (entries.size !== count) throw new Error(`zip com ${count} entradas, mas li ${entries.size} (${url})`);
  return { url, total, entries };
}

/** Conteúdo de uma entrada: um pedido só, com folga para o cabeçalho local (nome + extra). */
export async function readEntry(zip, entry) {
  const slack = 30 + Buffer.byteLength(entry.name) + 160;
  const { buf } = await range(zip.url, `bytes=${entry.offset}-${entry.offset + slack + entry.csize - 1}`);
  if (buf.readUInt32LE(0) !== SIG_LOCAL) throw new Error(`cabeçalho local inválido para ${entry.name}`);
  const start = 30 + buf.readUInt16LE(26) + buf.readUInt16LE(28);
  let data = buf.subarray(start, start + entry.csize);
  if (data.length < entry.csize) data = (await range(zip.url, `bytes=${entry.offset + start}-${entry.offset + start + entry.csize - 1}`)).buf;
  if (entry.method === 0) return data;
  if (entry.method === 8) return inflateRawSync(data);
  throw new Error(`método de compressão ${entry.method} não suportado (${entry.name})`);
}
