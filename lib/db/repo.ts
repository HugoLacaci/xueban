/**
 * Capa de repositorio: la UI nunca habla con Dexie directamente salvo con useLiveQuery.
 * Multiidioma: cada operación trabaja sobre el idioma activo (o el que se pase).
 */
import { db } from "./index";
import type { Card, CardType, Category, DailyStat, ExerciseAttempt, Lang, StudySession, Word } from "./schema";
import { createEmptyCard } from "ts-fsrs";
import { categoryId, todayKey } from "./ids";
import { seedToWord } from "./seed-word";
import { getActiveLang, getActivePack, getPack, loadPack } from "@/lib/languages/registry";
import type { LanguagePack, SeedWord } from "@/lib/languages/types";

export const SEED_VERSION = 1;

export const CARD_TYPES: CardType[] = ["recognition", "production", "listening", "sentence", "writing", "reading"];
export const DEFAULT_CARD_TYPES: CardType[] = ["recognition", "production", "listening"];

/** Semilla del paquete activo (o del indicado). */
export function seedWords(lang: Lang = getActiveLang()): SeedWord[] {
  const pack = getPack(lang) ?? getActivePack();
  return pack.seed.words;
}

export function seedCategoryNames(lang: Lang = getActiveLang()): string[] {
  const names: string[] = [];
  for (const w of seedWords(lang)) if (!names.includes(w.category)) names.push(w.category);
  return names;
}

