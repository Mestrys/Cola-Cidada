// Presença em sessões e fidelidade à orientação de bancada, calculadas a partir
// da API de Dados Abertos da Câmara. Todos os números vêm de registros oficiais
// das últimas sessões deliberativas e votações nominais do Plenário.
import { senateNominalVotings, senateOrientations, legislatureBlocs, recentPlenarySessions, sessionAttendees, recentNominalVotings, votesOf, votingOrientations } from './api.js';

const SESSIONS = 15; // sessões deliberativas encerradas mais recentes
const VOTINGS = 20; // votações nominais mais recentes
const CLEAR = new Set(['Sim', 'Não', 'Abstenção', 'Obstrução']);

const CONCURRENCY = 5;

// Executa as tarefas com concorrência limitada e uma nova tentativa em caso de falha de rede.
async function pool(items, fn) {
  const out = new Array(items.length);
  let next = 0;
  const attempt = async (x) => {
    try {
      return await fn(x);
    } catch {
      await new Promise((r) => setTimeout(r, 400));
      return fn(x);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await attempt(items[i]).catch(() => null);
      }
    })
  );
  return out;
}

let datasetPromise = null;

// Carrega uma vez e reaproveita para todos os parlamentares monitorados.
export function plenaryDataset() {
  if (!datasetPromise) datasetPromise = buildDataset().catch((e) => ((datasetPromise = null), Promise.reject(e)));
  return datasetPromise;
}

async function buildDataset() {
  const sessions = await recentPlenarySessions(SESSIONS);
  const candidates = await recentNominalVotings(VOTINGS);
  const blocs = await legislatureBlocs().catch(() => []);
  const attendees = await pool(sessions, (s) => sessionAttendees(s.id));
  const withVotes = await pool(candidates, async (v) => ({ ...v, votos: await votesOf(v.id) }));
  const nominal = withVotes.filter((v) => v && v.votos.length > 0);
  const orients = await pool(nominal, (v) => votingOrientations(v.id));

  const okSessions = sessions
    .map((s, i) => (attendees[i] && attendees[i].length ? { ...s, present: new Set(attendees[i].map((d) => d.id)) } : null))
    .filter(Boolean);
  const votings = nominal.map((v, i) => ({ ...v, orient: orients[i] || [], hasOrient: !!orients[i] })).filter((v) => v.hasOrient);
  if (!okSessions.length && !votings.length) throw new Error('API da Câmara indisponível');
  return { sessions: okSessions, votings, blocs: blocs.map(parseBloc) };
}

