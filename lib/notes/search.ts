"use client";
/**
 * Búsqueda total de apuntes (offline) con MiniSearch: título, texto de los bloques, campos de la plantilla,
 * etiquetas, hanzi, pinyin con y sin tonos y español. Índice en memoria que se reconstruye al cambiar las notas.
 */
import MiniSearch from "minisearch";
import type { Note } from "@/lib/db";
import { getActivePackOrNull } from "@/lib/languages/registry";
import { docToText, type PMDoc } from "./markdown";

export interface NoteDoc {
  id: string;
  title: string;
  text: string;
  tags: string;
  zh: string; // texto en la lengua meta
  reading: string; // lectura con tonos
  readingPlain: string; // sin tonos ni espacios
  type: string;
}

const stripDiacritics = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ü/g, "v");

function fieldsText(fields: Record<string, unknown>): string {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(fields);
  return out.join("\n");
}

export function noteToDoc(n: Note): NoteDoc {
  const pack = getActivePackOrNull();
  const text = `${docToText(n.doc as PMDoc)}\n${fieldsText(n.fields)}\n${n.cues.map((c) => `${c.q} ${c.a}`).join("\n")}\n${n.summary ?? ""}`;
  const all = `${n.title}\n${text}`;
  // tramos en la lengua meta (para lectura)
  const zhRuns = pack ? all.match(/[㐀-鿿぀-ヿ가-힯]+/g) ?? [] : [];
  const zh = zhRuns.join(" ");
  const reading = pack && zhRuns.length ? zhRuns.slice(0, 200).map((r) => pack.reading(r)).join(" ") : "";
  return { id: n.id, title: n.title, text, tags: n.tags.join(" "), zh, reading, readingPlain: stripDiacritics(reading).replace(/\s+/g, ""), type: n.type };
}

/** Tokenizador: palabras latinas + cada carácter CJK por separado (y bigramas) para buscar por hanzi. */
function tokenize(text: string): string[] {
  const out: string[] = [];
  for (const m of text.toLowerCase().matchAll(/[\p{L}\p{N}üāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+/gu)) {
    const t = m[0];
    if (/[㐀-鿿぀-ヿ가-힯]/.test(t)) {
      const chars = Array.from(t);
      out.push(...chars);
      for (let i = 0; i < chars.length - 1; i++) out.push(chars[i] + chars[i + 1]);
      if (chars.length > 2) out.push(t);
    } else {
      out.push(t);
      const plain = stripDiacritics(t);
      if (plain !== t) out.push(plain);
    }
  }
  return out;
}

export function buildIndex(notes: Note[]): MiniSearch<NoteDoc> {
  const ms = new MiniSearch<NoteDoc>({
    fields: ["title", "text", "tags", "zh", "reading", "readingPlain", "type"],
    storeFields: ["id"],
    tokenize,
    processTerm: (t) => t,
    searchOptions: { boost: { title: 4, tags: 2, zh: 3, reading: 2 }, prefix: true, fuzzy: (term) => (term.length > 4 ? 0.15 : false), combineWith: "AND" },
  });
  ms.addAll(notes.map(noteToDoc));
  return ms;
}

/** Normaliza la consulta: pinyin con números → tildes, y también sin tonos para readingPlain. */
export function queryVariants(q: string): string[] {
  const pack = getActivePackOrNull();
  const base = q.trim();
  if (!base) return [];
  const out = new Set<string>([base]);
  if (pack) out.add(pack.normalizeInput(base));
  out.add(stripDiacritics(base).replace(/[1-5]/g, ""));
  out.add(stripDiacritics(base).replace(/[1-5\s]/g, ""));
  return Array.from(out).filter(Boolean);
}

export function searchNotes(index: MiniSearch<NoteDoc>, q: string, limit = 50): string[] {
  const seen = new Map<string, number>();
  for (const v of queryVariants(q)) {
    for (const r of index.search(v)) seen.set(r.id as string, Math.max(seen.get(r.id as string) ?? 0, r.score));
  }
  return Array.from(seen.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
}
