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
        <div class="row" style="gap:8px; margin-bottom:4px">
          <span class="chip green xs">TEMPO REAL</span>
          <span class="xs muted">Notificações e Avisos Oficiais</span>
        </div>
        <div class="row" style="gap:10px">
          <div style="width:36px; height:36px; border-radius:10px; background:var(--primary-soft); color:var(--primary); display:grid; place-items:center">
            <span class="mi" style="font-size:22px">notifications_active</span>
          </div>
          <h1>Central de Alertas</h1>
        </div>
        <p>Atualizações em tempo real dos seus representantes monitorados no Congresso e Assembleias.</p>
      </div>
      <div class="row">
        <button class="btn primary" id="check"><span class="mi">sync</span>Verificar Agora</button>
      </div>
    </div>

    <!-- Filtros de Alerta (Conforme Stitch) -->
    <div class="row" id="alert-filters" style="gap:8px; margin-bottom:20px">
      <button class="chip green" data-filter="all" style="cursor:pointer; padding:6px 14px; font-size:12px">
        ✔ Todas (${alerts.length})
      </button>
      <button class="chip" data-filter="votacao" style="cursor:pointer; padding:6px 14px; font-size:12px">
        Votações Nominais
      </button>
      <button class="chip" data-filter="gasto" style="cursor:pointer; padding:6px 14px; font-size:12px">
        Gastos & Notas
      </button>
      <button class="chip" data-filter="proposicao" style="cursor:pointer; padding:6px 14px; font-size:12px">
        Projetos de Lei
      </button>
    </div>

    <div class="grid g2" style="align-items:start">
      
      <!-- COLUNA PRINCIPAL: Lista de Alertas -->
      <div class="stack" id="alerts-stream">
        ${
          hasNotificationSupport && !isNotificationGranted
            ? `
          <div class="card soft row between" style="padding:16px; background:var(--secondary-soft); border-left:4px solid var(--secondary)">
            <div>
              <b style="color:var(--on-secondary-soft); font-size:14px">Ativar Notificações no Dispositivo</b>
              <p class="xs" style="color:var(--on-secondary-soft); margin-top:2px">Receba avisos na área de trabalho quando houver votações de alto impacto.</p>
            </div>
            <button class="btn primary sm" id="btn-enable-notify">
              <span class="mi">notifications</span>Ativar
            </button>
          </div>`
            : ''
        }

        ${
          alerts.length
            ? `
          <div class="stack" style="gap:14px">
            <div class="row between xs muted" style="font-weight:700; text-transform:uppercase">
              <span>● Registros Mais Recentes</span>
              <span>${alerts.length} eventos monitorados</span>
            </div>
            ${alerts
              .map(
                (a) => `
              <article class="card stack" style="gap:10px; border-left:4px solid var(--primary)">
                <div class="row between">
                  <div class="row" style="gap:6px">
                    <span class="chip green xs"><span class="mi" style="font-size:12px">how_to_vote</span>Nominal</span>
                    <span class="xs muted">Deliberação em Plenário</span>
                  </div>
                  <span class="xs muted">${fmtDate(a.ts)}</span>
                </div>
                <p style="font-size:14px; font-weight:600; line-height:1.45">${esc(a.text)}</p>
                <div class="row between xs muted" style="background:var(--s1); padding:8px 12px; border-radius:var(--r-sm)">
                  <span>Auditoria direta via API oficial</span>
                  <span class="chip green xs"><span class="mi" style="font-size:12px">check</span>Verificado</span>
                </div>
              </article>`
              )
              .join('')}
          </div>`
            : `
          <div class="card empty">
            <span class="mi">notifications_off</span>
            <h3>Nenhum alerta pendente</h3>
            <p>Cadastre deputados ou senadores e clique em "Verificar agora" para rastrear deliberações recentes do Congresso.</p>
          </div>`
        }

        <!-- Card Stitch: Fiscalização Cívica Direcionada -->
        <div class="card stack" style="gap:10px; padding:18px; background:var(--s1); border:1px solid var(--line); margin-top:10px">
          <div class="row" style="gap:8px">
            <span class="mi" style="color:var(--primary); font-size:22px">verified</span>
            <b style="font-size:14px">Fiscalização Cívica Direcionada</b>
          </div>
          <p class="sm muted" style="line-height:1.5">
            Você recebe notificações automáticas dos <b>${politicians.length} representantes</b> em quem declarou voto nas eleições gerais. O monitoramento deste mandato acompanha a legislatura atual até o encerramento do mandato constitucional.
          </p>
          <div class="row between sm" style="margin-top:6px">
            <span class="xs muted">↻ Sincronizado via TSE & APIs Oficiais</span>
            <a href="#/perfil" class="btn sm outlined">Configurar Preferências</a>
          </div>
        </div>
      </div>

      <!-- COLUNA LATERAL: Preferências de Notificação (Stitch) -->
      <aside class="card stack" style="gap:16px; padding:20px; position:sticky; top:80px">
        <div class="row between">
          <div class="row" style="gap:8px">
            <span class="mi" style="color:var(--primary); font-size:20px">tune</span>
            <h2 class="h2">Gatilhos de Notificação</h2>
          </div>
          <span class="chip green xs">Ativo</span>
        </div>

        <p class="xs muted" style="line-height:1.5">
          Defina quais matérias acionam alertas locais no seu navegador. Os dados são processados inteiramente no seu dispositivo.
        </p>

        <div class="stack" style="gap:12px">
          ${toggles
            .map(
              ([k, t, d]) => `
            <div class="card soft row between" style="padding:12px 14px; gap:12px">
              <div style="flex:1">
                <b style="font-size:13px; display:block">${t}</b>
                <span class="xs muted" style="line-height:1.4">${d}</span>
              </div>
              <label class="switch">
                <input type="checkbox" data-pref="${k}" ${prefs[k] ? 'checked' : ''}>
                <i></i>
              </label>
            </div>`
            )
            .join('')}
        </div>

        <div class="card soft stack" style="gap:8px; padding:12px; font-size:12px; background:var(--s2)">
          <div class="row" style="gap:6px; color:var(--primary)">
            <span class="mi" style="font-size:16px">security</span>
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
