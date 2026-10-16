// Quem foi acompanhado antes de o dado do STF ganhar o estado de nascimento e a foto guarda a ficha antiga no aparelho:
// completa essa ficha com o dado atual (só se houver um ministro acompanhado; senão, nem consulta nada).
import { store } from './store.js';
import { loadStf } from './api.js';

export async function refreshFollowed() {
  const stale = store.get().politicians.filter((p) => p.source === 'stf' && (!p.naturalidade || !p.photo));
  if (!stale.length) return false;
  const { ministros } = await loadStf();
  let changed = false;
  for (const p of stale) {
    const fresh = ministros.find((m) => m.id === p.id);
    if (!fresh) continue;
    store.replacePolitician(p.id, { ...p, naturalidade: fresh.naturalidade, photo: fresh.photo, fotoCredito: fresh.fotoCredito });
    changed = true;
  }
  return changed;
}
