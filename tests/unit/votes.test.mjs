// Votações abertas: placar por partido e pool de consultas (sem rede).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { partyBreakdown, mapLimit } from '../../src/votes.js';

test('placar por partido separa Sim, Não e o resto, maiores bancadas primeiro', () => {
  const rows = partyBreakdown([
    { party: 'PT', vote: 'Sim' },
    { party: 'PT', vote: 'Sim' },
    { party: 'PL', vote: 'Não' },
    { party: 'PT', vote: 'Obstrução' },
    { party: '', vote: 'Abstenção' },
  ]);
  assert.deepEqual(rows[0], { party: 'PT', Sim: 2, Não: 0, Outros: 1, total: 3 });
  assert.deepEqual(rows.map((r) => r.party), ['PT', 'PL', 'Sem partido']);
});

test('mapLimit mantém a ordem e nunca passa do limite de consultas simultâneas', async () => {
  let running = 0;
  let peak = 0;
  const out = await mapLimit([5, 1, 3, 2, 4], 2, async (n) => {
    running++;
    peak = Math.max(peak, running);
    await new Promise((r) => setTimeout(r, n));
    running--;
    return n * 10;
  });
  assert.deepEqual(out, [50, 10, 30, 20, 40]);
  assert.equal(peak, 2);
});
