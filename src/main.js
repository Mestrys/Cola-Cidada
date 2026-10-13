import { store } from './store.js';
import { $, $$ } from './ui.js';
import * as inicio from './views/inicio.js';
import * as politicos from './views/politicos.js';
import * as comparador from './views/comparador.js';
import * as alertas from './views/alertas.js';
import * as perfil from './views/perfil.js';
import { openPoliticianModal } from './views/addPolitician.js';
import { openOnboardingModal } from './views/onboarding.js';
import { openColaEleitoralModal } from './views/colaEleitoral.js';

const routes = {
  inicio: { icon: 'feed', label: 'Início', view: inicio },
  'meus-politicos': { icon: 'how_to_vote', label: 'Meus Políticos', view: politicos },
  comparador: { icon: 'compare_arrows', label: 'Comparador Cívico', view: comparador },
  alertas: { icon: 'notifications', label: 'Alertas', view: alertas },
  perfil: { icon: 'person', label: 'Perfil', view: perfil },
};

const app = $('#app');
let deferredPrompt = null;

function formatSyncTime() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `Hoje, ${hh}:${mm}`;
}

function shell() {
  const unreadAlerts = store.get().alerts.length;

  app.innerHTML = `
    <div class="app-wrapper">
      <!-- 1. Top Global Header (Conforme Stitch) -->
      <header class="top-header" role="banner">
        <div class="header-brand">
          <a href="#/inicio" style="display:flex; align-items:center; gap:10px; color:inherit">
            <div style="width:36px; height:36px; border-radius:10px; background:linear-gradient(135deg, var(--primary-c), var(--secondary)); display:grid; place-items:center; color:#fff">
              <span class="mi fill" style="font-size:22px">balance</span>
            </div>
            <div class="brand-badge">
              <span class="brand-title">Monitor Cidadão</span>
              <span class="brand-subtitle">Transparência Pública</span>
            </div>
          </a>
        </div>

        <div class="header-center">
          <div class="live-pill" title="Fluxo de dados abertos conectado ao Congresso Nacional">
            <span class="live-dot"></span>
            <span>DADOS DO CONGRESSO AO VIVO</span>
          </div>
        </div>

        <div class="header-actions">
          <div class="sync-status" title="Última sincronização com APIs oficiais">
            <span class="mi" style="font-size:16px; color:var(--primary)">sync</span>
            <span>Sincronizado: ${formatSyncTime()}</span>
          </div>

          <a href="#/alertas" class="btn icon ghost" title="Central de Alertas" style="position:relative" aria-label="Alertas">
            <span class="mi">notifications</span>
            ${
              unreadAlerts > 0
                ? `<span style="position:absolute; top:4px; right:4px; width:8px; height:8px; border-radius:50%; background:var(--primary-c)"></span>`
                : ''
            }
          </a>

          <a href="#/perfil" class="header-user-btn" title="Perfil do Cidadão">
            <div class="user-avatar">
              <span class="mi" style="font-size:18px">person</span>
            </div>
            <div style="display:flex; flex-direction:column; line-height:1.2; padding-right:4px">
              <b style="font-size:12px">Cidadão</b>
              <span class="xs muted">Eleitor Regular</span>
            </div>
          </a>
        </div>
      </header>

      <!-- 2. Sub-Banner Cívico Institucional -->
      <div class="sub-civic-bar no-print">
        <div class="row" style="gap:12px">
          <span class="civic-tag">
            <span class="live-dot" style="background:#fff; width:6px; height:6px"></span>
            TRANSMISSÃO CÍVICA CONTÍNUA
          </span>
          <span class="civic-sources">
            <span class="mi" style="font-size:15px; color:var(--primary)">verified</span>
            Fontes Oficiais: TSE • API Câmara dos Deputados • Senado Aberto
          </span>
        </div>

        <div class="row" style="gap:8px">
          <button class="chip green" id="sub-btn-cola" style="cursor:pointer; border:none"><span class="mi" style="font-size:14px">how_to_vote</span>Minha Cola</button>
          <a href="#/inicio" class="chip" style="cursor:pointer; text-decoration:none"><span class="mi" style="font-size:14px">dashboard</span>Visão Geral</a>
          <a href="#/comparador" class="chip" style="cursor:pointer; text-decoration:none"><span class="mi" style="font-size:14px">how_to_vote</span>Votações</a>
          <a href="#/meus-politicos" class="chip" style="cursor:pointer; text-decoration:none"><span class="mi" style="font-size:14px">receipt_long</span>Auditoria CEAP</a>
        </div>
      </div>

      <!-- 3. Shell Principal (Sidebar + Content) -->
      <div class="shell">
        <aside class="side" role="navigation" aria-label="Navegação Lateral">
          <nav class="nav">
            ${Object.entries(routes)
              .map(
                ([k, r]) => `
              <a href="#/${k}" data-route="${k}">
                <span class="mi">${r.icon}</span>
                <span>${r.label}</span>
              </a>`
              )
              .join('')}
          </nav>

          <div class="side-foot">
            <button class="btn outlined sm" id="pwa-install" hidden style="width:100%; justify-content:flex-start">
              <span class="mi">install_mobile</span>
              <span>Instalar Aplicativo</span>
            </button>

            <!-- Toggle Claro / Escuro -->
            <div class="row between" style="padding:4px 6px">
              <div class="row" style="gap:8px">
                <span class="mi" id="theme-icon" style="font-size:18px; color:var(--muted)">light_mode</span>
                <span class="sm" id="theme-label" style="font-weight:600">Tema Claro</span>
              </div>
              <label class="switch" title="Alternar entre Tema Claro e Escuro">
                <input type="checkbox" id="theme-toggle-check">
                <i></i>
              </label>
            </div>

            <!-- Card de Segurança LGPD -->
            <div class="user-quick-card">
              <span class="mi citizen-shield">shield</span>
              <div style="flex:1">
                <b style="font-size:11.5px; display:block">Ambiente Seguro LGPD</b>
                <span class="xs muted">Criptografia Local 100% Offline</span>
              </div>
            </div>

            <small class="muted" style="font-size:10.5px; padding:0 4px">
              © ${new Date().getFullYear()} Mestry's Tecnologia
            </small>
          </div>
        </aside>

        <!-- Main Content -->
        <main class="content" id="view" role="main"></main>
      </div>

      <!-- 4. Mobile Bottom Navigation Bar (Material You MD3) -->
      <nav class="mobile-nav no-print" aria-label="Navegação Inferior Mobile">
        ${Object.entries(routes)
          .map(
            ([k, r]) => `
          <a href="#/${k}" data-route="${k}">
            <div class="nav-pill">
              <span class="mi">${r.icon}</span>
            </div>
            <span>${r.label.split(' ')[0]}</span>
          </a>`
          )
          .join('')}
      </nav>

      <!-- 5. Rodapé Institucional Corporativo (Conforme Stitch) -->
      <footer class="footer-corporate no-print" role="contentinfo">
        <div style="max-width:1400px; margin:0 auto; padding:0 32px">
          <div class="footer-top">
            <div>
              <div class="row" style="gap:8px; margin-bottom:8px">
                <div style="width:24px; height:24px; border-radius:6px; background:var(--primary); display:grid; place-items:center; color:#fff">
                  <span class="mi fill" style="font-size:15px">balance</span>
                </div>
                <b style="font-size:14px; color:var(--text)">Mestry's Tecnologia</b>
              </div>
              <p style="font-size:12px; line-height:1.5; max-width:440px">
                Desenvolvimento de software de alta conformidade e soluções para integridade cívica, inteligência legislativa e auditoria de dados públicos abertos.
              </p>
              <div class="xs muted" style="margin-top:6px">CNPJ: 68.027.889/0001-34</div>
            </div>

            <div>
              <b style="font-size:12.5px; color:var(--text); display:block; margin-bottom:6px">Sede Corporativa & Endereço</b>
              <p style="font-size:12px; line-height:1.5">
                Rua Pais Leme, 215, Conj 1713<br>
                Bairro Pinheiros, São Paulo - SP<br>
                CEP: 05424-150 • Brasil
              </p>
            </div>

            <div>
              <b style="font-size:12.5px; color:var(--text); display:block; margin-bottom:6px">Atendimento Cívico</b>
              <p style="font-size:12px; line-height:1.5">
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
                <span class="mi" style="font-size:14px; color:var(--primary)">lock</span>
                Ambiente Seguro LGPD
              </span>
              <span class="footer-badge-item">
                <span class="mi" style="font-size:14px; color:var(--primary)">gavel</span>
                Aderência LAI (Lei 12.527/11)
              </span>
              <span class="footer-badge-item">
                <span class="mi" style="font-size:14px; color:var(--primary)">security</span>
                Framework Cívico Ver. 3.4.12
              </span>
            </div>
          </div>
        </div>
      </footer>

      <!-- Floating Action Button (FAB MD3 Stitch) -->
      <button class="fab-btn no-print" id="global-fab" title="Seguir Político">
        <span class="mi">person_add</span>
        <span>Seguir Político</span>
      </button>
    </div>`;

  const fab = $('#global-fab');
  if (fab) fab.onclick = () => openPoliticianModal();

  const btnCola = $('#sub-btn-cola');
  if (btnCola) btnCola.onclick = () => openColaEleitoralModal();

  const themeCheck = $('#theme-toggle-check');
  if (themeCheck) {
    themeCheck.checked = store.get().theme === 'dark';
    themeCheck.onchange = () => {
      store.set({ theme: themeCheck.checked ? 'dark' : 'light' });
    };
  }

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

function applyTheme() {
  const t = store.get().theme;
  document.documentElement.dataset.theme = t;
  const label = $('#theme-label'),
    icon = $('#theme-icon'),
    check = $('#theme-toggle-check');
  if (label) {
    label.textContent = t === 'dark' ? 'Tema Escuro' : 'Tema Claro';
    icon.textContent = t === 'dark' ? 'dark_mode' : 'light_mode';
  }
  if (check) {
    check.checked = t === 'dark';
  }
}

let cleanup;
async function render() {
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
applyTheme();
let lastTheme = store.get().theme;

store.subscribe((s) => {
  if (s.theme !== lastTheme) {
    lastTheme = s.theme;
    applyTheme();
    return;
  }
  render();
});

window.addEventListener('hashchange', () => {
  window.scrollTo(0, 0);
  render();
});

render();

// Disparo automático do Onboarding para primeiros acessos
if (!store.get().onboardingDone) {
  setTimeout(() => openOnboardingModal(), 500);
}
