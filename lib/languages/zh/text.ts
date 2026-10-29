/** Análisis de texto chino: segmentación con el léxico del diccionario + pinyin por carácter + sandhi. */
import type { AnalyzedToken, TextAnalysis } from "@/lib/languages/types";
import { segment } from "@/lib/segment";
import { getLexicon, lookupFirst } from "./dictionary";
import { distributePinyin, isHanzi, lexicalPinyinPerChar, wordPinyin } from "./pinyin/convert";
import { applySandhi, splitSyllables, toneOf } from "./pinyin/tones";

export function analyzeZh(text: string, opts?: { wordReadings?: Record<string, string> }): TextAnalysis {
  const tokens = segment(text, getLexicon());
  const auto = lexicalPinyinPerChar(text);
  const perChar: string[] = [];
  const rows: { token: (typeof tokens)[number]; py: string[] }[] = [];
  for (const t of tokens) {
    const chars = Array.from(t.text);
    let py: string[] = chars.map((c, i) => (isHanzi(c) ? (auto[t.start + i] ?? "") : ""));
    if (t.isWord) {
      const override = opts?.wordReadings?.[t.text] ?? lookupFirst(t.text)?.p;
      if (override) {
        const d = distributePinyin(t.text, override);
        if (d) py = d;
      }
    }
    perChar.push(...py);
    rows.push({ token: t, py });
  }
  const sandhied = applySandhi(Array.from(text), perChar);
  const out: AnalyzedToken[] = rows.map(({ token, py }) => {
    const segments = Array.from(token.text).map((hanzi, i) => {
      const s = sandhied[token.start + i];
      const reading = s?.pinyin || py[i] || "";
      const tone = reading ? toneOf(reading) : py[i] ? toneOf(py[i]) : 5;
      return { text: hanzi, reading: isHanzi(hanzi) ? reading : undefined, cls: isHanzi(hanzi) ? `tone-${tone}` : undefined, title: s?.sandhi ? "sandhi tonal" : undefined };
    });
    return { text: token.text, isWord: token.isWord, start: token.start, segments, reading: token.isWord ? py.filter(Boolean).join(" ") : undefined };
  });
  return { tokens: out };
}

export function colorizePinyin(reading: string): { text: string; cls?: string }[] {
  return splitSyllables(reading).map((p) => (p.isSyllable ? { text: p.text, cls: `tone-${p.tone}` } : { text: p.text }));
}

export function readingOfZh(text: string): string {
  return wordPinyin(text);
}
