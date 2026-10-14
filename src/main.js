import { store } from './store.js';
import { $, $$ } from './ui.js';
import { initDynamicStyles } from './dynamic.js';
import * as inicio from './views/inicio.js';
import * as politicos from './views/politicos.js';
import * as comparador from './views/comparador.js';
import * as alertas from './views/alertas.js';
import * as perfil from './views/perfil.js';
import { openPoliticianModal } from './views/addPolitician.js';
import { openOnboardingModal } from './views/onboarding.js';
import { openColaEleitoralModal } from './views/colaEleitoral.js';

const routes = {
  inicio: { icon: 'feed', label: 'Início', short: 'Início', view: inicio },
  'meus-politicos': { icon: 'how_to_vote', label: 'Meus Políticos', short: 'Políticos', view: politicos },
  comparador: { icon: 'compare_arrows', label: 'Comparador Cívico', short: 'Comparar', view: comparador },
  alertas: { icon: 'notifications', label: 'Alertas', short: 'Alertas', view: alertas },
  perfil: { icon: 'person', label: 'Perfil', short: 'Perfil', view: perfil },
};

const app = $('#app');
let deferredPrompt = null;

function shell() {
  const unreadAlerts = store.get().alerts.length;

  app.innerHTML = `
    <div class="app-wrapper">
      <a href="#view" class="skip-link">Pular para o conteúdo</a>
      <!-- 1. Top Global Header (Conforme Stitch) -->
      <header class="top-header" role="banner">
        <div class="header-brand">
          <a href="#/inicio" class="u-d-flex u-ai-center u-gap-10 u-c-inherit">
            <div class="u-width-36 u-height-36 u-br-10 u-bg-f4e9bb u-d-grid u-place-items-center u-c-fff">
              <span class="mi fill u-fs-22" aria-hidden="true">balance</span>
            </div>
            <div class="brand-badge">
              <span class="brand-title">Monitor Cidadão</span>
              <span class="brand-subtitle">Transparência Pública</span>
            </div>
          </a>
        </div>

        <div class="header-actions">
          <button class="btn icon ghost header-icon-btn" id="header-theme-btn" aria-label="Alternar tema claro/escuro">
            <span class="mi" aria-hidden="true" id="header-theme-icon">dark_mode</span>
          </button>

          <a href="#/alertas" class="btn icon ghost u-position-relative" title="Central de Alertas" aria-label="Alertas">
            <span class="mi" aria-hidden="true">notifications</span>
            ${
              unreadAlerts > 0
                ? `<span class="u-position-absolute u-top-4 u-right-4 u-width-8 u-height-8 u-br-50pct u-bg-primary-c"></span>`
                : ''
            }
          </a>

          <a href="#/perfil" class="header-user-btn" title="Perfil do Cidadão">
            <div class="user-avatar">
              <span class="mi u-fs-18" aria-hidden="true">person</span>
            </div>
            <div class="user-text">
              <b class="u-fs-12">Meu Perfil</b>
              <span class="xs muted">Dados neste aparelho</span>
            </div>
          </a>
        </div>
      </header>

      <!-- 3. Shell Principal (Sidebar + Content) -->
      <div class="shell">
        <aside class="side" aria-label="Menu lateral">
          <nav class="nav" aria-label="Navegação principal">
            ${Object.entries(routes)
              .map(
                ([k, r]) => `
              <a href="#/${k}" data-route="${k}">
                <span class="mi" aria-hidden="true">${r.icon}</span>
                <span>${r.label}</span>
              </a>`
              )
              .join('')}
          </nav>

          <div class="side-foot">
            <button class="btn outlined sm u-width-100pct u-jc-flex-start" id="pwa-install" hidden>
              <span class="mi" aria-hidden="true">install_mobile</span>
              <span>Instalar Aplicativo</span>
            </button>

            <!-- Toggle Claro / Escuro -->
            <div class="row between u-p-4-6">
              <div class="row u-gap-8">
                <span class="mi u-fs-18 u-c-muted" aria-hidden="true" id="theme-icon">light_mode</span>
                <span class="sm u-fw-600" id="theme-label">Tema Claro</span>
              </div>
              <label class="switch" title="Alternar entre Tema Claro e Escuro">
                <input type="checkbox" id="theme-toggle-check" role="switch" aria-label="Tema escuro">
                <i></i>
              </label>
            </div>

            <!-- Card de Segurança LGPD -->
            <div class="user-quick-card">
              <span class="mi citizen-shield" aria-hidden="true">shield</span>
              <div class="u-flex-1">
                <b class="u-fs-11_5 u-d-block">Privacidade LGPD</b>
                <span class="xs muted">Dados salvos só neste dispositivo</span>
              </div>
            </div>

            <small class="muted u-fs-10_5 u-p-0-4">
              © ${new Date().getFullYear()} Mestry's Tecnologia
            </small>
          </div>
        </aside>

        <div class="main-col">
          <!-- 2. Sub-Banner Cívico Institucional -->
          <aside class="sub-civic-bar no-print" aria-label="Fontes oficiais e atalhos">
            <span class="civic-sources">
              <span class="mi u-fs-15 u-c-primary" aria-hidden="true">verified</span>
              Fontes oficiais: TSE • Câmara dos Deputados • Senado Federal
            </span>

            <div class="row civic-chips u-gap-8">
              <button class="chip green u-cursor-pointer u-border-none" id="sub-btn-cola"><span class="mi u-fs-14" aria-hidden="true">how_to_vote</span>Minha Cola</button>
              <a href="#/inicio" class="chip u-cursor-pointer u-text-decoration-none"><span class="mi u-fs-14" aria-hidden="true">dashboard</span>Visão Geral</a>
              <a href="#/comparador" class="chip u-cursor-pointer u-text-decoration-none"><span class="mi u-fs-14" aria-hidden="true">gavel</span>Votações</a>
              <a href="#/meus-politicos" class="chip u-cursor-pointer u-text-decoration-none"><span class="mi u-fs-14" aria-hidden="true">receipt_long</span>Auditoria CEAP</a>
            </div>
          </aside>

          <!-- Main Content -->
          <main class="content" id="view" role="main"></main>
        </div>
      </div>

      <!-- 4. Mobile Bottom Navigation Bar (Material You MD3) -->
      <nav class="mobile-nav no-print" aria-label="Navegação Inferior Mobile">
        ${Object.entries(routes)
          .map(
            ([k, r]) => `
          <a href="#/${k}" data-route="${k}">
            <div class="nav-pill">
              <span class="mi" aria-hidden="true">${r.icon}</span>
            </div>
            <span>${r.short}</span>
          </a>`
          )
          .join('')}
      </nav>

      <!-- 5. Rodapé Institucional Corporativo (Conforme Stitch) -->
      <footer class="footer-corporate no-print" role="contentinfo">
        <div class="u-maxw-1400 u-m-0-auto u-p-0-32">
          <div class="footer-top">
            <div>
              <div class="row u-gap-8 u-mb-8">
                <div class="u-width-24 u-height-24 u-br-6 u-bg-primary u-d-grid u-place-items-center u-c-fff">
                  <span class="mi fill u-fs-15" aria-hidden="true">balance</span>
                </div>
                <b class="u-fs-14 u-c-text">Mestry's Tecnologia</b>
              </div>
              <p class="u-fs-12 u-lh-1_5 u-maxw-440">
                Desenvolvimento de software de alta conformidade e soluções para integridade cívica, inteligência legislativa e auditoria de dados públicos abertos.
              </p>
              <div class="xs muted u-mt-6">CNPJ: 68.027.889/0001-34</div>
            </div>

            <div>
              <b class="u-fs-12_5 u-c-text u-d-block u-mb-6">Sede Corporativa & Endereço</b>
              <p class="u-fs-12 u-lh-1_5">
                Rua Pais Leme, 215, Conj 1713<br>
                Bairro Pinheiros, São Paulo - SP<br>
                CEP: 05424-150 • Brasil
              </p>
            </div>

            <div>
              <b class="u-fs-12_5 u-c-text u-d-block u-mb-6">Atendimento Cívico</b>
              <p class="u-fs-12 u-lh-1_5">
                +55 (11) 3038-7214 (Central)<br>
                +55 (11) 5283-9382 (Suporte LGPD)<br>
                contato@mestrys.com.br
              </p>
            </div>
          </div>

          <div class="footer-bottom">
            <div>
              © ${new Date().getFullYear()} Monitor Cidadão • Todos os direitos reservados.
            </div>

            <div class="footer-badges">
              <span class="footer-badge-item">
                <span class="mi u-fs-14 u-c-primary" aria-hidden="true">lock</span>
                Dados só neste dispositivo
              </span>
              <span class="footer-badge-item">
                <span class="mi u-fs-14 u-c-primary" aria-hidden="true">database</span>
                Dados abertos: Câmara • Senado • TSE
              </span>
            </div>
          </div>
        </div>
      </footer>

      <!-- Floating Action Button (FAB MD3 Stitch) -->
      <button class="fab-btn no-print" id="global-fab" title="Seguir Político" aria-label="Seguir Político">
        <span class="mi" aria-hidden="true">person_add</span>
        <span class="fab-label">Seguir Político</span>
      </button>
    </div>`;

  const fab = $('#global-fab');
  if (fab) fab.onclick = () => openPoliticianModal();

  const btnCola = $('#sub-btn-cola');
  if (btnCola) btnCola.onclick = () => openColaEleitoralModal();

  // O roteamento usa o hash, então o link de pulo move o foco em vez de navegar.
  $('.skip-link').onclick = (e) => {
    e.preventDefault();
    focusViewHeading({ scroll: true });
  };

  const themeCheck = $('#theme-toggle-check');
  if (themeCheck) {
    themeCheck.checked = resolvedTheme() === 'dark';
    themeCheck.onchange = () => {
      store.set({ theme: themeCheck.checked ? 'dark' : 'light' });
    };
  }

  const themeBtn = $('#header-theme-btn');
  if (themeBtn) themeBtn.onclick = () => store.set({ theme: resolvedTheme() === 'dark' ? 'light' : 'dark' });

  const installBtn = $('#pwa-install');
  if (installBtn) {
    installBtn.onclick = async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        installBtn.hidden = true;
      }
      deferredPrompt = null;
    };
  }
}

