import { isHanzi } from "@/lib/pinyin/convert";

export interface Token {
  text: string;
  isWord: boolean; // true si contiene hanzi
  start: number; // índice (en code points) dentro del texto
}

export interface Lexicon {
  has(word: string): boolean;
  maxLen: number;
}

export function lexiconFromSet(set: Set<string>): Lexicon {
  let maxLen = 1;
  for (const w of set) maxLen = Math.max(maxLen, Array.from(w).length);
  return { has: (w) => set.has(w), maxLen: Math.min(maxLen, 8) };
}

/**
 * Segmentación por máxima coincidencia hacia delante con un léxico (diccionario + palabras del usuario),
 * con corrección "backward" para resolver ambigüedades típicas. Si no hay léxico, usa Intl.Segmenter.
 */
export function segment(text: string, lexicon?: Lexicon): Token[] {
  const chars = Array.from(text);
  const tokens: Token[] = [];
  let i = 0;
  while (i < chars.length) {
    const ch = chars[i];
    if (!isHanzi(ch)) {
      // agrupa no-hanzi consecutivos (puntuación, latín, números)
      let j = i + 1;
      while (j < chars.length && !isHanzi(chars[j])) j++;
      tokens.push({ text: chars.slice(i, j).join(""), isWord: false, start: i });
      i = j;
      continue;
    }
    // tramo de hanzi consecutivos
    let j = i;
    while (j < chars.length && isHanzi(chars[j])) j++;
    const run = chars.slice(i, j);
    const words = lexicon ? maxMatch(run, lexicon) : intlSegment(run.join(""));
    let pos = i;
    for (const w of words) {
      tokens.push({ text: w, isWord: true, start: pos });
      pos += Array.from(w).length;
    }
    i = j;
  }
  return tokens;
}

function maxMatch(chars: string[], lex: Lexicon): string[] {
  const fwd = forward(chars, lex);
  const bwd = backward(chars, lex);
  // Heurística clásica: menos tokens; empate → menos tokens de un carácter.
  if (bwd.length < fwd.length) return bwd;
  if (bwd.length === fwd.length) {
    const single = (a: string[]) => a.filter((w) => w.length === 1).length;
    if (single(bwd) < single(fwd)) return bwd;
  }
  return fwd;
}

function forward(chars: string[], lex: Lexicon): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < chars.length) {
    let found = "";
    for (let len = Math.min(lex.maxLen, chars.length - i); len >= 2; len--) {
      const cand = chars.slice(i, i + len).join("");
      if (lex.has(cand)) {
        found = cand;
        break;
      }
    }
    if (!found) found = chars[i];
    out.push(found);
    i += Array.from(found).length;
  }
  return out;
}

function backward(chars: string[], lex: Lexicon): string[] {
  const out: string[] = [];
  let i = chars.length;
  while (i > 0) {
    let found = "";
    for (let len = Math.min(lex.maxLen, i); len >= 2; len--) {
      const cand = chars.slice(i - len, i).join("");
      if (lex.has(cand)) {
        found = cand;
        break;
      }
    }
    if (!found) found = chars[i - 1];
    out.unshift(found);
    i -= Array.from(found).length;
  }
  return out;
}

function intlSegment(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const seg = new Intl.Segmenter("zh", { granularity: "word" });
    return Array.from(seg.segment(text)).map((s) => s.segment);
  }
  return Array.from(text);
}

/** Palabras (solo hanzi) de un texto. */
export function wordsOf(text: string, lexicon?: Lexicon): string[] {
  return segment(text, lexicon)
    .filter((t) => t.isWord)
    .map((t) => t.text);
}

/** % de palabras conocidas de un texto (por tokens, no por tipos). */
export function comprehension(text: string, known: Set<string>, lexicon?: Lexicon): { ratio: number; total: number; unknown: string[] } {
  const words = wordsOf(text, lexicon);
  if (!words.length) return { ratio: 1, total: 0, unknown: [] };
  const unknown: string[] = [];
  let k = 0;
  for (const w of words) {
    if (known.has(w) || Array.from(w).every((c) => known.has(c))) k++;
    else if (!unknown.includes(w)) unknown.push(w);
  }
  return { ratio: k / words.length, total: words.length, unknown };
}
