/** Atajos sobre el paquete activo para código no React (o React que ya está dentro del LanguageProvider). */
import { getActivePack } from "./registry";

/** Lectura de una palabra (pinyin / kana / romanización). */
export const readingOf = (text: string) => getActivePack().reading(text);
/** Solo los caracteres de la escritura meta (sin puntuación ni latín). */
export const targetOnly = (text: string) => Array.from(text).filter((c) => getActivePack().isTargetChar(c)).join("");
export const hasTarget = (text: string) => getActivePack().hasTargetText(text);
/** Normaliza lo que teclea el usuario (ni3→nǐ, romaji→kana, jamo→sílabas). */
export const normalizeInput = (text: string) => getActivePack().normalizeInput(text);
/** Regex de palabras meta para extraerlas de notas en Markdown. */
export function targetWordsIn(text: string, max = 30): string[] {
  const pack = getActivePack();
  const out = new Set<string>();
  let cur = "";
  for (const ch of Array.from(text)) {
    if (pack.isTargetChar(ch)) cur += ch;
    else {
      if (cur) for (const w of pack.segment(cur)) if (pack.hasTargetText(w)) out.add(w);
      cur = "";
    }
  }
  if (cur) for (const w of pack.segment(cur)) if (pack.hasTargetText(w)) out.add(w);
  return Array.from(out).slice(0, max);
}
