// Geração de cards visuais cívicos para redes sociais (WhatsApp, Stories, Instagram)
import { modal, esc, toast, brl, fmtDate } from './ui.js';

export async function createCardImage({ politician, title, highlight, badge, badgeColor = '#006c27', detailText }) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');

  // 1. Fundo Gradiente Escuro Moderno
  const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1080);
  bgGrad.addColorStop(0, '#0a1017');
  bgGrad.addColorStop(0.5, '#131e2b');
  bgGrad.addColorStop(1, '#0c1914');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1080, 1080);

  // Efeito sutil de brilho circular
  const radial = ctx.createRadialGradient(200, 200, 10, 200, 200, 450);
  radial.addColorStop(0, 'rgba(0, 108, 39, 0.22)');
  radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, 1080, 1080);

  // 2. Moldura e Cartão Interno
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 4;
  ctx.strokeRoundRect(50, 50, 980, 980, 36);

  // 3. Cabeçalho Marca Cívica
  ctx.fillStyle = '#00c354';
  ctx.font = 'bold 30px "Actor", system-ui, sans-serif';
  ctx.fillText('COLA-CIDADÃO', 90, 130);

  ctx.fillStyle = '#8e9aa8';
  ctx.font = '600 24px "Actor", system-ui, sans-serif';
  ctx.fillText('CONTROLE SOCIAL E FISCALIZAÇÃO DO MANDATO', 90, 170);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fillRect(90, 200, 900, 2);

  // 4. Foto e Dados do Parlamentar
  let imgLoaded = false;
  if (politician.photo) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve) => {
        img.onload = () => { imgLoaded = true; resolve(); };
        img.onerror = () => resolve();
        img.src = politician.photo;
        // Timeout de 2.5s se a foto demorar
        setTimeout(resolve, 2500);
      });

      if (imgLoaded) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(170, 310, 75, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, 95, 235, 150, 150);
        ctx.restore();

        ctx.strokeStyle = '#00c354';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(170, 310, 77, 0, Math.PI * 2);
        ctx.stroke();
      }
    } catch {
      imgLoaded = false;
    }
  }

  const textStartX = imgLoaded ? 280 : 90;

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px "Actor", system-ui, sans-serif';
  ctx.fillText(politician.name.slice(0, 32), textStartX, 290);

  ctx.fillStyle = '#a2b4c7';
  ctx.font = '600 30px "Actor", system-ui, sans-serif';
  const roleLabel =
    politician.roleKey === 'dep-federal'
      ? 'Deputado Federal'
      : politician.roleKey === 'senador'
      ? 'Senador da República'
      : politician.roleKey === 'dep-estadual'
      ? 'Deputado Estadual'
      : 'Parlamentar';
  ctx.fillText(`${roleLabel} · ${politician.party || ''}${politician.uf ? '/' + politician.uf : ''}`, textStartX, 340);

  // 5. Bloco de Conteúdo / Matéria Fiscalizada
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.fillRoundRect(90, 420, 900, 420, 28);

  ctx.fillStyle = '#78899b';
  ctx.font = 'bold 24px "Actor", system-ui, sans-serif';
  ctx.fillText(title.toUpperCase(), 130, 470);

  // Quebra de texto do texto principal
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 36px "Actor", system-ui, sans-serif';
  const words = highlight.split(' ');
  let line = '';
  let y = 530;
  for (const w of words) {
    const test = line + w + ' ';
    if (ctx.measureText(test).width > 820 && line !== '') {
      ctx.fillText(line, 130, y);
      line = w + ' ';
      y += 50;
      if (y > 670) {
        line += '…';
        break;
      }
    } else {
      line = test;
    }
  }
  ctx.fillText(line, 130, y);

  // Badge em Destaque (ex: VOTOU SIM, R$ 42.150,00)
  if (badge) {
    const badgeY = 730;
    ctx.fillStyle = badgeColor;
    ctx.fillRoundRect(130, badgeY, 340, 70, 20);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px "Actor", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(badge, 130 + 170, badgeY + 46);
    ctx.textAlign = 'left';
  }

  if (detailText) {
    ctx.fillStyle = '#9cb0c6';
    ctx.font = '500 24px "Actor", system-ui, sans-serif';
    ctx.fillText(detailText, badge ? 500 : 130, 775);
  }

  // 6. Rodapé Oficial
  ctx.fillStyle = '#718294';
  ctx.font = '500 22px "Actor", system-ui, sans-serif';
  ctx.fillText('FONTE: DADOS ABERTOS OFICIAIS (CÂMARA / SENADO / TSE)', 90, 900);
  ctx.fillText(`GERADO EM ${new Date().toLocaleDateString('pt-BR')} · PRIVACIDADE TOTAL (LGPD)`, 90, 935);

  return canvas;
}

export async function openShareModal({ politician, title, highlight, badge, badgeColor, detailText }) {
  const { el, close } = modal(`
    <div class="row between">
      <div class="row">
        <span class="mi" style="color:var(--primary); font-size:24px">share</span>
        <h3 class="h2" style="font-size:16px">Card Cívico para Redes Sociais</h3>
      </div>
      <button class="btn icon ghost" data-close aria-label="Fechar"><span class="mi">close</span></button>
    </div>

    <div class="stack" style="align-items:center; gap:12px; margin-top:8px">
      <div id="card-preview-wrap" style="width:100%; max-width:380px; aspect-ratio:1; border-radius:18px; overflow:hidden; box-shadow:0 12px 36px rgba(0,0,0,0.25); background:var(--s2); display:grid; place-items:center">
        <div class="row"><span class="spin"></span><span class="muted">Renderizando card em alta resolução…</span></div>
      </div>
      <p class="sm muted" style="text-align:center">Card formatado para WhatsApp, Telegram, X (Twitter) e Instagram Stories.</p>
    </div>

    <div class="row between" style="margin-top:14px">
      <button class="btn primary" id="btn-download-png" disabled><span class="mi">download</span>Baixar Imagem PNG</button>
      <button class="btn sm" id="btn-share-native" disabled><span class="mi">send</span>Enviar / Compartilhar</button>
    </div>
  `);

  const previewWrap = el.querySelector('#card-preview-wrap');
  const btnDownload = el.querySelector('#btn-download-png');
  const btnShare = el.querySelector('#btn-share-native');

  try {
    const canvas = await createCardImage({ politician, title, highlight, badge, badgeColor, detailText });
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    previewWrap.innerHTML = '';
    previewWrap.appendChild(canvas);

    btnDownload.disabled = false;
    btnShare.disabled = false;

    btnDownload.onclick = () => {
      const link = document.createElement('a');
      const cleanName = (politician.name || 'politico').toLowerCase().replace(/\s+/g, '-');
      link.download = `cola-cidadao-${cleanName}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast('Card baixado com sucesso!');
    };

    btnShare.onclick = async () => {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `cola-cidadao-${politician.name}.png`, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: `Cola-Cidadão: ${politician.name}`,
              text: `${highlight} - Confira no Cola-Cidadão:`,
              files: [file],
            });
            toast('Compartilhado com sucesso!');
          } catch (err) {
            if (err.name !== 'AbortError') toast('Compartilhamento cancelado ou não suportado.', 'info');
          }
        } else {
          // Fallback para download
          btnDownload.click();
        }
      }, 'image/png');
    };
  } catch (err) {
    previewWrap.innerHTML = `<p class="muted">Erro ao gerar card: ${esc(err.message)}</p>`;
  }
}