// Ouvinte de instalação PWA
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = $('#pwa-install');
  if (btn) btn.hidden = false;
});

// 'system' (padrão) segue a preferência do aparelho até o usuário escolher um tema.
const darkQuery = matchMedia('(prefers-color-scheme: dark)');
function resolvedTheme() {
  const t = store.get().theme;
  return t === 'dark' || t === 'light' ? t : darkQuery.matches ? 'dark' : 'light';
}

function paintTheme() {
  const t = resolvedTheme();
  document.documentElement.dataset.theme = t;
  const label = $('#theme-label'),
    icon = $('#theme-icon'),
    check = $('#theme-toggle-check'),
    headerIcon = $('#header-theme-icon');
  if (label) {
    label.textContent = t === 'dark' ? 'Tema Escuro' : 'Tema Claro';
    icon.textContent = t === 'dark' ? 'dark_mode' : 'light_mode';
  }
  if (check) check.checked = t === 'dark';
  if (headerIcon) headerIcon.textContent = t === 'dark' ? 'light_mode' : 'dark_mode';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = getComputedStyle(document.documentElement).getPropertyValue('--md-sys-color-surface').trim();
}

// Troca de tema com crossfade suave (evita o salto brusco de brilho); instantânea com movimento reduzido.
function applyTheme({ animate = false } = {}) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (animate && !reduce && document.startViewTransition) document.startViewTransition(paintTheme);
  else paintTheme();
}

