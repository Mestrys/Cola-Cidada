// Contas públicas pelo Siconfi (Tesouro Nacional): o que cada ente arrecadou e gastou (RREO) e quanto cada órgão
// gasta com pessoal (RGF). Mesmos dados que estados, municípios e União entregam por lei (LRF), sem chave de acesso.
import { FEDERATION_UNITS } from './api.js';

const SICONFI = 'https://apidatalake.tesouro.gov.br/ords/siconfi/tt';
const cache = new Map();

async function getItems(path, params) {
  // espaço como %20: com "+" (o padrão de URLSearchParams) o Siconfi responde sem o cabeçalho CORS
  const query = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  // A CDN do Siconfi guarda a resposta com o CORS de quem pediu primeiro e a entrega a todos: sem uma chave própria,
  // outro site que consultasse a mesma URL antes bloquearia o app. O Siconfi ignora parâmetros que não conhece.
  // Só o host, sem "https://": um endereço completo na URL faz o firewall do Tesouro responder 403.
  const key = typeof location === 'undefined' ? 'node' : location.host.replace(/[^a-z0-9.-]/gi, '-');
  const url = `${SICONFI}/${path}?${query}&origem=${key}`;
  if (cache.has(url)) return cache.get(url);
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 800 * attempt));
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`Siconfi respondeu ${res.status}`);
      const json = await res.json();
      cache.set(url, json);
      return json;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

// Do período mais recente para trás: o relatório de um período sai até 30 dias depois de ele fechar.
function recentPeriods(per, size, now = new Date()) {
  const y = now.getFullYear();
  const closed = Math.floor(now.getMonth() / size); // períodos já encerrados no ano
  const list = [];
  for (let p = Math.min(closed, per); p >= 1; p--) list.push([y, p]);
  list.push([y - 1, per], [y - 1, per - 1]);
  return list;
}

const esferaOf = (ente) => (ente.kind === 'uniao' ? 'U' : ente.kind === 'municipio' ? 'M' : 'E');
const value = (items, conta, coluna) => items.find((i) => i.cod_conta === conta && i.coluna.startsWith(coluna))?.valor ?? null;

// Balanço orçamentário (RREO, anexo 1): receita realizada e despesa empenhada, liquidada e paga no ano.
export async function budgetSummary(ente) {
  for (const [year, period] of recentPeriods(6, 2)) {
    const { items } = await getItems('rreo', {
      an_exercicio: year,
      nr_periodo: period,
      co_tipo_demonstrativo: 'RREO',
      no_anexo: 'RREO-Anexo 01',
      co_esfera: esferaOf(ente),
      id_ente: ente.ibge,
    });
    if (!items?.length) continue;
    return {
      year,
      period,
      periodLabel: `${period}º bimestre de ${year}`,
      institution: items[0].instituicao,
      revenueForecast: value(items, 'TotalReceitas', 'PREVISÃO ATUALIZADA'),
      revenue: value(items, 'TotalReceitas', 'Até o Bimestre'),
      budget: value(items, 'TotalDespesas', 'DOTAÇÃO ATUALIZADA'),
      committed: value(items, 'TotalDespesas', 'DESPESAS EMPENHADAS ATÉ'),
      liquidated: value(items, 'TotalDespesas', 'DESPESAS LIQUIDADAS ATÉ'),
      paid: value(items, 'TotalDespesas', 'DESPESAS PAGAS ATÉ'),
    };
  }
  return null;
}

