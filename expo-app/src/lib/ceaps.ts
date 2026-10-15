// Cota dos senadores (CEAPS): resumo gerado por scripts/build-ceaps.mjs do PWA a partir do dado aberto do Senado.
// A API devolve ~10 MB por ano e não filtra por senador, então o app lê este resumo.
import data from '@/data/ceaps.json';

export interface CeapsExpense {
  id: number;
  data: string;
  valor: number;
  tipo: string;
  fornecedor: string;
  documento: string;
}
export interface CeapsYear {
  total: number;
  tipos: { tipo: string; valor: number }[];
}
export interface Ceaps {
  nome: string;
  anos: Record<string, CeapsYear>;
  grandes: CeapsExpense[];
  geradoEm: string;
  ultimaDespesa: string;
  limite: number;
}

const all = data as unknown as {
  geradoEm: string;
  ultimaDespesa: string;
  limiteDespesaGrande: number;
  senadores: Record<string, Omit<Ceaps, 'geradoEm' | 'ultimaDespesa' | 'limite'>>;
};

export function senatorCeaps(senadoId: number | string): Ceaps | null {
  const s = all.senadores[String(senadoId)];
  return s ? { ...s, geradoEm: all.geradoEm, ultimaDespesa: all.ultimaDespesa, limite: all.limiteDespesaGrande } : null;
}
