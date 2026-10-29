/**
 * Diccionario coreano: Wiktionary (kaikki) + lista NIKL (niveles) + KRDict en español si se configuró la
 * clave + palabras del usuario. Búsqueda por hangul, por consonantes iniciales (초성: ㅎㄱ → 한국),
 * por romanización, por hanja y por español/inglés; formas conjugadas → lema (먹었어요 → 먹다).
 */
import type { DictionaryProvider, DictStatus } from "@/lib/languages/types";
import type { DictEntry, SearchResult } from "@/lib/dictionary/types";
import type { Word } from "@/lib/db/schema";
import { withBase } from "@/lib/base-path";
import { lexiconFromSet, type Lexicon } from "@/lib/segment";
import { choseong, isHangul, romanizeRR } from "./phonology";
import { lemmaCandidatesKo } from "./conjugation";

/** [s, p, en[], es, lv, freq, pos[], hanja, pron] */
type KoCompact = [string, string, string[], string, string, number, string[], string, string];

const bySurface = new Map<string, DictEntry[]>();
const byRoman = new Map<string, DictEntry[]>();
const byHanja = new Map<string, DictEntry[]>();
let all: DictEntry[] = [];
const lexSet = new Set<string>();
let lexicon: Lexicon | undefined;
const userWords = new Map<string, Word>();
let status: DictStatus = "idle";
let error: string | undefined;
let loading: Promise<void> | undefined;
let fullLoading: Promise<void> | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const push = <K, V>(m: Map<K, V[]>, k: K, v: V) => {
  const a = m.get(k);
  if (a) a.push(v);
  else m.set(k, [v]);
};
const normRoman = (s: string) => s.toLowerCase().replace(/[\s'\-·]/g, "");

export const TOPIK_LABEL: Record<string, string> = { TOPIK1: "TOPIK I (A)", TOPIK3: "TOPIK II (B)", TOPIK5: "TOPIK II (C)" };

function fromCompact([s, p, en, es, lv, freq, pos, hanja, pron]: KoCompact): DictEntry {
  return { s, p, t: hanja || undefined, en, es: es || undefined, lv: lv || undefined, freq: freq || undefined, pos: pos?.length ? pos : undefined, src: "wiktionary", extra: { hanja, pron } };
}

export function ingestKo(raw: KoCompact[]): number {
  for (const r of raw) {
    const e = fromCompact(r);
    all.push(e);
    push(bySurface, e.s, e);
    push(byRoman, normRoman(e.p), e);
    if (e.t) push(byHanja, e.t, e);
    lexSet.add(e.s);
  }
  lexicon = lexiconFromSet(lexSet);
  return raw.length;
}

export function resetKoDictionary() {
  bySurface.clear();
  byRoman.clear();
  byHanja.clear();
  all = [];
  lexSet.clear();
  status = "idle";
}

function fromUser(w: Word): DictEntry {
  return { s: w.hanzi, p: w.pinyin, t: (w.extra?.hanja as string) || w.traditional, en: w.meaningEn ? w.meaningEn.split(/;\s*/) : [], es: w.meaning, lv: w.hsk.find((h) => /^TOPIK/.test(h)), src: w.source === "seed" ? "seed" : "user", extra: { hanja: w.extra?.hanja, pron: w.extra?.pronunciation } };
}

const lvRank = (e: DictEntry) => (e.lv ? Number(e.lv.slice(5)) : 9);

export function lookupKo(word: string): DictEntry[] {
  const out: DictEntry[] = [];
  const u = userWords.get(word);
  if (u) out.push(fromUser(u));
  const d = (bySurface.get(word) ?? byHanja.get(word) ?? []).slice().sort((a, b) => lvRank(a) - lvRank(b));
  for (const e of d) {
    if (u && e.s === u.hanzi) out[0] = { ...out[0], en: e.en, pos: e.pos, freq: e.freq, lv: out[0].lv ?? e.lv, t: out[0].t ?? e.t, extra: { ...e.extra, ...Object.fromEntries(Object.entries(out[0].extra ?? {}).filter(([, v]) => v)) } };
    else out.push(e);
  }
  if (!out.length) {
    for (const c of lemmaCandidatesKo(word)) {
      const r = bySurface.get(c) ?? (userWords.get(c) ? [fromUser(userWords.get(c)!)] : undefined);
      if (r?.length) return r;
    }
  }
  return out;
}

export const lookupFirstKo = (w: string) => lookupKo(w)[0];

export function koLexicon(): Lexicon | undefined {
  if (!lexicon && lexSet.size) lexicon = lexiconFromSet(lexSet);
  return lexicon;
}

const strip = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const isChoseongQuery = (q: string) => /^[ㄱ-ㅎ]+$/.test(q);

export function searchKo(query: string, limit = 50): SearchResult[] {
  const q = query.trim();
  if (!q) return [];
  const res: SearchResult[] = [];
  const seen = new Set<string>();
  const add = (e: DictEntry, score: number) => {
    const k = `${e.s}|${e.t ?? ""}`;
    if (seen.has(k)) return;
    seen.add(k);
    res.push({ ...e, score });
  };
  const bonus = (e: DictEntry) => (e.lv ? 10 - lvRank(e) : 0) - (e.freq ? Math.min(e.freq, 50000) / 50000 : 0.5);
  if (isChoseongQuery(q)) {
    for (const w of userWords.values()) if (choseong(w.hanzi).startsWith(q)) add(fromUser(w), 90);
    for (const e of all) {
      const c = choseong(e.s);
      if (c === q) add(e, 85 + bonus(e));
      else if (c.startsWith(q)) add(e, 60 + bonus(e) - e.s.length);
      if (res.length > limit * 4) break;
    }
  } else if (/[一-鿿]/.test(q)) {
    for (const e of byHanja.get(q) ?? []) add(e, 100);
    for (const e of all) if (e.t?.includes(q)) add(e, 60 + bonus(e));
  } else if (Array.from(q).some(isHangul)) {
    for (const e of lookupKo(q)) add(e, 100);
    for (const w of userWords.values()) if (w.hanzi.startsWith(q) && w.hanzi !== q) add(fromUser(w), 75);
    for (const e of all) {
      if (e.s !== q && e.s.startsWith(q)) add(e, 60 + bonus(e) - e.s.length);
      else if (e.s.includes(q) && e.s !== q) add(e, 40 + bonus(e));
      if (res.length > limit * 4) break;
    }
  } else {
    const r = normRoman(q);
    for (const e of byRoman.get(r) ?? []) add(e, 92 + bonus(e));
    const ql = strip(q);
    for (const w of userWords.values()) if (strip(w.meaning).split(/[;,/]\s*/).some((p) => p === ql || p.startsWith(ql))) add(fromUser(w), 97);
    for (const e of all) {
      if (r.length >= 3 && normRoman(e.p).startsWith(r)) add(e, 55 + bonus(e) - e.p.length * 0.3);
      if (e.es && strip(e.es).split(/;\s*/).some((p) => p === ql)) add(e, 88 + bonus(e));
      for (const d of e.en) {
        const dl = d.toLowerCase();
        if (dl === ql || dl === `to ${ql}` || dl.startsWith(`${ql},`) || dl.startsWith(`to ${ql},`)) {
          add(e, 80 + bonus(e));
          break;
        }
        if (ql.length >= 3 && (dl.startsWith(ql + " ") || dl.includes(` ${ql};`))) {
          add(e, 48 + bonus(e) - dl.length * 0.05);
          break;
        }
      }
      if (res.length > limit * 6) break;
    }
  }
  return res.sort((a, b) => b.score - a.score).slice(0, limit);
}

async function loadFile(name: string) {
  const res = await fetch(withBase(`/data/ko/${name}`));
  if (!res.ok) throw new Error(`No se pudo cargar el diccionario coreano (${res.status}). Ejecuta npm run data:build -- --lang=ko.`);
  return ingestKo((await res.json()) as KoCompact[]);
}

export const koDictionary: DictionaryProvider = {
  name: "Wiktionary · NIKL",
  load() {
    if (status === "ready") return Promise.resolve();
    if (!loading) {
      status = "loading";
      emit();
      loading = loadFile("dict-core.json")
        .then(() => {
          status = "ready";
        })
        .catch((e) => {
          status = "error";
          error = (e as Error).message;
        })
        .finally(emit);
    }
    return loading;
  },
  loadFull() {
    fullLoading ??= this.load()
      .then(() => loadFile("dict-full.json"))
      .then(() => undefined)
      .finally(emit);
    return fullLoading;
  },
  status: () => status,
  error: () => error,
  entryCount: () => all.length,
  subscribe(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  lookup: lookupKo,
  lookupFirst: lookupFirstKo,
  search: searchKo,
  lexicon: koLexicon,
  setUserWords(words) {
    userWords.clear();
    for (const w of words) {
      userWords.set(w.hanzi, w);
      lexSet.add(w.hanzi);
    }
    lexicon = lexiconFromSet(lexSet);
  },
  userWord: (t) => userWords.get(t),
  wordsContaining: (ch, limit = 30) => all.filter((e) => e.s.length > 1 && (e.s.includes(ch) || e.t?.includes(ch)) && e.lv).slice(0, limit),
  entriesByLevel: (lv) => all.filter((e) => e.lv === lv),
  levelLabel: (e) => (e.lv ? (TOPIK_LABEL[e.lv] ?? e.lv) : undefined),
  externalLinks: (w) => [
    { name: "한국어기초사전 (KRDict)", url: `https://krdict.korean.go.kr/spa/dicSearch/search?nation=spa&nationCode=4&ParaWordNo=&mainSearchWord=${encodeURIComponent(w)}` },
    { name: "Wiktionary", url: `https://en.wiktionary.org/wiki/${encodeURIComponent(w)}#Korean` },
    { name: "Naver", url: `https://korean.dict.naver.com/koendict/#/search?query=${encodeURIComponent(w)}` },
  ],
};

export { romanizeRR };
