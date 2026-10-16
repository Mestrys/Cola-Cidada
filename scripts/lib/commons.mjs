// Wikimedia Commons: dados e miniaturas de arquivos, com a licença e a autoria de cada um (para os créditos do app).
// Só arquivos hospedados no Commons entram (o Commons só aceita conteúdo livre); a licença de cada um fica registrada.
const UA = 'MonitorCidadao/1.0 (https://github.com/Mestrys/Cola-Cidada; devops@mestrys.com.br)';
const API = 'https://commons.wikimedia.org/w/api.php';
let last = 0;

async function polite(url, opts = {}, tries = 5) {
  let err;
  for (let i = 0; i < tries; i++) {
    const wait = Math.max(0, last + 350 - Date.now()) + (i ? 1500 * i : 0); // 1 pedido a cada ~0,35 s; recua se der erro
    if (wait) await new Promise((r) => setTimeout(r, wait));
    last = Date.now();
    try {
      const res = await fetch(url, { ...opts, headers: { 'User-Agent': UA, ...(opts.headers || {}) }, signal: AbortSignal.timeout(90000) });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status} em ${url}`);
      return res;
    } catch (e) {
      err = e;
    }
  }
  throw err;
}

const strip = (h = '') => String(h).replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

/** Informações de um arquivo do Commons (título sem o prefixo "File:"), com a miniatura de `width` px de largura. */
export async function commonsInfo(file, width = 200) {
  const url = `${API}?action=query&titles=${encodeURIComponent(`File:${file}`)}&prop=imageinfo&iiprop=extmetadata|url|size|mime&iiurlwidth=${width}&format=json&formatversion=2`;
  const page = (await (await polite(url)).json()).query.pages[0];
  const ii = page.imageinfo?.[0];
  if (!ii) throw new Error(`arquivo não encontrado no Commons: ${file}`);
  const x = ii.extmetadata || {};
  return {
    arquivo: file,
    licenca: x.LicenseShortName?.value || '',
    licencaUrl: x.LicenseUrl?.value || '',
    autor: strip(x.Artist?.value),
    restricoes: strip(x.Restrictions?.value),
    pagina: ii.descriptionurl,
    largura: ii.width,
    altura: ii.height,
    mime: ii.mime,
    miniatura: ii.thumburl,
  };
}

export async function download(url) {
  const res = await polite(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ao baixar ${url}`);
  return Buffer.from(await res.arrayBuffer());
}
