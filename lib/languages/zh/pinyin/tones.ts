/**
 * Utilidades de pinyin: detección de tono, conversión numérico ⇄ diacrítico,
 * separación de sílabas y sandhi. Sin dependencias (ligero, testeable).
 */

export type Tone = 1 | 2 | 3 | 4 | 5;

const MARKS: Record<string, [string, Tone]> = {
  ā: ["a", 1], á: ["a", 2], ǎ: ["a", 3], à: ["a", 4],
  ē: ["e", 1], é: ["e", 2], ě: ["e", 3], è: ["e", 4],
  ī: ["i", 1], í: ["i", 2], ǐ: ["i", 3], ì: ["i", 4],
  ō: ["o", 1], ó: ["o", 2], ǒ: ["o", 3], ò: ["o", 4],
  ū: ["u", 1], ú: ["u", 2], ǔ: ["u", 3], ù: ["u", 4],
  ǖ: ["ü", 1], ǘ: ["ü", 2], ǚ: ["ü", 3], ǜ: ["ü", 4],
  Ā: ["A", 1], Á: ["A", 2], Ǎ: ["A", 3], À: ["A", 4],
  Ē: ["E", 1], É: ["E", 2], Ě: ["E", 3], È: ["E", 4],
  Ō: ["O", 1], Ó: ["O", 2], Ǒ: ["O", 3], Ò: ["O", 4],
  ń: ["n", 2], ň: ["n", 3], ǹ: ["n", 4], ḿ: ["m", 2],
};

const TONED: Record<string, string[]> = {
  a: ["ā", "á", "ǎ", "à"], e: ["ē", "é", "ě", "è"], i: ["ī", "í", "ǐ", "ì"],
  o: ["ō", "ó", "ǒ", "ò"], u: ["ū", "ú", "ǔ", "ù"], ü: ["ǖ", "ǘ", "ǚ", "ǜ"],
  A: ["Ā", "Á", "Ǎ", "À"], E: ["Ē", "É", "Ě", "È"], O: ["Ō", "Ó", "Ǒ", "Ò"],
};

/** Tono de una sílaba con diacríticos (5 = neutro). */
export function toneOf(syllable: string): Tone {
  for (const ch of syllable) {
    const m = MARKS[ch];
    if (m) return m[1];
  }
  const num = syllable.match(/[1-5]$/);
  if (num) return Number(num[0]) as Tone;
  return 5;
}

/** Elimina diacríticos: nǐ → ni, lǜ → lü */
export function stripTones(s: string): string {
  let out = "";
  for (const ch of s) out += MARKS[ch]?.[0] ?? ch;
  return out.replace(/[1-5]/g, "");
}

