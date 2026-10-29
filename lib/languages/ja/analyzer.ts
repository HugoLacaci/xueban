/**
 * Análisis de texto japonés para la interfaz (síncrono): usa los resultados de kuromoji calculados
 * en el worker (caché) y, mientras no estén, una segmentación por diccionario. Agrupa verbo +
 * auxiliares (食べ+まし+た → 食べました, lema 食べる) y pone furigana solo sobre los kanji.
 */
import type { AnalyzedToken, TextAnalysis } from "@/lib/languages/types";
import { bumpAnalysis } from "@/lib/languages/core/analysis-tick";
import { withBase } from "@/lib/base-path";
import { maxMatch } from "@/lib/segment";
import { alignFurigana } from "./furigana";
import { isJapaneseChar, isKanji, toHiragana } from "./kana";
import type { KToken } from "./worker";
import { jaLexicon, lookupFirstJa } from "./dictionary";
import { deinflect } from "./conjugation";

const cache = new Map<string, KToken[]>();
const pending = new Set<string>();
let worker: Worker | null = null;
let ready = false;
let failed = false;
let reqId = 0;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function ensureWorker() {
  if (worker || failed || typeof window === "undefined" || typeof Worker === "undefined") return;
  try {
    worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent) => {
      const m = e.data as { type: string; id?: number; results?: KToken[][]; error?: string };
      if (m.type === "ready") {
        ready = true;
        flush();
      } else if (m.type === "error") {
        failed = true;
        console.warn("kuromoji no disponible:", m.error);
      } else if (m.type === "tokens") {
        const texts = inflight.get(m.id!) ?? [];
        inflight.delete(m.id!);
        texts.forEach((t, i) => cache.set(t, m.results![i]));
        bumpAnalysis();
      }
    };
    worker.postMessage({ type: "init", dicPath: withBase("/data/ja/kuromoji/") });
  } catch (e) {
    failed = true;
    console.warn("No se pudo crear el worker de kuromoji", e);
  }
}

const inflight = new Map<number, string[]>();
function flush() {
  flushTimer = null;
  if (!worker || !ready || !pending.size) return;
  const texts = Array.from(pending);
  pending.clear();
  const id = ++reqId;
  inflight.set(id, texts);
  worker.postMessage({ type: "tokenize", id, texts });
}

function request(text: string) {
  if (cache.has(text) || pending.has(text)) return;
  pending.add(text);
  ensureWorker();
  if (ready && !flushTimer) flushTimer = setTimeout(flush, 16);
}

/** Precarga el analizador (al entrar en japonés). */
export function warmAnalyzer() {
  ensureWorker();
}

export function analyzerReady(): boolean {
  return ready;
}

/** Tokens de kuromoji si ya están en caché (para tests y breakdown). */
export function cachedTokens(text: string): KToken[] | undefined {
  return cache.get(text);
}

const AUX_POS = new Set(["助動詞"]);

/** Agrupa morfemas en palabras «de estudiante»: verbo/adjetivo + auxiliares + て/で/た. */
function groupTokens(toks: KToken[]): { surface: string; lemma: string; reading: string; pos: string }[] {
  const out: { surface: string; lemma: string; reading: string; pos: string }[] = [];
  for (const t of toks) {
    const prev = out[out.length - 1];
    const attach =
      prev &&
      (prev.pos === "動詞" || prev.pos === "形容詞" || prev.pos === "助動詞") &&
      (AUX_POS.has(t.p) || (t.p === "助詞" && t.d === "接続助詞" && /^(て|で)$/.test(t.s)) || (t.p === "動詞" && (t.d === "非自立" || t.d === "接尾")));
    if (attach) {
      prev.surface += t.s;
      prev.reading += t.r || t.s;
      continue;
    }
    out.push({ surface: t.s, lemma: t.b, reading: t.r || t.s, pos: t.p });
  }
  return out;
}

const POS_ES: Record<string, string> = { 名詞: "nombre", 動詞: "verbo", 形容詞: "adjetivo", 副詞: "adverbio", 助詞: "partícula", 助動詞: "auxiliar", 連体詞: "determinante", 接続詞: "conjunción", 感動詞: "interjección", 記号: "signo", 接頭詞: "prefijo" };

function toAnalyzed(surface: string, reading: string, start: number, lemma?: string, pos?: string): AnalyzedToken {
  const isWord = Array.from(surface).some(isJapaneseChar);
  if (!isWord) return { text: surface, isWord: false, start, segments: [{ text: surface }] };
  const hira = toHiragana(reading || surface);
  const segs = alignFurigana(surface, hira).map((s) => ({ text: s.text, reading: s.reading }));
  return { text: surface, isWord: true, start, segments: segs, reading: hira, lemma: lemma && lemma !== surface ? lemma : undefined, pos: pos ? (POS_ES[pos] ?? pos) : undefined };
}

/** Segmentación de respaldo (sin kuromoji): máxima coincidencia con el léxico de JMdict + deinflexión. */
function fallback(text: string): TextAnalysis {
  const chars = Array.from(text);
  const tokens: AnalyzedToken[] = [];
  const lex = jaLexicon();
  let i = 0;
  while (i < chars.length) {
    if (!isJapaneseChar(chars[i])) {
      let j = i + 1;
      while (j < chars.length && !isJapaneseChar(chars[j])) j++;
      tokens.push({ text: chars.slice(i, j).join(""), isWord: false, start: i, segments: [{ text: chars.slice(i, j).join("") }] });
      i = j;
      continue;
    }
    let j = i;
    while (j < chars.length && isJapaneseChar(chars[j])) j++;
    const run = chars.slice(i, j);
    const words = lex ? maxMatch(run, lex) : [run.join("")];
    let pos = i;
    for (const w of words) {
      const e = lookupFirstJa(w) ?? deinflect(w).map((d) => lookupFirstJa(d)).find(Boolean);
      const hasK = Array.from(w).some(isKanji);
      const reading = !hasK ? w : e && (e.s === w || (e.extra?.alt as string[] | undefined)?.includes(w)) ? e.p : "";
      tokens.push(toAnalyzed(w, reading, pos, e && e.s !== w ? e.s : undefined));
      pos += Array.from(w).length;
    }
    i = j;
  }
  return { tokens };
}

export function analyzeJa(text: string): TextAnalysis {
  const toks = cache.get(text);
  if (!toks) {
    request(text);
    return fallback(text);
  }
  const groups = groupTokens(toks);
  const out: AnalyzedToken[] = [];
  let pos = 0;
  for (const g of groups) {
    out.push(toAnalyzed(g.surface, g.reading, pos, g.lemma, g.pos));
    pos += Array.from(g.surface).length;
  }
  return { tokens: out };
}

/** Palabras (para fichas de ordenar frases): grupos de kuromoji o respaldo. */
export function segmentJa(text: string): string[] {
  return analyzeJa(text)
    .tokens.map((t) => t.text)
    .filter((t) => t.trim());
}
