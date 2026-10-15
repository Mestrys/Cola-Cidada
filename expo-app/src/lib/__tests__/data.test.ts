// As cópias em expo-app/src/data precisam ser iguais às do PWA (rode `node scripts/sync-data.mjs` ao atualizar).
/* eslint-disable @typescript-eslint/no-require-imports -- compara com os arquivos do PWA, fora do bundle */
import { CAPITALS, POLOS, STATES } from '@/data';
import federation from '@/data/federation.json';

const PWA = '../../../../src/data';

describe('dados copiados do PWA', () => {
  it.each(['executivo.json', 'stf.json', 'entes.json', 'cidades.json', 'prefeitos-cidades.json'])('%s está igual ao do PWA', (f) => {
    expect(require(`../../data/${f}`)).toEqual(require(`${PWA}/${f}`));
  });

  it('cada assembleia e cada câmara de capital está igual à do PWA', () => {
    expect(Object.keys(STATES)).toHaveLength(27);
    for (const [uf, load] of Object.entries(STATES)) expect(load()).toEqual(require(`${PWA}/states/${uf}.json`));
    expect(Object.keys(CAPITALS)).toHaveLength(26);
    for (const [uf, load] of Object.entries(CAPITALS)) expect(load()).toEqual(require(`${PWA}/capitais/${uf}.json`));
    expect(Object.keys(POLOS)).toHaveLength(26);
    for (const [uf, load] of Object.entries(POLOS)) expect(load()).toEqual(require(`${PWA}/cidades/${uf}.json`));
  });

  it('a lista de estados é a mesma do PWA', () => {
    expect(federation.map((u: { uf: string }) => u.uf)).toHaveLength(27);
  });
});
