/** Comprobaciones de contenido propias del chino (pinyin): las usa scripts/check-content.ts. */
import { pinyin } from "pinyin-pro";
import { normalizePinyin, syllablesOf } from "../../lib/languages/zh/pinyin/tones";

const HANZI = /[一-鿿]/;

/** Aviso si la frase y su pinyin no tienen el mismo número de sílabas. */
export function zhSentenceIssue(zh: string, py?: string): string | null {
  if (/[,.?!]/.test(zh) && !/[A-Za-z0-9]/.test(zh)) return `puntuación occidental en chino: ${zh}`;
  if (!py) return null;
  // 儿 final de erhua (哪儿/点儿) no forma sílaba propia
  const nChars = Array.from(zh).filter((c) => HANZI.test(c)).length - (zh.match(/[一-鿿]儿/g)?.length ?? 0) * (/r/.test(py.replace(/[^a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜs]/g, "")) ? 1 : 0);
  const nSyl = syllablesOf(py).length;
  return nChars !== nSyl ? `«${zh}»: ${nChars} hanzi pero ${nSyl} sílabas en «${py}»` : null;
}

/** Aviso si el pinyin de una palabra difiere de la semilla o de pinyin-pro. */
export function zhReadingIssue(word: string, reading: string, seedReading?: string): string | null {
  if (seedReading) return normalizePinyin(seedReading) !== normalizePinyin(reading) ? `pinyin de ${word} «${reading}» difiere de la semilla «${seedReading}»` : null;
  const auto = pinyin(word, { toneType: "symbol", type: "string", nonZh: "removed" });
  return normalizePinyin(auto) !== normalizePinyin(reading) ? `pinyin de ${word} «${reading}» ≠ pinyin-pro «${auto}» (revisar polifonía/tono neutro)` : null;
}
