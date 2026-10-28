"use client";
/**
 * Análisis ("breakdown") de las líneas de un vídeo o texto: segmentación, pinyin, vocabulario
 * nuevo (por nivel HSK y según el mazo del usuario) y puntos gramaticales detectados por reglas.
 */
import { getLexicon, lookupFirst } from "@/lib/dictionary/service";
import type { DictEntry } from "@/lib/dictionary/types";
import { segment } from "@/lib/segment";
import { GRAMMAR } from "@/lib/course";
import { isHanzi, wordPinyin } from "@/lib/pinyin/convert";

export interface LineAnalysis {
  tokens: { text: string; isWord: boolean; entry?: DictEntry; pinyin?: string; known: boolean; inDeck: boolean; hsk?: number }[];
  pinyin: string;
  newWords: { hanzi: string; pinyin: string; meaning: string; hsk?: number }[];
  grammar: { id: string; title: string; zh: string }[];
  knownRatio: number;
}

/** Reglas sencillas de detección de gramática HSK 1–3 (ids de content/grammar.json). */
const RULES: { id: string; test: (zh: string) => boolean }[] = [
  { id: "ma", test: (s) => /吗[？?]/.test(s) },
  { id: "ne", test: (s) => /呢[？?。]/.test(s) },
  { id: "ba", test: (s) => /吧[。！!]/.test(s) },
  { id: "shi", test: (s) => /(^|[^不])是(?!不是)/.test(s) && !/是……的|是.{1,8}的$/.test(s) },
  { id: "bu-mei", test: (s) => /没(有|去|来|看|吃|说|听|买|做)|不(是|去|来|喜欢|想|要|会|能|好|太)/.test(s) },
  { id: "you", test: (s) => /(^|[^没])有/.test(s) },
  { id: "zai", test: (s) => /在/.test(s) },
  { id: "le", test: (s) => /了/.test(s) },
  { id: "modal-verbs", test: (s) => /会|能|可以|想|要/.test(s) },
  { id: "measure-words", test: (s) => /[一二两三四五六七八九十几这那哪][个本块件口杯瓶只岁张条位辆家次些]/.test(s) },
  { id: "de", test: (s) => /的/.test(s) },
  { id: "question-words", test: (s) => /什么|谁|哪儿|哪里|哪|几|多少|怎么样|怎么/.test(s) },
  { id: "tai-le", test: (s) => /太.{1,4}了|不太/.test(s) },
  { id: "hen-adj", test: (s) => /很|非常|真/.test(s) },
  { id: "ye-dou", test: (s) => /也|都/.test(s) },
  { id: "he", test: (s) => /和/.test(s) },
  { id: "lai-qu", test: (s) => /来|去|回/.test(s) },
  { id: "yidianr-youdianr", test: (s) => /一点儿|有点儿|一点|有点/.test(s) },
  { id: "reduplication", test: (s) => /(看看|听听|试试|坐坐|走走|玩玩|说说|想想|问问)/.test(s) },
  { id: "yixia", test: (s) => /一下/.test(s) },
  { id: "shi-de", test: (s) => /是.{1,10}的[。？?]/.test(s) },
  { id: "qing", test: (s) => /请/.test(s) },
  { id: "gei", test: (s) => /给/.test(s) },
  { id: "complements", test: (s) => /看见|听见|听懂|看懂|做完|吃完|得很|得真/.test(s) },
  { id: "mei", test: (s) => /每/.test(s) },
  { id: "dates-time", test: (s) => /[一二三四五六七八九十]+(点|月|号|日|年)|星期/.test(s) },
  { id: "price-age", test: (s) => /多少钱|几岁|多大|块钱|块/.test(s) },
  { id: "numbers", test: (s) => /两|[一二三四五六七八九]十|百/.test(s) },
  { id: "demonstratives", test: (s) => /这|那|哪/.test(s) },
];

const grammarMeta = new Map(GRAMMAR.map((g) => [g.id, { id: g.id, title: g.title, zh: g.zh }]));

export function detectGrammar(zh: string, max = 4): { id: string; title: string; zh: string }[] {
  const out: { id: string; title: string; zh: string }[] = [];
  for (const r of RULES) {
    if (r.test(zh)) {
      const m = grammarMeta.get(r.id);
      if (m) out.push(m);
    }
    if (out.length >= max) break;
  }
  return out;
}

export function analyzeLine(zh: string, known: Set<string>, deck: Set<string>, knownChars: Set<string> = new Set()): LineAnalysis {
  const toks = segment(zh, getLexicon());
  const tokens: LineAnalysis["tokens"] = [];
  const newWords: LineAnalysis["newWords"] = [];
  const seen = new Set<string>();
  let wordCount = 0;
  let knownCount = 0;
  for (const t of toks) {
    if (!t.isWord) {
      tokens.push({ text: t.text, isWord: false, known: true, inDeck: false });
      continue;
    }
    const entry = lookupFirst(t.text);
    const chars = Array.from(t.text);
    const isKnown = known.has(t.text) || (chars.length > 1 && chars.every((c) => known.has(c) || knownChars.has(c)));
    wordCount++;
    if (isKnown) knownCount++;
    tokens.push({ text: t.text, isWord: true, entry, pinyin: entry?.p ?? wordPinyin(t.text), known: isKnown, inDeck: deck.has(t.text), hsk: entry?.hsk });
    if (!isKnown && !seen.has(t.text) && chars.every(isHanzi)) {
      seen.add(t.text);
      newWords.push({ hanzi: t.text, pinyin: entry?.p ?? wordPinyin(t.text), meaning: entry?.es ?? entry?.en?.slice(0, 2).join("; ") ?? "", hsk: entry?.hsk });
    }
  }
  return { tokens, pinyin: tokens.map((t) => (t.isWord ? t.pinyin : t.text)).join(" ").replace(/\s+([，。！？,.!?])/g, "$1"), newWords, grammar: detectGrammar(zh), knownRatio: wordCount ? knownCount / wordCount : 1 };
}

export function comprehensionOfLines(lines: { zh: string }[], known: Set<string>, knownChars: Set<string> = new Set()): { ratio: number; unknown: Map<string, number> } {
  const lex = getLexicon();
  const unknown = new Map<string, number>();
  let total = 0;
  let k = 0;
  for (const l of lines) {
    for (const t of segment(l.zh, lex)) {
      if (!t.isWord) continue;
      total++;
      const chars = Array.from(t.text);
      if (known.has(t.text) || (chars.length > 1 && chars.every((c) => known.has(c) || knownChars.has(c)))) k++;
      else unknown.set(t.text, (unknown.get(t.text) ?? 0) + 1);
    }
  }
  return { ratio: total ? k / total : 1, unknown };
}
