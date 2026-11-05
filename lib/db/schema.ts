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

/* ---- Apuntes (v5) ---- */

/** Plantillas de apunte. `free` = texto libre (notas heredadas); `class` = cuaderno de clase heredado. */
export type NoteType =
  | "free"
  | "word"
  | "character"
  | "grammar"
  | "particle"
  | "question"
  | "contrast"
  | "phrase"
  | "dialogue"
  | "error"
  | "class"
  | "topic"
  | "culture"
  | "pronunciation"
  | "lesson";

export type NoteStatus = "inbox" | "active" | "archived";

export interface NoteCue {
  id: string;
  q: string; // pregunta clave (columna Cornell)
  a: string; // respuesta (se tapa al repasar)
}

export interface NoteSource {
  kind: "dictionary" | "exercise" | "video" | "reading" | "tutor" | "class" | "capture" | "lesson" | "grammar" | "correction" | "manual";
  ref?: string; // id de la palabra, vídeo, lectura, ejercicio…
  context?: string; // frase o texto de donde vino
  href?: string; // ruta interna para volver
}

export interface Note {
  id: string;
  lang: Lang;
  title: string;
  /** Plantilla del apunte (v5). */
  type: NoteType;
  status: NoteStatus;
  /** Documento TipTap (JSON de ProseMirror) con los bloques libres. */
  doc?: unknown;
  /** Campos estructurados de la plantilla (ver lib/notes/templates.ts). */
  fields: Record<string, unknown>;
  /** Markdown: heredado de las notas antiguas y copia de exportación (se regenera al guardar). */
  markdown: string;
  /** Preguntas clave (método Cornell) con su respuesta. */
  cues: NoteCue[];
  /** Resumen de una línea (pie Cornell). */
  summary?: string;
  tags: string[];
  wordIds: string[];
  /** Ids de apuntes enlazados con [[…]] (los backlinks se calculan). */
  links: string[];
  grammarIds: string[];
  unitId?: string;
  /** unitId del temario antiguo (u01…u14), conservado tras la migración al temario nuevo */
  legacyUnitId?: string;
  level?: number; // nivel HSK (1–3)
  pinned: boolean;
  /** Apunte del profesor (compendio incluido en la app). Se puede duplicar y anotar. */
  builtin?: boolean;
  reviewed?: boolean;
  source?: NoteSource;
  /** Heredado (v≤4): "note" | "class". Se mantiene para las consultas antiguas y las copias de seguridad. */
  kind: "note" | "class";
  classDate?: string; // YYYY-MM-DD (apuntes de clase)
  homework?: string;
  grammar?: string;
  createdAt: number;
  updatedAt: number;
  lastReviewed?: number;
}

/** Forma antigua de una nota (v≤4), solo para la migración y los tests. */
export interface LegacyNote {
  id: string;
  lang: Lang;
  title: string;
  markdown: string;
  wordIds: string[];
  kind: "note" | "class";
  classDate?: string;
  homework?: string;
  grammar?: string;
  createdAt: number;
  updatedAt: number;
}

/** Tarjeta SRS generada desde un apunte (pregunta Cornell, frase, hueco o error del 错题本). Tabla `noteCards`. */
export interface NoteCard {
  id: string; // `${noteId}:${kind}:${n}`
  lang: Lang;
  noteId: string;
  kind: "cue" | "cloze" | "phrase" | "error" | "word";
  front: string;
  back: string;
  hint?: string;
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
}

/** Conjunto de ejercicios del cuaderno 练习本 (por clase, fecha o tema). */
export interface ExerciseSet {
  id: string;
  lang: Lang;
  title: string;
  date?: string; // YYYY-MM-DD
  topic?: string;
  unitId?: string;
  /** unitId del temario antiguo (u01…u14), conservado tras la migración al temario nuevo */
  legacyUnitId?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

/** Ítem del cuaderno: frase en español que hay que traducir al chino, con soluciones opcionales. */
export interface ExerciseItem {
  id: string;
  lang: Lang;
  setId: string;
  order: number;
  es: string;
  answers: string[]; // respuestas de referencia (puede estar vacío)
  hint?: string;
  tags: string[];
  grammarIds: string[];
  unitId?: string;
  /** unitId del temario antiguo (u01…u14), conservado tras la migración al temario nuevo */
  legacyUnitId?: string;
  // SRS (ts-fsrs)
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
  attempts: number;
  correct: number;
  lastScore?: number;
  /** Respuesta del alumno escrita en la lista del conjunto (se guarda mientras escribe; se corrige cuando quiera). */
  myAnswer?: string;
  lastAt?: number;
  createdAt: number;
  updatedAt: number;
}

export type AnswerMode = "hanzi" | "pinyin" | "handwriting" | "speech";

export interface ItemAttempt {
  id?: number;
  lang: Lang;
  itemId: string;
  setId: string;
  mode: AnswerMode;
  answer: string;
  score: number; // 0–100
  verdict: "correct" | "improvable" | "wrong" | "partial";
  report?: unknown; // CorrectionReport (lib/correction)
  at: number;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  at: number;
  /** Acciones propuestas por el tutor pendientes de confirmación */
  actions?: { id: string; tool: string; args: Record<string, unknown>; done?: boolean }[];
  meta?: Record<string, unknown>;
}

/** Conversación con el tutor (tabla `chats`). */
export interface Chat {
  id: string;
  lang: Lang;
  mode: "scenario" | "free" | "corrector" | "explainer" | "generator" | "planner" | "voice" | "roleplay";
  title: string;
  scenarioId?: string;
  messages: ChatMessage[];
  goals?: { text: string; done: boolean }[];
  newWords?: string[];
  createdAt: number;
  updatedAt: number;
  savedNoteId?: string;
}

/** Fotos y audios de los apuntes (Blob en IndexedDB). Tabla `assets`. */
export interface Asset {
  id: string;
  lang: Lang;
  noteId?: string;
  kind: "image" | "audio" | "drawing";
  mime: string;
  blob: Blob;
  name?: string;
  createdAt: number;
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

/** v6: aportaciones del usuario a los apuntes vivos (separadas del contenido base: nunca se sobrescriben). */
export interface LivingNoteAdd {
  id: string;
  lang: Lang;
  noteId: string;
  afterSectionId?: string;
  kind: "section" | "example" | "teacher";
  title?: string;
  markdown: string;
  createdAt: number;
  updatedAt: number;
}
