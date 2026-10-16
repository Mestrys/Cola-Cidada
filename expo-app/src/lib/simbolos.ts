// Bandeiras e símbolos ao lado de quem aparece no app: a bandeira do partido (de quem tem partido) e, para ministros do
// STF e demais magistrados, que não têm vínculo partidário, o estado onde nasceram no lugar do partido. Lógica do PWA.
import { PARTY_IMAGES, PHOTOS, STATE_IMAGES } from '@/data/imagens';
import symbols from '@/data/simbolos.json';

import type { Politician } from './types';

interface Symbol {
  sigla: string;
  nome: string;
  arquivo: string;
  licenca: string;
  autor: string;
  pagina: string;
}
const PARTIDOS = symbols.PARTIDOS as Record<string, Symbol>;
const BANDEIRAS = symbols.BANDEIRAS as Record<string, Symbol>;

// "PC do B" e "PCdoB", "UNIÃO" e "Uniao" dão a mesma chave
export const partyKey = (sigla = '') => String(sigla).normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();

/** Magistrado (STF; vale para qualquer órgão do Judiciário que entre no app): não tem vínculo ativo com partido. */
export const isMagistrate = (p?: Pick<Politician, 'roleKey' | 'source'> | null) => p?.roleKey === 'ministro-stf' || p?.source === 'stf';

const NO_PARTY = new Set(['', '—', '-', 'SPARTIDO', 'SEMPARTIDO']);
/** Sigla do partido, ou '' para quem não tem (sem partido, magistrado). */
export function partyName(p?: Pick<Politician, 'roleKey' | 'source' | 'party'> | null): string {
  if (!p || isMagistrate(p)) return '';
  return NO_PARTY.has(partyKey(p.party)) ? '' : String(p.party).trim();
}

export const partyFlag = (sigla: string) => PARTIDOS[partyKey(sigla)] ?? null;
export const stateFlag = (uf?: string) => BANDEIRAS[String(uf ?? '').toUpperCase()] ?? null;

/** Imagem da bandeira do partido ou do estado (ou undefined). */
export const partyImage = (sigla: string) => PARTY_IMAGES[partyKey(sigla)]?.();
export const stateImage = (uf?: string) => STATE_IMAGES[String(uf ?? '').toUpperCase()]?.();

/** Onde o magistrado nasceu: { cidade, uf, estado, texto } (texto = "Marília/SP"), ou null se não se sabe. */
export function birthplace(p?: Pick<Politician, 'naturalidade'> | null) {
  const n = p?.naturalidade;
  if (!n?.uf) return null;
  return { cidade: n.cidade || '', uf: n.uf, estado: stateFlag(n.uf)?.nome ?? n.uf, texto: n.cidade ? `${n.cidade}/${n.uf}` : n.uf };
}

/** Trecho curto para textos corridos: "PT/SP" para quem tem partido; "natural de Marília/SP" para magistrado. */
export function partyOrBirth(p?: Politician | null): string {
  if (isMagistrate(p)) {
    const b = birthplace(p);
    return b ? `natural de ${b.texto}` : '';
  }
  return [partyName(p), p?.uf].filter(Boolean).join('/');
}

/** Foto do app (fotos do TSE e do STF ficam empacotadas) ou o endereço da Câmara e do Senado. */
export function photoSource(photo?: string): number | { uri: string } | undefined {
  if (!photo) return undefined;
  if (photo.startsWith('/fotos/')) {
    const local = PHOTOS[photo.slice(1)];
    return local ? local() : undefined;
  }
  return { uri: photo.replace(/^http:\/\//i, 'https://') };
}

/** Crédito da foto, para a ficha: de onde vem e, quando exige, quem tirou e a licença. */
export function photoCredit(p?: Pick<Politician, 'photo' | 'fotoCredito'> | null): { texto: string; url: string } | null {
  if (!p?.photo) return null;
  if (p.fotoCredito) return { texto: `Foto: ${p.fotoCredito.autor} · ${p.fotoCredito.licenca}`, url: p.fotoCredito.url };
  if (p.photo.startsWith('/fotos/tse/')) return { texto: 'Foto: Tribunal Superior Eleitoral (dados abertos)', url: 'https://dadosabertos.tse.jus.br/' };
  if (/camara\.leg\.br/.test(p.photo)) return { texto: 'Foto: Câmara dos Deputados', url: '' };
  if (/senado\.leg\.br/.test(p.photo)) return { texto: 'Foto: Senado Federal', url: '' };
  return null;
}
