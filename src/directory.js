// Diretório público: todos os cargos que o app acompanha, abertos para consulta sem o usuário escolher nada.
// Cada item já nasce no formato guardado ao acompanhar (store.politicians), então abrir a ficha e seguir usam o mesmo objeto.
import {
  allDeputies,
  allSenators,
  allStateDeputies,
  allCapitalCouncilors,
  loadExecutive,
  loadPoloMayors,
  poloCouncilors,
  loadStf,
  FEDERATION_UNITS,
} from './api.js';
import { defaultMandate } from './ui.js';

export const SECTIONS = [
  { key: 'presidencia', label: 'Presidência', icon: 'account_balance', hint: 'Presidente e vice-presidente da República' },
  { key: 'stf', label: 'STF', icon: 'gavel', hint: 'Ministros do Supremo Tribunal Federal' },
  { key: 'senado', label: 'Senado', icon: 'groups', hint: 'Senadores em exercício', filter: 'uf' },
  { key: 'camara', label: 'Câmara', icon: 'how_to_vote', hint: 'Deputados federais em exercício', filter: 'uf' },
  { key: 'governadores', label: 'Governadores', icon: 'flag', hint: 'Governadores dos 26 estados e do DF', filter: 'uf' },
  { key: 'assembleias', label: 'Assembleias', icon: 'apartment', hint: 'Deputados estaduais e distritais', filter: 'uf', requiresUf: true },
  { key: 'prefeitos', label: 'Prefeitos', icon: 'location_city', hint: 'Prefeitos das 26 capitais e das duas maiores cidades de cada estado (por PIB)', filter: 'uf' },
  { key: 'vereadores', label: 'Vereadores', icon: 'diversity_3', hint: 'Vereadores das capitais e das duas maiores cidades de cada estado (por PIB)', filter: 'uf', requiresUf: true },
  { key: 'orgaos', label: 'Contas', icon: 'receipt_long', hint: 'Transparência e contas de cada órgão' },
];

const ufName = (uf) => FEDERATION_UNITS.find((u) => u.uf === uf)?.name || uf;

function fromExecutive(e) {
  return { ...e, uf: e.state, mandate: e.mandate };
}

export async function loadSection(key, uf = '') {
  switch (key) {
    case 'presidencia': {
      const { presidente } = await loadExecutive();
      return presidente.map(fromExecutive);
    }
    case 'stf': {
      const { ministros } = await loadStf();
      return ministros.map((m) => ({ ...m, uf: 'BR', mandate: null }));
    }
    case 'senado': {
      const list = await allSenators();
      return list.map((s) => ({
        id: `senado-${s.senadoId}`,
        source: 'senado',
        senadoId: s.senadoId,
        name: s.name,
        fullName: s.fullName,
        party: s.party,
        uf: s.uf,
        photo: s.photo,
        email: s.email,
        roleKey: 'senador',
        mandate: s.mandate || defaultMandate('senador'),
      }));
    }
    case 'camara': {
      const list = await allDeputies();
      return list.map((d) => ({
        id: `camara-${d.camaraId}`,
        source: 'camara',
        camaraId: d.camaraId,
        name: d.name,
        party: d.party,
        uf: d.uf,
        photo: d.photo,
        roleKey: 'dep-federal',
        mandate: defaultMandate('dep-federal'),
      }));
    }
    case 'governadores': {
      const { governadores } = await loadExecutive();
      return governadores.map(fromExecutive);
    }
    case 'prefeitos': {
      const [{ prefeitos }, polos] = await Promise.all([loadExecutive(), loadPoloMayors()]);
      return [...prefeitos, ...polos].map(fromExecutive);
    }
    case 'assembleias': {
      const list = await allStateDeputies(uf);
      return list.map((d) => ({
        ...d,
        source: d.source || `al-${uf.toLowerCase()}`,
        uf: d.state || uf,
        roleKey: 'dep-estadual',
        mandate: defaultMandate('dep-estadual', d.state || uf),
      }));
    }
    case 'vereadores': {
      const [capital, polos] = await Promise.all([allCapitalCouncilors(uf), poloCouncilors(uf)]);
      return [...capital, ...polos].map((c) => ({
        ...c,
        source: c.source || `cm-${uf.toLowerCase()}`,
        uf: c.state || uf,
        city: c.city || 'Capital',
        roleKey: 'vereador',
        mandate: defaultMandate('vereador'),
      }));
    }
    default:
      return [];
  }
}

// Texto curto que descreve onde a pessoa atua, para a linha de apoio do cartão.
export function placeOf(p) {
  if (p.roleKey === 'presidente') return 'Brasil';
  if (p.roleKey === 'ministro-stf') return p.cargo || 'Supremo Tribunal Federal';
  if (p.roleKey === 'prefeito' || p.roleKey === 'vereador') return `${p.city || ''} · ${p.uf}`.replace(/^ · /, '');
  return ufName(p.uf);
}

const fold = (s) => String(s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function matches(p, query) {
  const q = fold(query).trim();
  if (!q) return true;
  return [p.name, p.fullName, p.party, p.uf, p.city, ufName(p.uf)].some((v) => fold(v).includes(q));
}
