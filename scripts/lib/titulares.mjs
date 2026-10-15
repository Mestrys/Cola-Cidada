// Aplica por cima de quem foi eleito (TSE) quem ocupa o cargo hoje (src/data/titulares.json).
// A mesma regra de scripts/build-executive-data.mjs: se for a mesma pessoa, a ficha do TSE continua valendo;
// se não for, a ficha fica com o eleito e o ocupante aparece sem ela.
import { norm } from './tse.mjs';

const words = (s) => norm(s).replace(/[^A-Z ]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
export function samePerson(current, e) {
  const known = new Set([...words(e.name), ...words(e.fullName)]);
  const w = words(current);
  return w.length > 0 && w.every((x) => known.has(x));
}

export function applyHolder(e, h, label) {
  if (!h.name) return { ...e, ...(h.nota ? { nota: h.nota } : {}) }; // só uma observação (ocupante não conferido)
  const same = samePerson(h.name, e);
  const since = h.desde ? new Date(`${h.desde}T12:00:00`).toLocaleDateString('pt-BR') : null;
  const prefix = e.name.split(' ')[0];
  const out = {
    ...e,
    name: `${prefix} ${h.name}`,
    fullName: same ? e.fullName : h.name,
    party: h.party,
    ...(h.condicao && h.condicao !== 'titular' ? { condicao: h.condicao } : {}),
    ...(h.desde ? { desde: h.desde } : {}),
    ...(h.nota ? { nota: h.nota } : {}),
  };
  if (h.vice) out.vice = { name: h.vice };
  else if (!same) delete out.vice;
  if (!same) {
    out.eleitoPeloTse = { name: e.name.replace(/^\S+ /, ''), party: e.party, year: e.tse.year };
    out.situacao = `${label} desde ${since ?? 'data não informada'} (substituiu quem foi eleito em ${e.tse.year})`;
    out.id = `${e.id}-${norm(h.name).toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '')}`;
    if (h.desde) out.mandate = [h.desde, e.mandate[1]];
    delete out.tse;
    out.pageUrl = 'https://divulgacandcontas.tse.jus.br/divulga/';
  } else if (since && h.desde > `${e.tse.year + 1}-01-01`) {
    out.situacao = `${label} desde ${since}`;
  }
  return out;
}
