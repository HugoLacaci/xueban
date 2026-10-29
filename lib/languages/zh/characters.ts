/** Módulo de caracteres del chino: Make Me a Hanzi (descomposición, radical, etimología) + radicales Kangxi. */
import type { CharacterModule, StrokeProvider, CounterModule } from "@/lib/languages/types";
import { withBase } from "@/lib/base-path";
import { charInfoLoaded, componentsOf, getCharInfo, getHsk, loadCharInfo, lookupFirst, RADICALS, radicalInfo } from "./dictionary";
import { isHanzi, hanziOnly } from "./pinyin/convert";
import { SIMILAR_CHARS } from "./data/pronunciation";
import { ALL_COMPONENTS, CLASSIFIER_HINTS } from "./exercises";

export const zhCharacters: CharacterModule = {
  name: "Caracteres",
  isChar: isHanzi,
  charsOf: (text) => Array.from(hanziOnly(text)),
  load: async () => {
    await loadCharInfo();
  },
  loaded: charInfoLoaded,
  info(ch) {
    const c = getCharInfo(ch);
    if (!c) return undefined;
    const r = radicalInfo(c.radical);
    return {
      char: ch,
      readings: c.pinyin,
      meaning: lookupFirst(ch)?.es,
      meaningEn: c.definition,
      strokes: c.strokes,
      radical: c.radical,
      components: componentsOf(ch),
      level: lookupFirst(ch)?.hsk ? `HSK ${lookupFirst(ch)!.hsk}` : undefined,
      extra: { etymology: c.etymology, decomposition: c.decomposition, radicalMeaning: r?.meaning },
    };
  },
  similarSets: SIMILAR_CHARS,
  components: componentsOf,
  allComponents: ALL_COMPONENTS,
  radicalMeaning: (r) => radicalInfo(r)?.meaning,
  allRadicals: RADICALS.slice(0, 80).map((r) => r.radical),
  levelChars(level) {
    const hsk = getHsk();
    return hsk?.chars["3.0"]?.[Number(level)] ?? [];
  },
};

export const zhStrokes: StrokeProvider = {
  kind: "hanzi-writer",
  url: (ch) => withBase(`/data/zh/hanzi/${encodeURIComponent(ch)}.json`),
  fallbackUrl: (ch) => `https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${encodeURIComponent(ch)}.json`,
  grid: "tianzige",
};

export const zhCounters: CounterModule = {
  name: "Clasificadores",
  native: "量词",
  counters: Object.entries(CLASSIFIER_HINTS).map(([counter, es]) => ({ counter, reading: "", es, examples: [] })),
  of: (word) => lookupFirst(word)?.cl,
  hint: (c) => CLASSIFIER_HINTS[c],
};
