/**
 * Accesos síncronos a los textos decorativos del idioma activo, para componentes que no necesitan
 * suscribirse: el LanguageProvider vuelve a montar el árbol al cambiar de idioma.
 */
import { getActiveLang, getActivePack } from "./registry";
import { PAGE_NATIVE, UI_GLYPHS } from "./glyphs";
import { CULTURE } from "./culture";

export const ui = () => UI_GLYPHS[getActiveLang()];
export const pageNative = (key: string) => PAGE_NATIVE[getActiveLang()][key] ?? "";
export const culture = () => CULTURE[getActiveLang()];
export const numeral = (n: number) => UI_GLYPHS[getActiveLang()].numerals[n] ?? String(n);

const FOCUS: Record<string, string> = {
  zh: "fíjate en el tono",
  ja: "fíjate en el acento tonal y en las vocales y consonantes largas",
  ko: "fíjate en cómo se encadenan las sílabas (la pronunciación real)",
};
/** «fíjate en el tono» / «…acento tonal…» / «…pronunciación real…» */
export const listenFocus = () => FOCUS[getActiveLang()];
/** Nombre de la ayuda de lectura en minúsculas para frases («con pinyin», «con furigana»…). */
export const readingName = () => {
  const p = getActivePack();
  return p.id === "zh" ? "pinyin" : p.readingAid.name.toLowerCase();
};
