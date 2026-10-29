/** Contenido estático del paquete japonés (generado en content/ja/index.ts). */
import type { GrammarPoint, Unit } from "@/lib/course/types";
import type { GradedReading } from "@/lib/readings/types";
import type { Article, Resource } from "@/lib/study-hall/types";
import type { SeedData, SeedWord } from "@/lib/languages/types";
import { buildCurriculum } from "@/lib/languages/core/curriculum";
import * as C from "@/content/ja/index";

export const UNITS: Unit[] = C.UNITS;
export const GRAMMAR: GrammarPoint[] = C.GRAMMAR;
export const READINGS: GradedReading[] = C.READINGS;
export const ARTICLES: Article[] = C.ARTICLES;
export const RESOURCES: Resource[] = C.RESOURCES.filter((r) => r.verified);
export const EXAM_BANK = C.EXAM_BANK;

export const SEED: SeedData = {
  version: C.SEED_JSON.version,
  source: C.SEED_JSON.source,
  levelTag: C.SEED_JSON.levelTag || "N5",
  words: (C.SEED_JSON.words as SeedWord[]).map((w) => ({ ...w, lang: "ja" as const })),
};

export const CATEGORY_META: Record<string, { color: string; icon: string }> = {
  "Saludos y expresiones": { color: "#264e70", icon: "Hand" },
  Pronombres: { color: "#5b4a8b", icon: "Users" },
  "Números y cantidades": { color: "#2f6690", icon: "Hash" },
  Preguntas: { color: "#b5652f", icon: "CircleHelp" },
  Clasificadores: { color: "#3d7a6b", icon: "Boxes" },
  "Tiempo y fechas": { color: "#3a6ea5", icon: "CalendarDays" },
  Adjetivos: { color: "#c8462f", icon: "Sparkles" },
  "Familia y personas": { color: "#a14d6b", icon: "Baby" },
  "Escuela y trabajo": { color: "#5f7a3a", icon: "GraduationCap" },
  "Comida y bebida": { color: "#9a6b2f", icon: "Utensils" },
  "Casa y objetos": { color: "#6d6a63", icon: "Home" },
  Lugares: { color: "#4f7a4a", icon: "MapPin" },
  Transporte: { color: "#34495e", icon: "TrainFront" },
  "Posición y dirección": { color: "#2d7a85", icon: "Compass" },
  "Partículas y gramática": { color: "#6d4c41", icon: "Puzzle" },
  "Verbos básicos": { color: "#264e70", icon: "Zap" },
  Adverbios: { color: "#5d6d7e", icon: "ArrowUpRight" },
  Ocio: { color: "#b5546a", icon: "Music" },
  Animales: { color: "#795548", icon: "Cat" },
  "Tiempo atmosférico": { color: "#3c8dbc", icon: "CloudSun" },
  Salud: { color: "#b03a2e", icon: "HeartPulse" },
  Clase: { color: "#7b8d4b", icon: "NotebookPen" },
};

/** Detección por reglas de puntos de gramática N5 (ids de content/ja/grammar.json). */
const RULES: { id: string; test: (s: string) => boolean }[] = [
  { id: "desu", test: (s) => /です|でした|だ[。！]/.test(s) },
  { id: "ka-question", test: (s) => /か[。？?]/.test(s) },
  { id: "wa-topic", test: (s) => /[^\s]は/.test(s) },
  { id: "wo", test: (s) => /を/.test(s) },
  { id: "ni-time-place", test: (s) => /に/.test(s) },
  { id: "de-place-means", test: (s) => /[^でし]で[^すし]/.test(s) },
  { id: "he-ni-direction", test: (s) => /へ/.test(s) },
  { id: "mo", test: (s) => /も/.test(s) },
  { id: "no", test: (s) => /の/.test(s) },
  { id: "kosoado", test: (s) => /(これ|それ|あれ|どれ|この|その|あの|どの|ここ|そこ|あそこ|どこ)/.test(s) },
  { id: "question-words", test: (s) => /(何|なに|なん|だれ|誰|いつ|どこ|どう|いくら|いくつ)/.test(s) },
  { id: "masu", test: (s) => /ます[。か]/.test(s) },
  { id: "masu-negative-past", test: (s) => /(ません|ました|ませんでした)/.test(s) },
  { id: "te-kudasai", test: (s) => /[てで]ください/.test(s) },
  { id: "te-iru", test: (s) => /[てで](い|います|いる|いました)/.test(s) },
  { id: "te-mo-ii", test: (s) => /[てで]もいい/.test(s) },
  { id: "te-wa-ikenai", test: (s) => /[てで]はいけ/.test(s) },
  { id: "tai", test: (s) => /たい(です)?/.test(s) },
  { id: "mashou-masenka", test: (s) => /ましょう|ませんか/.test(s) },
  { id: "aru-iru", test: (s) => /(あります|います|ある|いる)/.test(s) },
  { id: "kara-made", test: (s) => /から.*まで|まで/.test(s) },
  { id: "kara-because", test: (s) => /[だすいた]から/.test(s) },
  { id: "ga-but", test: (s) => /が、/.test(s) },
  { id: "yori-comparison", test: (s) => /より|ほうが/.test(s) },
  { id: "mae-ni-ato-de", test: (s) => /前に|後で|あとで|まえに/.test(s) },
  { id: "deshou", test: (s) => /でしょう/.test(s) },
  { id: "hoshii", test: (s) => /ほしい|欲しい/.test(s) },
  { id: "ya-nado", test: (s) => /や.*など|など/.test(s) },
  { id: "counters", test: (s) => /[一二三四五六七八九十0-9０-９](つ|人|本|枚|匹|冊|台|杯|個|歳|回|階|円)/.test(s) },
];

export function detectGrammar(text: string, max = 4): string[] {
  const ids = new Set(GRAMMAR.map((g) => g.id));
  const out: string[] = [];
  for (const r of RULES) {
    if (ids.has(r.id) && r.test(text)) out.push(r.id);
    if (out.length >= max) break;
  }
  return out;
}

export const { curriculum, grammar } = buildCurriculum({ units: UNITS, grammar: GRAMMAR, levelTitle: "JLPT N5", idPrefix: "ja-course-", sentenceEnd: /(?<=[。！？!?])/, detect: detectGrammar });
