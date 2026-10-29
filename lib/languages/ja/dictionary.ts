/**
 * Diccionario japonés: JMdict (núcleo: comunes + JLPT + semilla; completo bajo demanda) con glosas en
 * español cuando existen, nivel JLPT comunitario y acento de Kanjium. Búsqueda por kanji/kana,
 * rōmaji (wanakana), español/inglés y formas conjugadas (deinflexión).
 */
import type { DictionaryProvider, DictStatus } from "@/lib/languages/types";
import type { DictEntry, SearchResult } from "@/lib/dictionary/types";
import type { Word } from "@/lib/db/schema";
import { withBase } from "@/lib/base-path";
import { lexiconFromSet, type Lexicon } from "@/lib/segment";
import { hasJapanese, toHiragana } from "./kana";
import { deinflect } from "./conjugation";
import * as wanakana from "wanakana";

/** [s, p, en[], es, lv, freq, pos[], pitch[], alt[]] */
type JaCompact = [string, string, string[], string, string, number, string[], number[], string[]];

const bySurface = new Map<string, DictEntry[]>();
const byReading = new Map<string, DictEntry[]>();
let all: DictEntry[] = [];
const lexSet = new Set<string>();
let lexicon: Lexicon | undefined;
const userWords = new Map<string, Word>();
let status: DictStatus = "idle";
let fullStatus: DictStatus = "idle";
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

function fromCompact([s, p, en, es, lv, freq, pos, pitch, alt]: JaCompact): DictEntry {
  return {
    s,
    p,
    t: s !== p && /[一-鿿]/.test(s) ? p : undefined, // escritura alternativa: solo kana
    en,
    es: es || undefined,
    lv: lv || undefined,
    freq: freq || undefined,
    pos: pos?.length ? pos : undefined,
    src: "jmdict",
    extra: { pitch: pitch ?? [], alt: alt ?? [] },
  };
}

export function ingestJa(raw: JaCompact[]): number {
  for (const r of raw) {
    const e = fromCompact(r);
    all.push(e);
    push(bySurface, e.s, e);
    push(byReading, e.p, e);
    lexSet.add(e.s);
    for (const a of (e.extra?.alt as string[]) ?? []) {
      push(bySurface, a, e);
      lexSet.add(a);
    }
  }
  lexicon = lexiconFromSet(lexSet);
  return raw.length;
}

export function resetJaDictionary() {
  bySurface.clear();
  byReading.clear();
  all = [];
  lexSet.clear();
  lexicon = undefined;
  status = "idle";
  fullStatus = "idle";
}

function fromUser(w: Word): DictEntry {
  return { s: w.hanzi, p: w.pinyin, en: w.meaningEn ? w.meaningEn.split(/;\s*/) : [], es: w.meaning, lv: w.hsk.find((h) => /^N\d$/.test(h)), src: w.source === "seed" ? "seed" : "user", extra: { pitch: w.extra?.pitch_all ?? (w.extra?.pitch_accent != null ? [w.extra.pitch_accent] : []) } };
}

export function lookupJa(word: string): DictEntry[] {
  const out: DictEntry[] = [];
  const u = userWords.get(word);
  if (u) out.push(fromUser(u));
  let d = bySurface.get(word) ?? [];
  if (!d.length && !/[一-鿿]/.test(word)) d = byReading.get(toHiragana(word)) ?? [];
  const sorted = d.slice().sort((a, b) => (a.s === word ? 0 : 1) - (b.s === word ? 0 : 1) || (lvRank(a) - lvRank(b)) || ((a.freq ?? 1e6) - (b.freq ?? 1e6)));
  for (const e of sorted) {
    if (u && e.p === u.pinyin) out[0] = { ...out[0], en: e.en, pos: e.pos, freq: e.freq, lv: out[0].lv ?? e.lv, t: e.t, extra: { ...e.extra, ...out[0].extra, alt: e.extra?.alt } };
    else out.push(e);
  }
  // variantes de la semilla («初め; 始め»), verbos con する, adverbios con と y grafías alternativas
  if (!out.length) {
    const alts = word.includes(";") ? word.split(/;s*/) : [];
    if (word.endsWith("する") && word.length > 2) alts.push(word.slice(0, -2));
    if (word.endsWith("と") && word.length > 2) alts.push(word.slice(0, -1));
    if (word.startsWith("さ来")) alts.push("再来" + word.slice(2));
    for (const a of alts) {
      const r = a && a !== word ? lookupJa(a) : [];
      if (r.length) return r.map((e) => ({ ...e, s: word }));
    }
  }
  // afijos de la semilla («～円», «お～»): se buscan sin la tilde ondulada
  if (!out.length && /[～〜]/.test(word)) {
    const bare = word.replace(/[～〜]/g, "");
    if (bare) return lookupJa(bare).map((e) => ({ ...e, s: word }));
  }
  if (!out.length) for (const cand of deinflect(word)) {
    const r = bySurface.get(cand);
    if (r?.length) return r;
  }
  return out;
}

const lvRank = (e: DictEntry) => (e.lv ? 6 - Number(e.lv.slice(1)) : 9);

export function lookupFirstJa(word: string): DictEntry | undefined {
  return lookupJa(word)[0];
}

