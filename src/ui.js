// Utilitários de UI e domínio.
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const initials = (n = '') => n.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export function avatar(p, cls = '') {
  return p.photo
    ? `<img class="avatar ${cls}" src="${esc(p.photo)}" alt="${esc(p.name)}" loading="lazy">`
    : `<div class="avatar ${cls}">${esc(initials(p.name))}</div>`;
}

export const ROLES = {
  presidente: { label: 'Presidente', term: 4 },
  governador: { label: 'Governador(a)', term: 4 },
  senador: { label: 'Senador(a)', term: 8 },
  'dep-federal': { label: 'Deputado(a) Federal', term: 4 },
  'dep-estadual': { label: 'Deputado(a) Estadual', term: 4 },
  vereador: { label: 'Vereador(a)', term: 4 },
};

// Mandatos eleitos em out/2022 começam em 1/jan/2023 (Presidente, Governadores)
// ou 1/fev/2023 (Legislativo federal e estadual) e terminam 4 anos depois.
// Senadores eleitos em 2018 terminam em 31/jan/2027; os de 2022, em 31/jan/2031.
// Vereadores eleitos em 2024 iniciam mandato em 1/jan/2025 até 31/dez/2028.
export function defaultMandate(role) {
  const dates = {
    presidente: ['2023-01-01', '2026-12-31'],
    governador: ['2023-01-01', '2026-12-31'],
    'dep-federal': ['2023-02-01', '2027-01-31'],
    'dep-estadual': ['2023-03-15', '2027-03-14'],
    senador: ['2023-02-01', '2031-01-31'],
    vereador: ['2025-01-01', '2028-12-31'],
  };
  return dates[role];
}

export function mandateProgress(p) {
  const [start, end] = p.mandate || defaultMandate(p.roleKey) || [];
  if (!start) return { pct: 0, label: '—' };
  const s = new Date(start), e = new Date(end), now = new Date();
  const pct = Math.max(0, Math.min(100, ((now - s) / (e - s)) * 100));
  const left = Math.ceil((e - now) / 864e5);
  return {
    pct: Math.round(pct),
    label: left > 0 ? `${left} dias restantes` : 'Mandato encerrado',
    end: e.toLocaleDateString('pt-BR'),
    ended: left <= 0,
  };
}

export function toast(msg, icon = 'check_circle') {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span class="mi">${icon}</span><span>${esc(msg)}</span>`;
  document.body.append(t);
  setTimeout(() => t.remove(), 3200);
}

export function modal(html) {
  const o = document.createElement('div');
  o.className = 'overlay';
  o.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  const close = () => o.remove();
  o.addEventListener('mousedown', (e) => { if (e.target === o) close(); });
  o.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  document.body.append(o);
  return { el: o.firstChild, close };
}

export const VOTE_CLASS = { Sim: 'sim', Não: 'nao' };
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : '');
export const brl = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
