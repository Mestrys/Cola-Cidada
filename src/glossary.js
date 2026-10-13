// Glossário Cívico do Cidadão — Tradução didática dos termos legislativos e orçamentários.
import { modal, esc } from './ui.js';

export const GLOSSARY_TERMS = [
  {
    term: 'Quórum Qualificado (3/5)',
    category: 'Votação',
    summary: 'Exigência de votos para aprovar Propostas de Emenda à Constituição (PEC).',
    explanation: 'Na Câmara, são necessários ao menos 308 deputados (de 513). No Senado, 49 senadores (de 81), em dois turnos de votação em cada casa.',
  },
  {
    term: 'Obstrução Parlamentar',
    category: 'Estratégia',
    summary: 'Manobra regimental para impedir ou atrasar a votação de um projeto.',
    explanation: 'Os partidos orientam seus membros a não registrar presença ou a apresentar requerimentos regimentais para forçar o governo a negociar concessões.',
  },
  {
    term: 'Jabuti (Contrabando Legislativo)',
    category: 'Alerta',
    summary: 'Artigo ou emenda inserida no projeto sem relação com o tema original.',
    explanation: 'Expressão popular que ilustra que "jabuti não sobe em árvore: ou foi enchente ou mão de gente". O STF já declarou inconstitucional a inclusão de temas estranhos em MPs.',
  },
  {
    term: 'Substitutivo',
    category: 'Tramitação',
    summary: 'Novo texto que substitui integralmente a proposta inicial.',
    explanation: 'Quando o relator de uma comissão elabora um parecer alternativo que reformula todo o projeto original. Se aprovado, é o substitutivo que segue para sanção.',
  },
  {
    term: 'Destaque para Votação em Separado (DVS)',
    category: 'Plenário',
    summary: 'Votação individual de um trecho específico de um projeto.',
    explanation: 'Permite que os parlamentares excluam ou preservem um artigo controverso sem derrubar o projeto de lei inteiro.',
  },
  {
    term: 'Emenda Pix (Transferência Especial)',
    category: 'Orçamento',
    summary: 'Repasse direto de verba federal para prefeituras e governos estaduais.',
    explanation: 'Criada pela Emenda Constitucional 105/2019, o dinheiro cai diretamente na conta do município sem necessidade de convênio prévio com ministérios, mas sujeito a fiscalização do TCU/CGU.',
  },
  {
    term: 'Medida Provisória (MPV)',
    category: 'Poder Executivo',
    summary: 'Norma com força imediata de lei editada pelo Presidente da República.',
    explanation: 'Tem vigência de 60 dias (prorrogável por mais 60). Precisa ser aprovada pela Câmara e pelo Senado; se não for votada a tempo, perde a eficácia (caduca).',
  },
  {
    term: 'Cota Parlamentar (CEAP)',
    category: 'Finanças',
    summary: 'Cota para o Exercício da Atividade Parlamentar.',
    explanation: 'Verba mensal de reembolso destinada a custear passagens aéreas, combustível, telefonia, locação de escritórios e consultorias ligadas ao exercício do mandato.',
  },
];

export function openGlossaryModal() {
  const { el } = modal(`
    <div class="row between">
      <div class="row">
        <span class="mi" style="color:var(--primary); font-size:24px">menu_book</span>
        <h3 class="h2" style="font-size:16px">Glossário Cívico do Cidadão</h3>
      </div>
      <button class="btn icon ghost" data-close aria-label="Fechar"><span class="mi">close</span></button>
    </div>

    <div style="margin:4px 0 8px">
      <input class="input" id="q-glossary" placeholder="Pesquisar termo (ex.: jabuti, quórum, obstrução, emenda)…" autocomplete="off" style="font-size:13px">
    </div>

    <div id="glossary-list" class="stack" style="gap:10px; max-height:60vh; overflow-y:auto; padding-right:4px">
      ${renderTerms(GLOSSARY_TERMS)}
    </div>
  `);

  const listEl = el.querySelector('#glossary-list');
  const inputEl = el.querySelector('#q-glossary');

  inputEl.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    const filtered = GLOSSARY_TERMS.filter(
      (t) => t.term.toLowerCase().includes(q) || t.summary.toLowerCase().includes(q) || t.explanation.toLowerCase().includes(q)
    );
    listEl.innerHTML = filtered.length
      ? renderTerms(filtered)
      : '<p class="muted">Nenhum termo encontrado para essa busca.</p>';
  });
}

function renderTerms(items) {
  return items
    .map(
      (t) => `
    <div class="card soft stack" style="gap:6px; padding:12px">
      <div class="row between">
        <b style="font-size:14px; color:var(--text)">${esc(t.term)}</b>
        <span class="chip blue">${esc(t.category)}</span>
      </div>
      <p style="font-size:13px; font-weight:500; color:var(--text)">${esc(t.summary)}</p>
      <p class="sm muted" style="line-height:1.4">${esc(t.explanation)}</p>
    </div>`
    )
    .join('');
}
