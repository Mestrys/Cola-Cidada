// Utilitários de UI e domínio.
import { spring, project, rubberband, velocityFrom, prefersReducedMotion } from './motion.js';

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
// Exceção: a 20ª legislatura da ALESP tomou posse em 15/mar/2023; uma PEC da Alesp antecipou
// a posse seguinte para 1/fev/2027, então o mandato atual termina em 31/jan/2027.
// Senadores eleitos em 2018 terminam em 31/jan/2027; os de 2022, em 31/jan/2031.
// Vereadores eleitos em 2024 iniciam mandato em 1/jan/2025 até 31/dez/2028.
export function defaultMandate(role, uf) {
  const dates = {
    presidente: ['2023-01-01', '2026-12-31'],
    governador: ['2023-01-01', '2026-12-31'],
    'dep-federal': ['2023-02-01', '2027-01-31'],
    'dep-estadual': String(uf || '').toUpperCase() === 'SP' ? ['2023-03-15', '2027-01-31'] : ['2023-02-01', '2027-01-31'],
    senador: ['2023-02-01', '2031-01-31'],
    vereador: ['2025-01-01', '2028-12-31'],
  };
  return dates[role];
}

// Cadastros antigos gravaram a data da ALESP (15/03/2023–14/03/2027) para todas as assembleias.
const LEGACY_STATE_MANDATE = '2023-03-15|2027-03-14';

