import { pinyin as pp } from "pinyin-pro";
import { applySandhi, syllablesOf, type Tone, toneOf } from "./tones";

export interface CharPinyin {
  hanzi: string;
  pinyin: string; // forma lexical con diacríticos ("" si no es hanzi)
  spoken: string; // tras sandhi
  tone: Tone;
  sandhi: "33" | "bu" | "yi" | null;
  isHanzi: boolean;
}

export const HANZI_RE = /[一-鿿㐀-䶿]/;
export const HANZI_ONLY_RE = /^[一-鿿㐀-䶿]+$/;
export function isHanzi(ch: string): boolean {
  return HANZI_RE.test(ch);
}
export function hanziOnly(s: string): string {
  return Array.from(s).filter(isHanzi).join("");
}
export function hasHanzi(s: string): boolean {
  return HANZI_RE.test(s);
}

/** Pinyin lexical carácter a carácter (sin sandhi) usando pinyin-pro con polifonía por contexto. */
export function lexicalPinyinPerChar(text: string): string[] {
  const all = pp(text, { type: "all", toneType: "symbol", nonZh: "consecutive", toneSandhi: false });
  const out: string[] = [];
  for (const item of all) {
    if (item.isZh) out.push(item.pinyin);
    else for (let i = 0; i < Array.from(item.origin).length; i++) out.push("");
  }
  return out;
}

/**
 * Pinyin carácter a carácter para un texto y aplicación de sandhi para la forma hablada.
 * `override` permite imponer el pinyin de cada carácter (p. ej. desde el diccionario/semilla).
 */
export function textToPinyin(text: string, override?: (string | undefined)[]): CharPinyin[] {
  const chars = Array.from(text);
  const auto = lexicalPinyinPerChar(text);
  const lexical = chars.map((ch, i) => (override && override[i] !== undefined ? override[i]! : auto[i] ?? ""));
  const sandhied = applySandhi(chars, lexical);
  return chars.map((hanzi, i) => ({
    hanzi,
    pinyin: lexical[i] ?? "",
    spoken: sandhied[i].pinyin,
    tone: lexical[i] ? toneOf(lexical[i]) : 5,
    sandhi: sandhied[i].sandhi,
    isHanzi: isHanzi(hanzi),
  }));
}

/** Pinyin de una palabra, con espacios entre sílabas (forma lexical). */
export function wordPinyin(word: string): string {
  return pp(word, { toneType: "symbol", type: "string", nonZh: "removed", toneSandhi: false });
}

/** Pinyin sin tonos ni espacios (para índices de búsqueda). */
export function wordPinyinPlain(word: string): string {
  return pp(word, { toneType: "none", type: "string", nonZh: "removed" }).replace(/\s+/g, "");
}

/**
 * Reparte el pinyin de una palabra (p. ej. "xièxie" o "nǐ hǎo") entre sus caracteres.
 * Devuelve undefined si el número de sílabas no coincide.
 */
export function distributePinyin(word: string, pinyin: string): string[] | undefined {
  const chars = Array.from(word).filter(isHanzi);
  const syl = syllablesOf(pinyin);
  if (syl.length !== chars.length) return undefined;
  const out: string[] = [];
  let k = 0;
  for (const ch of Array.from(word)) out.push(isHanzi(ch) ? syl[k++] : "");
  return out;
}