export function newCard(wordId: string, type: CardType, now = Date.now(), lang: Lang = getActiveLang()): Card {
  const c = createEmptyCard(new Date(now));
  return {
    id: `${wordId}:${type}`,
    lang,
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

function seedKey(lang: Lang): string {
  return lang === "zh" ? "seed:version" : `seed:version:${lang}`;
}

/** Carga la semilla de un idioma si su mazo está vacío (idempotente). */
export async function ensureSeeded(lang: Lang = getActiveLang()): Promise<{ seeded: boolean; count: number }> {
  const pack: LanguagePack = getPack(lang) ?? (await loadPack(lang));
  const existing = await db.syncState.get(seedKey(lang));
  const wordCount = await db.words.where("lang").equals(lang).count();
  if (existing && wordCount > 0) return { seeded: false, count: wordCount };
  const now = Date.now();
  const names: string[] = [];
  for (const w of pack.seed.words) if (!names.includes(w.category)) names.push(w.category);
  const categories: Category[] = names.map((name, i) => ({
    id: categoryId(lang, name),
    lang,
    name,
    color: pack.categories[name]?.color ?? "#7a7064",
    icon: pack.categories[name]?.icon ?? "Tag",
    order: i + 1,
    builtin: true,
  }));
  categories.push({ id: categoryId(lang, "Clase"), lang, name: "Clase", color: "#2f8f6f", icon: "NotebookPen", order: 99, builtin: true });
  const words: Word[] = pack.seed.words.map((w) => seedToWord(w, lang, pack.seed.levelTag, now));
  const cards: Card[] = [];
  for (const w of words) for (const t of cardTypesFor(pack, w)) cards.push(newCard(w.id, t, now, lang));
  await db.transaction("rw", db.words, db.cards, db.categories, db.syncState, async () => {
    await db.categories.bulkPut(categories);
    await db.words.bulkPut(words);
    await db.cards.bulkPut(cards);
    await db.syncState.put({ key: seedKey(lang), value: SEED_VERSION, updatedAt: now });
  });
  return { seeded: true, count: words.length };
}

export { slugify, uuid, todayKey, categoryId } from "./ids";

/** Tipos de tarjeta de una palabra según el modelo de Anki del idioma (ja añade «Lectura»). */
export function cardTypesFor(pack: LanguagePack, w: Word): CardType[] {
  if (pack.id === "zh") return DEFAULT_CARD_TYPES; // comportamiento heredado (no cambiar)
  const types = pack.anki.cardOrds(w).map((o) => pack.anki.ordToType[o]).filter(Boolean);
  return types.length ? types : DEFAULT_CARD_TYPES;
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
  romanization?: string;
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
  lang?: Lang;
  extra?: Record<string, unknown>;
}

/** Crea (o actualiza si ya existe la forma escrita en ese idioma) una palabra y sus tarjetas. */
export async function upsertWord(input: NewWordInput, cardTypesIn?: CardType[]): Promise<Word> {
  const now = Date.now();
  const lang = input.lang ?? getActiveLang();
  const pack = getPack(lang) ?? getActivePack();
  const hanzi = input.hanzi.trim();
  const existing = (await db.words.where("[lang+hanzi]").equals([lang, hanzi]).first()) ?? (input.id ? await db.words.get(input.id) : undefined);
  const id = existing?.id ?? input.id ?? `${pack.anki.minePrefix}${hanzi}`;
  const word: Word = {
    id,
    lang,
    hanzi,
    traditional: input.traditional && input.traditional !== hanzi ? input.traditional : existing?.traditional,
    pinyin: input.pinyin.trim(),
    romanization: input.romanization ?? existing?.romanization,
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
    extra: input.extra ?? existing?.extra,
  };
  const cardTypes = cardTypesIn ?? cardTypesFor(pack, word);
  await db.transaction("rw", db.words, db.cards, db.daily, async () => {
    await db.words.put(word);
    for (const t of cardTypes) {
      const cid = `${id}:${t}`;
      if (!(await db.cards.get(cid))) await db.cards.put(newCard(id, t, now, lang));
    }
    if (!existing) await bumpDaily({ newWords: 1 }, lang);
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

export async function bumpDaily(delta: Partial<Omit<DailyStat, "id" | "lang" | "date" | "updatedAt">>, lang: Lang = getActiveLang()): Promise<void> {
  const date = todayKey();
  const now = Date.now();
  const id = `${lang}:${date}`;
  const cur = (await db.daily.get(id)) ?? { id, lang, date, minutes: 0, reviews: 0, newWords: 0, exercises: 0, correct: 0, updatedAt: now };
  await db.daily.put({
    ...cur,
    minutes: cur.minutes + (delta.minutes ?? 0),
    reviews: cur.reviews + (delta.reviews ?? 0),
    newWords: cur.newWords + (delta.newWords ?? 0),
    exercises: cur.exercises + (delta.exercises ?? 0),
    correct: cur.correct + (delta.correct ?? 0),
    updatedAt: now,
  });
}

export async function logStudy(session: Omit<StudySession, "id" | "lang"> & { lang?: Lang }): Promise<void> {
  const lang = session.lang ?? getActiveLang();
  await db.studySessions.add({ ...session, lang });
  await bumpDaily({ minutes: session.minutes }, lang);
}

export async function logAttempt(a: Omit<ExerciseAttempt, "id" | "at" | "lang"> & { at?: number; lang?: Lang }): Promise<void> {
  const lang = a.lang ?? getActiveLang();
  await db.exerciseAttempts.add({ ...a, lang, at: a.at ?? Date.now() });
  await bumpDaily({ exercises: 1, correct: a.correct ? 1 : 0 }, lang);
}

/* ------------------------- Conocimiento ------------------------- */

/** Palabras consideradas "conocidas" en un idioma: alguna tarjeta en Review con estabilidad ≥ 1 día, o marcada por Anki. */
export async function knownWordSet(lang: Lang = getActiveLang()): Promise<Set<string>> {
  const cards = await db.cards.where("[lang+state]").anyOf([[lang, 2], [lang, 3]]).toArray();
  const known = new Set<string>();
  for (const c of cards) if (c.ankiState === "review" || c.stability >= 1) known.add(c.wordId);
  const ankiKnown = await db.cards.where("lang").equals(lang).filter((c) => c.ankiState === "review").toArray();
  for (const c of ankiKnown) known.add(c.wordId);
  const words = await db.words.bulkGet(Array.from(known));
  const set = new Set<string>();
  for (const w of words) if (w) set.add(w.hanzi);
  return set;
}

/** Todas las palabras que están en el mazo del idioma (en estudio o no). */
export async function deckWordSet(lang: Lang = getActiveLang()): Promise<Map<string, Word>> {
  const words = await db.words.where("lang").equals(lang).toArray();
  return new Map(words.map((w) => [w.hanzi, w]));
}

/* ------------------------- Copia de seguridad ------------------------- */

const LANG_TABLES = ["words", "cards", "reviewLogs", "categories", "charStates", "lessonProgress", "exerciseAttempts", "videos", "readings", "notes", "studySessions", "dictHistory", "favorites", "daily"];

export async function exportBackup(lang?: Lang): Promise<string> {
  const tables = db.tables.map((t) => t.name);
  const data: Record<string, unknown[]> = {};
  for (const name of tables) {
    const table = db.table(name);
    data[name] = lang && LANG_TABLES.includes(name) ? await table.where("lang").equals(lang).toArray() : await table.toArray();
  }
  return JSON.stringify({ app: "xueban", version: db.verno, lang: lang ?? "all", exportedAt: new Date().toISOString(), data }, null, 1);
}

export async function importBackup(json: string, mode: "replace" | "merge" = "merge"): Promise<void> {
  const parsed = JSON.parse(json) as { app?: string; data?: Record<string, unknown[]>; lang?: string; version?: number };
  if (parsed.app !== "xueban" || !parsed.data) throw new Error("El archivo no es una copia de seguridad de Xuébàn.");
  const data = upgradeBackup(parsed.data, parsed.version ?? 2);
  const only = parsed.lang && parsed.lang !== "all" ? (parsed.lang as Lang) : undefined;
  await db.transaction("rw", db.tables, async () => {
    for (const name of Object.keys(data)) {
      const table = db.tables.find((t) => t.name === name);
      if (!table) continue;
      if (mode === "replace") {
        if (only && LANG_TABLES.includes(name)) await table.where("lang").equals(only).delete();
        else await table.clear();
      }
      await table.bulkPut(data[name] as never[]);
    }
  });
}

/** Convierte una copia v1/v2 (solo chino) al esquema v3. */
function upgradeBackup(data: Record<string, unknown[]>, version: number): Record<string, unknown[]> {
  if (version >= 3) return data;
  const out: Record<string, unknown[]> = {};
  for (const [name, rows] of Object.entries(data)) {
    if (name === "characters") out.charStates = (rows as { hanzi: string }[]).map((r) => ({ ...r, id: `zh:${r.hanzi}`, lang: "zh" }));
    else if (name === "dictFavorites") out.favorites = (rows as { hanzi: string }[]).map((r) => ({ ...r, id: `zh:${r.hanzi}`, lang: "zh" }));
    else if (name === "dailyStats") out.daily = (rows as { date: string }[]).map((r) => ({ ...r, id: `zh:${r.date}`, lang: "zh" }));
    else if (LANG_TABLES.includes(name)) out[name] = (rows as object[]).map((r) => ({ lang: "zh", ...r }));
    else out[name] = rows;
  }
  return out;
}

export async function resetProgress(lang?: Lang): Promise<void> {
  await db.transaction("rw", db.tables, async () => {
    for (const t of db.tables) {
      if (lang && LANG_TABLES.includes(t.name)) await t.where("lang").equals(lang).delete();
      else if (!lang) await t.clear();
    }
    if (lang) await db.syncState.delete(seedKey(lang));
  });
  await ensureSeeded(lang ?? getActiveLang());
}
