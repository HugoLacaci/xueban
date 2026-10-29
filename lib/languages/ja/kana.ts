/** Tablas de kana (gojūon, dakuten, yōon), utilidades de escritura y caracteres parecidos. */
import * as wanakana from "wanakana";

export const KANA_RE = /[ぁ-ゖァ-ヺーゝゞヽヾ]/;
export const KANJI_RE = /[一-鿿㐀-䶿々]/; // incluye 々
export const isKana = (c: string) => KANA_RE.test(c);
export const isKanji = (c: string) => KANJI_RE.test(c);
export const isJapaneseChar = (c: string) => isKana(c) || isKanji(c);
export const hasJapanese = (s: string) => Array.from(s).some(isJapaneseChar);
export const hasKanji = (s: string) => Array.from(s).some(isKanji);

export const toHiragana = (s: string) => wanakana.toHiragana(s, { passRomaji: true });
export const toKatakana = (s: string) => wanakana.toKatakana(s, { passRomaji: true });
export const toRomaji = (s: string) => wanakana.toRomaji(s);

export interface KanaRow {
  id: string; // a, ka, sa…
  name: string; // «fila A»
  romaji: string[]; // a i u e o (vacíos para huecos)
  hiragana: string[];
  katakana: string[];
}

const row = (id: string, name: string, romaji: string[]): KanaRow => ({
  id,
  name,
  romaji,
  hiragana: romaji.map((r) => (r ? wanakana.toHiragana(r === "n" ? "nn" : r) : "")),
  katakana: romaji.map((r) => (r ? wanakana.toKatakana(r === "n" ? "nn" : r) : "")),
});

export const GOJUON: KanaRow[] = [
  row("a", "Vocales", ["a", "i", "u", "e", "o"]),
  row("ka", "Fila K", ["ka", "ki", "ku", "ke", "ko"]),
  row("sa", "Fila S", ["sa", "shi", "su", "se", "so"]),
  row("ta", "Fila T", ["ta", "chi", "tsu", "te", "to"]),
  row("na", "Fila N", ["na", "ni", "nu", "ne", "no"]),
  row("ha", "Fila H", ["ha", "hi", "fu", "he", "ho"]),
  row("ma", "Fila M", ["ma", "mi", "mu", "me", "mo"]),
  row("ya", "Fila Y", ["ya", "", "yu", "", "yo"]),
  row("ra", "Fila R", ["ra", "ri", "ru", "re", "ro"]),
  row("wa", "Fila W", ["wa", "", "", "", "wo"]),
  row("n", "N final", ["n", "", "", "", ""]),
];

export const DAKUTEN: KanaRow[] = [
  row("ga", "G (dakuten)", ["ga", "gi", "gu", "ge", "go"]),
  row("za", "Z (dakuten)", ["za", "ji", "zu", "ze", "zo"]),
  row("da", "D (dakuten)", ["da", "dji", "dzu", "de", "do"]),
  row("ba", "B (dakuten)", ["ba", "bi", "bu", "be", "bo"]),
  row("pa", "P (handakuten)", ["pa", "pi", "pu", "pe", "po"]),
];
// ぢ / づ: wanakana no los genera con «dji/dzu»
DAKUTEN[2].hiragana = ["だ", "ぢ", "づ", "で", "ど"];
DAKUTEN[2].katakana = ["ダ", "ヂ", "ヅ", "デ", "ド"];
DAKUTEN[2].romaji = ["da", "ji", "zu", "de", "do"];

export const YOON: KanaRow[] = ["k", "s", "c", "n", "h", "m", "r", "g", "j", "b", "p"].map((c) => {
  const base = c === "s" ? "sh" : c === "c" ? "ch" : c === "j" ? "j" : `${c}y`;
  const romaji = [`${base}a`, "", `${base}u`, "", `${base}o`];
  return row(`${base}a`, `${base.toUpperCase()}A · ${base.toUpperCase()}U · ${base.toUpperCase()}O`, romaji);
});

export const ALL_ROWS = [...GOJUON, ...DAKUTEN, ...YOON];

export function rowById(id: string): KanaRow | undefined {
  return ALL_ROWS.find((r) => r.id === id);
}

/** Todos los kana básicos (hiragana y katakana) con su rōmaji. */
export const KANA_LIST: { kana: string; romaji: string; script: "hiragana" | "katakana" }[] = ALL_ROWS.flatMap((r) =>
  r.romaji.flatMap((ro, i) =>
    ro
      ? [
          { kana: r.hiragana[i], romaji: ro, script: "hiragana" as const },
          { kana: r.katakana[i], romaji: ro, script: "katakana" as const },
        ]
      : [],
  ),
);

/** Grupos de caracteres que se confunden (kana y kanji N5). */
export const SIMILAR_SETS: string[][] = [
  ["シ", "ツ"],
  ["ソ", "ン"],
  ["ぬ", "め"],
  ["わ", "れ", "ね"],
  ["は", "ほ"],
  ["あ", "お"],
  ["さ", "ち"],
  ["る", "ろ"],
  ["い", "り"],
  ["う", "ら"],
  ["き", "さ"],
  ["ク", "ケ", "タ"],
  ["コ", "ユ"],
  ["チ", "テ"],
  ["ウ", "ワ", "フ"],
  ["ノ", "メ"],
  ["ス", "ヌ"],
  ["マ", "ム"],
  ["カ", "力"],
  ["エ", "工"],
  ["ニ", "二"],
  ["ロ", "口"],
  ["未", "末"],
  ["土", "士"],
  ["人", "入", "八"],
  ["大", "太", "犬"],
  ["日", "目", "白"],
  ["休", "体"],
  ["午", "牛"],
  ["右", "石"],
  ["千", "干"],
  ["天", "夫"],
  ["見", "貝"],
  ["読", "語"],
  ["持", "待", "特"],
  ["間", "聞", "問"],
  ["校", "交"],
  ["雨", "両"],
];

/** Moras de una palabra en kana (きゃ, っ, ー y ん cuentan como una mora). */
export function moras(kana: string): string[] {
  const out: string[] = [];
  for (const ch of Array.from(kana)) {
    if (/[ゃゅょャュョぁぃぅぇぉァィゥェォ]/.test(ch) && out.length) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out;
}
