import { esc, fmtDate } from '../ui.js';

const rateClass = (r) => (r == null ? 'blue' : r >= 90 ? 'green' : r >= 75 ? 'gold' : 'red');
const short = (t = '', n = 140) => (t.length > n ? t.slice(0, n - 1) + '…' : t);

// Painel de presença em sessões e fidelidade à orientação da bancada (dados oficiais da Câmara).
export function plenaryPanelHtml({ attendance: a, fidelity: f }) {
  const attendance = a.sessions
    ? `
    <div class="stat" style="padding:10px">
      <span>Presença em Sessões Deliberativas</span>
      <b style="font-size:22px; color:var(--primary)">${a.rate}%</b>
      <span class="xs muted">${a.presences} de ${a.sessions} sessões do Plenário (${esc(fmtDate(a.from))} a ${esc(fmtDate(a.to))})</span>
    </div>`
    : '<p class="muted sm">Sem sessões deliberativas encerradas recentes na API da Câmara.</p>';

  const fidelity =
    f.rate == null
      ? `<p class="muted sm">Não há votações recentes com orientação clara da bancada deste parlamentar (${f.voted} votos registrados em ${f.votings} votações nominais).</p>`
      : `
    <div class="grid" style="grid-template-columns:1fr 1fr; gap:8px">
      <div class="stat" style="padding:10px">
        <span>Votos Alinhados à Bancada</span>
        <b style="font-size:22px; color:var(--text)">${f.rate}%</b>
        <span class="xs muted">${f.aligned} de ${f.measured} votações com orientação clara</span>
      </div>
      <div class="stat" style="padding:10px">
        <span>Votos Contra a Orientação</span>
        <b style="font-size:20px; color:${f.diverged ? 'var(--gold)' : 'var(--primary)'}">${f.diverged}</b>
        <span class="xs muted">${f.freed} com bancada liberada · ${f.unknown} sem orientação</span>
      </div>
    </div>`;

  const divergences = f.divergences.length
    ? `
    <div class="stack" style="gap:6px">
      <span class="xs muted" style="font-weight:700; text-transform:uppercase">Votos contra a orientação da bancada:</span>
      ${f.divergences
        .map(
          (d) => `
        <div class="card soft stack xs" style="gap:3px; background:var(--s2); padding:8px 10px; border-radius:var(--r-sm)">
          <div class="row between">
            <span class="muted">${esc(fmtDate(d.date))}</span>
            <span class="chip gold xs">Votou ${esc(d.vote)} (orientação: ${esc(d.orientation)})</span>
          </div>
          <p class="muted">${esc(short(d.description))}</p>
        </div>`
        )
        .join('')}
    </div>`
    : '';

  return `
  <div class="card soft stack" style="gap:12px; padding:16px">
    <div class="row between">
      <span class="chip ${rateClass(a.rate)}">Presença em Plenário</span>
      <span class="xs muted">Registro oficial da Câmara</span>
    </div>
    ${attendance}
    <div class="stat" style="padding:10px">
      <span>Participação em Votações Nominais</span>
      <b style="font-size:20px">${f.participationRate ?? '—'}%</b>
      <span class="xs muted">votou em ${f.voted} das ${f.votings} votações nominais mais recentes do Plenário</span>
    </div>
  </div>
  <div class="card soft stack" style="gap:12px; padding:16px">
    <div class="row between">
      <span class="chip ${rateClass(f.rate)}">Fidelidade à Orientação da Bancada</span>
      <span class="xs muted">Orientações da liderança (Câmara)</span>
    </div>
    ${fidelity}
    ${divergences}
  </div>
  <p class="xs muted">
    Calculado sobre as últimas sessões deliberativas e votações nominais do Plenário, via API de Dados Abertos da Câmara.
    A presença é o registro oficial e não distingue falta justificada; quem assumiu o mandato há pouco tem taxa menor.
    A fidelidade compara o voto com a orientação do partido, ou do bloco/federação quando o partido não orienta isoladamente;
    votações com bancada liberada ou sem orientação publicada não entram na taxa.
  </p>`;
}
