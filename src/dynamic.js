// Estilos que dependem de medidas em tempo de execução. A CSP não aceita atributo de estilo inline no HTML,
// então as views declaram a intenção em atributos/classes e o ajuste é feito aqui pelo CSSOM, que a CSP permite:
//  - data-w="42": largura de barra de progresso em %;
//  - .tabs, .civic-chips, [data-edge-fade]: faixas rolagem horizontal esmaecem só do lado onde ainda há conteúdo.
const EDGE = '.tabs, .civic-chips, [data-edge-fade]';
const FADE = '1.5rem';
const watched = new WeakSet();

const applyWidth = (el) => {
  el.style.width = `${el.dataset.w}%`;
};

function updateEdge(el) {
  const max = el.scrollWidth - el.clientWidth;
  const overflow = max > 1;
  const x = Math.abs(el.scrollLeft);
  el.classList.toggle('edge-fade', overflow);
  el.style.setProperty('--fade-l', overflow && x > 1 ? FADE : '0px');
  el.style.setProperty('--fade-r', overflow && x < max - 1 ? FADE : '0px');
}

const resizes = typeof ResizeObserver === 'function' ? new ResizeObserver((entries) => entries.forEach((e) => updateEdge(e.target))) : null;

function watchEdge(el) {
  if (watched.has(el)) return updateEdge(el);
  watched.add(el);
  el.addEventListener('scroll', () => updateEdge(el), { passive: true });
  resizes?.observe(el);
  updateEdge(el);
}

function scan(node) {
  if (node.dataset?.w !== undefined) applyWidth(node);
  if (node.matches?.(EDGE)) watchEdge(node);
  node.querySelectorAll?.('[data-w]').forEach(applyWidth);
  node.querySelectorAll?.(EDGE).forEach(watchEdge);
}

export function initDynamicStyles(root = document) {
  scan(root.documentElement || root);
  new MutationObserver((records) => {
    for (const r of records) for (const n of r.addedNodes) if (n.nodeType === 1) scan(n);
  }).observe(root.documentElement || root, { childList: true, subtree: true });
  // a fonte de ícones muda a largura das faixas depois da primeira medição
  document.fonts?.ready.then(() => root.querySelectorAll(EDGE).forEach(updateEdge));
  addEventListener('resize', () => root.querySelectorAll(EDGE).forEach(updateEdge), { passive: true });
}
