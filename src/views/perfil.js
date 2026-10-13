import { store } from '../store.js';
import { toast, esc, brl, $, ROLES } from '../ui.js';
import { FEDERATION_UNITS } from '../api.js';
import { openPoliticianModal } from './addPolitician.js';
import { openOnboardingModal } from './onboarding.js';
import { openColaEleitoralModal } from './colaEleitoral.js';

export function render(root) {
  const s = store.get();
  const polCount = s.politicians.length;
  const alertCount = s.alerts.length;
  const filledRoles = new Set(s.politicians.map((p) => p.roleKey || p.role)).size;
  const civicScore = Math.min(100, Math.round((filledRoles / 5) * 75 + (s.alerts.length > 0 ? 25 : 0)));

  root.innerHTML = `
    <!-- Top Header do Perfil (Estilo Stitch) -->
    <div class="top">
      <div>
        <div class="row" style="gap:8px; margin-bottom:4px">
          <span class="chip green xs">GOVERNANÇA & LGPD</span>
          <span class="xs muted">Painel Individual de Auditoria</span>
        </div>
        <h1>Perfil do Cidadão & Governança</h1>
        <p>Garantia de soberania de dados pessoais (Art. 5º da LGPD) e fiscalização do ciclo eleitoral em vigor.</p>
      </div>
      <div class="row">
        <button class="btn outlined" id="btn-rever-onboarding"><span class="mi">help_outline</span>Guia Inicial</button>
        <button class="btn outlined" id="btn-cola-eleitoral"><span class="mi">how_to_vote</span>Minha Cola</button>
        <button class="btn outlined" id="btn-export-top"><span class="mi">download</span>Backup JSON</button>
        <button class="btn primary" id="btn-retificar"><span class="mi">person_add</span>Seguir Político</button>
      </div>
    </div>

    <!-- 1. Card Principal do Eleitor (Conforme Stitch) -->
    <div class="card stack" style="gap:18px; padding:24px; margin-bottom:20px; border-left:4px solid var(--primary)">
      <div class="row between">
        <div class="row nowrap" style="gap:16px">
          <div style="width:64px; height:64px; border-radius:50%; background:linear-gradient(135deg, var(--primary-c), var(--secondary)); display:grid; place-items:center; color:#fff; font-size:24px; font-weight:700; flex-shrink:0">
            <span class="mi fill" style="font-size:32px">person</span>
          </div>
          <div>
            <div class="row" style="gap:8px">
              <h2 style="font-size:20px; font-weight:800">Seu Perfil</h2>
            </div>
            <p class="sm muted" style="margin-top:2px">
              Domicílio eleitoral: <b>${esc(s.domicile?.city || 'São Paulo')} - ${esc(s.domicile?.state || 'SP')}</b>
            </p>
            <span class="xs muted">Usado para sugerir a Assembleia e a Câmara Municipal da sua região.</span>
          </div>
        </div>

        <div class="row" style="gap:8px">
          <button class="btn outlined sm" id="btn-edit-domicile">
            <span class="mi">edit_location_alt</span>Alterar Município
          </button>
        </div>
      </div>

      <!-- Métricas Cívicas do Cidadão (Stitch) -->
      <div class="grid" style="grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px; border-top:1px solid var(--line); padding-top:16px">
        <div class="stat">
          <span>Mandatos Vigiados</span>
          <b>${polCount} / 5</b>
          <span class="xs muted" style="text-transform:none">${Math.round((polCount / 5) * 100)}% de cobertura eleitoral</span>
        </div>
        <div class="stat">
          <span>Alertas Registrados</span>
          <b>${alertCount}</b>
          <span class="xs muted" style="text-transform:none">Votações encontradas em "Verificar agora"</span>
        </div>
      </div>

      <!-- Termômetro de Vigilância Cívica e Metas -->
      <div class="card stack" style="gap:10px; background:var(--s1); padding:16px; border-radius:var(--r); border:1px solid var(--line); margin-top:4px">
        <div class="row between">
          <div class="row" style="gap:8px">
            <span class="mi" style="color:var(--primary); font-size:20px">verified_user</span>
            <b style="font-size:13.5px">Seu Acompanhamento</b>
          </div>
          <span class="chip green"><b>${civicScore}/100 pts</b> · ${civicScore >= 80 ? 'Vigilância Alta' : civicScore >= 50 ? 'Vigilância Moderada' : 'Iniciante'}</span>
        </div>
        <div class="bar" style="height:8px"><i style="width:${civicScore}%"></i></div>
        <div class="row between sm muted">
          <span>${filledRoles} de 5 esferas sob acompanhamento direto</span>
          <span>${alertCount ? 'Alertas verificados' : 'Verifique alertas para completar'}</span>
        </div>
      </div>
    </div>

    <div class="grid g2" style="align-items:start">
      
      <!-- COLUNA 1: Votos Cadastrados & Ciclo de Mandato -->
      <div class="stack">
        
        <!-- Lista dos Votos Monitorados Atualmente -->
        <div class="card stack" style="gap:14px; padding:20px">
          <div class="row between">
            <div>
              <h2 class="h2">Meus Votos Declarados e Cadastrados</h2>
              <span class="xs muted">${polCount} representantes vinculados para auditoria e alertas nominais</span>
            </div>
          </div>

          ${
            polCount
              ? `
            <div class="stack" style="gap:10px">
              ${s.politicians
                .map(
                  (p) => `
                <div class="card soft row between sm" style="padding:10px 14px; border-radius:var(--r-md); background:var(--s2)">
                  <div class="row nowrap" style="gap:12px">
                    <div style="width:36px; height:36px; border-radius:50%; background:var(--card); display:grid; place-items:center; font-weight:700">
                      ${p.name.charAt(0)}
                    </div>
                    <div>
                      <b style="font-size:13.5px">${esc(p.name)}</b><br>
                      <span class="xs muted">${esc(p.party)}/${esc(p.uf)} • ${esc(ROLES[p.roleKey]?.label || 'Mandato')}</span>
                    </div>
                  </div>
                  <div class="row" style="gap:6px">
                    <span class="chip xs">${p.camaraId ? 'Câmara' : p.senadoId ? 'Senado' : p.tse ? 'TSE' : 'Manual'}</span>
                  </div>
                </div>`
                )
                .join('')}
            </div>`
              : `
            <div class="empty" style="padding:28px">
              <span class="mi">how_to_vote</span>
              <h3 style="font-size:14px">Nenhum voto declarado ainda</h3>
              <p class="xs muted">Cadastre seus votos para começar a acompanhar os mandatos.</p>
            </div>`
          }

          <div class="row between sm" style="background:var(--s1); padding:10px 14px; border-radius:var(--r-sm); margin-top:6px">
            <span class="muted">Deseja alterar ou substituir algum representante?</span>
            <button class="btn sm primary" id="btn-substituir-pol">Substituir Político</button>
          </div>
        </div>

        <!-- Domicílio Eleitoral Form -->
        <div class="card stack" id="card-domicile" style="gap:12px; padding:18px">
          <div class="row between">
            <h2 class="h2">Domicílio Eleitoral Federativo</h2>
            <span class="chip blue xs">Filtro Regional</span>
          </div>
          <p class="xs muted">
            Priorize deputados estaduais e vereadores do seu Estado e Município de residência.
          </p>
          <div class="grid g2" style="gap:10px">
            <div>
              <label class="label" for="dom-state">Estado (UF)</label>
              <select class="input" id="dom-state">
                ${FEDERATION_UNITS.map(
                  (u) => `<option value="${u.uf}" ${(s.domicile?.state || 'SP') === u.uf ? 'selected' : ''}>${esc(u.name)} (${u.uf})</option>`
                ).join('')}
              </select>
            </div>
            <div>
              <label class="label" for="dom-city">Município</label>
              <input class="input" id="dom-city" value="${esc(s.domicile?.city || 'São Paulo')}" placeholder="Ex.: São Paulo, Rio, BH, Niterói">
            </div>
          </div>
          <button class="btn sm primary" id="btn-save-domicile" style="align-self:flex-start">
            <span class="mi">check</span>Salvar Domicílio
          </button>
        </div>

      </div>

      <!-- COLUNA 2: Segurança Criptográfica & LGPD Cívica (Stitch) -->
      <div class="stack">
        
        <div class="card stack" style="gap:14px; padding:20px; border-left:4px solid var(--primary)">
          <div class="row between">
            <div class="row" style="gap:8px">
              <span class="mi" style="color:var(--primary); font-size:22px">shield</span>
              <h2 class="h2">Privacidade & LGPD</h2>
            </div>
          </div>

          <p class="sm muted" style="line-height:1.5">
            O Monitor Cidadão opera sob o princípio da <b>minimização absoluta de dados</b> (Art. 6º, III da Lei 13.709/18). Suas escolhas eleitorais e histórico de auditoria são dados pessoais sensíveis e <b>nunca são transmitidos para servidores remotos</b>.
          </p>

          <div class="stack" style="gap:8px; margin-top:4px">
            <b class="xs muted" style="text-transform:uppercase; font-weight:700">Backup & Portabilidade (Art. 18 LGPD):</b>
            <div class="row" style="gap:8px">
              <button class="btn sm outlined" id="export" style="flex:1">
                <span class="mi">download</span>Exportar JSON
              </button>
              <label class="btn sm outlined" style="flex:1; cursor:pointer; text-align:center">
                <span class="mi">upload</span>Restaurar
                <input type="file" id="import-file" accept=".json" style="display:none">
              </label>
            </div>
          </div>

          <div style="border-top:1px solid var(--line); padding-top:14px; margin-top:4px">
            <button class="btn danger sm" id="purge" style="width:100%">
              <span class="mi">delete_forever</span>Expurgar Todos os Dados Locais
            </button>
            <span class="xs muted" style="display:block; text-align:center; margin-top:6px">
              Apaga permanentemente todos os registros e zera a memória local.
            </span>
          </div>
        </div>

        <!-- Card de Conformidade Legal -->
        <div class="card soft stack" style="gap:10px; padding:16px">
          <h3 class="h3">De onde vêm os dados</h3>
          <div class="stack xs muted" style="gap:6px">
            <div>• <b>Dados abertos oficiais:</b> APIs da Câmara dos Deputados e do Senado Federal e arquivos públicos do TSE, disponibilizados com base na LAI (Lei 12.527/11).</div>
            <div>• <b>Sem servidor próprio:</b> o app consulta essas fontes direto do seu navegador; seus cadastros ficam só neste dispositivo.</div>
            <div>• <b>Funciona offline:</b> telas e dados já consultados ficam em cache no aparelho.</div>
          </div>
        </div>

      </div>

    </div>`;

  $('#btn-retificar', root).onclick = () => openPoliticianModal();
  $('#btn-substituir-pol', root).onclick = () => openPoliticianModal();
  $('#btn-rever-onboarding', root).onclick = () => openOnboardingModal(true);
  $('#btn-cola-eleitoral', root).onclick = () => openColaEleitoralModal();

  $('#btn-save-domicile', root).onclick = () => {
    const st = $('#dom-state', root)?.value || 'SP';
    const ct = $('#dom-city', root)?.value || 'São Paulo';
    store.setDomicile(st, ct);
    toast('Domicílio eleitoral atualizado!');
  };

  $('#btn-edit-domicile', root).onclick = () => {
    $('#dom-city', root)?.focus();
  };

  // Exportar Backup
  const handleExport = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([store.exportJson()], { type: 'application/json' }));
    a.download = `monitor-cidadao-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    toast('Backup exportado com sucesso.');
  };

  $('#export', root).onclick = handleExport;
  $('#btn-export-top', root).onclick = handleExport;

  // Importar Backup
  const importInput = $('#import-file', root);
  if (importInput) {
    importInput.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (text && store.importJson(text)) {
          toast('Dados restaurados com sucesso!');
          render(root);
        } else {
          toast('Arquivo de backup inválido.', 'error');
        }
      };
      reader.readAsText(file);
    };
  }

  // Expurgo LGPD
  $('#purge', root).onclick = () => {
    const ok = confirm(
      'Atenção (LGPD): Esta ação apagará permanentemente todos os políticos cadastrados, alertas e preferências salvas em cache neste dispositivo. Deseja prosseguir?'
    );
    if (ok) {
      store.purge();
      toast('Todos os dados locais foram expurgados.', 'delete');
      render(root);
    }
  };
}
