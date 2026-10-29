"use client";
import { create } from "zustand";
import { db } from "@/lib/db";
import type { Lang } from "@/lib/languages/types";

/** Modo de la ayuda de lectura global (pinyin / furigana / romanización): atajo P. */
export type PinyinMode = "show" | "hide" | "unknown";
export type HskList = "2.0" | "3.0" | "both";

export interface ToneColors {
  1: string;
  2: string;
  3: string;
  4: string;
  5: string;
}

/** Ajustes propios de cada idioma. */
export interface LangSettings {
  active: boolean; // el usuario estudia este idioma
  level: string; // zero | beginner | <primer nivel> | <segundo nivel>
  goal: string; // texto libre: «HSK 1 en junio», «leer kana»
  examDate: string; // YYYY-MM-DD o ""
  dailyGoalMinutes: number;
  newWordsPerDay: number;
  /** Opciones de la ayuda de lectura (ids definidos por el paquete: romaji, pitch, pronunciation) */
  readingOptions: Record<string, boolean>;
  /** Fuente del texto meta (id definido por el tema del paquete) */
  font: string;
  anki: { enabled: boolean; deckPrefix: string };
  /** Voz del navegador elegida para este idioma (vacío = automática) */
  voiceURI?: string;
}

export interface Settings {
  name: string;
  /** Idiomas activos en orden de preferencia; el primero es el principal */
  activeLangs: Lang[];
  lastLang: Lang;
  langs: Record<Lang, LangSettings>;
  // --- heredados (zh): se mantienen sincronizados con langs.zh para no romper nada
  hskList: HskList;
  examDate: string;
  dailyGoalMinutes: number; // objetivo total (todos los idiomas)
  newWordsPerDay: number;
  pinyinMode: PinyinMode;
  showTranslation: boolean;
  showTraditional: boolean; // escritura alternativa (繁 / solo kana / hanja)
  theme: "light" | "dark" | "system";
  zhFontScale: number; // 0.8–1.6 (escala del texto meta)
  zhFont: "sans" | "serif" | "kai";
  toneColorsEnabled: boolean;
  toneColors: ToneColors;
  toneScheme: "xueban" | "pleco" | "none" | "custom";
  toneMarks: boolean;
  tts: { voiceURI: string; rate: number; preferGenerated: boolean };
  anki: { enabled: boolean; url: string; srsSource: "anki" | "web"; autoSync: boolean; deckPrefix: string; langs: Record<Lang, boolean> };
  llm: { provider: "none" | "openai" | "anthropic" | "ollama" | "custom"; apiKey: string; baseUrl: string; model: string };
  fsrs: { retention: number; maxInterval: number };
  sounds: boolean;
  onboardingDone: boolean;
  level: "zero" | "beginner" | "hsk1" | "hsk2";
}

export const DEFAULT_TONE_COLORS: ToneColors = {
  1: "#d23c2f",
  2: "#2e8b57",
  3: "#1f6fd0",
  4: "#8e44ad",
  5: "#8a8178",
};

export const DEFAULT_LANG_SETTINGS: Record<Lang, LangSettings> = {
  zh: { active: true, level: "beginner", goal: "", examDate: "", dailyGoalMinutes: 30, newWordsPerDay: 7, readingOptions: {}, font: "sans", anki: { enabled: true, deckPrefix: "中文 Chino" } },
  ja: { active: false, level: "zero", goal: "", examDate: "", dailyGoalMinutes: 20, newWordsPerDay: 7, readingOptions: { romaji: false, pitch: false }, font: "sans", anki: { enabled: true, deckPrefix: "日本語 Japonés" } },
  ko: { active: false, level: "zero", goal: "", examDate: "", dailyGoalMinutes: 20, newWordsPerDay: 7, readingOptions: { pronunciation: false }, font: "sans", anki: { enabled: true, deckPrefix: "한국어 Coreano" } },
};

export const DEFAULT_SETTINGS: Settings = {
  name: "Hugo",
  activeLangs: ["zh"],
  lastLang: "zh",
  langs: DEFAULT_LANG_SETTINGS,
  hskList: "both",
  examDate: "",
  dailyGoalMinutes: 30,
  newWordsPerDay: 7,
  pinyinMode: "show",
  showTranslation: true,
  showTraditional: false,
  theme: "system",
  zhFontScale: 1,
  zhFont: "sans",
  toneColorsEnabled: true,
  toneColors: DEFAULT_TONE_COLORS,
  toneScheme: "xueban",
  toneMarks: false,
  tts: { voiceURI: "", rate: 0.9, preferGenerated: true },
  anki: { enabled: true, url: "http://127.0.0.1:8765", srsSource: "web", autoSync: false, deckPrefix: "中文 Chino", langs: { zh: true, ja: true, ko: true } },
  llm: { provider: "none", apiKey: "", baseUrl: "", model: "" },
  fsrs: { retention: 0.9, maxInterval: 365 },
  sounds: true,
  onboardingDone: false,
  level: "beginner",
};

