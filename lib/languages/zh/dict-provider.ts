/** Proveedor de diccionario del chino (envuelve el servicio CC-CEDICT de ./dictionary). */
import type { DictionaryProvider } from "@/lib/languages/types";
import type { DictEntry } from "@/lib/dictionary/types";
import { useDictionary as zhStore, getLexicon, lookup, lookupFirst, search, setUserWords, userWord, wordsContaining, entriesByHsk } from "./dictionary";

export function hskLabel(e: DictEntry): string | undefined {
  if (e.hsk) return `HSK ${e.hsk === 7 ? "7–9" : e.hsk}`;
  if (e.hsk2) return `HSK 2.0 · ${e.hsk2}`;
  return undefined;
}

export const zhDictionary: DictionaryProvider = {
  name: "CC-CEDICT",
  load: () => zhStore.getState().load() as Promise<void>,
  loadFull: () => zhStore.getState().loadFull() as Promise<void>,
  status: () => zhStore.getState().status,
  error: () => zhStore.getState().error,
  entryCount: () => zhStore.getState().entries,
  subscribe: (cb) => zhStore.subscribe(cb),
  lookup,
  lookupFirst,
  search,
  lexicon: getLexicon,
  setUserWords,
  userWord,
  wordsContaining,
  entriesByLevel: (level) => entriesByHsk(Number(level)),
  levelLabel: hskLabel,
  externalLinks: (word) => [
    { name: "MDBG", url: `https://www.mdbg.net/chinese/dictionary?wdqb=${encodeURIComponent(word)}` },
    { name: "Youdao", url: `https://www.youdao.com/result?word=${encodeURIComponent(word)}&lang=en` },
    { name: "Pleco", url: `plecoapi://x-callback-url/s?q=${encodeURIComponent(word)}` },
  ],
};
