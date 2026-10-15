// Créditos das imagens do app: de onde vem cada foto e bandeira, e a licença de quem exige crédito. Lógica do PWA.
import stf from '@/data/stf.json';
import symbols from '@/data/simbolos.json';

export interface Credit {
  titulo: string;
  texto: string;
  url: string;
}

const files = (obj: Record<string, any>): Credit[] =>
  Object.values(obj).map((v) => ({ titulo: `${v.sigla} — ${v.nome}`, texto: `${v.autor || 'autoria não informada'} · ${v.licenca}`, url: v.pagina }));

export function credits() {
  const ministros: Credit[] = (stf as any).ministros
    .filter((m: any) => m.fotoCredito)
    .map((m: any) => ({ titulo: m.name, texto: `${m.fotoCredito.autor} · ${m.fotoCredito.licenca}`, url: m.fotoCredito.url }));
  return { ministros, partidos: files(symbols.PARTIDOS), estados: files(symbols.BANDEIRAS) };
}
