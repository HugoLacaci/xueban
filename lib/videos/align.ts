/**
 * Utilidades sin dependencias de Node (se usan en la ruta API y en el navegador):
 *  - alignTranslation: asigna a cada línea de la lengua meta el texto de las líneas de traducción que se solapan
 *    con ella en el tiempo (las líneas chinas se fusionan, así que una línea puede recibir varias traducciones).
 *  - parseSubtitles: lee .srt / .vtt subidos por el usuario.
 */
export interface TimedText {
  start: number;
  end: number;
  zh: string;
}

export function alignTranslation<T extends { start: number; end: number }>(lines: T[], tr: TimedText[]): (T & { es?: string })[] {
  if (!tr.length) return lines;
  return lines.map((l) => {
    const parts: string[] = [];
    for (const t of tr) {
      const overlap = Math.min(l.end, t.end) - Math.max(l.start, t.start);
      const mid = (t.start + t.end) / 2;
      // se queda la traducción si la mitad de su duración cae en la línea o si empieza casi a la vez
      if ((mid >= l.start && mid < l.end) || Math.abs(t.start - l.start) < 0.35 || overlap > (t.end - t.start) * 0.5) {
        const txt = t.zh.trim();
        if (txt && parts[parts.length - 1] !== txt) parts.push(txt);
      }
    }
    return parts.length ? { ...l, es: parts.join(" ") } : l;
  });
}

function toSeconds(ts: string): number {
  const m = ts.trim().replace(",", ".").split(":");
  const nums = m.map(Number);
  if (nums.some((n) => Number.isNaN(n))) return NaN;
  return nums.length === 3 ? nums[0] * 3600 + nums[1] * 60 + nums[2] : nums.length === 2 ? nums[0] * 60 + nums[1] : nums[0];
}

/** Letras sincronizadas .lrc: «[01:23.45]texto» (admite varias marcas por línea); fin = inicio de la siguiente. */
export function parseLrc(raw: string): TimedText[] {
  const stamps: { start: number; zh: string }[] = [];
  for (const row of raw.replace(/\r/g, "").split("\n")) {
    const tags = [...row.matchAll(/\[(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)\]/g)];
    if (!tags.length) continue;
    const text = row.replace(/\[[^\]]*\]/g, "").replace(/<[^>]+>/g, "").trim();
    if (!text) continue;
    for (const t of tags) stamps.push({ start: Number(t[1]) * 60 + Number(t[2].replace(":", ".")), zh: text });
  }
  stamps.sort((a, b) => a.start - b.start);
  return stamps.map((s, i) => ({ start: s.start, end: stamps[i + 1] ? stamps[i + 1].start : s.start + 5, zh: s.zh }));
}

/** Lee SRT, WebVTT o LRC: devuelve líneas con texto plano (sin etiquetas) y sin duplicados consecutivos. */
export function parseSubtitles(raw: string): TimedText[] {
  if (!raw.includes("-->") && /^\s*\[\d{1,3}:\d{1,2}/m.test(raw)) return parseLrc(raw);
  const out: TimedText[] = [];
  const blocks = raw.replace(/\r/g, "").replace(/^﻿/, "").split(/\n{2,}/);
  for (const b of blocks) {
    const rows = b.split("\n");
    const ti = rows.findIndex((r) => r.includes("-->"));
    if (ti < 0) continue;
    const [a, z] = rows[ti].split("-->");
    const start = toSeconds(a);
    const end = toSeconds(z.trim().split(/\s+/)[0]);
    if (Number.isNaN(start) || Number.isNaN(end)) continue;
    const text = rows
      .slice(ti + 1)
      .join(" ")
      .replace(/<[^>]+>/g, "")
      .replace(/\{\\[^}]*\}/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) continue;
    const prev = out[out.length - 1];
    if (prev && prev.zh === text) {
      prev.end = Math.max(prev.end, end);
      continue;
    }
    out.push({ start, end, zh: text });
  }
  return out.sort((x, y) => x.start - y.start);
}
