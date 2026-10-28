/**
 * Capa de repositorio: la UI nunca habla con Dexie directamente salvo con useLiveQuery.
 * Diseñada para poder cambiar el backend (IndexedDB → servidor) sin tocar la UI.
 */
import { db } from "./index";
import type { Card, CardType, Category, DailyStat, ExerciseAttempt, StudySession, Word } from "./schema";
import { createEmptyCard } from "ts-fsrs";
import seedJson from "@/content/seed/hsk1_vocab.json";

export const SEED_VERSION = 1;

export const CATEGORY_META: Record<string, { color: string; icon: string }> = {
  "Saludos y expresiones": { color: "#c0392b", icon: "Hand" },
  Pronombres: { color: "#8e44ad", icon: "Users" },
  "Números y cantidades": { color: "#1f6fd0", icon: "Hash" },
  Preguntas: { color: "#d35400", icon: "CircleHelp" },
  Clasificadores: { color: "#16a085", icon: "Boxes" },
  "Tiempo y fechas": { color: "#2980b9", icon: "CalendarDays" },
  Adjetivos: { color: "#e67e22", icon: "Sparkles" },
  "Familia y personas": { color: "#c2185b", icon: "Baby" },
  "Escuela y trabajo": { color: "#2e8b57", icon: "GraduationCap" },
  "Comida y bebida": { color: "#b8860b", icon: "Utensils" },
  "Casa y objetos": { color: "#7f8c8d", icon: "Home" },
  Lugares: { color: "#27ae60", icon: "MapPin" },
  Transporte: { color: "#34495e", icon: "TrainFront" },
  "Posición y dirección": { color: "#0097a7", icon: "Compass" },
  "Partículas y gramática": { color: "#6d4c41", icon: "Puzzle" },
  "Verbos básicos": { color: "#c0392b", icon: "Zap" },
  Adverbios: { color: "#5d6d7e", icon: "ArrowUpRight" },
  Ocio: { color: "#e91e63", icon: "Music" },
  Animales: { color: "#795548", icon: "Cat" },
  "Tiempo atmosférico": { color: "#03a9f4", icon: "CloudSun" },
  Salud: { color: "#f44336", icon: "HeartPulse" },
  Clase: { color: "#2f8f6f", icon: "NotebookPen" },
};

export const CARD_TYPES: CardType[] = ["recognition", "production", "listening", "sentence", "writing"];
export const DEFAULT_CARD_TYPES: CardType[] = ["recognition", "production", "listening"];

interface SeedWord {
  id: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  category: string;
  example: string;
  example_pinyin: string;
  example_translation: string;
  traditional: string;
  radical: string;
  frequency: number;
  hsk: string[];
  level: number;
}

export function seedWords(): SeedWord[] {
  return (seedJson as { words: SeedWord[] }).words;
}

export function seedCategoryNames(): string[] {
  const names: string[] = [];
  for (const w of seedWords()) if (!names.includes(w.category)) names.push(w.category);
  return names;
}

export function newCard(wordId: string, type: CardType, now = Date.now()): Card {
  const c = createEmptyCard(new Date(now));
  return {
    id: `${wordId}:${type}`,
    wordId,
    type,
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state as Card["state"],
    last_review: undefined,
    suspended: false,
    createdAt: now,
    updatedAt: now,
  };
}

