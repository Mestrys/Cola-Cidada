// Cadastro e Visualização da Cola Eleitoral — Conforme Tela Stitch (5910ab54b8674598be3451b715b588d2)
import { store } from '../store.js';
import { modal, esc, avatar, ROLES, toast } from '../ui.js';
import { openPoliticianModal } from './addPolitician.js';

export function openColaEleitoralModal() {
  const { el, close } = modal(`
    <div class="row between no-print">
      <div class="row" style="gap:8px">
        <span class="mi" style="color:var(--primary); font-size:24px">how_to_vote</span>
        <div>
          <h2 class="h2" style="font-size:17px">Minha Cola Eleitoral</h2>
          <span class="sm muted">Cédula Cívica de Mandatos Ativos</span>
        </div>
      </div>
      <button class="btn icon ghost" data-close aria-label="Fechar"><span class="mi">close</span></button>
    </div>

    <div class="card soft stack" style="gap:6px; background:var(--primary-soft); color:var(--on-primary-soft); padding:12px 14px; margin-top:10px">
      <div class="row" style="gap:6px; font-weight:700; font-size:12.5px">
        <span class="mi" style="font-size:16px">lock</span>
        <span>Privacidade Garantida (LGPD)</span>
      </div>
      <p style="font-size:12px; line-height:1.4">
        Sua cola eleitoral fica 100% gravada neste navegador. Ninguém além de você sabe em quem você votou ou quem você fiscaliza.
      </p>
    </div>

    <div id="cola-slots-container" class="stack" style="gap:10px; margin-top:12px"></div>

    <div class="row between" style="margin-top:14px; padding-top:12px; border-top:1px solid var(--line)">
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
        <div class="card stack" style="padding:12px 14px; background:${matched ? 'var(--card)' : 'var(--s1)'}; border: 1px solid ${matched ? 'var(--outline-variant)' : 'var(--line)'}; border-left: 4px solid ${matched ? 'var(--primary)' : 'var(--s3)'}">
          <div class="row between" style="flex-wrap:nowrap">
            <div class="row" style="gap:10px; flex-wrap:nowrap">
              ${
                matched
                  ? avatar(matched)
                  : `<div style="width:42px; height:42px; border-radius:50%; background:var(--s2); display:grid; place-items:center; color:var(--muted)"><span class="mi" style="font-size:20px">person_outline</span></div>`
              }
              <div>
                <span class="xs muted" style="font-weight:700; text-transform:uppercase; letter-spacing:0.3px">${role.label}</span>
                <h4 style="font-size:14px; margin:2px 0 0; color:var(--text)">
                  ${matched ? esc(matched.name) : '<span class="muted" style="font-weight:400; font-style:italic">Não cadastrado na cola</span>'}
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

            <div class="row" style="gap:6px">
              ${
                matched
                  ? `
                <button class="btn sm ghost icon" data-remove-slot="${matched.id}" title="Desvincular da cola" aria-label="Remover"><span class="mi" style="font-size:18px; color:var(--error)">delete</span></button>`
                  : `
                <button class="btn sm primary" data-fill-slot="${role.key}"><span class="mi" style="font-size:15px">add</span>Preencher</button>`
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
