// Larguras de barra calculadas em tempo de execução. A CSP não aceita atributo de estilo inline no HTML,
// então as views escrevem data-w="42" e a largura é aplicada aqui pelo CSSOM, que a CSP permite.
const apply = (el) => {
  el.style.width = `${el.dataset.w}%`;
};

export function initDynamicStyles(root = document) {
  root.querySelectorAll('[data-w]').forEach(apply);
  new MutationObserver((records) => {
    for (const r of records) {
      for (const n of r.addedNodes) {
        if (n.nodeType !== 1) continue;
        if (n.dataset?.w !== undefined) apply(n);
        n.querySelectorAll?.('[data-w]').forEach(apply);
      }
    }
  }).observe(root.documentElement || root, { childList: true, subtree: true });
}