/** Carga la semilla HSK 1 si la base de datos está vacía (idempotente). */
export async function ensureSeeded(): Promise<{ seeded: boolean; count: number }> {
  const existing = await db.syncState.get("seed:version");
  const wordCount = await db.words.count();
  if (existing && wordCount > 0) return { seeded: false, count: wordCount };
  const now = Date.now();
  const names = seedCategoryNames();
  const categories: Category[] = names.map((name, i) => ({
    id: slugify(name),
    name,
    color: CATEGORY_META[name]?.color ?? "#7a7064",
    icon: CATEGORY_META[name]?.icon ?? "Tag",
    order: i + 1,
    builtin: true,
  }));
  categories.push({ id: "clase", name: "Clase", color: "#2f8f6f", icon: "NotebookPen", order: 99, builtin: true });
  const words: Word[] = seedWords().map((w) => ({
    id: w.id,
    hanzi: w.hanzi,
    traditional: w.traditional !== w.hanzi ? w.traditional : undefined,
    pinyin: w.pinyin,
    meaning: w.meaning,
    category: w.category,
    example: w.example,
    examplePinyin: w.example_pinyin,
    exampleTranslation: w.example_translation,
    radical: w.radical || undefined,
    hsk: w.hsk,
    level: w.level,
    frequency: w.frequency,
    tags: ["HSK1", ...w.hsk.filter((h) => h !== "Extra"), `cat::${w.category.replace(/\s+/g, "_")}`],
    source: "seed",
    createProduction: true,
    createdAt: now,
    updatedAt: now,
  }));
  const cards: Card[] = [];
  for (const w of words) for (const t of DEFAULT_CARD_TYPES) cards.push(newCard(w.id, t, now));
  await db.transaction("rw", db.words, db.cards, db.categories, db.syncState, async () => {
    await db.categories.bulkPut(categories);
    await db.words.bulkPut(words);
    await db.cards.bulkPut(cards);
    await db.syncState.put({ key: "seed:version", value: SEED_VERSION, updatedAt: now });
  });
  return { seeded: true, count: words.length };
}

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* ------------------------- Palabras ------------------------- */

export interface NewWordInput {
  hanzi: string;
  pinyin: string;
  meaning: string;
  category: string;
  example?: string;
  examplePinyin?: string;
  exampleTranslation?: string;
  traditional?: string;
  radical?: string;
  hsk?: string[];
  level?: number;
  tags?: string[];
  notes?: string;
  source?: Word["source"];
  sourceRef?: string;
  createProduction?: boolean;
  meaningEn?: string;
  id?: string;
}

/** Crea (o actualiza si ya existe el hanzi) una palabra y sus tarjetas. */
export async function upsertWord(input: NewWordInput, cardTypes: CardType[] = DEFAULT_CARD_TYPES): Promise<Word> {
  const now = Date.now();
  const hanzi = input.hanzi.trim();
  const existing = (await db.words.where("hanzi").equals(hanzi).first()) ?? (input.id ? await db.words.get(input.id) : undefined);
  const id = existing?.id ?? input.id ?? `mine-${hanzi}`;
  const word: Word = {
    id,
    hanzi,
    traditional: input.traditional && input.traditional !== hanzi ? input.traditional : existing?.traditional,
    pinyin: input.pinyin.trim(),
    meaning: input.meaning.trim(),
    meaningEn: input.meaningEn ?? existing?.meaningEn,
    category: input.category || existing?.category || "Clase",
    example: input.example ?? existing?.example,
    examplePinyin: input.examplePinyin ?? existing?.examplePinyin,
    exampleTranslation: input.exampleTranslation ?? existing?.exampleTranslation,
    radical: input.radical ?? existing?.radical,
    hsk: input.hsk ?? existing?.hsk ?? [],
    level: input.level ?? existing?.level,
    frequency: existing?.frequency,
    tags: Array.from(new Set([...(existing?.tags ?? []), ...(input.tags ?? [])])),
    notes: input.notes ?? existing?.notes,
    audio: existing?.audio,
    image: existing?.image,
    source: existing?.source ?? input.source ?? "manual",
    sourceRef: input.sourceRef ?? existing?.sourceRef,
    createProduction: input.createProduction ?? existing?.createProduction ?? true,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    ankiNoteId: existing?.ankiNoteId,
    ankiMod: existing?.ankiMod,
  };
  await db.transaction("rw", db.words, db.cards, db.dailyStats, async () => {
    await db.words.put(word);
    for (const t of cardTypes) {
      const cid = `${id}:${t}`;
      if (!(await db.cards.get(cid))) await db.cards.put(newCard(id, t, now));
    }
    if (!existing) await bumpDaily({ newWords: 1 });
  });
  return word;
}

