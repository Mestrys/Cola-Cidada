// Leitura dos CSVs do TSE (latin1, separador ";") e helpers de nome compartilhados pelos scripts de dados.
import { readFileSync } from 'node:fs';

export function parseCsv(path) {
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

export const norm = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().trim();
export const titleCase = (s) =>
  s.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase())
    .replace(/\b(Da|De|Do|Das|Dos|E)\b/g, (m) => m.toLowerCase());
export const isElected = (r) => /^ELEITO/.test(r.DS_SIT_TOT_TURNO) && !/N[ÃA]O ELEITO/.test(r.DS_SIT_TOT_TURNO);
export const clean = (v) => (v && !v.startsWith('#') ? v : null);
