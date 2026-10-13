// Cliente de APIs Oficiais de Dados Abertos (Câmara dos Deputados e Senado Federal)
import { FEDERATION_UNITS } from './data/federation.js';
export { FEDERATION_UNITS };

const CAMARA_BASE = 'https://dadosabertos.camara.leg.br/api/v2';
const SENADO_BASE = 'https://legis.senado.leg.br/dadosabertos';

const cache = new Map();

async function getJson(url, headers = {}) {
  if (cache.has(url)) return cache.get(url);
  const res = await fetch(url, { headers: { Accept: 'application/json', ...headers } });
  if (!res.ok) throw new Error(`HTTP ${res.status} para ${url}`);
  const json = await res.json();
  cache.set(url, json);
  return json;
}

/* ================= CÂMARA DOS DEPUTADOS ================= */

export async function searchDeputies(name) {
  const q = encodeURIComponent(name.trim());
  const { dados } = await getJson(`${CAMARA_BASE}/deputados?nome=${q}&itens=8&ordem=ASC&ordenarPor=nome`);
  return (dados || []).map((d) => ({
    camaraId: d.id,
    name: d.nome,
    party: d.siglaPartido,
    uf: d.siglaUf,
    photo: d.urlFoto,
  }));
}

export async function deputyProfile(camaraId) {
  const { dados } = await getJson(`${CAMARA_BASE}/deputados/${camaraId}`);
  return {
    civilName: dados.nomeCivil,
    electoralName: dados.ultimoStatus?.nomeEleitoral || dados.nomeCivil,
    electoralCondition: dados.ultimoStatus?.condicaoEleitoral || 'Titular',
    status: dados.ultimoStatus?.situacao || 'Exercício',
    birthDate: dados.dataNascimento,
    birthCity: dados.municipioNascimento ? `${dados.municipioNascimento}/${dados.ufNascimento}` : '',
    schooling: dados.escolaridade || 'Não informada',
    cabinet: dados.ultimoStatus?.gabinete
      ? {
          room: dados.ultimoStatus.gabinete.sala,
          building: dados.ultimoStatus.gabinete.predio,
          floor: dados.ultimoStatus.gabinete.andar,
          phone: dados.ultimoStatus.gabinete.telefone,
          email: dados.ultimoStatus.gabinete.email,
        }
      : null,
  };
}

export async function deputyPropositions(camaraId, limit = 8) {
  const { dados } = await getJson(
    `${CAMARA_BASE}/proposicoes?idDeputadoAutor=${camaraId}&siglaTipo=PL,PEC&ordem=DESC&ordenarPor=id&itens=${limit}`
  );
  return (dados || []).map((p) => ({
    id: p.id,
    type: p.siglaTipo,
    number: p.numero,
    year: p.ano,
    summary: p.ementa,
    date: p.dataApresentacao,
    url: `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${p.id}`,
  }));
}

export async function deputyExpenses(camaraId, limit = 100) {
  const { dados } = await getJson(
    `${CAMARA_BASE}/deputados/${camaraId}/despesas?idLegislatura=57&itens=${limit}&ordem=DESC&ordenarPor=dataDocumento`
  );
  return (dados || []).map((d) => ({
    year: d.ano,
    month: d.mes,
    type: d.tipoDespesa,
    supplier: d.nomeFornecedor,
    cnpjCpf: d.cnpjCpfFornecedor,
    docNumber: d.numDocumento,
    date: d.dataDocumento,
    value: d.valorLiquido,
    receiptUrl: d.urlDocumento,
  }));
}

export async function recentRollCalls(limit = 8) {
  const { dados } = await getJson(`${CAMARA_BASE}/votacoes?ordem=DESC&ordenarPor=dataHoraRegistro&itens=${limit * 3}`);
  return (dados || []).filter((v) => v.aprovacao !== null).slice(0, limit);
}

export async function votesOf(votingId) {
  const { dados } = await getJson(`${CAMARA_BASE}/votacoes/${votingId}/votos`);
  return dados || [];
}