export function mandateProgress(p) {
  const stored = p.mandate && p.mandate.join('|') !== LEGACY_STATE_MANDATE ? p.mandate : null;
  const [start, end] = stored || defaultMandate(p.roleKey, p.uf) || [];
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

const TOAST_ICONS = { success: 'check_circle', error: 'error', info: 'info', delete: 'delete' };

// Snackbar com região live para leitores de tela; `action` adiciona um botão (ex.: Desfazer).
export function toast(msg, icon = 'check_circle', { action, duration } = {}) {
  document.querySelectorAll('.toast').forEach((old) => old.remove());
  const t = document.createElement('div');
  t.className = 'toast';
  t.setAttribute('role', 'status');
  t.setAttribute('aria-live', 'polite');
  t.innerHTML = `<span class="mi" aria-hidden="true">${TOAST_ICONS[icon] || icon}</span><span class="toast-msg">${esc(msg)}</span>`;
  let timer;
  const dismiss = () => {
    clearTimeout(timer);
    t.classList.add('leaving');
    t.addEventListener('animationend', () => t.remove(), { once: true });
    setTimeout(() => t.remove(), 400);
  };
  if (action) {
    const b = document.createElement('button');
    b.className = 'toast-action';
    b.textContent = action.label;
    b.onclick = () => {
      action.onClick();
      dismiss();
    };
    t.append(b);
  }
  document.body.append(t);
  timer = setTimeout(dismiss, duration || (action ? 6000 : 3200));
}

let scrollLocks = 0;
// Só o que o Tab alcança: abas inativas (tabindex=-1, ver tablist) ficam de fora, senão o ciclo nunca fecha.
const FOCUSABLE = ':is(a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]):not([tabindex="-1"])';

// Enquanto houver diálogo aberto, o resto do app sai da árvore de acessibilidade e não recebe foco nem cliques.
function setBackgroundInert(on) {
  document.documentElement.classList.toggle('modal-open', on);
  document.querySelector('.app-wrapper')?.toggleAttribute('inert', on);
}

// Diálogo modal: entra e sai pelo mesmo caminho, fecha com Esc, prende o foco e devolve-o ao gatilho.
// Em telas estreitas vira folha inferior que pode ser arrastada para baixo para fechar.
export function modal(html) {
  const opener = document.activeElement;
  const o = document.createElement('div');
  o.className = 'overlay';
  o.innerHTML = `<div class="modal" role="dialog" aria-modal="true" tabindex="-1">${html}</div>`;
  const m = o.firstChild;
  const heading = m.querySelector('h1, h2, h3, h4');
  if (heading) {
    heading.id ||= `dlg-${Math.random().toString(36).slice(2, 8)}`;
    m.setAttribute('aria-labelledby', heading.id);
  }

  let closed = false;
  const finish = () => {
    if (!o.isConnected) return;
    o.remove();
    document.removeEventListener('keydown', onKey, true);
    if (--scrollLocks === 0) setBackgroundInert(false);
    const nothingFocused = !document.activeElement || document.activeElement === document.body;
    if (nothingFocused && opener?.isConnected) opener.focus({ preventScroll: true });
  };
  const close = ({ animate = true } = {}) => {
    if (closed) return;
    closed = true;
    if (!animate) return finish();
    o.classList.add('closing');
    o.addEventListener('animationend', (e) => e.target === m && finish());
    setTimeout(finish, 450);
  };

  const onKey = (e) => {
    const top = [...document.querySelectorAll('.overlay:not(.closing)')].pop();
    if (top !== o) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Tab') {
      const items = [...m.querySelectorAll(FOCUSABLE)].filter((x) => x.offsetParent !== null);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === m)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  o.addEventListener('mousedown', (e) => { if (e.target === o) close(); });
  o.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', onKey, true);
  if (scrollLocks++ === 0) setBackgroundInert(true);
  document.body.append(o);
  m.focus({ preventScroll: true });
  enableSheetDrag(o, m, () => {
    closed = true;
    finish();
  });
  return { el: m, close };
}

// Arrastar a folha para baixo: acompanha o dedo 1:1, resiste para cima, projeta a inércia
// na soltura e anima com mola a partir da velocidade do gesto. Pode ser agarrada no meio do caminho.
function enableSheetDrag(o, m, dismiss) {
  if (!matchMedia('(max-width: 600px)').matches || !('ontouchstart' in window)) return;
  let startX = 0, startY = 0, offset = 0, decided = false, dragging = false;
  let samples = [];
  let anim = null;

  const apply = (y) => {
    offset = y;
    m.style.transform = y ? `translateY(${y}px)` : '';
    const h = m.offsetHeight || 1;
    o.style.setProperty('--scrim', String(Math.max(0, 1 - Math.max(0, y) / h)));
  };

  m.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    samples = [{ v: t.clientY, t: e.timeStamp }];
    if (anim?.running) {
      // agarrou a folha em movimento: continua do valor apresentado, sem salto
      const { value } = anim.stop();
      apply(value);
      startY = t.clientY - value;
      decided = dragging = true;
      return;
    }
    startX = t.clientX;
    startY = t.clientY;
    decided = dragging = false;
  }, { passive: true });

  m.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    if (!decided) {
      const dx = t.clientX - startX, dy = t.clientY - startY;
      if (Math.hypot(dx, dy) < 10) return; // histerese antes de escolher a direção
      decided = true;
      const blocked = e.target.closest('input, textarea, select, .tabs, [data-no-drag]');
      dragging = dy > 0 && Math.abs(dy) > Math.abs(dx) && m.scrollTop <= 0 && !blocked;
      if (!dragging) return;
      startY = t.clientY;
    }
    if (!dragging) return;
    e.preventDefault();
    const raw = t.clientY - startY;
    apply(raw >= 0 ? raw : -rubberband(-raw, m.offsetHeight));
    samples.push({ v: t.clientY, t: e.timeStamp });
    if (samples.length > 6) samples.shift();
  }, { passive: false });

  const release = () => {
    if (!dragging) return;
    dragging = false;
    const velocity = velocityFrom(samples);
    const h = m.offsetHeight;
    const shouldDismiss = offset + project(velocity) > h * 0.5;
    if (prefersReducedMotion()) {
      if (shouldDismiss) dismiss();
      else apply(0);
      return;
    }
    anim = spring({
      from: offset,
      to: shouldDismiss ? h + 24 : 0,
      velocity,
      dampingRatio: 1,
      response: shouldDismiss ? 0.28 : 0.35,
      onUpdate: apply,
      onComplete: shouldDismiss ? dismiss : undefined,
    });
  };
  m.addEventListener('touchend', release);
  m.addEventListener('touchcancel', release);
}

export const VOTE_CLASS = { Sim: 'sim', Não: 'nao' };
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : '');
export const brl = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Grupo de abas acessível (padrão WAI-ARIA): papéis tablist/tab/tabpanel, um só ponto de Tab no grupo
// e setas, Home e End para trocar de aba. A troca de conteúdo continua no onclick de cada view;
// aqui só se espelha a seleção no ARIA e o teclado aciona o clique.
export function tablist(container, panelFor) {
  if (!container) return;
  const tabs = [...container.querySelectorAll(':scope > button')];
  container.setAttribute('role', 'tablist');
  const select = (tab) => tabs.forEach((t) => {
    t.setAttribute('aria-selected', String(t === tab));
    t.tabIndex = t === tab ? 0 : -1;
  });
  tabs.forEach((t, i) => {
    t.setAttribute('role', 'tab');
    t.id ||= `${container.id || 'tabs'}-tab-${i}`;
    const panel = panelFor(t);
    if (panel) {
      t.setAttribute('aria-controls', panel.id);
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', t.id);
    }
    t.addEventListener('click', () => select(t));
  });
  select(tabs.find((t) => t.classList.contains('on') || t.classList.contains('active')) || tabs[0]);
  container.addEventListener('keydown', (e) => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const tab = tabs[(next + tabs.length) % tabs.length];
    tab.focus();
    tab.click();
  });
}