export function jaLexicon(): Lexicon | undefined {
  if (!lexicon && lexSet.size) lexicon = lexiconFromSet(lexSet);
  return lexicon;
}

const strip = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function searchJa(query: string, limit = 50): SearchResult[] {
  const q = query.trim();
  if (!q) return [];
  const results: SearchResult[] = [];
  const seen = new Set<string>();
  const add = (e: DictEntry, score: number) => {
    const k = `${e.s}|${e.p}`;
    if (seen.has(k)) return;
    seen.add(k);
    results.push({ ...e, score });
  };
  const bonus = (e: DictEntry) => (e.lv ? 10 - lvRank(e) : 0) - (e.freq ? Math.min(e.freq, 50000) / 50000 : 0.5);
  const isRomaji = /^[a-zA-Z' -]+$/.test(q) && !/\s{2}/.test(q);
  if (hasJapanese(q) || isRomaji) {
    const kanaQ = isRomaji ? wanakana.toHiragana(q.replace(/\s+/g, "")) : q;
    for (const e of lookupJa(q)) add(e, 100);
    for (const e of byReading.get(toHiragana(kanaQ)) ?? []) add(e, 95 + bonus(e));
    for (const c of deinflect(kanaQ)) for (const e of bySurface.get(c) ?? []) add(e, 90 + bonus(e));
    for (const w of userWords.values()) if (w.hanzi.includes(q) || w.pinyin.startsWith(toHiragana(kanaQ))) add(fromUser(w), 85);
    let n = 0;
    for (const e of all) {
      if (results.length > limit * 4 || n++ > 60000) break;
      if (e.s.startsWith(q) || e.p.startsWith(toHiragana(kanaQ))) add(e, 60 + bonus(e) - e.s.length * 0.3);
      else if (e.s.includes(q)) add(e, 40 + bonus(e));
    }
  }
  if (!hasJapanese(q) && q.length >= 2) {
    const ql = strip(q);
    for (const w of userWords.values()) if (strip(w.meaning).split(/[;,/]\s*/).some((p) => p === ql || p.startsWith(ql))) add(fromUser(w), 97);
    for (const e of all) {
      const es = e.es ? strip(e.es) : "";
      if (es) {
        const parts = es.split(/;\s*/);
        if (parts.includes(ql)) {
          add(e, 88 + bonus(e));
          continue;
        }
        if (parts.some((p) => p.startsWith(ql + " ") || p === ql + "s")) {
          add(e, 70 + bonus(e));
          continue;
        }
      }
      for (const d of e.en) {
        const dl = d.toLowerCase();
        if (dl === ql || dl === "to " + ql) {
          add(e, 80 + bonus(e));
          break;
        }
        if (dl.startsWith(ql + " ") || dl.startsWith("to " + ql + " ") || dl.includes(" " + ql + ";")) {
          add(e, 50 + bonus(e) - dl.length * 0.05);
          break;
        }
      }
      if (results.length > limit * 6) break;
    }
  }
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function wordsContainingJa(ch: string, limit = 30): DictEntry[] {
  const out: DictEntry[] = [];
  for (const e of all) {
    if (e.s.length > 1 && e.s.includes(ch) && (e.lv || (e.freq && e.freq < 20000))) out.push(e);
    if (out.length > 400) break;
  }
  return out.sort((a, b) => lvRank(a) - lvRank(b) || (a.freq ?? 1e9) - (b.freq ?? 1e9)).slice(0, limit);
}

async function loadFile(name: string): Promise<number> {
  const res = await fetch(withBase(`/data/ja/${name}`));
  if (!res.ok) throw new Error(`No se pudo cargar el diccionario japonés (${res.status}). Ejecuta npm run data:build -- --lang=ja.`);
  return ingestJa((await res.json()) as JaCompact[]);
}

export const jaDictionary: DictionaryProvider = {
  name: "JMdict",
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
    if (!fullLoading) {
      fullStatus = "loading";
      fullLoading = this.load()
        .then(() => loadFile("dict-full.json"))
        .then(() => {
          fullStatus = "ready";
        })
        .catch(() => {
          fullStatus = "error";
        })
        .finally(emit);
    }
    return fullLoading;
  },
  status: () => status,
  error: () => error,
  entryCount: () => all.length,
  subscribe(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  lookup: lookupJa,
  lookupFirst: lookupFirstJa,
  search: searchJa,
  lexicon: jaLexicon,
  setUserWords(words) {
    userWords.clear();
    for (const w of words) {
      userWords.set(w.hanzi, w);
      lexSet.add(w.hanzi);
    }
    lexicon = lexiconFromSet(lexSet);
  },
  userWord: (t) => userWords.get(t),
  wordsContaining: wordsContainingJa,
  entriesByLevel: (level) => all.filter((e) => e.lv === level),
  levelLabel: (e) => e.lv,
  externalLinks: (w) => [
    { name: "Jisho", url: `https://jisho.org/search/${encodeURIComponent(w)}` },
    { name: "OJAD (acento)", url: `https://www.gavo.t.u-tokyo.ac.jp/ojad/search/index/word:${encodeURIComponent(w)}` },
    { name: "Weblio", url: `https://www.weblio.jp/content/${encodeURIComponent(w)}` },
  ],
};

export function jaFullStatus(): DictStatus {
  return fullStatus;
}