export async function deleteWord(id: string): Promise<void> {
  await db.transaction("rw", db.words, db.cards, db.reviewLogs, async () => {
    await db.words.delete(id);
    await db.cards.where("wordId").equals(id).delete();
    await db.reviewLogs.where("wordId").equals(id).delete();
  });
}

/* ------------------------- Estadísticas diarias ------------------------- */

export async function bumpDaily(delta: Partial<Omit<DailyStat, "date" | "updatedAt">>): Promise<void> {
  const date = todayKey();
  const now = Date.now();
  const cur = (await db.dailyStats.get(date)) ?? {
    date,
    minutes: 0,
    reviews: 0,
    newWords: 0,
    exercises: 0,
    correct: 0,
    updatedAt: now,
  };
  await db.dailyStats.put({
    ...cur,
    minutes: cur.minutes + (delta.minutes ?? 0),
    reviews: cur.reviews + (delta.reviews ?? 0),
    newWords: cur.newWords + (delta.newWords ?? 0),
    exercises: cur.exercises + (delta.exercises ?? 0),
    correct: cur.correct + (delta.correct ?? 0),
    updatedAt: now,
  });
}

export async function logStudy(session: Omit<StudySession, "id">): Promise<void> {
  await db.studySessions.add(session);
  await bumpDaily({ minutes: session.minutes });
}

export async function logAttempt(a: Omit<ExerciseAttempt, "id" | "at"> & { at?: number }): Promise<void> {
  await db.exerciseAttempts.add({ ...a, at: a.at ?? Date.now() });
  await bumpDaily({ exercises: 1, correct: a.correct ? 1 : 0 });
}

/* ------------------------- Conocimiento ------------------------- */

/** Palabras consideradas "conocidas": alguna tarjeta en estado Review con estabilidad ≥ 1 día, o marcada por Anki. */
export async function knownWordSet(): Promise<Set<string>> {
  const cards = await db.cards.where("state").anyOf([2, 3]).toArray();
  const known = new Set<string>();
  for (const c of cards) {
    if (c.ankiState === "review" || c.stability >= 1) known.add(c.wordId);
  }
  const ankiKnown = await db.cards.filter((c) => c.ankiState === "review").toArray();
  for (const c of ankiKnown) known.add(c.wordId);
  const words = await db.words.bulkGet(Array.from(known));
  const set = new Set<string>();
  for (const w of words) if (w) set.add(w.hanzi);
  return set;
}

/** Todas las palabras que están en el mazo (en estudio o no). */
export async function deckWordSet(): Promise<Map<string, Word>> {
  const words = await db.words.toArray();
  return new Map(words.map((w) => [w.hanzi, w]));
}

/* ------------------------- Copia de seguridad ------------------------- */

export async function exportBackup(): Promise<string> {
  const tables = db.tables.map((t) => t.name);
  const data: Record<string, unknown[]> = {};
  for (const name of tables) data[name] = await db.table(name).toArray();
  return JSON.stringify({ app: "xueban", version: db.verno, exportedAt: new Date().toISOString(), data }, null, 1);
}

export async function importBackup(json: string, mode: "replace" | "merge" = "merge"): Promise<void> {
  const parsed = JSON.parse(json) as { app?: string; data?: Record<string, unknown[]> };
  if (parsed.app !== "xueban" || !parsed.data) throw new Error("El archivo no es una copia de seguridad de Xuébàn.");
  const data = parsed.data;
  await db.transaction("rw", db.tables, async () => {
    for (const name of Object.keys(data)) {
      const table = db.tables.find((t) => t.name === name);
      if (!table) continue;
      if (mode === "replace") await table.clear();
      await table.bulkPut(data[name] as never[]);
    }
  });
}

export async function resetProgress(): Promise<void> {
  await db.transaction("rw", db.tables, async () => {
    for (const t of db.tables) await t.clear();
  });
  await ensureSeeded();
}
