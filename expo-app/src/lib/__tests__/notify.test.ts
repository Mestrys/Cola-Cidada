import { notifyOn, noticesFor, runCheck, type CheckDeps } from '../notify-core';
import { initialState } from '../state';
import type { Alert, AppState, Politician } from '../types';
import type { Sources } from '../alerts';

const SEN: Politician = { id: 'senado-2', source: 'senado', senadoId: 2, name: 'Sen. B', party: 'PL', uf: 'RJ', roleKey: 'senador' };
const alert = (id: string, kind: Alert['kind'], ts: string, politicianId?: string): Alert => ({ id, kind, ts, text: `texto ${id}`, politicianId });

const emptySources: Sources = {
  camara: async () => [],
  senado: async () => [
    { key: '7', date: '2026-09-01', matter: 'PEC 1/2026', summary: 'Saúde.', result: 'Aprovado', secret: false, round: '', yes: 60, no: 10, votes: [], tally: { Sim: 60, Não: 10, Outros: 0 }, category: 'geral', bySenator: { [SEN.id]: 'Não' } },
  ],
  expenses: async () => [],
  bills: async () => [],
  ceaps: () => null,
};

function harness(state: AppState | null) {
  let saved: AppState | null = state;
  const sent: { title: string; body: string }[] = [];
  const deps: CheckDeps = {
    load: async () => saved,
    save: async (s) => void (saved = s),
    send: async (n) => void sent.push(n),
    sources: emptySources,
  };
  return { deps, sent, get saved() { return saved; } };
}

describe('avisos no aparelho', () => {
  it('é opt-in: ausente conta como desligado', () => {
    expect(notifyOn(initialState())).toBe(false);
    expect(notifyOn({ prefs: { ...initialState().prefs, notify: true } })).toBe(true);
  });

  it('um aviso por alerta novo (até 3), com quem a pessoa acompanha primeiro; acima disso, um resumo', () => {
    const three = [alert('a', 'plenario', '2026-09-03'), alert('b', 'votacao', '2026-09-01', 'x'), alert('c', 'gasto', '2026-09-02', 'x')];
    expect(noticesFor(three).map((n) => n.body)).toEqual(['texto c', 'texto b', 'texto a']);
    expect(noticesFor(three)[2].title).toBe('Votação no Plenário');
    const many = [...three, alert('d', 'plenario', '2026-09-04')];
    const [only, ...rest] = noticesFor(many);
    expect(rest).toEqual([]);
    expect(only.title).toBe('4 alertas novos');
    expect(only.body).toBe('texto c');
    expect(noticesFor([])).toEqual([]);
  });

  it('desligado, não consulta nem avisa', async () => {
    const h = harness({ ...initialState(), politicians: [SEN] });
    expect(await runCheck(h.deps)).toBe(0);
    expect(h.sent).toEqual([]);
  });

  it('ligado, guarda o alerta novo e avisa uma vez; na verificação seguinte não repete', async () => {
    const h = harness({ ...initialState(), politicians: [SEN], prefs: { ...initialState().prefs, notify: true } });
    expect(await runCheck(h.deps)).toBe(2); // plenário do Senado e o voto de quem se acompanha
    expect(h.sent).toHaveLength(2);
    expect(h.sent[0].title).toBe('Voto de quem você acompanha');
    expect(h.saved!.alerts).toHaveLength(2);
    expect(await runCheck(h.deps)).toBe(0);
    expect(h.sent).toHaveLength(2);
  });

  it('a primeira verificação silenciosa guarda o que já existe sem avisar, e depois só o novo avisa', async () => {
    const h = harness({ ...initialState(), politicians: [SEN], prefs: { ...initialState().prefs, notify: true } });
    expect(await runCheck(h.deps, { silent: true })).toBe(2);
    expect(h.sent).toEqual([]);
    expect(await runCheck(h.deps)).toBe(0);
  });

  it('sem dados salvos não faz nada', async () => {
    expect(await runCheck(harness(null).deps)).toBe(0);
  });
});
