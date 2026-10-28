"use client";
import { create } from "zustand";
import { db } from "@/lib/db";

export type PinyinMode = "show" | "hide" | "unknown";
export type HskList = "2.0" | "3.0" | "both";

export interface ToneColors {
  1: string;
  2: string;
  3: string;
  4: string;
  5: string;
}

export interface Settings {
  name: string;
  hskList: HskList;
  examDate: string; // YYYY-MM-DD o ""
  dailyGoalMinutes: number;
  newWordsPerDay: number;
  pinyinMode: PinyinMode;
  showTranslation: boolean;
  showTraditional: boolean;
  theme: "light" | "dark" | "system";
  zhFontScale: number; // 0.8–1.6
  zhFont: "sans" | "serif" | "kai";
  toneColorsEnabled: boolean;
  toneColors: ToneColors;
  toneScheme: "xueban" | "pleco" | "none" | "custom";
  toneMarks: boolean; // indicador extra (marca de tono grande) para daltónicos
  tts: { voiceURI: string; rate: number; preferGenerated: boolean };
  anki: { enabled: boolean; url: string; srsSource: "anki" | "web"; autoSync: boolean; deckPrefix: string };
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

export const DEFAULT_SETTINGS: Settings = {
  name: "Hugo",
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
  anki: { enabled: true, url: "http://127.0.0.1:8765", srsSource: "web", autoSync: false, deckPrefix: "中文 Chino" },
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

export const useSettings = create<SettingsStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  load: async () => {
    const row = await db.settings.get("main");
    const settings = row ? deepMerge(DEFAULT_SETTINGS, row.value as Partial<Settings>) : DEFAULT_SETTINGS;
    set({ settings, loaded: true });
  },
  update: async (patch) => {
    const cur = get().settings;
    const p = typeof patch === "function" ? patch(cur) : patch;
    const next = deepMerge(cur, p);
    set({ settings: next });
    await db.settings.put({ key: "main", value: next, updatedAt: Date.now() });
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
