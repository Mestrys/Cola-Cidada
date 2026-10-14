import { store } from '../store.js';
import { loadComparison, loadSenateComparison } from '../votes.js';
import { esc, fmtDate, toast, $ } from '../ui.js';

export function render(root) {
  const { prefs, alerts, politicians } = store.get();
  const hasNotificationSupport = 'Notification' in window;
  const isNotificationGranted = hasNotificationSupport && Notification.permission === 'granted';

  const toggles = [
    ['rollcall', 'Votações Nominais no Plenário', 'Emissão instantânea quando um deputado ou senador monitorado votar.'],
    ['expenses', 'Despesas CEAP > R$ 5.000', 'Alerta imediato para notas fiscais atípicas, combustíveis e consultorias.'],
    ['bills', 'Novas Proposições & Relatorias', 'Apresentação de novos projetos de lei, emendas à constituição ou pareceres.'],
  ];

  root.innerHTML = `
    <!-- Top Header da Central de Alertas (Stitch) -->
    <div class="top">
      <div>
        <div class="row u-gap-8 u-mb-4">
          <span class="chip green xs">SOB DEMANDA</span>
          <span class="xs muted">Notificações e Avisos Oficiais</span>
        </div>
        <div class="row u-gap-10">
          <div class="u-width-36 u-height-36 u-br-10 u-bg-primary-soft u-c-primary u-d-grid u-place-items-center">
            <span class="mi u-fs-22" aria-hidden="true">notifications_active</span>
          </div>
          <h1>Central de Alertas</h1>
        </div>
        <p>Votações recentes dos seus representantes no Congresso, consultadas quando você toca em "Verificar agora".</p>
      </div>
      <div class="row page-actions">
        <button class="btn primary" id="check"><span class="mi" aria-hidden="true">sync</span>Verificar Agora</button>
      </div>
    </div>

    <!-- Filtros de Alerta (Conforme Stitch) -->
    <div class="row u-gap-8 u-mb-20" id="alert-filters">
      <button class="chip green u-cursor-pointer u-p-6-14 u-fs-12" data-filter="all">
        ✔ Todas (${alerts.length})
      </button>
      <button class="chip u-cursor-pointer u-p-6-14 u-fs-12" data-filter="votacao">
        Votações Nominais
      </button>
      <button class="chip u-cursor-pointer u-p-6-14 u-fs-12" data-filter="gasto">
        Gastos & Notas
      </button>
      <button class="chip u-cursor-pointer u-p-6-14 u-fs-12" data-filter="proposicao">
        Projetos de Lei
      </button>
    </div>

    <div class="grid g2 u-ai-start">
      
      <!-- COLUNA PRINCIPAL: Lista de Alertas -->
      <div class="stack" id="alerts-stream">
        ${
          hasNotificationSupport && !isNotificationGranted
            ? `
          <div class="card soft row between u-p-16 u-bg-secondary-soft u-bl-4-solid-secondary">
            <div>
              <b class="u-c-on-secondary-soft u-fs-14">Ativar Notificações no Dispositivo</b>
              <p class="xs u-c-on-secondary-soft u-mt-2">Receba avisos na área de trabalho quando houver votações de alto impacto.</p>
            </div>
            <button class="btn primary sm" id="btn-enable-notify">
              <span class="mi" aria-hidden="true">notifications</span>Ativar
            </button>
          </div>`
            : ''
        }

        ${
          alerts.length
            ? `
          <div class="stack u-gap-14">
            <div class="row between xs muted u-fw-700 u-tt-uppercase">
              <span>● Registros Mais Recentes</span>
              <span>${alerts.length} eventos monitorados</span>
            </div>
            ${alerts
              .map(
                (a) => `
              <article class="card stack u-gap-10 u-bl-4-solid-primary">
                <div class="row between">
                  <div class="row u-gap-6">
                    <span class="chip green xs"><span class="mi u-fs-12" aria-hidden="true">how_to_vote</span>Nominal</span>
                    <span class="xs muted">Deliberação em Plenário</span>
                  </div>
                  <span class="xs muted">${fmtDate(a.ts)}</span>
                </div>
                <p class="u-fs-14 u-fw-600 u-lh-1_45">${esc(a.text)}</p>
                <div class="row between xs muted u-bg-s1 u-p-8-12 u-br-r-sm">
                  <span>Auditoria direta via API oficial</span>
                  <span class="chip green xs"><span class="mi u-fs-12" aria-hidden="true">check</span>Verificado</span>
                </div>
              </article>`
              )
              .join('')}
          </div>`
            : `
          <div class="card empty">
            <span class="mi" aria-hidden="true">notifications_off</span>
            <h2>Nenhum alerta pendente</h2>
            <p>Acompanhe deputados ou senadores (pelo perfil deles no <a href="#/painel">Painel Público</a>) e toque em "Verificar agora" para ver as deliberações recentes do Congresso.</p>
          </div>`
        }

        <!-- Card Stitch: Fiscalização Cívica Direcionada -->
        <div class="card stack u-gap-10 u-p-18 u-bg-s1 u-border-1-solid-line u-mt-10">
          <div class="row u-gap-8">
            <span class="mi u-c-primary u-fs-22" aria-hidden="true">verified</span>
            <b class="u-fs-14">Fiscalização Cívica Direcionada</b>
          </div>
          <p class="sm muted u-lh-1_5">
            Os alertas cobrem os <b>${politicians.length} representantes</b> que você acompanha. A consulta acontece quando você toca em "Verificar agora"; com as notificações do aparelho ativadas, cada votação nova também aparece como notificação.
          </p>
          <div class="row between sm u-mt-6">
            <span class="xs muted">Fonte: APIs da Câmara e do Senado</span>
            <a href="#/perfil" class="btn sm outlined">Configurar Preferências</a>
          </div>
        </div>
      </div>

      <!-- COLUNA LATERAL: Preferências de Notificação (Stitch) -->
      <aside class="card stack u-gap-16 u-p-20 u-position-sticky u-top-80">
        <div class="row between">
          <div class="row u-gap-8">
            <span class="mi u-c-primary u-fs-20" aria-hidden="true">tune</span>
            <h2 class="h2">Gatilhos de Notificação</h2>
          </div>
          <span class="chip green xs">Ativo</span>
        </div>

        <p class="xs muted u-lh-1_5">
          Defina quais matérias acionam alertas locais no seu navegador. Os dados são processados inteiramente no seu dispositivo.
        </p>

        <div class="stack u-gap-12">
          ${toggles
            .map(
              ([k, t, d]) => `
            <div class="card soft row between u-p-12-14 u-gap-12">
              <div class="u-flex-1">
                <b class="u-fs-13 u-d-block">${t}</b>
                <span class="xs muted u-lh-1_4">${d}</span>
              </div>
              <label class="switch">
                <input type="checkbox" role="switch" data-pref="${k}" aria-label="${t}" ${prefs[k] ? 'checked' : ''}>
                <i></i>
              </label>
            </div>`
            )
            .join('')}
        </div>

        <div class="card soft stack u-gap-8 u-p-12 u-fs-12 u-bg-s2">
          <div class="row u-gap-6 u-c-primary">
            <span class="mi u-fs-16" aria-hidden="true">security</span>
            <b>Privacidade LGPD</b>
          </div>
          <p class="xs muted">Nenhum servidor externo recebe a lista de deputados ou convicções que você monitora.</p>
        </div>
      </aside>

    </div>`;

  const btnNotify = $('#btn-enable-notify', root);
  if (btnNotify) {
    btnNotify.onclick = async () => {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast('Notificações no dispositivo ativadas!');
        render(root);
      } else {
        toast('Permissão de notificação negada.', 'info');
      }
    };
  }

  root.querySelectorAll('[data-pref]').forEach((i) => {
    i.onchange = () => {
      store.setPref(i.dataset.pref, i.checked);
      toast('Preferência de notificação salva.');
    };
  });

  $('#check', root).onclick = async (e) => {
    const deputies = politicians.filter((p) => p.camaraId);
    const senators = politicians.filter((p) => p.senadoId);

    if (!deputies.length && !senators.length) {
      return toast('Adicione ao menos um deputado ou senador para monitorar.', 'info');
    }

    const btn = e.currentTarget;
    btn.disabled = true;
    btn.innerHTML = '<span class="spin"></span><span>Consultando Congresso…</span>';

    try {
      const freshAlerts = [];

      // 1. Votações da Câmara
      if (deputies.length && store.get().prefs.rollcall) {
        const rows = await loadComparison(politicians, 10);
        for (const v of rows) {
          for (const d of deputies) {
            const vote = v.byPol[d.id];
            if (vote) {
              freshAlerts.push({
                id: `camara:${v.id}:${d.id}`,
                ts: v.data || new Date().toISOString(),
                politicianId: d.id,
                text: `${d.name} (${d.party}/${d.uf}) votou ${vote.toUpperCase()} na Câmara — ${v.descricao || 'Votação nominal no Plenário'}`,
              });
            }
          }
        }
      }

      // 2. Votações do Senado
      if (senators.length && store.get().prefs.rollcall) {
        const rowsSen = await loadSenateComparison(politicians, 10);
        for (const v of rowsSen) {
          for (const s of senators) {
            const vote = v.bySenator[s.id];
            if (vote && vote !== 'Ausente') {
              freshAlerts.push({
                id: `senado:${v.matter}:${s.id}`,
                ts: v.date || new Date().toISOString(),
                politicianId: s.id,
                text: `${s.name} (${s.party}/${s.uf}) votou ${vote.toUpperCase()} no Senado — ${v.matter}: ${v.summary.slice(0, 90)}`,
              });
            }
          }
        }
      }

      const count = store.addAlerts(freshAlerts);
      if (count > 0) {
        toast(`${count} novo(s) alerta(s) de votação encontrado(s)!`);
        if ('Notification' in window && Notification.permission === 'granted' && freshAlerts.length > 0) {
          new Notification('Monitor Cidadão: Novo Voto no Congresso', {
            body: freshAlerts[0].text,
            icon: '/icon.svg',
          });
        }
      } else {
        toast('Nenhuma nova deliberação registrada recentemente.', 'info');
      }
      render(root);
    } catch {
      toast('Erro temporário ao consultar bases de dados abertas.', 'error');
      render(root);
    }
  };
}
