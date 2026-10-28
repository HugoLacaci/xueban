/**
 * Modelo de datos local-first (IndexedDB vía Dexie).
 * Todas las entidades llevan updatedAt para permitir sincronización futura.
 */

export type WordSource = "seed" | "class" | "video" | "reading" | "dictionary" | "anki" | "manual" | "import";

export interface Word {
  id: string; // WebID compartido con Anki: hsk1-<hanzi> | mine-<hanzi> | uuid
  hanzi: string;
  traditional?: string;
  pinyin: string;
  meaning: string; // español (editable por el usuario)
  meaningEn?: string; // respaldo en inglés (CC-CEDICT)
  category: string;
  example?: string;
  examplePinyin?: string;
  exampleTranslation?: string;
  radical?: string;
  hsk: string[]; // ["HSK2.0", "HSK3.0"] | ["Extra"]
  level?: number; // 1–9 (HSK 3.0) o nivel 2.0 equivalente
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
}

export type CardType = "recognition" | "production" | "listening" | "sentence" | "writing";
export type CardState = 0 | 1 | 2 | 3; // ts-fsrs: New, Learning, Review, Relearning

export interface Card {
  id: string; // `${wordId}:${type}`
  wordId: string;
  type: CardType;
  // Campos FSRS (ts-fsrs Card)
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
  // Si Anki es la fuente de verdad: intervalo/estado leído de Anki
  ankiInterval?: number;
  ankiDue?: number;
  ankiState?: "new" | "learning" | "review" | "relearning" | "suspended";
}

export interface ReviewLog {
  id?: number;
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
  id: string;
  name: string;
  color: string;
  icon: string; // nombre de icono lucide
  order: number;
  builtin: boolean;
}

export interface CharacterState {
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
  exerciseType: string;
  itemId: string; // wordId, hanzi, grammarId o id de frase
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
  zh: string;
  es?: string;
  en?: string;
}

export interface Video {
  id: string; // id de YouTube
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
  key: string; // "anki:lastSync", "seed:version", ...
  value: unknown;
  updatedAt: number;
}

export interface DictHistoryRow {
  id?: number;
  query: string;
  hanzi: string;
  at: number;
}

export interface DictFavorite {
  hanzi: string;
  pinyin: string;
  meaning: string;
  at: number;
}

export interface DailyStat {
  date: string; // YYYY-MM-DD
  minutes: number;
  reviews: number;
  newWords: number;
  exercises: number;
  correct: number;
  updatedAt: number;
}
