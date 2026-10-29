/**
 * Análisis de texto coreano para la interfaz: segmenta por 어절 (palabras separadas por espacios),
 * separa partículas (은/는, 이/가, 을/를, 에, 에서, 의, 도, 와/과, 하고, (으)로, 부터, 까지, 한테…) y
 * propone el lema de las formas verbales (먹었어요 → 먹다) contra el diccionario.
 * Kiwi (kiwi-nlp, WASM) sería más preciso, pero su modelo pesa ≈ 88 MB: para el nivel TOPIK I este
 * analizador ligero por reglas basta y funciona offline sin descargas.
 */
import type { AnalyzedToken, TextAnalysis } from "@/lib/languages/types";
import { isHangul, pronounce, romanizeRR } from "./phonology";
import { lemmaCandidatesKo } from "./conjugation";
import { lookupKo } from "./dictionary";

/** Partículas de más larga a más corta. */
export const PARTICLES = ["에서는", "에게서", "한테서", "으로는", "에서", "에게", "한테", "께서", "까지", "부터", "보다", "처럼", "하고", "이랑", "으로", "이나", "에는", "에도", "은", "는", "이", "가", "을", "를", "에", "의", "도", "와", "과", "로", "만", "랑", "나", "요"];

const cache = new Map<string, TextAnalysis>();

function splitEojeol(word: string): { stem: string; particle?: string; lemma?: string } {
  if (lookupKo(word).length && !/(요|다|니다)$/.test(word)) return { stem: word };
  for (const p of PARTICLES) {
    if (word.length > p.length && word.endsWith(p)) {
      const stem = word.slice(0, -p.length);
      if (lookupKo(stem).some((e) => e.s === stem || !e.pos?.includes("verbo"))) return { stem, particle: p };
    }
  }
  const lemma = lemmaCandidatesKo(word).find((c) => lookupKo(c).some((e) => e.s === c));
  return { stem: word, lemma };
}

function token(text: string, start: number, isWord: boolean, lemma?: string, pos?: string): AnalyzedToken {
  if (!isWord) return { text, isWord: false, start, segments: [{ text }] };
  const pr = pronounce(text);
  const roman = romanizeRR(text);
  const changed = pr.pron !== text;
  return {
    text,
    isWord: true,
    start,
    segments: [{ text, reading: roman, cls: changed ? (pr.rules.length ? `ko-rule-${pr.rules[0]}` : undefined) : undefined, title: changed ? `[${pr.pron}]` : undefined }],
    reading: roman,
    pronunciation: changed ? pr.pron : undefined,
    lemma,
    pos,
  };
}

export function analyzeKo(text: string): TextAnalysis {
  const c = cache.get(text);
  if (c) return c;
  const tokens: AnalyzedToken[] = [];
  const chars = Array.from(text);
  let i = 0;
  while (i < chars.length) {
    if (!isHangul(chars[i])) {
      let j = i + 1;
      while (j < chars.length && !isHangul(chars[j])) j++;
      tokens.push(token(chars.slice(i, j).join(""), i, false));
      i = j;
      continue;
    }
    let j = i;
    while (j < chars.length && isHangul(chars[j])) j++;
    const word = chars.slice(i, j).join("");
    const { stem, particle, lemma } = splitEojeol(word);
    tokens.push(token(stem, i, true, lemma));
    if (particle) tokens.push(token(particle, i + Array.from(stem).length, true, undefined, "partícula"));
    i = j;
  }
  const res = { tokens };
  if (cache.size > 3000) cache.clear();
  cache.set(text, res);
  return res;
}

export function segmentKo(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

export function clearKoCache() {
  cache.clear();
}
