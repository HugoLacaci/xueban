/** Contenido estático del paquete coreano (generado en content/ko/index.ts). */
import type { GrammarPoint, Unit } from "@/lib/course/types";
import type { GradedReading } from "@/lib/readings/types";
import type { Article, Resource } from "@/lib/study-hall/types";
import type { SeedData, SeedWord } from "@/lib/languages/types";
import { buildCurriculum } from "@/lib/languages/core/curriculum";
import * as C from "@/content/ko/index";

export const UNITS: Unit[] = C.UNITS;
export const GRAMMAR: GrammarPoint[] = C.GRAMMAR;
export const READINGS: GradedReading[] = C.READINGS;
export const ARTICLES: Article[] = C.ARTICLES;
export const RESOURCES: Resource[] = C.RESOURCES.filter((r) => r.verified);
export const EXAM_BANK = C.EXAM_BANK;

export const SEED: SeedData = {
  version: C.SEED_JSON.version,
  source: C.SEED_JSON.source,
  levelTag: C.SEED_JSON.levelTag || "TOPIK1",
  words: (C.SEED_JSON.words as SeedWord[]).map((w) => ({ ...w, lang: "ko" as const })),
};

export const CATEGORY_META: Record<string, { color: string; icon: string }> = {
  "Saludos y expresiones": { color: "#2f6f73", icon: "Hand" },
  Pronombres: { color: "#5b4a8b", icon: "Users" },
  "Números y cantidades": { color: "#2f5f8f", icon: "Hash" },
  Preguntas: { color: "#b5652f", icon: "CircleHelp" },
  Clasificadores: { color: "#3d7a6b", icon: "Boxes" },
  "Tiempo y fechas": { color: "#3a6ea5", icon: "CalendarDays" },
  Adjetivos: { color: "#b5402e", icon: "Sparkles" },
  "Familia y personas": { color: "#a14d6b", icon: "Baby" },
  "Escuela y trabajo": { color: "#5f7a3a", icon: "GraduationCap" },
  "Comida y bebida": { color: "#9a6b2f", icon: "Utensils" },
  "Casa y objetos": { color: "#6d6a63", icon: "Home" },
  Lugares: { color: "#4f7a4a", icon: "MapPin" },
  Transporte: { color: "#34495e", icon: "TrainFront" },
  "Posición y dirección": { color: "#2d7a85", icon: "Compass" },
  "Partículas y gramática": { color: "#6d4c41", icon: "Puzzle" },
  "Verbos básicos": { color: "#2f6f73", icon: "Zap" },
  Adverbios: { color: "#5d6d7e", icon: "ArrowUpRight" },
  Ocio: { color: "#b5546a", icon: "Music" },
  Animales: { color: "#795548", icon: "Cat" },
  "Tiempo atmosférico": { color: "#3c8dbc", icon: "CloudSun" },
  Salud: { color: "#b03a2e", icon: "HeartPulse" },
  Clase: { color: "#8db3a5", icon: "NotebookPen" },
};

/** Detección por reglas de gramática TOPIK I (ids de content/ko/grammar.json). */
const RULES: { id: string; test: (s: string) => boolean }[] = [
  { id: "ieyo-yeyo", test: (s) => /(이에요|예요)/.test(s) },
  { id: "anieyo", test: (s) => /아니에요|아닙니다/.test(s) },
  { id: "eun-neun", test: (s) => /[가-힣](은|는)\s/.test(s) },
  { id: "i-ga", test: (s) => /[가-힣](이|가)\s/.test(s) },
  { id: "eul-reul", test: (s) => /[가-힣](을|를)\s/.test(s) },
  { id: "eseo", test: (s) => /에서/.test(s) },
  { id: "e-place-time", test: (s) => /[가-힣]에\s/.test(s) },
  { id: "ui", test: (s) => /[가-힣]의\s/.test(s) },
  { id: "do", test: (s) => /[가-힣]도\s/.test(s) },
  { id: "wa-gwa-hago", test: (s) => /(하고|와|과)\s/.test(s) },
  { id: "seumnida", test: (s) => /(습니다|ㅂ니다|입니다|합니다)/.test(s) },
  { id: "past-ass-eoss", test: (s) => /(았|었|였|했)어요/.test(s) },
  { id: "future-eul-geoyeyo", test: (s) => /(을|ㄹ)?\s?거예요/.test(s) },
  { id: "an-negation", test: (s) => /안\s/.test(s) },
  { id: "mot-negation", test: (s) => /못\s/.test(s) },
  { id: "ji-anta", test: (s) => /지 않/.test(s) },
  { id: "go-sipda", test: (s) => /고 싶/.test(s) },
  { id: "jiman", test: (s) => /지만/.test(s) },
  { id: "euseyo", test: (s) => /(으세요|세요)/.test(s) },
  { id: "a-juseyo", test: (s) => /(아|어|해) 주세요/.test(s) },
  { id: "eul-su-itda", test: (s) => /수 (있|없)/.test(s) },
  { id: "go-itda", test: (s) => /고 있/.test(s) },
  { id: "a-seo", test: (s) => /(아서|어서|해서)/.test(s) },
  { id: "euni-kka", test: (s) => /니까/.test(s) },
  { id: "eul-kkayo", test: (s) => /까요/.test(s) },
  { id: "eu-ro", test: (s) => /(으로|로)\s/.test(s) },
  { id: "buteo-kkaji", test: (s) => /부터|까지/.test(s) },
  { id: "myeon", test: (s) => /(으면|면)\s/.test(s) },
  { id: "ayo-eoyo", test: (s) => /(아요|어요|해요)/.test(s) },
];

export function detectGrammar(text: string, max = 4): string[] {
  const ids = new Set(GRAMMAR.map((g) => g.id));
  const out: string[] = [];
  for (const r of RULES) {
    if (ids.has(r.id) && r.test(text + " ")) out.push(r.id);
    if (out.length >= max) break;
  }
  return out;
}

export const { curriculum, grammar } = buildCurriculum({ units: UNITS, grammar: GRAMMAR, levelTitle: "TOPIK I", idPrefix: "ko-course-", sentenceEnd: /(?<=[.!?])\s+/, detect: detectGrammar });
