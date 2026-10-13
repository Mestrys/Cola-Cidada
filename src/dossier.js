import { modal, esc, brl, fmtDate, avatar, ROLES, mandateProgress, toast } from './ui.js';
import {
  deputyProfile,
  deputyExpenses,
  deputyPropositions,
  senatorVotes,
  getTseElectoralProfile,
} from './api.js';
import { deputyPlenaryStats, senatorPlenaryStats } from './plenary.js';
import { plenaryPanelHtml } from './views/plenaryPanel.js';

export async function openDossierModal(p) {
  const m = mandateProgress(p);

  const { el, close } = modal(`
    <div class="row between no-print">
      <div class="row">
        <span class="mi" style="color:var(--primary); font-size:24px">description</span>
        <h3 class="h2" style="font-size:16px">Dossiê Cívico de Prestação de Contas</h3>
      </div>
      <div class="row">
        <button class="btn primary sm" id="btn-print-dossier"><span class="mi">print</span>Imprimir / Salvar PDF</button>
        <button class="btn icon ghost" data-close aria-label="Fechar"><span class="mi">close</span></button>
      </div>
    </div>

    <div id="dossier-content" class="stack" style="margin-top:10px">
      <div class="row"><span class="spin"></span><span class="muted">Consolidando dados oficiais para o relatório…</span></div>
    </div>
  `);

  const dossierContent = el.querySelector('#dossier-content');
  const btnPrint = el.querySelector('#btn-print-dossier');

  try {
    let profile = null;
    let expenses = [];
    let propositions = [];
    let votes = [];
    let plenary = null;

    if (p.source === 'camara') {
      [profile, expenses, propositions, plenary] = await Promise.all([
        deputyProfile(p.camaraId).catch(() => null),
        deputyExpenses(p.camaraId, 80).catch(() => []),
        deputyPropositions(p.camaraId, 10).catch(() => []),
        deputyPlenaryStats(p.camaraId).catch(() => null),
      ]);
    } else if (p.source === 'senado') {
      [votes, plenary] = await Promise.all([
        senatorVotes(p.senadoId, 15).catch(() => []),
        senatorPlenaryStats(p.senadoId).catch(() => null),
      ]);
    }

    // Cálculo do Hash SHA-256 de integridade local
    const nowIso = new Date().toISOString();
    const payloadForHash = JSON.stringify({
      politicianId: p.id,
      name: p.name,
      party: p.party,
      uf: p.uf,
      timestamp: nowIso,
      expensesLength: expenses.length,
      propositionsLength: propositions.length,
      votesLength: votes.length,
      plenary: plenary && { a: plenary.attendance.rate, f: plenary.fidelity.rate },
    });
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payloadForHash));
    const sha256Hex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const tse = getTseElectoralProfile(p);
    const totalSpent = expenses.reduce((acc, x) => acc + (x.value || 0), 0);

    dossierContent.innerHTML = `
      <div class="dossier-paper stack" style="gap:16px; background:var(--card); border:1px solid var(--line); border-radius:14px; padding:24px">
        <!-- Cabeçalho Institucional -->
        <div class="row between" style="border-bottom:2px solid var(--primary); padding-bottom:12px">
          <div>
            <span class="sm" style="letter-spacing:1px; text-transform:uppercase; font-weight:700; color:var(--primary)">COLA-CIDADÃO · AUDITORIA CÍVICA</span>
            <h2 style="font-size:20px; font-weight:800; margin-top:2px">Relatório de Desempenho & Fiscalização de Mandato</h2>
            <span class="sm muted">Documento emitido diretamente pelo cidadão via Dados Abertos Oficiais</span>
          </div>
          <div style="text-align:right">
            <span class="chip green">57ª Legislatura</span><br>
            <span class="sm muted" style="display:inline-block; margin-top:4px">Emissão: ${new Date().toLocaleDateString('pt-BR')}</span>
          </div>
        </div>

        <!-- Identificação Parlamentar -->
        <div class="row" style="gap:18px; align-items:flex-start">
          ${avatar(p)}
          <div style="flex:1">
            <h3 style="font-size:18px; font-weight:700">${esc(p.name)}</h3>
            <p class="sm muted" style="margin-top:2px">
              <b>Cargo:</b> ${ROLES[p.roleKey]?.label || 'Parlamentar'} · <b>Partido:</b> ${esc(p.party || '—')} · <b>Estado/UF:</b> ${esc(p.uf || 'SP')}
            </p>
            ${
              profile?.civilName && profile.civilName !== p.name
                ? `<p class="sm muted"><b>Nome Civil Registrado:</b> ${esc(profile.civilName)}</p>`
                : ''
            }
            <div class="row sm" style="margin-top:6px; gap:16px">
              <span><b>Mandato:</b> ${m.pct}% cumprido</span>
              <span><b>Término Previsto:</b> ${m.end}</span>
              <span><b>Dias Restantes:</b> ${m.label}</span>
            </div>
          </div>
        </div>

        <!-- Seção: Origem Eleitoral (TSE) -->
        ${
          tse.available
            ? `
        <div class="stack" style="gap:8px; border-top:1px solid var(--line); padding-top:12px">
          <div class="row between">
            <h4 style="font-size:14px; text-transform:uppercase; font-weight:700; color:var(--text)">Origem Eleitoral (TSE)</h4>
            <span class="chip gold sm">Eleição ${tse.electionYear}</span>
          </div>
          <div class="row sm" style="gap:16px; flex-wrap:wrap">
            <span><b>Número de Urna:</b> <code style="font-weight:700; color:var(--primary)">${esc(tse.ballotNumber)}</code></span>
            <span><b>Resultado:</b> ${esc(tse.status)}</span>
            <span><b>Coligação/Federação:</b> ${esc(tse.electoralCoalition || (tse.isolatedParty ? 'Partido isolado' : '—'))}</span>
          </div>
          <div style="background:var(--s1); padding:10px; border-radius:8px">
            <span class="sm muted" style="display:block">Patrimônio declarado no registro de candidatura:</span>
            <b style="font-size:15px; color:var(--primary)">${tse.declaredAssets != null ? brl(tse.declaredAssets) : 'Não declarado'}</b>
          </div>
        </div>`
            : ''
        }

        <!-- Seção: Presença & Fidelidade (Câmara) -->
        ${
          plenary
            ? `
        <div class="stack" style="gap:8px; border-top:1px solid var(--line); padding-top:12px">
          <h4 style="font-size:14px; text-transform:uppercase; font-weight:700; color:var(--text)">Presença em Plenário & Fidelidade à Bancada</h4>
          ${plenaryPanelHtml(plenary)}
        </div>`
            : ''
        }

        <!-- Seção: Despesas da Cota Parlamentar (CEAP) -->
        ${
          expenses.length
            ? `
        <div class="stack" style="gap:8px; border-top:1px solid var(--line); padding-top:12px">
          <div class="row between">
            <h4 style="font-size:14px; text-transform:uppercase; font-weight:700; color:var(--text)">Auditoria Financeira da Cota (CEAP)</h4>
            <span class="sm" style="font-weight:700; color:var(--primary)">Total Auditado: ${brl(totalSpent)}</span>
          </div>
          <p class="sm muted">Amostra recente dos últimos ${expenses.length} comprovantes emitidos pelo gabinete:</p>
          <div class="stack" style="gap:4px">
            ${expenses
              .slice(0, 5)
              .map(
                (ex) => `
              <div class="row between sm" style="background:var(--s1); padding:6px 10px; border-radius:6px">
                <span class="truncate" style="max-width:320px">${esc(ex.supplier || ex.type)}</span>
                <span class="muted">${fmtDate(ex.date)}</span>
                <b>${brl(ex.value || 0)}</b>
              </div>`
              )
              .join('')}
          </div>
        </div>`
            : ''
        }

        <!-- Seção: Projetos de Lei de Autoria -->
        ${
          propositions.length
            ? `
        <div class="stack" style="gap:8px; border-top:1px solid var(--line); padding-top:12px">
          <h4 style="font-size:14px; text-transform:uppercase; font-weight:700; color:var(--text)">Projetos Autorais Recentes (PLs & PECs)</h4>
          <div class="stack" style="gap:6px">
            ${propositions
              .slice(0, 4)
              .map(
                (pr) => `
              <div class="stack" style="gap:2px; background:var(--s1); padding:8px 10px; border-radius:6px">
                <div class="row between sm">
                  <b>${esc(pr.type)} ${esc(pr.number)}/${esc(pr.year)}</b>
                  <span class="muted">${fmtDate(pr.date)}</span>
                </div>
                <p class="sm" style="color:var(--text); line-height:1.3">${esc(pr.summary)}</p>
              </div>`
              )
              .join('')}
          </div>
        </div>`
            : ''
        }

        <!-- Seção: Votações do Senado -->
        ${
          votes.length
            ? `
        <div class="stack" style="gap:8px; border-top:1px solid var(--line); padding-top:12px">
          <h4 style="font-size:14px; text-transform:uppercase; font-weight:700; color:var(--text)">Deliberações Nominais no Senado Federal</h4>
          <div class="stack" style="gap:6px">
            ${votes
              .slice(0, 5)
              .map(
                (v) => `
              <div class="row between sm" style="background:var(--s1); padding:8px 10px; border-radius:6px">
                <div style="flex:1">
                  <b>${esc(v.matter)}</b>
                  <p class="muted" style="margin-top:2px">${esc(v.summary.slice(0, 90))}…</p>
                </div>
                <span class="chip ${v.vote === 'Sim' ? 'green' : v.vote === 'Não' ? 'red' : 'gold'}" style="font-weight:700">${esc(v.vote)}</span>
              </div>`
              )
              .join('')}
          </div>
        </div>`
            : ''
        }

        <!-- Seção: Dados de Gabinete Estadual / Municipal -->
        ${
          (typeof p.source === 'string' && /^(al|cm)-/.test(p.source))
            ? `
        <div class="stack" style="gap:8px; border-top:1px solid var(--line); padding-top:12px">
          <h4 style="font-size:14px; text-transform:uppercase; font-weight:700; color:var(--text)">
            ${
              p.source.startsWith('al-')
                ? `Atuação Estadual · ${esc(p.house || p.uf || '')}`
                : `Atuação Municipal · ${esc(p.house || p.city || '')}`
            }
          </h4>
          <p class="sm"><b>Base Eleitoral / Domicílio:</b> ${esc(p.baseEleitoral || p.uf || 'Geral')}</p>
          ${p.areaAtuacao ? `<p class="sm"><b>Áreas de Atuação:</b> ${esc(p.areaAtuacao)}</p>` : ''}
          <p class="sm"><b>Gabinete:</b> ${esc(p.room || 'Gabinete Parlamentar')} ${p.phone ? `· <b>Telefone:</b> ${esc(p.phone)}` : ''}</p>
        </div>`
            : ''
        }

        <!-- Selo Criptográfico de Integridade -->
        <div style="border-top:1px dashed var(--line); padding-top:12px; margin-top:6px">
          <div class="row between sm muted">
            <span>Selo Digital de Integridade SHA-256:</span>
            <span>Base LGPD: Armazenamento 100% Local</span>
          </div>
          <code class="sm" style="display:block; margin-top:4px; word-break:break-all; font-size:10px; color:var(--muted); background:var(--s2); padding:6px; border-radius:6px">
            ${sha256Hex}
          </code>
        </div>
      </div>
    `;

    btnPrint.onclick = () => window.print();
  } catch (err) {
    dossierContent.innerHTML = `<p class="muted">Falha ao gerar relatório: ${esc(err.message)}</p>`;
  }
}
