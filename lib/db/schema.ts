/**
 * Modelo de datos local-first (IndexedDB vía Dexie). Multiidioma: todas las entidades llevan `lang`.
 * Convención heredada: `hanzi` = forma escrita en la lengua meta (hanzi / kanji+kana / hangul) y
 * `pinyin` = lectura (pinyin / kana / romanización). Todas las entidades llevan updatedAt.
 */
import type { Lang } from "@/lib/languages/types";

export type { Lang };

export type WordSource = "seed" | "class" | "video" | "reading" | "dictionary" | "anki" | "manual" | "import";

export interface Word {
  id: string; // WebID compartido con Anki: hsk1-<hanzi> | mine-<hanzi> | ja-n5-… | mine-ja-… | uuid
  lang: Lang;
  hanzi: string; // forma escrita
  traditional?: string; // zh: tradicional · ja: forma solo kana · ko: hanja
  pinyin: string; // lectura
  romanization?: string; // ja: rōmaji · ko: romanización revisada (zh: = pinyin)
  meaning: string; // español (editable por el usuario)
  meaningEn?: string; // respaldo en inglés
  category: string;
  example?: string;
  examplePinyin?: string;
  exampleTranslation?: string;
  radical?: string;
  hsk: string[]; // etiquetas de lista/nivel: ["HSK2.0", "HSK3.0"] | ["N5"] | ["TOPIK1"] | ["Extra"]
  level?: number; // 1–9 (HSK 3.0) · 5…1 (JLPT N5…N1) · 1–6 (TOPIK)
  frequency?: number;
  tags: string[];
  notes?: string;
  audio?: string; // ruta relativa a /audio/
  image?: string;
  source: WordSource;
  sourceRef?: string; // p. ej. id del vídeo/lectura/clase
  createProduction: boolean;
  createdAt: number;
  updatedAt: number;
  ankiNoteId?: number;
  ankiMod?: number; // mod de la nota en Anki (segundos)
  /** Campos propios del idioma: ja → kanjiBreakdown, pitchAccent, wordType · ko → hanja, pronunciation, irregular */
  extra?: Record<string, unknown>;
}

export type CardType = "recognition" | "production" | "listening" | "sentence" | "writing" | "reading";
export type CardState = 0 | 1 | 2 | 3; // ts-fsrs: New, Learning, Review, Relearning

export interface Card {
  id: string; // `${wordId}:${type}`
  lang: Lang;
  wordId: string;
  type: CardType;
  due: number;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: CardState;
  last_review?: number;
  suspended: boolean;
  createdAt: number;
  updatedAt: number;
  ankiInterval?: number;
  ankiDue?: number;
  ankiState?: "new" | "learning" | "review" | "relearning" | "suspended";
}

export interface ReviewLog {
  id?: number;
  lang: Lang;
  cardId: string;
  wordId: string;
  rating: 1 | 2 | 3 | 4;
  state: CardState;
  due: number;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  last_elapsed_days: number;
  scheduled_days: number;
  review: number;
  durationMs?: number;
}

export interface Category {
  id: string; // zh: slug · ja/ko: `${lang}:${slug}`
  lang: Lang;
  name: string;
  color: string;
  icon: string; // nombre de icono lucide
  order: number;
  builtin: boolean;
}

/** Estado de un carácter (hanzi / kanji / kana / jamo). Tabla `charStates`, id `${lang}:${char}`. */
export interface CharacterState {
  id: string;
  lang: Lang;
  hanzi: string;
  known: boolean; // reconocido
  canWrite: boolean; // sabe escribirlo
  mnemonic?: string;
  writingAttempts: number;
  writingMistakes: number;
  lastPracticed?: number;
  updatedAt: number;
}

export interface LessonProgress {
  lessonId: string;
  lang: Lang;
  unitId: string;
  status: "locked" | "available" | "started" | "completed";
  score?: number; // 0–1
  attempts: number;
  completedAt?: number;
  updatedAt: number;
}

export type Skill = "listening" | "reading" | "writing" | "speaking" | "tones" | "vocabulary" | "grammar" | "characters";

export interface ExerciseAttempt {
  id?: number;
  lang: Lang;
  exerciseType: string;
  itemId: string; // wordId, carácter, grammarId o id de frase
  itemKind: "word" | "character" | "grammar" | "sentence" | "tone" | "radical";
  skill: Skill;
  correct: boolean;
  answer?: string;
  expected?: string;
  context?: string; // lessonId, "practice", "exam"
  at: number;
  durationMs?: number;
}

export interface VideoLine {
  start: number; // segundos
  end: number;
  zh: string; // texto en la lengua meta
  es?: string;
  en?: string;
  reading?: string; // lectura de la línea (furigana / romanización) si viene precalculada
}

export interface Video {
  id: string; // id de YouTube
  lang: Lang;
  title: string;
  channel?: string;
  thumbnail?: string;
  lines: VideoLine[];
  source: "curated" | "user";
  level?: number;
  addedAt: number;
  lastWatched?: number;
  watchedSeconds: number;
}

export interface Reading {
  id: string;
  lang: Lang;
  title: string;
  text: string;
  translation?: string;
  source: "builtin" | "user";
  level?: number;
  addedAt: number;
  lastRead?: number;
  completed?: boolean;
  score?: number;
}

export interface Note {
  id: string;
  lang: Lang;
  title: string;
  markdown: string;
  wordIds: string[];
  kind: "note" | "class";
  classDate?: string; // YYYY-MM-DD
  homework?: string;
  grammar?: string;
  createdAt: number;
  updatedAt: number;
}

export interface StudySession {
  id?: number;
  lang: Lang;
  start: number;
  end: number;
  minutes: number;
  kind: "review" | "lesson" | "practice" | "video" | "reading" | "pomodoro" | "other";
  ref?: string;
}

export interface SettingRow {
  key: string;
  value: unknown;
  updatedAt: number;
}

export interface SyncStateRow {
  key: string; // "anki:lastSync", "seed:version", "seed:version:ja", ...
  value: unknown;
  updatedAt: number;
}

export interface DictHistoryRow {
  id?: number;
  lang: Lang;
  query: string;
  hanzi: string;
  at: number;
}

/** Tabla `favorites`, id `${lang}:${hanzi}`. */
export interface DictFavorite {
  id: string;
  lang: Lang;
  hanzi: string;
  pinyin: string;
  meaning: string;
  at: number;
}

/** Tabla `daily`, id `${lang}:${date}`. */
export interface DailyStat {
  id: string;
  lang: Lang;
  date: string; // YYYY-MM-DD
  minutes: number;
  reviews: number;
  newWords: number;
  exercises: number;
  correct: number;
  updatedAt: number;
}

/* ---- Formas antiguas (v2), solo para la migración ---- */
export type LegacyCharacterState = Omit<CharacterState, "id" | "lang">;
export type LegacyDictFavorite = Omit<DictFavorite, "id" | "lang">;
export type LegacyDailyStat = Omit<DailyStat, "id" | "lang">;
