"use client";
/**
 * Análisis ("breakdown") de las líneas de un vídeo o texto en el idioma activo: tokens con lectura,
 * lema y forma conjugada, vocabulario nuevo (por nivel y según el mazo del usuario) y puntos
 * gramaticales detectados por reglas del paquete.
 */
import { lookupFirst, levelLabel } from "@/lib/dictionary/service";
import type { DictEntry } from "@/lib/dictionary/types";
import { getActivePack } from "@/lib/languages/registry";

export interface LineToken {
  text: string;
  isWord: boolean;
  entry?: DictEntry;
  pinyin?: string; // lectura
  lemma?: string; // forma de diccionario si difiere (食べました → 食べる)
  pos?: string;
  known: boolean;
  inDeck: boolean;
  hsk?: number; // rango de nivel para ordenar (1 = más básico)
  level?: string; // etiqueta («HSK 1», «N5», «TOPIK 1»)
}

export interface LineAnalysis {
  tokens: LineToken[];
  pinyin: string;
  newWords: { hanzi: string; pinyin: string; meaning: string; hsk?: number; level?: string }[];
  grammar: { id: string; title: string; zh: string }[];
  knownRatio: number;
}

/** Rango numérico de una entrada (1 = más básico) para ordenar vocabulario nuevo. */
function levelRank(e?: DictEntry): number | undefined {
  if (!e) return undefined;
  if (e.hsk) return e.hsk;
  const lv = e.lv ?? "";
  const n5 = lv.match(/^N([1-5])$/);
  if (n5) return 6 - Number(n5[1]);
  const t = lv.match(/(\d)/);
  return t ? Number(t[1]) : undefined;
}

export function detectGrammar(text: string, max = 4): { id: string; title: string; zh: string }[] {
  const pack = getActivePack();
  return pack.grammar
    .detect(text)
    .slice(0, max)
    .map((id) => pack.grammar.byId(id))
    .filter((g): g is NonNullable<typeof g> => Boolean(g))
    .map((g) => ({ id: g.id, title: g.title, zh: g.zh }));
}

function isKnownToken(text: string, lemma: string | undefined, known: Set<string>, knownChars: Set<string>): boolean {
  if (known.has(text) || (lemma && known.has(lemma))) return true;
  const chars = Array.from(text);
  return chars.length > 1 && chars.every((c) => known.has(c) || knownChars.has(c));
}

export function analyzeLine(zh: string, known: Set<string>, deck: Set<string>, knownChars: Set<string> = new Set()): LineAnalysis {
  const pack = getActivePack();
  const toks = pack.analyze(zh).tokens;
  const tokens: LineToken[] = [];
  const newWords: LineAnalysis["newWords"] = [];
  const seen = new Set<string>();
  let wordCount = 0;
  let knownCount = 0;
  for (const t of toks) {
    if (!t.isWord) {
      tokens.push({ text: t.text, isWord: false, known: true, inDeck: false });
      continue;
    }
    const key = t.lemma ?? t.text;
    const entry = lookupFirst(key) ?? (t.lemma ? lookupFirst(t.text) : undefined);
    const isKnown = isKnownToken(t.text, t.lemma, known, knownChars);
    // las partículas y auxiliares cuentan como palabras, pero no como «nuevas» si son gramática
    wordCount++;
    if (isKnown) knownCount++;
    const reading = entry?.p ?? t.reading ?? pack.reading(t.text);
    tokens.push({ text: t.text, isWord: true, entry, pinyin: t.reading ?? reading, lemma: t.lemma && t.lemma !== t.text ? t.lemma : undefined, pos: t.pos, known: isKnown, inDeck: deck.has(t.text) || deck.has(key), hsk: levelRank(entry), level: entry ? levelLabel(entry) : undefined });
    if (!isKnown && !seen.has(key) && Array.from(t.text).every((c) => pack.isTargetChar(c))) {
      seen.add(key);
      newWords.push({ hanzi: key, pinyin: entry?.p ?? pack.reading(key), meaning: entry?.es ?? entry?.en?.slice(0, 2).join("; ") ?? "", hsk: levelRank(entry), level: entry ? levelLabel(entry) : undefined });
    }
  }
  const sep = pack.id === "zh" ? " " : " ";
  return {
    tokens,
    pinyin: tokens
      .map((t) => (t.isWord ? t.pinyin : t.text))
      .join(sep)
      .replace(/\s+([，。！？、,.!?])/g, "$1"),
    newWords,
    grammar: detectGrammar(zh),
    knownRatio: wordCount ? knownCount / wordCount : 1,
  };
}

export function comprehensionOfLines(lines: { zh: string }[], known: Set<string>, knownChars: Set<string> = new Set()): { ratio: number; unknown: Map<string, number> } {
  const pack = getActivePack();
  const unknown = new Map<string, number>();
  let total = 0;
  let k = 0;
  for (const l of lines) {
    for (const t of pack.analyze(l.zh).tokens) {
      if (!t.isWord) continue;
      total++;
      if (isKnownToken(t.text, t.lemma, known, knownChars)) k++;
      else {
        const key = t.lemma ?? t.text;
        unknown.set(key, (unknown.get(key) ?? 0) + 1);
      }
    }
  }
  return { ratio: total ? k / total : 1, unknown };
}
