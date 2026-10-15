// Gera src/data/ceaps.json: resumo da cota para o exercício da atividade parlamentar dos senadores (CEAPS),
// a partir dos dados abertos do Senado (adm.senado.gov.br). A API devolve ~10 MB por ano e não filtra por senador,
// por isso o app lê este resumo em vez de consultar ao vivo.
//
// Uso: node scripts/build-ceaps.mjs [ano ...]   (padrão: o ano anterior e o atual)
// Cada senador: total e principais tipos de despesa por ano, e as despesas grandes (a partir de R$ 5.000) mais recentes.
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const BIG_EXPENSE = 5000;
const KEEP_BIG = 12;
const KEEP_TYPES = 5;
const round = (v) => Math.round(v * 100) / 100;

/** Resume as linhas de despesa da API (já de vários anos) no formato de ceaps.json. */
export function summarize(rows, anos, geradoEm) {
  const senadores = {};
  let ultima = '';
  for (const r of rows) {
    if (!(r.valorReembolsado > 0)) continue; // estornos e linhas zeradas não são gasto
    if (r.data > geradoEm) continue; // a API traz lançamentos com data futura (ex.: dezembro em outubro)
    const id = String(r.codSenador);
    const s = (senadores[id] ??= { nome: r.nomeSenador, anos: {}, grandes: [] });
    const a = (s.anos[r.ano] ??= { total: 0, tipos: {} });
    a.total += r.valorReembolsado;
    a.tipos[r.tipoDespesa] = (a.tipos[r.tipoDespesa] || 0) + r.valorReembolsado;
    if (r.data > ultima) ultima = r.data;
    if (r.valorReembolsado >= BIG_EXPENSE)
      s.grandes.push({
        id: r.id,
        data: r.data,
        valor: round(r.valorReembolsado),
        tipo: r.tipoDespesa,
        fornecedor: r.fornecedor || '',
        documento: r.documento || '',
      });
  }
  for (const s of Object.values(senadores)) {
    for (const a of Object.values(s.anos)) {
      a.total = round(a.total);
      a.tipos = Object.entries(a.tipos)
        .sort((x, y) => y[1] - x[1])
        .slice(0, KEEP_TYPES)
        .map(([tipo, valor]) => ({ tipo, valor: round(valor) }));
    }
    s.grandes = s.grandes.sort((x, y) => y.data.localeCompare(x.data) || y.valor - x.valor).slice(0, KEEP_BIG);
  }
  return {
    geradoEm,
    fonte: 'Senado Federal — dados abertos, CEAPS (adm.senado.gov.br/adm-dadosabertos)',
    anos,
    ultimaDespesa: ultima,
    limiteDespesaGrande: BIG_EXPENSE,
    senadores,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const now = new Date();
  const anos = process.argv.slice(2).map(Number).filter(Boolean);
  if (!anos.length) anos.push(now.getUTCFullYear() - 1, now.getUTCFullYear());
  const rows = [];
  for (const ano of anos) {
    const res = await fetch(`https://adm.senado.gov.br/adm-dadosabertos/api/v1/senadores/despesas_ceaps/${ano}`, { signal: AbortSignal.timeout(300000) });
    if (!res.ok) throw new Error(`CEAPS ${ano}: HTTP ${res.status}`);
    const list = await res.json();
    console.log(ano, list.length, 'despesas');
    rows.push(...list);
  }
  const out = summarize(rows, anos, now.toISOString().slice(0, 10));
  const path = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'ceaps.json');
  writeFileSync(path, JSON.stringify(out));
  console.log('senadores', Object.keys(out.senadores).length, 'última despesa', out.ultimaDespesa);
}
