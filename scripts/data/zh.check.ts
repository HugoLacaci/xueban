/** Comprobaciones de contenido propias del chino (pinyin): las usa scripts/check-content.ts. */
import { pinyin } from "pinyin-pro";
import { normalizePinyin, syllablesOf } from "../../lib/languages/zh/pinyin/tones";
import { SYLLABLES } from "../../lib/languages/zh/data/pronunciation";

const HANZI = /[一-鿿〇]/;

const VALID = new Set<string>([
  ...Object.values(SYLLABLES).flat(),
  "er",
  "lü",
  "nü",
  "lüe",
  "nüe",
  "m",
  "n",
  "ng",
  "hm",
  "yo",
  "lo",
  "den",
  "nei",
  "shei",
]);

/** Posibles números de sílabas de un texto en pinyin (todas las segmentaciones válidas de cada palabra). */
export function syllableCounts(py: string): Set<number> {
  const words = py
    .normalize("NFD")
    .replace(/[̀́̄̌]/g, "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/v/g, "ü")
    .split(/[^a-zü]+/)
    .filter(Boolean);
  let totals = new Set<number>([0]);
  for (const w of words) {
    // dp[i] = conjunto de recuentos posibles para w[0..i)
    const dp: Set<number>[] = Array.from({ length: w.length + 1 }, () => new Set<number>());
    dp[0].add(0);
    for (let i = 0; i < w.length; i++) {
      if (!dp[i].size) continue;
      for (let j = i + 1; j <= Math.min(w.length, i + 7); j++) {
        const s = w.slice(i, j);
        const ok = VALID.has(s) || (s.endsWith("r") && s.length > 1 && VALID.has(s.slice(0, -1)));
        if (ok) for (const c of dp[i]) dp[j].add(c + 1);
      }
    }
    const counts = dp[w.length].size ? dp[w.length] : new Set([syllablesOf(w).length]);
    const next = new Set<number>();
    for (const a of totals) for (const b of counts) next.add(a + b);
    totals = next;
  }
  return totals;
}

/** Aviso si la frase y su pinyin no tienen el mismo número de sílabas. */
export function zhSentenceIssue(zh: string, py?: string): string | null {
  if (/[,.?!]/.test(zh) && !/[A-Za-z0-9]/.test(zh)) return `puntuación occidental en chino: ${zh}`;
  if (!py) return null;
  // 儿 final de erhua (哪儿/点儿) no forma sílaba propia
  // 儿 tras otro hanzi puede ser erhua (哪儿 nǎr, sin sílaba propia) o sílaba plena (女儿 nǚ'ér): vale cualquiera de los dos recuentos
  const all = Array.from(zh).filter((c) => HANZI.test(c)).length;
  const er = zh.match(/[一-鿿]儿/g)?.length ?? 0;
  const nSyl = syllablesOf(py).length;
  // el troceador codicioso se equivoca con -n/-ng (nánguò → náng+uò, fànguǎn → fàng+uǎn): se acepta si alguna
  // segmentación válida del pinyin da el número de hanzi
  const options = syllableCounts(py);
  for (let n = all - er; n <= all; n++) if (options.has(n)) return null;
  const nChars = nSyl >= all - er && nSyl <= all ? nSyl : all;
  return nChars !== nSyl ? `«${zh}»: ${nChars} hanzi pero ${nSyl} sílabas en «${py}»` : null;
}

/** Aviso si el pinyin de una palabra difiere de la semilla o de pinyin-pro. */
export function zhReadingIssue(word: string, reading: string, seedReading?: string): string | null {
  if (seedReading)
    return normalizePinyin(seedReading) !== normalizePinyin(reading)
      ? `pinyin de ${word} «${reading}» difiere de la semilla «${seedReading}»`
      : null;
  const auto = pinyin(word, { toneType: "symbol", type: "string", nonZh: "removed" });
  return normalizePinyin(auto) !== normalizePinyin(reading)
    ? `pinyin de ${word} «${reading}» ≠ pinyin-pro «${auto}» (revisar polifonía/tono neutro)`
    : null;
}
