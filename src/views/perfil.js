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
        <div class="row u-gap-8 u-mb-4">
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
    <div class="card stack u-gap-18 u-p-24 u-mb-20 u-bl-4-solid-primary">
      <div class="row between">
        <div class="row nowrap u-gap-16">
          <div class="u-width-64 u-height-64 u-br-50pct u-bg-f4e9bb u-d-grid u-place-items-center u-c-fff u-fs-24 u-fw-700 u-flex-shrink-0">
            <span class="mi fill u-fs-32">person</span>
          </div>
          <div>
            <div class="row u-gap-8">
              <h2 class="u-fs-20 u-fw-800">Seu Perfil</h2>
            </div>
            <p class="sm muted u-mt-2">
              Domicílio eleitoral: <b>${esc(s.domicile?.city || 'São Paulo')} - ${esc(s.domicile?.state || 'SP')}</b>
            </p>
            <span class="xs muted">Usado para sugerir a Assembleia e a Câmara Municipal da sua região.</span>
          </div>
        </div>

        <div class="row u-gap-8">
          <button class="btn outlined sm" id="btn-edit-domicile">
            <span class="mi">edit_location_alt</span>Alterar Município
          </button>
        </div>
      </div>

      <!-- Métricas Cívicas do Cidadão (Stitch) -->
      <div class="grid u-cols-3760d4 u-gap-10 u-bt-1-solid-line u-pt-16">
        <div class="stat">
          <span>Mandatos Vigiados</span>
          <b>${polCount} / 5</b>
          <span class="xs muted u-tt-none">${Math.round((polCount / 5) * 100)}% de cobertura eleitoral</span>
        </div>
        <div class="stat">
          <span>Alertas Registrados</span>
          <b>${alertCount}</b>
          <span class="xs muted u-tt-none">Votações encontradas em "Verificar agora"</span>
        </div>
      </div>

      <!-- Termômetro de Vigilância Cívica e Metas -->
      <div class="card stack u-gap-10 u-bg-s1 u-p-16 u-br-r u-border-1-solid-line u-mt-4">
        <div class="row between">
          <div class="row u-gap-8">
            <span class="mi u-c-primary u-fs-20">verified_user</span>
            <b class="u-fs-13_5">Seu Acompanhamento</b>
          </div>
          <span class="chip green"><b>${civicScore}/100 pts</b> · ${civicScore >= 80 ? 'Vigilância Alta' : civicScore >= 50 ? 'Vigilância Moderada' : 'Iniciante'}</span>
        </div>
        <div class="bar u-height-8"><i data-w="${civicScore}"></i></div>
        <div class="row between sm muted">
          <span>${filledRoles} de 5 esferas sob acompanhamento direto</span>
          <span>${alertCount ? 'Alertas verificados' : 'Verifique alertas para completar'}</span>
        </div>
      </div>
    </div>

    <div class="grid g2 u-ai-start">
      
      <!-- COLUNA 1: Votos Cadastrados & Ciclo de Mandato -->
      <div class="stack">
        
        <!-- Lista dos Votos Monitorados Atualmente -->
        <div class="card stack u-gap-14 u-p-20">
          <div class="row between">
            <div>
              <h2 class="h2">Meus Votos Declarados e Cadastrados</h2>
              <span class="xs muted">${polCount} representantes vinculados para auditoria e alertas nominais</span>
            </div>
          </div>

          ${
            polCount
              ? `
            <div class="stack u-gap-10">
              ${s.politicians
                .map(
                  (p) => `
                <div class="card soft row between sm u-p-10-14 u-br-r-md u-bg-s2">
                  <div class="row nowrap u-gap-12">
                    <div class="u-width-36 u-height-36 u-br-50pct u-bg-card u-d-grid u-place-items-center u-fw-700">
                      ${p.name.charAt(0)}
                    </div>
                    <div>
                      <b class="u-fs-13_5">${esc(p.name)}</b><br>
                      <span class="xs muted">${esc(p.party)}/${esc(p.uf)} • ${esc(ROLES[p.roleKey]?.label || 'Mandato')}</span>
                    </div>
                  </div>
                  <div class="row u-gap-6">
                    <span class="chip xs">${p.camaraId ? 'Câmara' : p.senadoId ? 'Senado' : p.tse ? 'TSE' : 'Manual'}</span>
                  </div>
                </div>`
                )
                .join('')}
            </div>`
              : `
            <div class="empty u-p-28">
              <span class="mi">how_to_vote</span>
              <h3 class="u-fs-14">Nenhum voto declarado ainda</h3>
              <p class="xs muted">Cadastre seus votos para começar a acompanhar os mandatos.</p>
            </div>`
          }

          <div class="row between sm u-bg-s1 u-p-10-14 u-br-r-sm u-mt-6">
            <span class="muted">Deseja alterar ou substituir algum representante?</span>
            <button class="btn sm primary" id="btn-substituir-pol">Substituir Político</button>
          </div>
        </div>

        <!-- Domicílio Eleitoral Form -->
        <div class="card stack u-gap-12 u-p-18" id="card-domicile">
          <div class="row between">
            <h2 class="h2">Domicílio Eleitoral Federativo</h2>
            <span class="chip blue xs">Filtro Regional</span>
          </div>
          <p class="xs muted">
            Priorize deputados estaduais e vereadores do seu Estado e Município de residência.
          </p>
          <div class="grid g2 u-gap-10">
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
          <button class="btn sm primary u-align-self-flex-start" id="btn-save-domicile">
            <span class="mi">check</span>Salvar Domicílio
          </button>
        </div>

      </div>

      <!-- COLUNA 2: Segurança Criptográfica & LGPD Cívica (Stitch) -->
      <div class="stack">
        
        <div class="card stack u-gap-14 u-p-20 u-bl-4-solid-primary">
          <div class="row between">
            <div class="row u-gap-8">
              <span class="mi u-c-primary u-fs-22">shield</span>
              <h2 class="h2">Privacidade & LGPD</h2>
            </div>
          </div>

          <p class="sm muted u-lh-1_5">
            O Monitor Cidadão opera sob o princípio da <b>minimização absoluta de dados</b> (Art. 6º, III da Lei 13.709/18). Suas escolhas eleitorais e histórico de auditoria são dados pessoais sensíveis e <b>nunca são transmitidos para servidores remotos</b>.
          </p>

          <div class="stack u-gap-8 u-mt-4">
            <b class="xs muted u-tt-uppercase u-fw-700">Backup & Portabilidade (Art. 18 LGPD):</b>
            <div class="row u-gap-8">
              <button class="btn sm outlined u-flex-1" id="export">
                <span class="mi">download</span>Exportar JSON
              </button>
              <label class="btn sm outlined u-flex-1 u-cursor-pointer u-ta-center">
                <span class="mi">upload</span>Restaurar
                <input type="file" id="import-file" accept=".json" class="u-d-none">
              </label>
            </div>
          </div>

          <div class="u-bt-1-solid-line u-pt-14 u-mt-4">
            <button class="btn danger sm u-width-100pct" id="purge">
              <span class="mi">delete_forever</span>Expurgar Todos os Dados Locais
            </button>
            <span class="xs muted u-d-block u-ta-center u-mt-6">
              Apaga permanentemente todos os registros e zera a memória local.
            </span>
          </div>
        </div>

        <!-- Card de Conformidade Legal -->
        <div class="card soft stack u-gap-10 u-p-16">
          <h3 class="h3">De onde vêm os dados</h3>
          <div class="stack xs muted u-gap-6">
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