darkQuery.addEventListener('change', () => {
  if (store.get().theme === 'system') applyTheme({ animate: true });
});

// Divisória do cabeçalho só aparece quando há conteúdo rolando por baixo dele.
let scrollTicking = false;
window.addEventListener(
  'scroll',
  () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      $('.top-header')?.classList.toggle('scrolled', window.scrollY > 4);
      scrollTicking = false;
    });
  },
  { passive: true }
);

// Leva o foco ao título da tela, para o leitor de tela anunciar onde o usuário chegou.
function focusViewHeading({ scroll = false } = {}) {
  const target = $('#view h1') || $('#view');
  target.setAttribute('tabindex', '-1');
  target.classList.add('focus-target');
  target.focus({ preventScroll: !scroll });
}

let cleanup;
async function render({ moveFocus = false } = {}) {
  const key = location.hash.replace('#/', '') || 'inicio';
  const route = routes[key] || routes.inicio;

  // Atualiza active na sidebar e no mobile nav
  $$('.nav a, .mobile-nav a').forEach((a) =>
    a.classList.toggle('active', a.dataset.route === (routes[key] ? key : 'inicio'))
  );

  const root = $('#view');
  if (typeof cleanup === 'function') cleanup();
  document.title = `${route.label} · Monitor Cidadão`;
  cleanup = await route.view.render(root);
  if (moveFocus && !document.querySelector('.overlay')) focusViewHeading();
}

// Registro do Service Worker (Offline & PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => console.log('Service Worker ativo:', reg.scope))
      .catch((err) => console.warn('Erro ao registrar Service Worker:', err));
  });
}

shell();
initDynamicStyles();
applyTheme();
let lastTheme = store.get().theme;

store.subscribe((s) => {
  if (s.theme !== lastTheme) {
    lastTheme = s.theme;
    applyTheme({ animate: true });
    return;
  }
  render();
});

window.addEventListener('hashchange', () => {
  window.scrollTo(0, 0);
  render({ moveFocus: true });
});

// Onboarding no primeiro acesso: abre junto da primeira renderização, sem espera artificial.
render();
if (!store.get().onboardingDone) openOnboardingModal();
