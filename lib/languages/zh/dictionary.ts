"use client";
/**
 * Servicio de diccionario (cliente). Carga perezosa de /data/cedict-core.json (HSK + 40 000 palabras
 * frecuentes) y, bajo demanda, /data/cedict-full.json (resto de CC-CEDICT). Fusión con las palabras
 * del usuario (Dexie). Expone búsqueda, léxico para segmentar, caracteres (Make Me a Hanzi), radicales y listas HSK.
 */
import { create } from "zustand";
import { db, type Word } from "@/lib/db";
import { normalizePinyin, syllablesOf, toneOf } from "./pinyin/tones";
import { isHanzi, hanziOnly, hasHanzi } from "./pinyin/convert";
import { lexiconFromSet, type Lexicon } from "@/lib/segment";
import radicalsJson from "@/content/zh/radicals.json";
import type { CharInfo, DictEntry, RadicalInfo, SearchResult } from "@/lib/dictionary/types";
import { withBase } from "@/lib/base-path";

/** Formato compacto en disco: [s, t, p, en[], hsk, hsk2, freq, pos[], cl[]] */
export type CompactEntry = [string, string, string, string[], number?, number?, number?, string[]?, string[]?];

interface DictState {
  status: "idle" | "loading" | "ready" | "error";
  full: "idle" | "loading" | "ready" | "error";
  error?: string;
  entries: number;
  load: () => Promise<void>;
  loadFull: () => Promise<void>;
}

const bySimp = new Map<string, DictEntry[]>();
const byTrad = new Map<string, DictEntry[]>();
const byPinyinPlain = new Map<string, DictEntry[]>();
let allEntries: DictEntry[] = [];
let lexicon: Lexicon | undefined;
const lexSet = new Set<string>();
const userWords = new Map<string, Word>();
let charInfo: Map<string, CharInfo> | undefined;
let loadingPromise: Promise<void> | undefined;
let fullPromise: Promise<void> | undefined;

function addIndex(e: DictEntry) {
  const a = bySimp.get(e.s);
  if (a) a.push(e);
  else bySimp.set(e.s, [e]);
  if (e.t) {
    const b = byTrad.get(e.t);
    if (b) b.push(e);
    else byTrad.set(e.t, [e]);
  }
  const pp = normalizePinyin(e.p);
  const c = byPinyinPlain.get(pp);
  if (c) c.push(e);
  else byPinyinPlain.set(pp, [e]);
  lexSet.add(e.s);
}

export function fromCompact([s, t, p, en, hsk, hsk2, freq, pos, cl]: CompactEntry): DictEntry {
  return {
    s,
    t: t || undefined,
    p,
    en,
    hsk: hsk || undefined,
    hsk2: hsk2 || undefined,
    freq: freq || undefined,
    pos: pos?.length ? pos : undefined,
    cl: cl?.length ? cl : undefined,
    src: "cedict",
  };
}

/** Indexa entradas (usado por load y por los tests). */
export function ingest(raw: CompactEntry[]): number {
  const entries = raw.map(fromCompact);
  for (const e of entries) addIndex(e);
  allEntries = allEntries.concat(entries);
  lexicon = lexiconFromSet(lexSet);
  return entries.length;
}

export function resetDictionaryForTests() {
  bySimp.clear();
  byTrad.clear();
  byPinyinPlain.clear();
  allEntries = [];
  lexSet.clear();
  lexicon = undefined;
  userWords.clear();
  useDictionary.setState({ status: "idle", full: "idle", entries: 0 });
  loadingPromise = undefined;
  fullPromise = undefined;
}

