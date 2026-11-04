/**
 * Capa 1 del motor de corrección: normalización de la respuesta del usuario y de las referencias.
 * - puntuación de ancho completo y medio, espacios, tradicional → simplificado;
 * - análisis del pinyin de entrada (números, tildes, sin tonos, ü/v/u:), separado en sílabas;
 * - variantes equivalentes aceptadas (儿化, 一点儿/一点, 哪儿/哪里…).
 * Lógica pura (sin React ni Dexie). La conversión tradicional→simplificado usa opencc-js (carga perezosa).
 */
import { numberedToMarked, normalizePinyin, syllablesOf, toneOf, stripTones, type Tone } from "@/lib/languages/zh/pinyin/tones";
import { wordPinyin } from "@/lib/languages/zh/pinyin/convert";
import { segment, type Lexicon } from "@/lib/segment";
import { defaultLexicon } from "./lexicon";

export const HAN = /[\u3400-\u9fff]/;
export const HAN_G = /[\u3400-\u9fff]/g;
const PUNCT = /[\s，。！？、：；“”‘’（）《》〈〉【】…—～,.!?;:'"()\-·]/g;

export type InputKind = "hanzi" | "pinyin" | "mixed" | "empty";

export interface PinyinSyllable {
  raw: string;
  base: string; // sin tono, ü normalizada
  tone: Tone | 0; // 0 = no indicado
  marked: string; // con diacrítico (o base si no hay tono)
}

export interface NormalizedAnswer {
  kind: InputKind;
  /** Texto sin puntuación ni espacios (hanzi) o pinyin marcado (pinyin) */
  text: string;
  hanzi?: string; // solo si kind = hanzi/mixed
  syllables?: PinyinSyllable[]; // solo si kind = pinyin
  /** ¿El usuario escribió tonos? (números o tildes) */
  hasTones?: boolean;
}

/** Puntuación de ancho medio → ancho completo y limpieza de espacios en texto chino. */
export function normalizePunctuation(s: string): string {
  return s
    .replace(/,/g, "，")
    .replace(/\?/g, "？")
    .replace(/!/g, "！")
    .replace(/;/g, "；")
    .replace(/:/g, "：")
    .replace(/\.\s*$/g, "。")
    .replace(/\s+(?=[\u3400-\u9fff，。！？])/g, "")
    .replace(/(?<=[\u3400-\u9fff，。！？])\s+/g, "")
    .trim();
}

/** Quita puntuación y espacios para comparar hanzi. */
export function stripAll(s: string): string {
  return s.replace(PUNCT, "");
}

let converter: ((s: string) => string) | undefined;
let converterPromise: Promise<void> | undefined;
/** Tradicional → simplificado (opencc-js, carga perezosa). Síncrono tras la primera carga. */
export async function loadT2S(): Promise<void> {
  if (converter) return;
  if (!converterPromise) {
    converterPromise = import("opencc-js")
      .then((m) => {
        const conv = m.Converter({ from: "tw", to: "cn" });
        converter = (s: string) => conv(s);
      })
      .catch(() => {
        converter = (s) => s;
      });
  }
  await converterPromise;
}
export function toSimplified(s: string): string {
  return converter ? converter(s) : s;
}

/** Detecta si la respuesta es hanzi, pinyin o mezcla. */
export function detectKind(s: string): InputKind {
  const t = s.trim();
  if (!t) return "empty";
  const han = (t.match(HAN_G) ?? []).length;
  const latin = (t.match(/[a-zA-ZüÜ]/g) ?? []).length;
  if (han && !latin) return "hanzi";
  if (latin && !han) return "pinyin";
  return "mixed";
}

/** Analiza pinyin escrito de cualquier forma (ni3hao3, nǐ hǎo, nihao, lv4, nu:3) en sílabas. */
export function parsePinyin(input: string): { syllables: PinyinSyllable[]; hasTones: boolean } {
  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/u:/g, "ü")
    .replace(/v/g, "ü")
    .replace(/[^a-zü1-5āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ'\s-]/g, " ");
  const marked = numberedToMarked(cleaned);
  const syls = syllablesOf(marked);
  let hasTones = false;
  const out: PinyinSyllable[] = syls.map((raw) => {
    const t = toneOf(raw);
    const explicit = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(raw) || /[1-5]$/.test(raw);
    if (explicit) hasTones = true;
    const base = normalizePinyin(raw);
    return { raw, base, tone: explicit ? t : 0, marked: explicit ? raw : stripTones(raw) };
  });
  return { syllables: out, hasTones };
}

export function normalizeAnswer(input: string): NormalizedAnswer {
  const kind = detectKind(input);
  if (kind === "empty") return { kind, text: "" };
  if (kind === "pinyin") {
    const p = parsePinyin(input);
    return { kind, text: p.syllables.map((s) => s.marked).join(" "), syllables: p.syllables, hasTones: p.hasTones };
  }
  const simp = toSimplified(normalizePunctuation(input));
  return { kind, text: stripAll(simp), hanzi: stripAll(simp) };
}

/* ------------------------------------------------------------------ variantes equivalentes */

/** Pares de formas equivalentes (ambas correctas): se normalizan a la primera para comparar. */
export const EQUIVALENTS: [string, string][] = [
  ["一点儿", "一点"],
  ["哪儿", "哪里"],
  ["这儿", "这里"],
  ["那儿", "那里"],
  ["一会儿", "一会"],
  ["没有", "没"],
  ["饭馆儿", "饭馆"],
  ["玩儿", "玩"],
  ["小孩儿", "小孩"],
  ["有点儿", "有点"],
  ["星期天", "星期日"],
  ["礼拜", "星期"],
  ["好吗", "好不好"],
  ["你们好", "大家好"],
  ["谢谢你", "谢谢"],
  ["不用谢", "不客气"],
];

/** Canonicaliza variantes equivalentes (儿化 opcional, sinónimos de registro) para comparar sin penalizar. */
export function canonicalize(hanzi: string): string {
  let s = hanzi;
  for (const [a, b] of EQUIVALENTS) {
    if (b && s.includes(b) && !s.includes(a)) s = s.split(b).join(a);
  }
  return s;
}

/** Segmenta hanzi en palabras con el léxico (si se da) o carácter a carácter. */
export function words(hanzi: string, lexicon?: Lexicon): string[] {
  const clean = stripAll(hanzi);
  if (!clean) return [];
  return segment(clean, lexicon ?? defaultLexicon())
    .filter((t) => t.isWord)
    .map((t) => t.text);
}

/** Pinyin (marcado) de una lista de palabras, sílaba a sílaba. */
export function pinyinOfWords(ws: string[]): string[][] {
  return ws.map((w) => syllablesOf(wordPinyin(w)));
}

export { numberedToMarked, normalizePinyin, syllablesOf, toneOf, stripTones };
