import { authorEmendas, cityEmendas, normName } from '../emendas';
import data from '@/data/emendas.json';

describe('emendas parlamentares', () => {
  it('liga o parlamentar pelo nome, sem acento nem caixa', () => {
    expect(normName('  Célio  Studart ')).toBe('CELIO STUDART');
    const [key, a] = Object.entries((data as any).autores)[0] as [string, any];
    expect(authorEmendas(a.nome.toLowerCase())?.nome).toBe(a.nome);
    expect(normName(a.nome)).toBe(key);
    expect(authorEmendas('Fulano Sem Emenda')).toBeNull();
  });

  it('traz anos, destinos e favorecidos do parlamentar, com a data do resumo', () => {
    const a = authorEmendas(Object.values((data as any).autores).find((x: any) => x.favorecidos.length >= 3 && x.destinos.length >= 3 && x.nome)!['nome' as never])!;
    expect(a.desde).toBe(2023);
    expect(Object.keys(a.anos).length).toBeGreaterThan(0);
    expect(a.destinos.length).toBeGreaterThanOrEqual(3);
    expect(a.geradoEm).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('cidades monitoradas: as que receberam emendas trazem autores; as demais voltam nulas', () => {
    const c = cityEmendas(3534401)!; // Osasco
    expect(c.nome).toBe('Osasco');
    expect(c.autores.length).toBeGreaterThan(0);
    expect(cityEmendas(1)).toBeNull();
  });
});
