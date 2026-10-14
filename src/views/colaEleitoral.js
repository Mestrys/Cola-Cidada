// Cadastro e Visualização da Cola Eleitoral — Conforme Tela Stitch (5910ab54b8674598be3451b715b588d2)
import { store } from '../store.js';
import { modal, esc, avatar, ROLES, toast } from '../ui.js';
import { openPoliticianModal } from './addPolitician.js';

export function openColaEleitoralModal() {
  const { el, close } = modal(`
    <div class="row between no-print">
      <div class="row u-gap-8">
        <span class="mi u-c-primary u-fs-24">how_to_vote</span>
        <div>
          <h2 class="h2 u-fs-17">Minha Cola Eleitoral</h2>
          <span class="sm muted">Cédula Cívica de Mandatos Ativos</span>
        </div>
      </div>
      <button class="btn icon ghost" data-close aria-label="Fechar"><span class="mi">close</span></button>
    </div>

    <div class="card soft stack u-gap-6 u-bg-primary-soft u-c-on-primary-soft u-p-12-14 u-mt-10">
      <div class="row u-gap-6 u-fw-700 u-fs-12_5">
        <span class="mi u-fs-16">lock</span>
        <span>Privacidade Garantida (LGPD)</span>
      </div>
      <p class="u-fs-12 u-lh-1_4">
        Sua cola eleitoral fica 100% gravada neste navegador. Ninguém além de você sabe em quem você votou ou quem você fiscaliza.
      </p>
    </div>

    <div id="cola-slots-container" class="stack u-gap-10 u-mt-12"></div>

    <div class="row between u-mt-14 u-pt-12 u-bt-1-solid-line">
      <span class="sm muted" id="cola-completion-stats"></span>
      <button class="btn primary sm" id="btn-add-any"><span class="mi">person_add</span>Adicionar Outro Representante</button>
    </div>
  `);

  const container = el.querySelector('#cola-slots-container');
  const statsEl = el.querySelector('#cola-completion-stats');

  const electoralRoles = [
    { key: 'dep-federal', label: 'Deputado(a) Federal', sphere: 'Federal · Câmara', sourceTarget: 'camara' },
    { key: 'senador', label: 'Senador(a) da República', sphere: 'Federal · Senado', sourceTarget: 'senado' },
    { key: 'dep-estadual', label: 'Deputado(a) Estadual', sphere: 'Estadual · Assembleia Legislativa', sourceTarget: 'estadual' },
    { key: 'vereador', label: 'Vereador(a) Municipal', sphere: 'Municipal · Câmara Municipal da capital', sourceTarget: 'municipal' },
    { key: 'governador', label: 'Governador(a) do Estado', sphere: 'Executivo Estadual', sourceTarget: 'manual' },
    { key: 'presidente', label: 'Presidente da República', sphere: 'Executivo Federal', sourceTarget: 'manual' },
  ];

  function renderSlots() {
    const { politicians } = store.get();
    let filledCount = 0;

    container.innerHTML = electoralRoles
      .map((role) => {
        // Encontra político preenchido com esse cargo
        const matched = politicians.find((p) => p.roleKey === role.key || p.role === role.key);
        if (matched) filledCount++;

        return `
        <div class="card stack cola-item${matched ? ' matched' : ''}">
          <div class="row between u-fwrap-nowrap">
            <div class="row u-gap-10 u-fwrap-nowrap">
              ${
                matched
                  ? avatar(matched)
                  : `<div class="u-width-42 u-height-42 u-br-50pct u-bg-s2 u-d-grid u-place-items-center u-c-muted"><span class="mi u-fs-20">person_outline</span></div>`
              }
              <div>
                <span class="xs muted u-fw-700 u-tt-uppercase u-ls-0_3">${role.label}</span>
                <h4 class="u-fs-14 u-m-2-0-0 u-c-text">
                  ${matched ? esc(matched.name) : '<span class="muted u-fw-400 u-font-style-italic">Não cadastrado na cola</span>'}
                </h4>
                <span class="xs muted">
                  ${
                    matched
                      ? `${esc(matched.party || '-')}${matched.uf ? '/' + esc(matched.uf) : ''} • Mandato até ${matched.mandateEnd?.slice(0, 4) || '2026'}`
                      : role.sphere
                  }
                </span>
              </div>
            </div>

            <div class="row u-gap-6">
              ${
                matched
                  ? `
                <button class="btn sm ghost icon" data-remove-slot="${matched.id}" title="Desvincular da cola" aria-label="Remover"><span class="mi u-fs-18 u-c-error">delete</span></button>`
                  : `
                <button class="btn sm primary" data-fill-slot="${role.key}"><span class="mi u-fs-15">add</span>Preencher</button>`
              }
            </div>
          </div>
        </div>
      `;
      })
      .join('');

    statsEl.textContent = `${filledCount} de ${electoralRoles.length} cargos preenchidos na sua cola`;

    // Vincular botões de preenchimento
    container.querySelectorAll('[data-fill-slot]').forEach((b) => {
      b.onclick = () => {
        close();
        openPoliticianModal();
      };
    });

    container.querySelectorAll('[data-remove-slot]').forEach((b) => {
      b.onclick = () => {
        const id = b.dataset.removeSlot;
        store.removePolitician(id);
        toast('Candidato removido da cola.');
        renderSlots();
      };
    });
  }

  el.querySelector('#btn-add-any').onclick = () => {
    close();
    openPoliticianModal();
  };

  renderSlots();
}
