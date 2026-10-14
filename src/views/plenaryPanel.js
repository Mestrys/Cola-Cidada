import { esc, fmtDate } from '../ui.js';

const rateClass = (r) => (r == null ? 'blue' : r >= 90 ? 'green' : r >= 75 ? 'gold' : 'red');
const short = (t = '', n = 140) => (t.length > n ? t.slice(0, n - 1) + '…' : t);

// Painel de presença em sessões e fidelidade à orientação da bancada (dados oficiais da Câmara).
export function plenaryPanelHtml({ attendance: a, fidelity: f, source = 'camara' }) {
  const senate = source === 'senado';
  const unit = a.unit || 'sessões do Plenário';
  const attendance = a.sessions
    ? `
    <div class="stat u-p-10">
      <span>${senate ? 'Presença nas Votações Nominais' : 'Presença em Sessões Deliberativas'}</span>
      <b class="u-fs-22 u-c-primary">${a.rate}%</b>
      <span class="xs muted">${a.presences} de ${a.sessions} ${esc(unit)} (${esc(fmtDate(a.from))} a ${esc(fmtDate(a.to))})</span>
      ${
        senate
          ? `<span class="xs muted">${a.justified} ausência(s) justificada(s) (licença, missão ou atividade parlamentar) · ${a.unjustified} sem comparecimento</span>`
          : ''
      }
    </div>`
    : '<p class="muted sm">Sem sessões deliberativas encerradas recentes na API da Câmara.</p>';

  const fidelity =
    f.rate == null
      ? `<p class="muted sm">Não há votações recentes com orientação clara da bancada deste parlamentar (${f.voted} votos registrados em ${f.votings} votações nominais).</p>`
      : `
    <div class="grid u-cols-1fr-1fr u-gap-8">
      <div class="stat u-p-10">
        <span>Votos Alinhados à Bancada</span>
        <b class="u-fs-22 u-c-text">${f.rate}%</b>
        <span class="xs muted">${f.aligned} de ${f.measured} votações com orientação clara</span>
      </div>
      <div class="stat u-p-10">
        <span>Votos Contra a Orientação</span>
        <b class="u-fs-20 ${f.diverged ? 'u-c-gold' : 'u-c-primary'}">${f.diverged}</b>
        <span class="xs muted">${f.freed} com bancada liberada · ${f.unknown} sem orientação</span>
      </div>
    </div>`;

  const divergences = f.divergences.length
    ? `
    <div class="stack u-gap-6">
      <span class="xs muted u-fw-700 u-tt-uppercase">Votos contra a orientação da bancada:</span>
      ${f.divergences
        .map(
          (d) => `
        <div class="card soft stack xs u-gap-3 u-bg-s2 u-p-8-10 u-br-r-sm">
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
  <div class="card soft stack u-gap-12 u-p-16">
    <div class="row between">
      <span class="chip ${rateClass(a.rate)}">Presença em Plenário</span>
      <span class="xs muted">Registro oficial ${senate ? 'do Senado' : 'da Câmara'}</span>
    </div>
    ${attendance}
    ${
      f.participationRate == null
        ? ''
        : `<div class="stat u-p-10">
      <span>Participação em Votações Nominais</span>
      <b class="u-fs-20">${f.participationRate}%</b>
      <span class="xs muted">votou em ${f.voted} das ${f.votings} votações nominais mais recentes do Plenário</span>
    </div>`
    }
  </div>
  <div class="card soft stack u-gap-12 u-p-16">
    <div class="row between">
      <span class="chip ${rateClass(f.rate)}">Fidelidade à Orientação da Bancada</span>
      <span class="xs muted">Orientações da liderança (${senate ? 'Senado' : 'Câmara'})</span>
    </div>
    ${fidelity}
    ${divergences}
  </div>
  <p class="xs muted">
    ${
      senate
        ? `Calculado sobre as votações nominais do Plenário do Senado nos últimos 180 dias, via Dados Abertos do Senado.
    Presença inclui votos secretos; licença, missão e atividade parlamentar contam como ausência justificada.
    A fidelidade compara o voto com a orientação publicada para o partido; poucas votações têm orientação, e as com bancada liberada ou sem orientação não entram na taxa.`
        : `Calculado sobre as últimas sessões deliberativas e votações nominais do Plenário, via API de Dados Abertos da Câmara.
    A presença é o registro oficial e não distingue falta justificada; quem assumiu o mandato há pouco tem taxa menor.
    A fidelidade compara o voto com a orientação do partido, ou do bloco/federação quando o partido não orienta isoladamente;
    votações com bancada liberada ou sem orientação publicada não entram na taxa.`
    }
  </p>`;
}