const norm = (s) => String(s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

// "UNIÃO, PP, Federação PSDB CIDADANIA" -> partidos membros + abreviação usada pela Câmara
// nas orientações ("Bl UniPpPsd..."): três primeiras letras de cada partido, em sequência.
export function parseBloc(b) {
  const parties = [];
  for (const part of b.name.split(',').map((x) => x.trim())) {
    const m = part.match(/^Federa[çc][ãa]o\s+(.+)$/i);
    for (const p of m ? m[1].split(/\s+/) : [part]) parties.push(p);
  }
  const abbr = parties.map((p) => p[0].toUpperCase() + p.slice(1, 3).toLowerCase()).join('');
  return { parties: parties.map(norm), abbr: norm(abbr), federation: b.federation };
}

// Orientação aplicável a um partido: a do próprio partido ou, se vazia, a do bloco/federação
// a que pertence. Retorna null quando não for possível determinar.
export function orientationFor(party, orient, blocs = []) {
  const key = norm(party);
  const own = orient.find((o) => o.codTipoLideranca === 'P' && norm(o.siglaPartidoBloco) === key);
  if (own && own.orientacaoVoto) return own.orientacaoVoto;
  const blocOrient = orient.filter((o) => o.codTipoLideranca === 'B' && o.orientacaoVoto);
  for (const o of blocOrient) {
    const name = norm(o.siglaPartidoBloco);
    // Federações: "Fdr PT-PCdoB-PV" cita os partidos por sigla
    if (/^fdr\b/.test(name) && name.split(/[^a-z0-9]+/).includes(key)) return o.orientacaoVoto;
    // Blocos: "Bl UniPpPsd..." é o início da abreviação do bloco que contém o partido
    if (/^bl\b/.test(name)) {
      const stem = name.replace(/^bl\s+/, '').replace(/\.+$/, '');
      if (blocs.some((b) => !b.federation && b.parties.includes(key) && b.abbr.startsWith(stem))) return o.orientacaoVoto;
    }
  }
  return own ? own.orientacaoVoto || null : null;
}

export async function deputyPlenaryStats(camaraId) {
  const { sessions, votings, blocs } = await plenaryDataset();

  const presences = sessions.filter((s) => s.present.has(camaraId)).length;
  const attendance = {
    sessions: sessions.length,
    presences,
    absences: sessions.length - presences,
    rate: sessions.length ? Math.round((presences / sessions.length) * 100) : null,
    from: sessions.length ? sessions.map((s) => s.date).sort()[0] : null,
    to: sessions.length ? sessions.map((s) => s.date).sort().at(-1) : null,
  };

  let voted = 0, aligned = 0, diverged = 0, freed = 0, unknown = 0;
  const divergences = [];
  for (const v of votings) {
    const hit = v.votos.find((x) => x.deputado_?.id === camaraId);
    if (!hit) continue;
    voted++;
    const o = orientationFor(hit.deputado_.siglaPartido, v.orient, blocs);
    if (o === 'Liberado') freed++;
    else if (!o || !CLEAR.has(o)) unknown++;
    else if (o === hit.tipoVoto) aligned++;
    else {
      diverged++;
      divergences.push({ id: v.id, date: v.data, description: v.descricao, vote: hit.tipoVoto, orientation: o });
    }
  }
  const measured = aligned + diverged;
  const fidelity = {
    votings: votings.length,
    voted,
    participationRate: votings.length ? Math.round((voted / votings.length) * 100) : null,
    measured,
    aligned,
    diverged,
    freed,
    unknown,
    rate: measured ? Math.round((aligned / measured) * 100) : null,
    divergences: divergences.slice(0, 5),
  };
  return { attendance, fidelity };
}

/* ================= SENADO ================= */

// Situações de um senador numa votação nominal (siglaVotoParlamentar).
const SEN_PRESENT = new Set(['Sim', 'Não', 'Abstenção', 'Votou', 'P-NRV', 'Presidente (art. 51 RISF)']);
const SEN_JUSTIFIED = new Set(['AP', 'LS', 'MIS', 'LP', 'LAP']); // atividade parlamentar, licenças e missões
const SEN_CAST = new Set(['Sim', 'Não', 'Abstenção']);
const SENATE_WINDOW_DAYS = 180;

let senatePromise = null;

export function senateDataset() {
  if (!senatePromise) senatePromise = buildSenateDataset().catch((e) => ((senatePromise = null), Promise.reject(e)));
  return senatePromise;
}

async function buildSenateDataset() {
  const iso = (d) => d.toISOString().slice(0, 10);
  const now = new Date();
  const since = iso(new Date(now.getTime() - SENATE_WINDOW_DAYS * 86400000));
  const until = iso(now);
  const votings = await senateNominalVotings(since, until);
  const orientations = await senateOrientations(since, until).catch(() => []);
  const orientBy = new Map(
    orientations.map((o) => [`${o.numeroSessao}-${o.sequencialVotacao}`, o.orientacoesLideranca || []])
  );
  return { since, until, votings, orientBy };
}

// Presença (inclui ausências justificadas e não justificadas) e fidelidade de um senador.
export async function senatorPlenaryStats(codigo) {
  const { since, until, votings, orientBy } = await senateDataset();
  const id = Number(codigo);

  let listed = 0, present = 0, justified = 0, unjustified = 0, cast = 0;
  let aligned = 0, diverged = 0, freed = 0, unknown = 0;
  const divergences = [];
  for (const v of votings) {
    const mine = (v.votos || []).find((x) => x.codigoParlamentar === id);
    if (!mine) continue;
    const sit = mine.siglaVotoParlamentar;
    if (sit === 'NA') continue; // dispositivo não citado: sem relação com presença
    listed++;
    if (SEN_PRESENT.has(sit)) present++;
    else if (SEN_JUSTIFIED.has(sit)) justified++;
    else unjustified++;
    if (!SEN_CAST.has(sit)) continue;
    cast++;
    const orient = (orientBy.get(`${v.numeroSessao}-${v.sequencialVotacao}`) || []).find(
      (o) => norm(o.partido) === norm(mine.siglaPartidoParlamentar)
    );
    const o = orient?.voto?.toLowerCase();
    if (!o) unknown++;
    else if (o === 'livre') freed++;
    else {
      const want = o === 'sim' ? 'Sim' : o === 'não' || o === 'nao' ? 'Não' : o.startsWith('abst') ? 'Abstenção' : null;
      if (!want) unknown++;
      else if (want === sit) aligned++;
      else {
        diverged++;
        divergences.push({ id: v.sequencialVotacao, date: v.dataSessao, description: `${v.identificacao} — ${v.ementa || v.descricaoVotacao || ''}`, vote: sit, orientation: want });
      }
    }
  }
  const measured = aligned + diverged;
  return {
    source: 'senado',
    attendance: {
      unit: 'votações nominais',
      sessions: listed,
      presences: present,
      absences: listed - present,
      justified,
      unjustified,
      rate: listed ? Math.round((present / listed) * 100) : null,
      from: since,
      to: until,
    },
    fidelity: {
      votings: votings.length,
      voted: cast,
      participationRate: null,
      measured,
      aligned,
      diverged,
      freed,
      unknown,
      rate: measured ? Math.round((aligned / measured) * 100) : null,
      divergences: divergences.slice(0, 5),
    },
  };
}
