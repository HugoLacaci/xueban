/**
 * Lectura de transcripciones de Teams (.vtt y .docx) → segmentos comunes.
 * Los nombres se anonimizan AL LEER: nunca se guardan nombres de compañeros.
 *   - el hablante con más tiempo de palabra → "profesor/a"
 *   - el que coincide con mi nombre (si se conoce) → "yo"
 *   - el resto → "compañero/a"
 */
import { unzipSync, strFromU8 } from "fflate";

export interface TeamsSegment {
  start: number;
  end: number;
  speaker?: "profesor/a" | "yo" | "compañero/a";
  text: string;
}

function ts(h: string, m: string, s: string, ms = "0"): number {
  return +h * 3600 + +m * 60 + +s + +`0.${ms}`;
}

const TS_RE = /(\d+):(\d{1,2}):(\d{1,2})(?:[.,](\d+))?/;

type Raw = { start: number; end: number; name?: string; text: string };

export function parseVtt(vtt: string, opts: { myName?: string } = {}): TeamsSegment[] {
  const raw: Raw[] = [];
  let cur: Raw | undefined;
  for (const line0 of vtt.replace(/^﻿/, "").split(/\r?\n/)) {
    const line = line0.trim();
    const m = line.match(/^(\d+):(\d{2}):(\d{2})[.,](\d+)\s*-->\s*(\d+):(\d{2}):(\d{2})[.,](\d+)/);
    if (m) {
      cur = { start: ts(m[1], m[2], m[3], m[4]), end: ts(m[5], m[6], m[7], m[8]), text: "" };
      raw.push(cur);
      continue;
    }
    if (!cur || !line || line === "WEBVTT" || /^NOTE\b/.test(line) || /^[0-9a-f-]{20,}(\/\d+-\d+)?$/i.test(line)) continue;
    const v = line.match(/^<v\s+([^>]+)>(.*?)(?:<\/v>)?$/);
    if (v) {
      cur.name = v[1].trim();
      cur.text += (cur.text ? " " : "") + v[2].trim();
    } else cur.text += (cur.text ? " " : "") + line.replace(/<[^>]+>/g, "");
  }
  return anonymize(raw.filter((r) => r.text), opts.myName);
}

/** .docx de Teams: párrafos "Nombre   0:03:12" seguidos del texto (o "0:0:3.1 --> 0:0:7.3" en formatos antiguos). */
export function parseDocx(data: Uint8Array, opts: { myName?: string } = {}): TeamsSegment[] {
  const files = unzipSync(data, { filter: (f) => f.name === "word/document.xml" });
  const xml = files["word/document.xml"];
  if (!xml) throw new Error("El .docx no tiene word/document.xml");
  const paras = strFromU8(xml)
    .split(/<\/w:p>/)
    .map((p) =>
      [...p.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:br\/>/g)]
        .map((m) => (m[1] !== undefined ? m[1] : " "))
        .join("")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .trim(),
    )
    .filter(Boolean);
  return parsePlainTranscript(paras, opts);
}

/** Formato de texto de Teams (también vale para lo copiado del panel de transcripción de Stream). */
export function parsePlainTranscript(lines: string[], opts: { myName?: string } = {}): TeamsSegment[] {
  const raw: Raw[] = [];
  let cur: Raw | undefined;
  for (const p of lines) {
    const range = p.match(/^(\d+):(\d+):(\d+)(?:[.,](\d+))?\s*-->\s*(\d+):(\d+):(\d+)(?:[.,](\d+))?$/);
    if (range) {
      cur = { start: ts(range[1], range[2], range[3], range[4]), end: ts(range[5], range[6], range[7], range[8]), text: "" };
      raw.push(cur);
      continue;
    }
    // "Nombre Apellido   0:03:12" o "Nombre Apellido 3:12"
    const head = p.match(/^(.{1,80}?)\s+(?:(\d+):)?(\d{1,2}):(\d{2})$/);
    if (head && !TS_RE.test(head[1])) {
      cur = { start: ts(head[2] ?? "0", head[3], head[4]), end: 0, name: head[1].trim(), text: "" };
      raw.push(cur);
      continue;
    }
    if (cur && !cur.name && !cur.text && raw.length && /^[^\s].{0,60}$/.test(p) && lines.length > 2 && !/[。，？！.,?!]/.test(p)) {
      // formato antiguo: rango, nombre, texto
      cur.name = p;
      continue;
    }
    if (cur) cur.text += (cur.text ? " " : "") + p;
  }
  // fin = inicio del siguiente
  raw.forEach((r, i) => {
    if (!r.end) r.end = raw[i + 1]?.start ?? r.start + 5;
  });
  return anonymize(raw.filter((r) => r.text), opts.myName);
}

function anonymize(raw: Raw[], myName?: string): TeamsSegment[] {
  const talk = new Map<string, number>();
  for (const r of raw) if (r.name) talk.set(r.name, (talk.get(r.name) ?? 0) + Math.max(1, r.end - r.start));
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const me = myName ? [...talk.keys()].find((n) => norm(n).includes(norm(myName)) || norm(myName).includes(norm(n))) : undefined;
  const teacher = [...talk.entries()].filter(([n]) => n !== me).sort((a, b) => b[1] - a[1])[0]?.[0];
  return raw.map((r) => ({
    start: Math.round(r.start * 100) / 100,
    end: Math.round(r.end * 100) / 100,
    speaker: !r.name ? undefined : r.name === me ? "yo" : r.name === teacher ? "profesor/a" : "compañero/a",
    text: r.text.trim(),
  }));
}
