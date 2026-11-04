/**
 * Pinyin → hanzi probable (para el audio y para mostrar la frase en caracteres cuando el profesor la dio en pinyin).
 * Segmentación por programación dinámica: entre todas las formas de partir las sílabas en palabras del diccionario,
 * gana la que usa palabras más básicas (nivel HSK) y frecuentes. Así «mei2 qu4» es 没去 y no 没趣, y «xue2sheng»
 * es 学生. Si alguna sílaba no se resuelve, devuelve null: mejor no inventar.
 */
import { isLoaded, search } from "@/lib/languages/zh/dictionary";
import type { DictEntry } from "@/lib/dictionary/types";
import { normalizePinyin, syllablesOf, toneOf } from "@/lib/languages/zh/pinyin/tones";

export interface Syl {
  base: string;
  /** 1–5; 0 = desconocido (pinyin sin tonos) */
  tone: number;
}

const tonesMatch = (want: number, got: number) => !want || want === got || (want === 5 && got !== 0) || got === 5;

function entrySyllables(p: string): Syl[] {
  return syllablesOf(p).map((s) => ({ base: normalizePinyin(s), tone: toneOf(s) }));
}

// las búsquedas por pinyin recorren el diccionario: se guardan (el diccionario no cambia durante la sesión)
const searchCache = new Map<string, DictEntry[]>();
function searchPinyin(query: string, limit: number): DictEntry[] {
  const key = query + "|" + limit;
  let r = searchCache.get(key);
  if (!r) {
    r = search(query, limit);
    if (searchCache.size > 2000) searchCache.clear();
    searchCache.set(key, r);
  }
  return r;
}

/** Mejor entrada del diccionario para un tramo de sílabas (o null) y su «coste» (menor = más básica). */
function bestEntry(span: Syl[]): { s: string; cost: number } | null {
  const len = span.length;
  const query = span.map((s) => s.base).join("");
  const matches = searchPinyin(query, len === 1 ? 400 : 120).filter((e) => {
    if (!e.p || [...e.s].length !== len) return false;
    const es = entrySyllables(e.p);
    return es.length === len && es.every((x, k) => x.base === span[k].base && tonesMatch(span[k].tone, x.tone));
  });
  if (!matches.length) return null;
  const exact = matches.filter((e) => entrySyllables(e.p).every((x, k) => x.tone === (span[k].tone || x.tone)));
  const pool = (exact.length ? exact : matches).slice();
  const rank = (e: DictEntry) => (e.hsk ?? 8) + Math.min(e.freq ?? 50000, 50000) / 50000;
  pool.sort((a, b) => rank(a) - rank(b));
  const e = pool[0];
  // cada palabra cuesta 1 más su rareza: dos palabras básicas (没 + 去) ganan a una rara (没趣),
  // pero una palabra básica (学生) gana a sus dos caracteres sueltos
  return { s: e.s, cost: 1 + rank(e) + (exact.length ? 0 : 0.5) };
}

export function pinyinToHanzi(syl: Syl[]): string | null {
  if (!syl.length || !isLoaded()) return null;
  const n = syl.length;
  const best: ({ cost: number; text: string } | null)[] = Array(n + 1).fill(null);
  best[0] = { cost: 0, text: "" };
  for (let i = 0; i < n; i++) {
    const cur = best[i];
    if (!cur) continue;
    for (let len = 1; len <= Math.min(4, n - i); len++) {
      const e = bestEntry(syl.slice(i, i + len));
      if (!e) continue;
      const cand = { cost: cur.cost + e.cost, text: cur.text + e.s };
      const prev = best[i + len];
      if (!prev || cand.cost < prev.cost) best[i + len] = cand;
    }
  }
  return best[n]?.text ?? null;
}