export const useDictionary = create<DictState>((set, get) => ({
  status: "idle",
  full: "idle",
  entries: 0,
  load: async () => {
    if (get().status === "ready" || get().status === "loading") return loadingPromise;
    set({ status: "loading" });
    loadingPromise = (async () => {
      try {
        const res = await fetch(withBase("/data/zh/cedict-core.json"));
        if (!res.ok) throw new Error(`No se pudo cargar el diccionario (${res.status}). Ejecuta npm run data:build.`);
        const raw = (await res.json()) as CompactEntry[];
        const n = ingest(raw);
        set({ status: "ready", entries: n });
      } catch (err) {
        set({ status: "error", error: (err as Error).message });
      }
    })();
    return loadingPromise;
  },
  loadFull: async () => {
    if (get().full === "ready" || get().full === "loading") return fullPromise;
    await get().load();
    set({ full: "loading" });
    fullPromise = (async () => {
      try {
        const res = await fetch(withBase("/data/zh/cedict-full.json"));
        if (!res.ok) throw new Error("No se pudo cargar el diccionario completo.");
        const raw = (await res.json()) as CompactEntry[];
        const n = ingest(raw);
        set({ full: "ready", entries: get().entries + n });
      } catch (err) {
        set({ full: "error", error: (err as Error).message });
      }
    })();
    return fullPromise;
  },
}));

/** Actualiza la caché de palabras del usuario (llamar cuando cambie la tabla words). */
export function setUserWords(words: Word[]) {
  userWords.clear();
  for (const w of words) {
    userWords.set(w.hanzi, w);
    lexSet.add(w.hanzi);
  }
  lexicon = lexiconFromSet(lexSet);
}

export function getLexicon(): Lexicon | undefined {
  if (!lexicon && lexSet.size) lexicon = lexiconFromSet(lexSet);
  return lexicon;
}

export function userWord(hanzi: string): Word | undefined {
  return userWords.get(hanzi);
}

function fromUserWord(w: Word): DictEntry {
  return {
    s: w.hanzi,
    t: w.traditional,
    p: w.pinyin,
    en: w.meaningEn ? w.meaningEn.split(/;\s*/) : [],
    es: w.meaning,
    hsk: w.level,
    src: w.source === "seed" ? "seed" : "user",
  };
}

/** Orden dentro de una misma palabra: clasificador conocido > más acepciones > tono no neutro. */
function sortReadings(a: DictEntry, b: DictEntry): number {
  const score = (e: DictEntry) => (e.cl?.length ? 4 : 0) + (e.hsk ? 2 : 0) + Math.min(e.en.length, 3) * 0.5 - (/^(variant|old variant|used in|surname)/.test(e.en[0] ?? "") ? 5 : 0);
  return score(b) - score(a);
}

/** Entradas para una palabra exacta (simplificado o tradicional). Prioriza la del usuario. */
export function lookup(word: string): DictEntry[] {
  const out: DictEntry[] = [];
  const u = userWords.get(word);
  if (u) out.push(fromUserWord(u));
  const d = (bySimp.get(word) ?? byTrad.get(word) ?? []).slice().sort(sortReadings);
  for (const e of d) {
    if (u && e.p && normalizePinyin(e.p) === normalizePinyin(u.pinyin)) {
      out[0] = { ...out[0], en: e.en, cl: e.cl, pos: e.pos, freq: e.freq, hsk: out[0].hsk ?? e.hsk, hsk2: e.hsk2, t: out[0].t ?? e.t };
    } else out.push(e);
  }
  return out;
}

export function lookupFirst(word: string): DictEntry | undefined {
  return lookup(word)[0];
}

export function isLoaded(): boolean {
  return useDictionary.getState().status === "ready";
}


