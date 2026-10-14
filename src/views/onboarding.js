// Onboarding Cívico Interativo — Conforme Tela Stitch (66e9007f27e04f3583b2b4e94108ef14)
import { store } from '../store.js';
import { modal, esc, toast } from '../ui.js';
import { openPoliticianModal } from './addPolitician.js';

export function openOnboardingModal(force = false) {
  const s = store.get();
  if (!force && s.onboardingDone) return;

  let currentStep = 0;
  const steps = [
    {
      icon: 'balance',
      tag: 'TRANSPARÊNCIA CÍVICA',
      title: 'Seja bem-vindo ao Monitor Cidadão',
      desc: 'Transforme sua cola eleitoral em acompanhamento contínuo de mandato. Fiscalize quem você elegeu com dados oficiais da Câmara, do Senado e do TSE.',
      bulletTitle: 'O que você vai poder fazer:',
      bullets: [
        { icon: 'how_to_vote', text: 'Cadastrar os candidatos que você votou ou deseja auditar.' },
        { icon: 'receipt_long', text: 'Consultar notas fiscais e gastos da cota parlamentar (CEAP) dos deputados federais.' },
        { icon: 'verified', text: 'Comparar votações nominais oficiais com a sua própria convicção.' },
      ],
      actionLabel: 'Continuar Apresentação',
    },
    {
      icon: 'shield',
      tag: 'PRIVACIDADE RADICAL (LGPD)',
      title: 'Sua escolha política é um dado sensível',
      desc: 'Nos termos do Art. 5º, inciso II da Lei Geral de Proteção de Dados (LGPD), convicção política é dado pessoal sensível. Por isso, nossa arquitetura não utiliza servidores de coleta.',
      bulletTitle: 'Garantias do Monitor Cidadão:',
      bullets: [
        { icon: 'lock', text: '100% Armazenado Localmente: Seus votos e pesquisas ficam apenas neste dispositivo.' },
        { icon: 'public_off', text: 'Zero Rastreamento: Nenhum analítico ou perfil comportamental é criado.' },
        { icon: 'delete_forever', text: 'Expurgo Sob Demanda: Você pode apagar todos os registros em 1 clique.' },
      ],
      actionLabel: 'Entendi, ver fontes oficiais',
    },
    {
      icon: 'account_balance',
      tag: 'DADOS ABERTOS OFICIAIS',
      title: 'Conexão Direta com os Poderes',
      desc: 'Todas as informações exibidas são consumidas diretamente dos portais da transparência e de Dados Abertos governamentais.',
      bulletTitle: 'Fontes Integradas:',
      bullets: [
        { icon: 'account_balance', text: 'Câmara dos Deputados & Senado Federal (Votações Nominais e CEAP).' },
        { icon: 'how_to_reg', text: 'Tribunal Superior Eleitoral (TSE / DivulgaCandContas: patrimônio e financiamento).' },
        { icon: 'domain', text: 'Assembleias Legislativas dos 26 estados e do DF e Câmaras Municipais das capitais (dados oficiais do TSE).' },
      ],
      actionLabel: 'Começar a Monitorar Agora',
    },
  ];

  const { el, close } = modal(`
    <div id="onboarding-container" class="stack u-gap-20 u-ta-left"></div>
  `);

  const container = el.querySelector('#onboarding-container');

  function renderStep(idx) {
    const step = steps[idx];
    const isLast = idx === steps.length - 1;

    container.innerHTML = `
      <div class="row between no-print">
        <div class="row u-gap-8">
          <span class="chip green">
            <span class="mi u-fs-14">${step.icon}</span>
            <span>${step.tag}</span>
          </span>
          <span class="sm muted">Passo ${idx + 1} de ${steps.length}</span>
        </div>
        <button class="btn icon ghost" id="skip-onboarding" title="Pular introdução" aria-label="Fechar">
          <span class="mi">close</span>
        </button>
      </div>

      <div class="stack u-gap-10 u-mt-4">
        <h2 class="h2 u-fs-20 u-lh-1_25">${step.title}</h2>
        <p class="u-fs-13_5 u-lh-1_5 u-c-text">${step.desc}</p>
      </div>

      <div class="card soft stack u-gap-10 u-bg-s1 u-p-16 u-br-r">
        <b class="u-fs-12_5 u-c-text u-tt-uppercase u-ls-0_3">${step.bulletTitle}</b>
        <div class="stack u-gap-8">
          ${step.bullets
            .map(
              (b) => `
            <div class="row u-ai-flex-start u-gap-10 u-fwrap-nowrap">
              <span class="mi u-c-primary u-fs-18 u-mt-2">${b.icon}</span>
              <span class="u-fs-13 u-lh-1_4">${esc(b.text)}</span>
            </div>`
            )
            .join('')}
        </div>
      </div>

      <!-- Indicador de Passos (Dots) -->
      <div class="row between u-mt-8">
        <div class="row u-gap-6">
          ${steps
            .map(
              (_, i) => `
            <span class="step-dot${i === idx ? ' on' : ''}"></span>`
            )
            .join('')}
        </div>

        <div class="row u-gap-8">
          ${
            idx > 0
              ? `<button class="btn sm" id="btn-prev-step"><span class="mi">arrow_back</span>Voltar</button>`
              : ''
          }
          <button class="btn primary sm" id="btn-next-step">
            <span>${step.actionLabel}</span>
            <span class="mi">${isLast ? 'check_circle' : 'arrow_forward'}</span>
          </button>
        </div>
      </div>
    `;

    container.querySelector('#skip-onboarding').onclick = () => {
      store.setOnboardingDone(true);
      close();
    };

    const btnPrev = container.querySelector('#btn-prev-step');
    if (btnPrev) {
      btnPrev.onclick = () => {
        if (currentStep > 0) {
          currentStep--;
          renderStep(currentStep);
        }
      };
    }

    container.querySelector('#btn-next-step').onclick = () => {
      if (isLast) {
        store.setOnboardingDone(true);
        close();
        toast('Bem-vindo! Adicione seus representantes para começar.', 'success');
        openPoliticianModal();
      } else {
        currentStep++;
        renderStep(currentStep);
      }
    };
  }

  renderStep(currentStep);
}