export async function votingDetail(votingId) {
  const { dados } = await getJson(`${CAMARA_BASE}/votacoes/${votingId}`);
  return dados;
}

/* ================= SENADO FEDERAL ================= */

let senatorsCache = null;

export async function allSenators() {
  if (senatorsCache) return senatorsCache;
  const data = await getJson(`${SENADO_BASE}/senador/lista/atual.json`);
  const list = data?.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar || [];
  senatorsCache = list.map((item) => {
    const id = item.IdentificacaoParlamentar;
    const man = item.Mandato;
    const leg2 = man?.SegundaLegislaturaDoMandato;
    const leg1 = man?.PrimeiraLegislaturaDoMandato;
    const end = leg2?.DataFim || leg1?.DataFim || '2027-01-31';
    const start = leg1?.DataInicio || '2023-02-01';

    return {
      senadoId: id.CodigoParlamentar,
      name: id.NomeParlamentar,
      fullName: id.NomeCompletoParlamentar,
      party: id.SiglaPartidoParlamentar,
      uf: id.UfParlamentar,
      photo: id.UrlFotoParlamentar,
      email: id.EmailParlamentar,
      mandate: [start, end],
    };
  });
  return senatorsCache;
}

export async function searchSenators(query) {
  const list = await allSenators();
  const q = query.trim().toLowerCase();
  if (!q) return list.slice(0, 8);
  return list
    .filter((s) => s.name.toLowerCase().includes(q) || s.uf.toLowerCase() === q || s.party.toLowerCase().includes(q))
    .slice(0, 8);
}

export async function senatorVotes(senadoId, limit = 10) {
  try {
    const data = await getJson(`${SENADO_BASE}/senador/${senadoId}/votacoes.json`);
    const raw = data?.VotacaoParlamentar?.Parlamentar?.Votacoes?.Votacao || [];
    const list = Array.isArray(raw) ? raw : [raw];
    return list.slice(0, limit).map((v) => ({
      code: v.CodigoSessaoVotacao,
      matter: v.Materia?.DescricaoIdentificacao || 'Matéria',
      summary: v.Materia?.Ementa || v.DescricaoVotacao || '',
      date: v.SessaoPlenaria?.DataSessao || v.Materia?.Data || '',
      result: v.DescricaoResultado || '',
      secret: v.IndicadorVotacaoSecreta === 'Sim',
      vote: v.SiglaDescricaoVoto || 'Ausente',
      yes: v.TotalVotosSim || 0,
      no: v.TotalVotosNao || 0,
    }));
  } catch (err) {
    console.warn(`Erro ao carregar votações do senador ${senadoId}:`, err);
    return [];
  }
}

/* ================= AGENDA LEGISLATIVA (CÂMARA) ================= */

// Próximos eventos oficiais da Câmara (sessões e reuniões de comissão) nos próximos 7 dias.
export async function upcomingAgenda(limit = 5) {
  const iso = (d) => d.toISOString().slice(0, 10);
  const now = new Date();
  const end = new Date(now.getTime() + 7 * 86400000);
  const { dados } = await getJson(
    `${CAMARA_BASE}/eventos?dataInicio=${iso(now)}&dataFim=${iso(end)}&ordem=ASC&ordenarPor=dataHoraInicio&itens=100`
  );
  const rank = (e) => (/Deliberativa/.test(e.descricaoTipo || '') && !/N[ãa]o/.test(e.descricaoTipo || '') ? 0 : 1);
  return (dados || [])
    .filter((e) => !/cancelad/i.test(e.situacao || ''))
    .map((e, i) => ({ e, i }))
    .sort((a, b) => rank(a.e) - rank(b.e) || a.i - b.i)
    .slice(0, limit)
    .map(({ e }) => ({
      id: e.id,
      start: e.dataHoraInicio,
      type: e.descricaoTipo,
      description: e.descricao,
      organ: e.orgaos?.[0]?.sigla || '',
      organName: e.orgaos?.[0]?.nome || '',
      place: e.localCamara?.nome || e.localExterno || '',
      url: `https://www.camara.leg.br/evento-legislativo/${e.id}`,
    }))
    .sort((a, b) => String(a.start).localeCompare(String(b.start)));
}