const strip = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Búsqueda por hanzi, pinyin (con o sin tonos/números) o español/inglés. */
export function search(query: string, limit = 50): SearchResult[] {
  const q = query.trim();
  if (!q) return [];
  const results: SearchResult[] = [];
  const seen = new Set<string>();
  const push = (e: DictEntry, score: number) => {
    const key = `${e.s}|${normalizePinyin(e.p)}`;
    if (seen.has(key)) return;
    seen.add(key);
    results.push({ ...e, score });
  };
  const hskBonus = (e: DictEntry) => (e.hsk ? 10 - Math.min(e.hsk, 9) : 0) + (e.hsk2 ? 3 : 0);
  const freqPenalty = (e: DictEntry) => (e.freq ? Math.min(e.freq, 50000) / 50000 : 0.6);
  if (hasHanzi(q)) {
    const h = hanziOnly(q);
    for (const e of lookup(h)) push(e, 100);
    for (const e of userWords.values()) if (e.hanzi.includes(h) && e.hanzi !== h) push(fromUserWord(e), 70);
    for (const e of allEntries) {
      if (e.s === h) continue;
      if (e.s.startsWith(h)) push(e, 60 - e.s.length + hskBonus(e) - freqPenalty(e));
      else if (e.s.includes(h)) push(e, 40 - e.s.length + hskBonus(e) - freqPenalty(e));
      if (results.length > limit * 4) break;
    }
  } else {
    const qp = normalizePinyin(q);
    const hasTone = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ1-5]/.test(q);
    const qSyl = syllablesOf(q).map((s) => normalizePinyin(s) + (hasTone ? toneOf(s) : ""));
    const esNorm = strip(q);
    // 1) palabras del usuario: español exacto / parcial, pinyin exacto
    for (const w of userWords.values()) {
      const m = strip(w.meaning);
      const parts = m.split(/[;,/]\s*/);
      if (parts.includes(esNorm)) push(fromUserWord(w), 97);
      else if (normalizePinyin(w.pinyin) === qp) push(fromUserWord(w), 95);
      else if (parts.some((p) => p.startsWith(esNorm)) || m.includes(" " + esNorm)) push(fromUserWord(w), 80);
      else if (m.includes(esNorm) && esNorm.length >= 3) push(fromUserWord(w), 65);
    }
    // 2) pinyin exacto
    const exact = byPinyinPlain.get(qp);
    if (exact) {
      for (const e of exact) {
        if (hasTone) {
          const es = syllablesOf(e.p).map((s) => normalizePinyin(s) + toneOf(s));
          if (!qSyl.every((s, i) => es[i] === s)) continue;
        }
        push(e, 90 + hskBonus(e) - freqPenalty(e));
      }
    }
    // 3) pinyin por prefijo e inglés
    const ql = q.toLowerCase();
    const isPinyinLike = /^[a-zü\s'1-5āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+$/i.test(q);
    let scanned = 0;
    for (const e of allEntries) {
      scanned++;
      if (isPinyinLike) {
        const ep = normalizePinyin(e.p);
        if (ep !== qp && ep.startsWith(qp)) {
          if (hasTone) {
            const es = syllablesOf(e.p).map((s) => normalizePinyin(s) + toneOf(s));
            if (!qSyl.every((s, i) => es[i] === s)) continue;
          }
          push(e, 60 + hskBonus(e) - ep.length * 0.5 - freqPenalty(e));
          continue;
        }
      }
      if (ql.length >= 2) {
        for (const d of e.en) {
          const dl = d.toLowerCase();
          if (dl === ql) {
            push(e, 85 + hskBonus(e) - freqPenalty(e));
            break;
          }
          if (dl.startsWith(ql + " ") || dl.startsWith(ql + ",") || dl.startsWith(ql + ";") || dl.endsWith(" " + ql) || dl.includes(" " + ql + " ") || dl.includes(" " + ql + ";") || dl.startsWith("to " + ql)) {
            push(e, 55 + hskBonus(e) - freqPenalty(e) - dl.length * 0.05);
            break;
          }
        }
      }
      if (results.length > limit * 6 && scanned > 20000) break;
    }
  }
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

/* ------------------- Caracteres (Make Me a Hanzi) ------------------- */

let charLoading: Promise<void> | undefined;
export async function loadCharInfo(): Promise<Map<string, CharInfo>> {
  if (charInfo) return charInfo;
  if (!charLoading) {
    charLoading = (async () => {
      const res = await fetch(withBase("/data/zh/hanzi.json"));
      if (!res.ok) throw new Error("No se pudo cargar /data/zh/hanzi.json (ejecuta npm run data:build).");
      const raw = (await res.json()) as Record<string, Omit<CharInfo, "character">>;
      charInfo = new Map(Object.entries(raw).map(([k, v]) => [k, { character: k, ...v }]));
    })();
  }
  await charLoading;
  return charInfo!;
}

export function getCharInfo(ch: string): CharInfo | undefined {
  return charInfo?.get(ch);
}

export function charInfoLoaded(): boolean {
  return Boolean(charInfo);
}

/** Componentes directos de un carácter según su descomposición IDS (sin los operadores ⿰⿱…). */
export function componentsOf(ch: string): string[] {
  const info = charInfo?.get(ch);
  if (!info) return [];
  return Array.from(info.decomposition).filter((c) => /[一-鿿⺀-⿟㐀-䶿]/.test(c) && c !== ch);
}

/** Caracteres (HSK o frecuentes) que contienen un componente. */
export function charsWithComponent(component: string, pool?: Set<string>, limit = 40): string[] {
  if (!charInfo) return [];
  const out: string[] = [];
  for (const [ch, info] of charInfo) {
    if (ch === component) continue;
    if (pool && !pool.has(ch)) continue;
    if (info.decomposition.includes(component)) out.push(ch);
    if (out.length >= limit) break;
  }
  return out;
}

/** Caracteres por radical (y nº de trazos totales opcional) dentro de un conjunto. */
export function charsByRadical(radical: string, pool?: Set<string>, strokes?: number): string[] {
  if (!charInfo) return [];
  const variants = radicalVariants(radical);
  const out: string[] = [];
  for (const [ch, info] of charInfo) {
    if (pool && !pool.has(ch)) continue;
    if (!variants.has(info.radical)) continue;
    if (strokes !== undefined && info.strokes !== strokes) continue;
    out.push(ch);
  }
  return out;
}

/** Palabras del diccionario que contienen un carácter, ordenadas por HSK/frecuencia. */
export function wordsContaining(ch: string, limit = 30): DictEntry[] {
  if (!isHanzi(ch)) return [];
  const out: DictEntry[] = [];
  for (const e of allEntries) {
    if (e.s.length > 1 && e.s.includes(ch) && (e.hsk || e.hsk2 || (e.freq && e.freq < 20000))) out.push(e);
  }
  return out.sort((a, b) => (a.hsk ?? 99) - (b.hsk ?? 99) || (a.freq ?? 1e9) - (b.freq ?? 1e9)).slice(0, limit);
}

export function entriesByHsk(level: number): DictEntry[] {
  return allEntries.filter((e) => e.hsk === level);
}

export function allDictEntries(): DictEntry[] {
  return allEntries;
}

/** Sincroniza la caché del usuario con Dexie (llamar al arrancar y tras cambios). */
export async function refreshUserWords() {
  setUserWords(await db.words.toArray());
}

/* ------------------- Radicales ------------------- */

interface RadicalRow {
  n: number;
  r: string;
  v: string[];
  s: number;
  p: string;
  es: string;
  en: string;
}

export const RADICALS: RadicalInfo[] = (radicalsJson as RadicalRow[]).map((r) => ({
  number: r.n,
  radical: r.r,
  variants: r.v,
  strokes: r.s,
  pinyin: r.p,
  meaning: r.es,
  meaningEn: r.en,
}));

const radicalIndex = new Map<string, RadicalInfo>();
for (const r of RADICALS) {
  radicalIndex.set(r.radical, r);
  for (const v of r.variants) radicalIndex.set(v.replace(/\(.*\)/, ""), r);
}

export function radicalInfo(ch: string): RadicalInfo | undefined {
  return radicalIndex.get(ch);
}

export function radicalVariants(radical: string): Set<string> {
  const r = radicalIndex.get(radical);
  const set = new Set<string>([radical]);
  if (r) {
    set.add(r.radical);
    for (const v of r.variants) set.add(v.replace(/\(.*\)/, ""));
  }
  return set;
}

/* ------------------- Listas HSK ------------------- */

export interface HskData {
  words: Record<"3.0" | "2.0" | "std", Record<string, string[]>>;
  chars: Record<"3.0" | "2.0", Record<string, string[]>>;
}

let hskData: HskData | undefined;
let hskLoading: Promise<HskData> | undefined;
export async function loadHsk(): Promise<HskData> {
  if (hskData) return hskData;
  if (!hskLoading) {
    hskLoading = fetch(withBase("/data/zh/hsk.json"))
      .then((r) => {
        if (!r.ok) throw new Error("No se pudo cargar /data/zh/hsk.json (npm run data:build)");
        return r.json() as Promise<HskData>;
      })
      .then((d) => (hskData = d));
  }
  return hskLoading;
}

export function getHsk(): HskData | undefined {
  return hskData;
}