/** Normaliza para comparar/buscar: "Nǐ hǎo" → "nihao", "lü" → "lv" */
export function normalizePinyin(s: string): string {
  return stripTones(s)
    .toLowerCase()
    .replace(/ü/g, "v")
    .replace(/u:/g, "v")
    .replace(/[\s'\u2019\-\u00b7]/g, "");
}

/** Coloca la marca de tono en la vocal correcta de una sílaba sin tono. */
export function addToneMark(syllable: string, tone: Tone): string {
  if (tone === 5 || tone < 1) return syllable;
  const s = syllable.replace(/v/g, "ü").replace(/u:/g, "ü");
  const idx = tone - 1;
  // Reglas: a/e siempre; "ou" → o; si no, la última vocal.
  const vowels = "aeiouüAEOU";
  const place = (i: number) => s.slice(0, i) + TONED[s[i]][idx] + s.slice(i + 1);
  let i = s.search(/[aA]/);
  if (i >= 0) return place(i);
  i = s.search(/[eE]/);
  if (i >= 0) return place(i);
  i = s.indexOf("ou");
  if (i >= 0) return place(i);
  i = s.indexOf("Ou");
  if (i >= 0) return place(i);
  for (let k = s.length - 1; k >= 0; k--) {
    if (vowels.includes(s[k]) && TONED[s[k]]) return place(k);
  }
  return s;
}

/** Convierte pinyin numérico (ni3 hao3, lv4, nu:3) a diacríticos (nǐ hǎo, lǜ). */
export function numberedToMarked(input: string): string {
  return input.replace(/([a-zA-ZüÜ:]+)([1-5])/g, (_, syl: string, n: string) =>
    addToneMark(syl.replace(/u:/g, "ü").replace(/U:/g, "Ü"), Number(n) as Tone),
  );
}

/** Convierte pinyin con diacríticos a numérico (nǐ hǎo → ni3 hao3). */
export function markedToNumbered(input: string): string {
  return splitSyllables(input)
    .map((p) => (p.isSyllable ? stripTones(p.text) + toneOf(p.text) : p.text))
    .join("");
}

export interface PinyinPart {
  text: string;
  isSyllable: boolean;
  tone: Tone;
}

const VOW = "aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜAEIOUÜĀÁǍÀĒÉĚÈŌÓǑÒ";
const SYL_RE = new RegExp(
  `([bpmfdtnlgkhjqxrzcsywBPMFDTNLGKHJQXRZCSYW]?[hH]?)([${VOW}]+)(ng|n(?![${VOW}])|r(?![${VOW}]))?(r(?![${VOW}]))?[1-5]?|[ńňǹḿ]|[mM](?![${VOW}])|[nN][gG]?(?![${VOW}])`,
  "g",
);

/**
 * Separa una cadena de pinyin (con espacios, apóstrofos o pegada) en sílabas.
 * Aproximación robusta para HSK 1–3: "nǐhǎo" → ["nǐ","hǎo"].
 */
export function splitSyllables(input: string): PinyinPart[] {
  const parts: PinyinPart[] = [];
  let last = 0;
  for (const m of input.matchAll(SYL_RE)) {
    const i = m.index ?? 0;
    if (i > last) parts.push({ text: input.slice(last, i), isSyllable: false, tone: 5 });
    parts.push({ text: m[0], isSyllable: true, tone: toneOf(m[0]) });
    last = i + m[0].length;
  }
  if (last < input.length) parts.push({ text: input.slice(last), isSyllable: false, tone: 5 });
  return parts;
}

/** Devuelve solo las sílabas (sin puntuación). */
export function syllablesOf(input: string): string[] {
  return splitSyllables(input)
    .filter((p) => p.isSyllable)
    .map((p) => p.text);
}

/** Tonos de cada sílaba de una palabra en pinyin: "nǐ hǎo" → [3,3]. */
export function tonesOf(pinyin: string): Tone[] {
  return syllablesOf(pinyin).map(toneOf);
}

export interface SandhiSyllable {
  hanzi: string;
  pinyin: string; // pronunciación real
  original: string; // forma lexical
  sandhi: "33" | "bu" | "yi" | null;
}

/**
 * Aplica el sandhi tonal a una secuencia de sílabas (se devuelve la forma hablada):
 * - 3+3 → 2+3
 * - 不 + 4º tono → bú
 * - 一: antes de 4º → yí; antes de 1º/2º/3º → yì; aislado/ordinal/número → yī
 */
export function applySandhi(chars: string[], pinyins: string[]): SandhiSyllable[] {
  const out: SandhiSyllable[] = chars.map((hanzi, i) => ({
    hanzi,
    pinyin: pinyins[i] ?? "",
    original: pinyins[i] ?? "",
    sandhi: null,
  }));
  for (let i = 0; i < out.length; i++) {
    const cur = out[i];
    const next = out[i + 1];
    if (!cur.pinyin) continue;
    const nt = next && next.pinyin ? toneOf(next.pinyin) : 0;
    if (cur.hanzi === "不" && nt === 4) {
      cur.pinyin = "bú";
      cur.sandhi = "bu";
      continue;
    }
    if (cur.hanzi === "一" && next && next.pinyin) {
      const prev = out[i - 1]?.hanzi ?? "";
      const isOrdinal =
        prev === "第" ||
        /^[日号月年]$/.test(next.hanzi) ||
        /^[零一二三四五六七八九十百千万]$/.test(next.hanzi) ||
        /^[零一二三四五六七八九十百千万]$/.test(prev);
      if (!isOrdinal) {
        if (nt === 4) {
          cur.pinyin = "yí";
          cur.sandhi = "yi";
        } else if (nt === 1 || nt === 2 || nt === 3) {
          cur.pinyin = "yì";
          cur.sandhi = "yi";
        }
      }
      continue;
    }
    if (toneOf(cur.pinyin) === 3 && nt === 3) {
      cur.pinyin = addToneMark(stripTones(cur.pinyin), 2);
      cur.sandhi = "33";
    }
  }
  return out;
}

/** Comparación flexible de pinyin escrito por el usuario con el esperado. */
export function pinyinEquals(user: string, expected: string, { requireTones = true } = {}): boolean {
  const u = numberedToMarked(user.trim());
  const e = expected.trim();
  if (!requireTones) return normalizePinyin(u) === normalizePinyin(e);
  const us = syllablesOf(u).map((s) => normalizePinyin(s) + toneOf(s));
  const es = syllablesOf(e).map((s) => normalizePinyin(s) + toneOf(s));
  if (us.length !== es.length) return false;
  return us.every((s, i) => s === es[i]);
}

/** Diferencias sílaba a sílaba (para explicar el error). */
export function pinyinDiff(
  user: string,
  expected: string,
): { syllable: string; got: string; ok: boolean; toneOnly: boolean }[] {
  const us = syllablesOf(numberedToMarked(user.trim()));
  const es = syllablesOf(expected.trim());
  return es.map((syl, i) => {
    const got = us[i] ?? "";
    const ok = normalizePinyin(got) + toneOf(got) === normalizePinyin(syl) + toneOf(syl);
    const toneOnly = !ok && normalizePinyin(got) === normalizePinyin(syl);
    return { syllable: syl, got, ok, toneOnly };
  });
}