// Despesa com pessoal por órgão (RGF, anexo 1), nos 12 meses até o quadrimestre. `match` escolhe o órgão
// dentro do Poder (ex.: a Assembleia, e não o Tribunal de Contas que entra no mesmo relatório do Legislativo).
export async function personnelSpending(ente, poder, match) {
  for (const [year, period] of recentPeriods(3, 4)) {
    const found = [];
    for (let offset = 0; offset < 20000; offset += 5000) {
      const page = await getItems('rgf', {
        an_exercicio: year,
        in_periodicidade: 'Q',
        nr_periodo: period,
        co_tipo_demonstrativo: 'RGF',
        no_anexo: 'RGF-Anexo 01',
        co_esfera: esferaOf(ente),
        co_poder: poder,
        id_ente: ente.ibge,
        ...(offset ? { offset } : {}),
      });
      const items = page.items || [];
      found.push(...items.filter((i) => match.test(i.instituicao)));
      // o órgão já apareceu inteiro nesta página, ou acabou: não baixa o resto
      if (!page.hasMore || (found.length && !items.slice(-1).some((i) => match.test(i.instituicao)))) break;
    }
    if (!found.length) continue;
    const total = found.find((i) => i.cod_conta === 'DespesaComPessoalBruta' && i.coluna.startsWith('TOTAL'));
    const net = found.find((i) => i.cod_conta === 'DespesaComPessoalTotal' && i.coluna.startsWith('TOTAL'));
    const rcl = found.find((i) => i.cod_conta === 'DespesaComPessoalTotal' && i.coluna.startsWith('% sobre a RCL'));
    return {
      year,
      period,
      periodLabel: `12 meses até o ${period}º quadrimestre de ${year}`,
      institution: found[0].instituicao,
      gross: total?.valor ?? null,
      net: net?.valor ?? null,
      rclPct: rcl?.valor ?? null,
    };
  }
  return null;
}

/* ================= Órgãos acompanhados ================= */

export const UNIAO = { kind: 'uniao', ibge: 1 };

// Cada órgão sabe de onde vêm as contas dele e onde fica o portal oficial de transparência.
export function federalBodies() {
  return [
    {
      key: 'presidencia', name: 'Presidência da República (Governo Federal)', icon: 'account_balance',
      ente: UNIAO, budget: true,
      portal: 'https://portaldatransparencia.gov.br/', portalLabel: 'Portal da Transparência',
    },
    {
      key: 'camara', name: 'Câmara dos Deputados', icon: 'how_to_vote',
      ente: UNIAO, poder: 'L', match: /^Câmara dos Deputados/i,
      portal: 'https://www2.camara.leg.br/transparencia', portalLabel: 'Transparência da Câmara',
    },
    {
      key: 'senado', name: 'Senado Federal', icon: 'groups',
      ente: UNIAO, poder: 'L', match: /^Senado Federal/i,
      portal: 'https://www12.senado.leg.br/transparencia', portalLabel: 'Transparência do Senado',
    },
    {
      key: 'stf', name: 'Supremo Tribunal Federal', icon: 'gavel',
      ente: UNIAO, poder: 'J', match: /^Supremo Tribunal Federal/i, heavy: true,
      portal: 'https://portal.stf.jus.br/transparencia/', portalLabel: 'Transparência do STF',
    },
  ];
}

export function stateBodies(uf, entes) {
  const u = FEDERATION_UNITS.find((x) => x.uf === uf);
  const ids = entes.ufs[uf];
  if (!u || !ids) return [];
  const estado = { kind: 'estado', ibge: ids.estado };
  const list = [
    {
      key: `gov-${uf}`, name: uf === 'DF' ? 'Governo do Distrito Federal' : `Governo do Estado — ${u.name}`, icon: 'flag',
      ente: estado, budget: true,
    },
    {
      key: `al-${uf}`, name: `${u.house} (${u.assembly})`, icon: 'apartment',
      ente: estado, poder: 'L', match: /^(Assembleia Legislativa|Câmara Legislativa)/i,
      portal: u.domain ? `https://${u.domain}` : null, portalLabel: `Site da ${u.assembly}`,
    },
  ];
  if (ids.capital) {
    const municipio = { kind: 'municipio', ibge: ids.capital };
    list.push(
      { key: `pref-${uf}`, name: `Prefeitura de ${u.capital}`, icon: 'location_city', ente: municipio, budget: true },
      {
        key: `cm-${uf}`, name: u.councilName || `Câmara Municipal de ${u.capital}`, icon: 'diversity_3',
        ente: municipio, poder: 'L', match: /^C[âa]mara/i,
      }
    );
  }
  return list;
}

export const SICONFI_URL = 'https://siconfi.tesouro.gov.br/siconfi/index.jsf';
