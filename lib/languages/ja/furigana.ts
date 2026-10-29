/**
 * Alinea la lectura en kana con la escritura para poner furigana solo sobre los kanji:
 * 食べる / たべる → [食:た][べる]; 美味しい / おいしい → [美味:おい][しい].
 */
import { isKanji, toHiragana } from "./kana";

export interface FuriSeg {
  text: string;
  reading?: string; // solo en tramos con kanji
}

export function alignFurigana(surface: string, reading: string): FuriSeg[] {
  const chars = Array.from(surface);
  if (!chars.some(isKanji)) return [{ text: surface }];
  const r = toHiragana(reading);
  // trocea la escritura en tramos kanji / no-kanji
  const runs: { text: string; kanji: boolean }[] = [];
  for (const c of chars) {
    const k = isKanji(c);
    const last = runs[runs.length - 1];
    if (last && last.kanji === k) last.text += c;
    else runs.push({ text: c, kanji: k });
  }
  // patrón: tramos de kana literales; tramos de kanji = (.+?)
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = "^" + runs.map((run) => (run.kanji ? "(.+?)" : `(${esc(toHiragana(run.text))})`)).join("") + "$";
  const m = r.match(new RegExp(pattern));
  if (!m) return [{ text: surface, reading: r }];
  return runs.map((run, i) => (run.kanji ? { text: run.text, reading: m[i + 1] } : { text: run.text }));
}
