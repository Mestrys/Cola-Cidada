import { CAPITALS, POLOS, STATES } from '@/data';
import executivo from '@/data/executivo.json';
import { PHOTOS } from '@/data/imagens';
import prefeitosPolos from '@/data/prefeitos-cidades.json';
import stf from '@/data/stf.json';
import { birthplace, isMagistrate, partyFlag, partyImage, partyKey, partyName, partyOrBirth, photoCredit, photoSource, stateImage } from '../simbolos';
import { credits } from '../creditos';
import { UNITS } from '../directory';
import type { Politician } from '../types';

const gilmar = (stf as any).ministros.find((m: any) => m.id === 'stf-gilmar-mendes') as Politician;

describe('bandeiras, estado de nascimento do STF e fotos', () => {
  it('a chave da sigla ignora acento, espaço e pontuação', () => {
    expect(partyKey('PC do B')).toBe('PCDOB');
    expect(partyKey('UNIÃO')).toBe('UNIAO');
  });

  it('ministro do STF não tem partido: o estado de nascimento ocupa o lugar dele', () => {
    expect(isMagistrate(gilmar)).toBe(true);
    expect(partyName(gilmar)).toBe('');
    expect(partyName({ ...gilmar, party: 'PT' })).toBe('');
    expect(birthplace(gilmar)).toMatchObject({ cidade: 'Diamantino', uf: 'MT', estado: 'Mato Grosso', texto: 'Diamantino/MT' });
    expect(partyOrBirth(gilmar)).toBe('natural de Diamantino/MT');
    expect(stateImage('MT')).toBeDefined();
  });

  it('quem tem partido mostra a bandeira e a sigla; sem partido, nada', () => {
    const dep = { roleKey: 'dep-federal', party: 'PT', uf: 'SP' } as Politician;
    expect(partyName(dep)).toBe('PT');
    expect(partyImage('PT')).toBeDefined();
    expect(partyImage('PC do B')).toBeDefined();
    expect(partyOrBirth(dep)).toBe('PT/SP');
    expect(partyName({ ...dep, party: 'S/PARTIDO' })).toBe('');
    expect(partyName({ ...dep, party: '—' })).toBe('');
    expect(partyImage('XYZ')).toBeUndefined();
  });

  it('os 10 ministros têm estado de nascimento, bandeira do estado, foto empacotada e o crédito', () => {
    const list = (stf as any).ministros as Politician[];
    expect(list).toHaveLength(10);
    for (const m of list) {
      expect(birthplace(m)?.uf).toMatch(/^[A-Z]{2}$/);
      expect(stateImage(birthplace(m)!.uf)).toBeDefined();
      expect(photoSource(m.photo)).toBeDefined();
      expect(photoCredit(m)?.texto).toMatch(/^Foto: .+ · .+/);
    }
    expect(UNITS.every((u) => stateImage(u.uf) !== undefined)).toBe(true);
  });

  it('foto: as do app saem do pacote, as da Câmara e do Senado do endereço (sempre https), sem foto não há fonte', () => {
    expect(photoSource('/fotos/stf/gilmar-mendes.jpg')).toBeDefined();
    expect(photoSource('/fotos/tse/2022/inexistente.jpg')).toBeUndefined();
    expect(photoSource('http://www.senado.leg.br/senadores/img/fotos-oficiais/senador1.jpg')).toEqual({ uri: 'https://www.senado.leg.br/senadores/img/fotos-oficiais/senador1.jpg' });
    expect(photoSource(undefined)).toBeUndefined();
    expect(photoCredit({ photo: '/fotos/tse/2024/250001881806.jpg' })?.texto).toMatch(/Tribunal Superior Eleitoral/);
  });

  it('todo caminho photo dos dados existe no pacote e toda sigla dos dados tem bandeira', () => {
    const siglas = new Set<string>();
    let comFoto = 0;
    const check = (list: any[]) => {
      for (const p of list) {
        if (p.photo) {
          comFoto++;
          expect(PHOTOS[p.photo.slice(1)]).toBeDefined();
        }
        if (p.party && partyName({ ...p, roleKey: 'vereador' })) siglas.add(p.party);
      }
    };
    check([...executivo.presidente, ...executivo.governadores, ...executivo.prefeitos]);
    check(prefeitosPolos as any[]);
    for (const group of [STATES, CAPITALS, POLOS]) for (const load of Object.values(group)) check(load());
    expect(comFoto).toBeGreaterThan(2900);
    expect([...siglas].filter((s) => !partyFlag(s))).toEqual([]);
  });

  it('créditos das imagens: as 10 fotos do STF, os 31 partidos e os 27 estados, cada um com autor, licença e página', () => {
    const c = credits();
    expect([c.ministros.length, c.partidos.length, c.estados.length]).toEqual([10, 31, 27]);
    for (const item of [...c.ministros, ...c.partidos, ...c.estados]) {
      expect(item.texto).toMatch(/ · /);
      expect(item.url).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
    }
  });
});
