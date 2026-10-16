// Bandeiras e símbolos ao lado de quem aparece no app: a bandeira do partido (de quem tem partido) e, para ministros do
// STF e demais magistrados, que não têm vínculo partidário, o estado onde nasceram no lugar do partido.
// Os arquivos e as licenças ficam em src/data/simbolos.js (gerado por scripts/build-simbolos.mjs).
import { PARTIDOS, BANDEIRAS } from './data/simbolos.js';

// "PC do B" e "PCdoB", "UNIÃO" e "Uniao" dão a mesma chave
export const partyKey = (sigla = '') => String(sigla).normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();

/** Magistrado (STF; vale para qualquer órgão do Judiciário que entre no app): não tem vínculo ativo com partido. */
export const isMagistrate = (p) => p?.roleKey === 'ministro-stf' || p?.source === 'stf';

const NO_PARTY = new Set(['', '—', '-', 'SPARTIDO', 'SEMPARTIDO']);
/** Sigla do partido, ou '' para quem não tem (sem partido, magistrado). */
export function partyName(p) {
  if (!p || isMagistrate(p)) return '';
  return NO_PARTY.has(partyKey(p.party)) ? '' : String(p.party).trim();
}

export const partyFlag = (sigla) => PARTIDOS[partyKey(sigla)] || null;
export const stateFlag = (uf) => BANDEIRAS[String(uf || '').toUpperCase()] || null;

/** Onde o magistrado nasceu: { cidade, uf, estado, texto } (texto = "Marília/SP"), ou null se não se sabe. */
export function birthplace(p) {
  const n = p?.naturalidade;
  if (!n?.uf) return null;
  return { cidade: n.cidade || '', uf: n.uf, estado: stateFlag(n.uf)?.nome || n.uf, texto: n.cidade ? `${n.cidade}/${n.uf}` : n.uf };
}

/** Trecho curto para textos corridos: "PT/SP" para quem tem partido; "natural de Marília/SP" para magistrado. */
export function partyOrBirth(p) {
  if (isMagistrate(p)) {
    const b = birthplace(p);
    return b ? `natural de ${b.texto}` : '';
  }
  const party = partyName(p);
  return [party, p?.uf].filter(Boolean).join('/');
}

/** Crédito da foto, para a ficha: de onde vem e, quando exige, quem tirou e a licença. */
export function photoCredit(p) {
  if (!p?.photo) return null;
  if (p.fotoCredito) return { texto: `Foto: ${p.fotoCredito.autor} · ${p.fotoCredito.licenca}`, url: p.fotoCredito.url };
  if (p.photo.startsWith('/fotos/tse/')) return { texto: 'Foto: Tribunal Superior Eleitoral (dados abertos)', url: 'https://dadosabertos.tse.jus.br/' };
  if (/camara\.leg\.br/.test(p.photo)) return { texto: 'Foto: Câmara dos Deputados', url: '' };
  if (/senado\.leg\.br/.test(p.photo)) return { texto: 'Foto: Senado Federal', url: '' };
  return null;
}