/* ================= ATOS DO EXECUTIVO / MEDIDAS PROVISÓRIAS ================= */

export async function recentProvisionalMeasures(limit = 10) {
  const { dados } = await getJson(
    `${CAMARA_BASE}/proposicoes?siglaTipo=MPV&ordem=DESC&ordenarPor=id&itens=${limit}`
  );
  return (dados || []).map((p) => ({
    id: p.id,
    type: p.siglaTipo,
    number: p.numero,
    year: p.ano,
    summary: p.ementa,
    date: p.dataApresentacao,
    url: `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${p.id}`,
  }));
}

/* ================= FEDERAÇÃO COMPLETA: 27 ASSEMBLEIAS & 26 CAPITAIS ================= */

const stateDepCache = new Map();

export async function allStateDeputies(uf = 'SP') {
  const key = (uf || 'SP').toLowerCase();
  if (stateDepCache.has(key)) return stateDepCache.get(key);
  try {
    const res = await fetch(`/src/data/states/${key}.json`);
    if (res.ok) {
      const data = await res.json();
      stateDepCache.set(key, data);
      return data;
    }
  } catch (err) {
    console.warn(`Fallback para estado ${key}:`, err);
  }
  return [];
}

export async function searchStateDeputies(uf = 'SP', query = '') {
  const list = await allStateDeputies(uf);
  const q = query.trim().toLowerCase();
  if (!q) return list.slice(0, 16);
  return list.filter(
    (d) =>
      d.name.toLowerCase().includes(q) ||
      d.party.toLowerCase().includes(q) ||
      (d.baseEleitoral && d.baseEleitoral.toLowerCase().includes(q)) ||
      (d.areaAtuacao && d.areaAtuacao.toLowerCase().includes(q))
  ).slice(0, 16);
}

const capitalCouncilCache = new Map();

export async function allCapitalCouncilors(uf = 'SP') {
  const key = (uf || 'SP').toLowerCase();
  if (capitalCouncilCache.has(key)) return capitalCouncilCache.get(key);
  try {
    const res = await fetch(`/src/data/capitais/${key}.json`);
    if (res.ok) {
      const data = await res.json();
      capitalCouncilCache.set(key, data);
      return data;
    }
  } catch (err) {
    console.warn(`Fallback para capital ${key}:`, err);
  }
  return [];
}

export async function searchCapitalCouncilors(uf = 'SP', query = '') {
  const list = await allCapitalCouncilors(uf);
  const q = query.trim().toLowerCase();
  if (!q) return list.slice(0, 16);
  return list.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.party.toLowerCase().includes(q) ||
      (c.baseEleitoral && c.baseEleitoral.toLowerCase().includes(q)) ||
      (c.city && c.city.toLowerCase().includes(q)) ||
      (c.areaAtuacao && c.areaAtuacao.toLowerCase().includes(q))
  ).slice(0, 16);
}

/* ================= DADOS ELEITORAIS DO TSE (DIVULGACANDCONTAS) ================= */

// Usa apenas dados reais vindos do TSE (p.tse, gerado por scripts/build-regional-data.mjs).
// Para parlamentares sem registro local (Câmara/Senado/manual) os campos ficam nulos e a
// interface aponta para a ficha oficial no DivulgaCandContas.
export function getTseElectoralProfile(p) {
  const t = p.tse || null;
  const coalition = t?.coalition && t.coalition !== 'PARTIDO ISOLADO' ? t.coalition : null;
  return {
    available: !!t,
    electionYear: t?.year ?? null,
    status: t?.status ?? null,
    ballotNumber: t?.ballotNumber ?? null,
    electoralCoalition: coalition,
    isolatedParty: t?.coalition === 'PARTIDO ISOLADO',
    declaredAssets: t?.declaredAssets ?? null,
    tseUrl: p.pageUrl && p.pageUrl.includes('divulgacandcontas') ? p.pageUrl : 'https://divulgacandcontas.tse.jus.br/divulga/',
  };
}