interface SettingsStore {
  settings: Settings;
  loaded: boolean;
  load: () => Promise<void>;
  update: (patch: Partial<Settings> | ((s: Settings) => Partial<Settings>)) => Promise<void>;
  updateLang: (lang: Lang, patch: Partial<LangSettings>) => Promise<void>;
  cyclePinyin: () => Promise<void>;
}

function deepMerge<T extends object>(base: T, patch: Partial<T>): T {
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(patch)) {
    const cur = out[k];
    if (v && typeof v === "object" && !Array.isArray(v) && cur && typeof cur === "object" && !Array.isArray(cur)) {
      out[k] = deepMerge(cur as object, v as object);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

/** Migra ajustes antiguos (solo chino) al modelo por idioma y mantiene los campos heredados en sintonía. */
export function normalizeSettings(raw: Partial<Settings>): Settings {
  const s = deepMerge(DEFAULT_SETTINGS, raw);
  const legacy = !raw.langs;
  if (legacy) {
    s.langs = deepMerge(DEFAULT_LANG_SETTINGS, {
      zh: {
        ...DEFAULT_LANG_SETTINGS.zh,
        level: raw.level ?? "beginner",
        examDate: raw.examDate ?? "",
        dailyGoalMinutes: raw.dailyGoalMinutes ?? 30,
        newWordsPerDay: raw.newWordsPerDay ?? 7,
        font: raw.zhFont ?? "sans",
        anki: { enabled: raw.anki?.enabled ?? true, deckPrefix: raw.anki?.deckPrefix ?? "中文 Chino" },
      },
    } as Partial<Record<Lang, LangSettings>>);
  }
  if (!s.activeLangs?.length) s.activeLangs = ["zh"];
  for (const l of s.activeLangs) s.langs[l].active = true;
  if (!s.activeLangs.includes(s.lastLang)) s.lastLang = s.activeLangs[0];
  // espejo heredado (componentes del paquete zh)
  s.examDate = s.langs.zh.examDate;
  s.level = s.langs.zh.level as Settings["level"];
  s.zhFont = (s.langs.zh.font as Settings["zhFont"]) || "sans";
  return s;
}

export const useSettings = create<SettingsStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  load: async () => {
    const row = await db.settings.get("main");
    const settings = row ? normalizeSettings(row.value as Partial<Settings>) : DEFAULT_SETTINGS;
    set({ settings, loaded: true });
  },
  update: async (patch) => {
    const cur = get().settings;
    const p = typeof patch === "function" ? patch(cur) : patch;
    let next = deepMerge(cur, p);
    // campos heredados → langs.zh
    const zhPatch: Partial<LangSettings> = {};
    if ("examDate" in p && p.examDate !== undefined) zhPatch.examDate = p.examDate;
    if ("level" in p && p.level !== undefined) zhPatch.level = p.level;
    if ("zhFont" in p && p.zhFont !== undefined) zhPatch.font = p.zhFont;
    if (Object.keys(zhPatch).length) next = deepMerge(next, { langs: { zh: zhPatch } as Record<Lang, LangSettings> });
    next = normalizeSettings(next);
    set({ settings: next });
    await db.settings.put({ key: "main", value: next, updatedAt: Date.now() });
  },
  updateLang: async (lang, patch) => {
    await get().update((s) => ({ langs: { ...s.langs, [lang]: deepMerge(s.langs[lang], patch) } }));
  },
  cyclePinyin: async () => {
    const order: PinyinMode[] = ["show", "unknown", "hide"];
    const cur = get().settings.pinyinMode;
    const next = order[(order.indexOf(cur) + 1) % order.length];
    await get().update({ pinyinMode: next });
  },
}));

/** Selector cómodo. */
export function useSetting<K extends keyof Settings>(key: K): Settings[K] {
  return useSettings((s) => s.settings[key]);
}

/** Ajustes del idioma dado. */
export function useLangSettings(lang: Lang): LangSettings {
  return useSettings((s) => s.settings.langs[lang] ?? DEFAULT_LANG_SETTINGS[lang]);
}

export function langSettings(lang: Lang): LangSettings {
  return useSettings.getState().settings.langs[lang] ?? DEFAULT_LANG_SETTINGS[lang];
}

/** ¿Está activa la integración con Anki para este idioma? (interruptor global + interruptor del idioma) */
export function ankiOnFor(s: Settings, lang: Lang): boolean {
  return s.anki.enabled && s.anki.langs?.[lang] !== false;
}
