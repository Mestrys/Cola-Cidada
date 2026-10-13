// Estado da aplicação — persistido apenas no navegador (localStorage).
const KEY = 'monitor-cidadao:v1';

const defaults = () => ({
  theme: 'system', // 'system' | 'light' | 'dark'
  politicians: [], // {id, source:'camara'|'manual', camaraId?, name, party, uf, role, photo?, mandateEnd}
  prefs: { rollcall: true, expenses: true, bills: true },
  alerts: [], // {id, ts, politicianId, text}
  domicile: { state: 'SP', city: 'São Paulo' },
  onboardingDone: false,
  auditCount: 0,
});

let state = load();
const listeners = new Set();

function load() {
  try {
    return { ...defaults(), ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return defaults();
  }
}

function persist() {
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((fn) => fn(state));
}

export const store = {
  get: () => state,
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  set(patch) { state = { ...state, ...patch }; persist(); },
  setOnboardingDone(val = true) {
    this.set({ onboardingDone: Boolean(val) });
  },
  incrementAuditCount() {
    this.set({ auditCount: (state.auditCount || 0) + 1 });
  },
  setDomicile(stateUf, city) {
    this.set({ domicile: { state: stateUf, city } });
  },
  addPolitician(p) {
    if (state.politicians.some((x) => x.id === p.id)) return false;
    this.set({ politicians: [...state.politicians, p] });
    return true;
  },
  removePolitician(id) {
    this.set({ politicians: state.politicians.filter((p) => p.id !== id) });
  },
  replacePolitician(id, p) {
    this.set({ politicians: state.politicians.map((x) => (x.id === id ? p : x)) });
  },
  setPref(k, v) { this.set({ prefs: { ...state.prefs, [k]: v } }); },
  addAlerts(list) {
    const known = new Set(state.alerts.map((a) => a.id));
    const fresh = list.filter((a) => !known.has(a.id));
    if (fresh.length) this.set({ alerts: [...fresh, ...state.alerts].slice(0, 200) });
    return fresh.length;
  },
  exportJson: () => JSON.stringify(state, null, 2),
  importJson(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== 'object') return false;
      state = {
        ...defaults(),
        ...parsed,
        politicians: Array.isArray(parsed.politicians) ? parsed.politicians : [],
      };
      persist();
      return true;
    } catch {
      return false;
    }
  },
  purge() {
    localStorage.removeItem(KEY);
    state = defaults();
    persist();
  },
};
