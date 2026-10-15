// Gera src/data/cnpjs.json: o CNPJ da prefeitura de cada capital e cidade-polo, a partir do cadastro de entes do Siconfi
// (Tesouro Nacional). O CNPJ é a chave para consultar os contratos da prefeitura no PNCP.
//
// Uso: node scripts/build-cnpjs.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');
const { cidades } = JSON.parse(readFileSync(join(root, 'cidades.json'), 'utf8'));
const res = await fetch('https://apidatalake.tesouro.gov.br/ords/siconfi/tt/entes?origem=node', { signal: AbortSignal.timeout(120000) });
if (!res.ok) throw new Error(`Siconfi respondeu ${res.status}`);
const { items } = await res.json();
const byIbge = new Map(items.filter((e) => e.esfera === 'M').map((e) => [e.cod_ibge, e.cnpj]));
const out = {};
for (const c of cidades) {
  const cnpj = byIbge.get(c.ibge);
  if (!/^\d{14}$/.test(cnpj ?? '')) throw new Error(`Sem CNPJ válido para ${c.nome}/${c.uf} (${c.ibge})`);
  out[c.ibge] = cnpj;
}
writeFileSync(join(root, 'cnpjs.json'), JSON.stringify(out, null, 1));
console.log(Object.keys(out).length, 'CNPJs');
