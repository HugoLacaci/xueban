/**
 * Paquete mínimo de un idioma (sin diccionario ni contenido): sirve de base para construir un paquete
 * real y para que la app no reviente mientras un idioma está incompleto. Las pruebas de paridad
 * fallan para cualquier paquete que siga usando piezas del stub.
 */
import type { CharacterModule, CounterModule, DictionaryProvider, ExamDefinition, ExampleProvider, ExerciseAdapters, FrequencyProvider, Lang, LanguagePack, ProsodyModule, StrokeProvider } from "@/lib/languages/types";
import { LANG_META } from "@/lib/languages/registry";
import { buildCurriculum } from "./curriculum";

export function stubDictionary(name: string): DictionaryProvider {
  return {
    name,
    load: async () => undefined,
    status: () => "ready",
    error: () => undefined,
    entryCount: () => 0,
    subscribe: () => () => undefined,
    lookup: () => [],
    lookupFirst: () => undefined,
    search: () => [],
    lexicon: () => undefined,
    setUserWords: () => undefined,
    userWord: () => undefined,
    levelLabel: () => undefined,
    externalLinks: () => [],
  };
}

export const stubExamples: ExampleProvider = { load: async () => undefined, find: () => [] };
export const stubFrequency: FrequencyProvider = { rank: () => undefined };

export function stubCharacters(isChar: (ch: string) => boolean): CharacterModule {
  return {
    name: "Caracteres",
    isChar,
    charsOf: (t) => Array.from(t).filter(isChar),
    load: async () => undefined,
    loaded: () => true,
    info: () => undefined,
    similarSets: [],
    components: () => [],
    allComponents: [],
  };
}

export const stubProsody: ProsodyModule = { kind: "tones", name: "Prosodia", items: [], legend: [], minimalPairs: [], describe: () => "" };
export const stubCounters: CounterModule = { name: "Clasificadores", native: "", counters: [], of: () => undefined, hint: () => undefined };

export function stubAdapters(): ExerciseAdapters {
  return {
    types: [],
    labels: {},
    readingInput: () => null,
    prosodyChoice: () => null,
    prosodyPair: () => null,
    similar: () => null,
    component: () => null,
    buildCharacter: () => null,
    classifier: () => null,
    writing: () => null,
    tiles: (t) => Array.from(t),
    readingEquals: (u, e) => u.trim() === e.trim(),
    readingDiff: (u, e) => [{ unit: e, got: u, ok: u.trim() === e.trim(), partial: false }],
    normalizeText: (s) => s.replace(/\s+/g, ""),
    normalizeInput: (s) => s,
  };
}

export function stubExam(id: ExamDefinition["id"], name: string, url: string): ExamDefinition {
  return {
    id,
    name,
    officialUrl: url,
    levels: [],
    firstLevel: "",
    sections: [],
    totalQuestions: 0,
    totalMinutes: 0,
    scoring: "",
    passRule: () => ({ passed: false, score: 0, max: 0, detail: "" }),
    source: "",
    buildMock: () => [],
  };
}

export function stubStrokes(grid: StrokeProvider["grid"]): StrokeProvider {
  return { kind: "kanjivg", url: () => "", grid };
}

/** Campos comunes a cualquier paquete a partir de su id (los específicos se pasan en `over`). */
export function basePack(lang: Lang, over: Partial<LanguagePack>): LanguagePack {
  const meta = LANG_META[lang];
  const { curriculum, grammar } = buildCurriculum({ units: [], grammar: [], levelTitle: "" });
  const base: LanguagePack = {
    meta,
    id: lang,
    bcp47: meta.bcp47,
    analyze: (text) => ({ tokens: [{ text, isWord: true, start: 0, segments: [{ text }] }] }),
    segment: (text) => [text],
    reading: () => "",
    romanize: (t) => t,
    normalizeInput: (s) => s,
    altScript: (t) => t,
    isTargetChar: () => false,
    hasTargetText: () => false,
    readingAid: { label: "", name: "", modes: { show: "", unknown: "", hide: "" }, options: [] },
    colorizeReading: (r) => [{ text: r }],
    prosody: stubProsody,
    characters: stubCharacters(() => false),
    strokeData: stubStrokes("tianzige"),
    dictionary: stubDictionary("—"),
    examples: stubExamples,
    frequency: stubFrequency,
    exam: stubExam("HSK", "", ""),
    levelLists: async () => ({ title: "", words: [], chars: [] }),
    curriculum,
    grammar,
    readings: [],
    articles: [],
    resources: [],
    loadVideoIndex: async () => [],
    counters: stubCounters,
    exerciseAdapters: stubAdapters(),
    tts: { voicePrefs: [], edgeTtsVoices: [], rateDefault: 0.9 },
    asr: { locale: meta.bcp47 },
    anki: {
      modelName: "",
      modelId: 0,
      deckRoot: "",
      deckMine: "",
      deckLevel: "",
      fields: [],
      keyField: "Palabra",
      css: "",
      templates: [],
      req: [],
      ordToType: {},
      cardOrds: () => [],
      toFields: () => ({}),
      fromFields: (_f, _t, noteId, mod, existing) => ({ ...(existing as object), ankiNoteId: noteId, ankiMod: mod }) as never,
      tags: () => [],
      deckFor: () => "",
      minePrefix: `mine-${lang}-`,
      apkgFileName: lang,
    },
    theme: {
      id: lang,
      name: "",
      nameEs: "",
      description: "",
      fontClasses: { sans: "", serif: "", display: "" },
      fontOptions: [{ id: "sans", label: "Sans", cls: "" }],
      themeColor: { light: "#F5EFE3", dark: "#181715" },
      seal: { shape: "square", brandText: meta.brand.native },
      ornaments: { Landscape: () => null, Branch: () => null, Lattice: () => null, DailyShape: () => null },
      motifs: [],
      prohibited: [],
    },
    ui: { CharactersPage: () => null, CharacterDetail: () => null, modules: {}, ReadingInput: () => null },
    seed: { version: 0, source: "", words: [], levelTag: "" },
    categories: {},
    data: {},
    credits: [],
  };
  return { ...base, ...over };
}
