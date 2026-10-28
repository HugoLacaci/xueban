"use client";
/**
 * Sincronización bidireccional web ⇄ Anki vía AnkiConnect.
 * Clave compartida: campo WebID. Conflictos: último modificado gana.
 */
import { db, type Card, type Word, newCard, slugify, bumpDaily, seedCategoryNames } from "@/lib/db";
import { useSettings } from "@/lib/settings";
import { createInvoker, type AnkiInvoker } from "./client";
import { CSS, DECK_HSK1, DECK_MINE, DECK_ROOT, FIELDS, MODEL_NAME, TEMPLATES, type NoteFields } from "./model";
import { uuid } from "@/lib/db/repo";

export interface AnkiNoteInfo {
  noteId: number;
  modelName: string;
  tags: string[];
  fields: Record<string, { value: string; order: number }>;
  mod?: number;
  cards: number[];
}

export interface AnkiCardInfo {
  cardId: number;
  note: number;
  deckName: string;
  interval: number;
  due: number;
  queue: number; // -1 suspended, 0 new, 1 learning, 2 review, 3 day-learn
  type: number; // 0 new, 1 learning, 2 review, 3 relearning
  reps: number;
  lapses: number;
  ord: number;
  mod?: number;
}

function invoker(): AnkiInvoker {
  return createInvoker(useSettings.getState().settings.anki.url);
}

function deckFor(word: Word): string {
  const names = seedCategoryNames();
  const idx = names.indexOf(word.category);
  if (word.source === "seed" && idx >= 0) return `${DECK_HSK1}::${String(idx + 1).padStart(2, "0")} ${word.category}`;
  return DECK_MINE;
}

export function wordToFields(w: Word): NoteFields {
  return {
    Hanzi: w.hanzi,
    Pinyin: w.pinyin,
    Significado: w.meaning,
    Categoria: w.category,
    Ejemplo: w.example ?? "",
    EjemploPinyin: w.examplePinyin ?? "",
    EjemploTraduccion: w.exampleTranslation ?? "",
    Tradicional: w.traditional && w.traditional !== w.hanzi ? w.traditional : "",
    Radical: w.radical ?? "",
    Audio: w.audio ? `[sound:${w.audio.split("/").pop()}]` : "",
    Imagen: w.image ?? "",
    Notas: w.notes ?? "",
    HSK: w.hsk.filter((h) => h !== "Extra").join(" "),
    WebID: w.id,
    CrearProduccion: w.createProduction ? "y" : "",
  };
}

export function tagsFor(w: Word): string[] {
  const tags = new Set<string>(w.tags);
  if (w.level === 1 || w.hsk.length) tags.add("HSK1");
  for (const h of w.hsk) if (h !== "Extra") tags.add(h);
  tags.add(`cat::${w.category.replace(/\s+/g, "_")}`);
  if (w.source === "class") tags.add("clase");
  return Array.from(tags);
}

export function fieldsToWord(fields: Record<string, { value: string }>, tags: string[], noteId: number, mod: number | undefined, existing?: Word): Word {
  const f = (k: string) => (fields[k]?.value ?? "").replace(/<[^>]+>/g, "").trim();
  const now = Date.now();
  const hsk = f("HSK").split(/\s+/).filter(Boolean);
  const audio = f("Audio").match(/\[sound:([^\]]+)\]/)?.[1];
  const level = tags.includes("HSK1") || hsk.length ? 1 : existing?.level;
  return {
    id: existing?.id ?? (f("WebID") || (f("Hanzi") ? `mine-${f("Hanzi")}` : uuid())),
    hanzi: f("Hanzi"),
    traditional: f("Tradicional") || existing?.traditional,
    pinyin: f("Pinyin"),
    meaning: f("Significado"),
    meaningEn: existing?.meaningEn,
    category: f("Categoria") || existing?.category || "Clase",
    example: f("Ejemplo") || undefined,
    examplePinyin: f("EjemploPinyin") || undefined,
    exampleTranslation: f("EjemploTraduccion") || undefined,
    radical: f("Radical") || undefined,
    hsk: hsk.length ? hsk : (existing?.hsk ?? []),
    level,
    frequency: existing?.frequency,
    tags: Array.from(new Set([...tags.filter((t) => !t.startsWith("cat::")), ...(existing?.tags ?? [])])),
    notes: f("Notas") || undefined,
    audio: audio ? `/audio/${audio}` : existing?.audio,
    image: f("Imagen") || undefined,
    source: existing?.source ?? "anki",
    sourceRef: existing?.sourceRef,
    createProduction: f("CrearProduccion").toLowerCase() === "y",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    ankiNoteId: noteId,
    ankiMod: mod,
  };
}

/* ------------------------ Modelo y mazos ------------------------ */

export async function ensureModel(invoke: AnkiInvoker = invoker()): Promise<void> {
  const models = await invoke<string[]>("modelNames");
  if (models.includes(MODEL_NAME)) return;
  await invoke("createModel", {
    modelName: MODEL_NAME,
    inOrderFields: [...FIELDS],
    css: CSS,
    isCloze: false,
    cardTemplates: TEMPLATES,
  });
}

export async function ensureDeck(name: string, invoke: AnkiInvoker = invoker()): Promise<void> {
  await invoke("createDeck", { deck: name });
}

/* ------------------------ Web → Anki ------------------------ */

export interface PushResult {
  created: number;
  updated: number;
  errors: string[];
}

export async function pushWordsToAnki(words: Word[], invoke: AnkiInvoker = invoker()): Promise<PushResult> {
  const result: PushResult = { created: 0, updated: 0, errors: [] };
  if (!words.length) return result;
  await ensureModel(invoke);
  const decks = new Set(words.map(deckFor));
  for (const d of decks) await ensureDeck(d, invoke);

  // Buscar existentes por WebID
  const existingIds = new Map<string, number>();
  const query = words.map((w) => `WebID:${escapeQuery(w.id)}`).join(" or ");
  const found = await invoke<number[]>("findNotes", { query: `"note:${MODEL_NAME}" (${query})` });
  if (found.length) {
    const infos = await invoke<AnkiNoteInfo[]>("notesInfo", { notes: found });
    for (const n of infos) existingIds.set(n.fields.WebID?.value ?? "", n.noteId);
  }

  const toAdd: Word[] = [];
  for (const w of words) {
    const noteId = existingIds.get(w.id) ?? w.ankiNoteId;
    if (noteId) {
      try {
        await invoke("updateNoteFields", { note: { id: noteId, fields: wordToFields(w) } });
        await invoke("addTags", { notes: [noteId], tags: tagsFor(w).join(" ") });
        await db.words.update(w.id, { ankiNoteId: noteId });
        result.updated++;
      } catch (e) {
        result.errors.push(`${w.hanzi}: ${(e as Error).message}`);
      }
    } else toAdd.push(w);
  }
  if (toAdd.length) {
    const notes = toAdd.map((w) => ({
      deckName: deckFor(w),
      modelName: MODEL_NAME,
      fields: wordToFields(w),
      tags: tagsFor(w),
      options: { allowDuplicate: false, duplicateScope: "deck" },
    }));
    const ids = await invoke<(number | null)[]>("addNotes", { notes });
    for (let i = 0; i < toAdd.length; i++) {
      const id = ids[i];
      if (id) {
        await db.words.update(toAdd[i].id, { ankiNoteId: id });
        result.created++;
        // audio
        const w = toAdd[i];
        if (w.audio) await storeAudio(w.audio, invoke).catch(() => undefined);
      } else {
        // probablemente duplicado por Hanzi: intenta localizar por Hanzi y actualizar
        const dup = await invoke<number[]>("findNotes", { query: `"note:${MODEL_NAME}" Hanzi:${escapeQuery(toAdd[i].hanzi)}` });
        if (dup.length) {
          await invoke("updateNoteFields", { note: { id: dup[0], fields: wordToFields(toAdd[i]) } });
          await db.words.update(toAdd[i].id, { ankiNoteId: dup[0] });
          result.updated++;
        } else result.errors.push(`${toAdd[i].hanzi}: Anki no aceptó la nota`);
      }
    }
  }
  await db.syncState.put({ key: "anki:lastPush", value: Date.now(), updatedAt: Date.now() });
  return result;
}

async function storeAudio(path: string, invoke: AnkiInvoker) {
  const res = await fetch(path);
  if (!res.ok) return;
  const buf = await res.arrayBuffer();
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  await invoke("storeMediaFile", { filename: path.split("/").pop(), data: b64 });
}

function escapeQuery(s: string): string {
  return `"${s.replace(/"/g, '\\"')}"`;
}

/* ------------------------ Anki → Web ------------------------ */

export interface SyncPlan {
  newInAnki: { note: AnkiNoteInfo; word: Word }[];
  newInWeb: Word[];
  conflicts: { web: Word; anki: Word; note: AnkiNoteInfo; winner: "web" | "anki" }[];
  unchanged: number;
  missingWebId: AnkiNoteInfo[];
}

export async function planSync(invoke: AnkiInvoker = invoker()): Promise<SyncPlan> {
  const ids = await invoke<number[]>("findNotes", { query: `"note:${MODEL_NAME}"` });
  const notes = ids.length ? await invoke<AnkiNoteInfo[]>("notesInfo", { notes: ids }) : [];
  const webWords = await db.words.toArray();
  const byId = new Map(webWords.map((w) => [w.id, w]));
  const byHanzi = new Map(webWords.map((w) => [w.hanzi, w]));
  const seenWeb = new Set<string>();
  const plan: SyncPlan = { newInAnki: [], newInWeb: [], conflicts: [], unchanged: 0, missingWebId: [] };
  const lastSync = ((await db.syncState.get("anki:lastSync"))?.value as number | undefined) ?? 0;

  for (const n of notes) {
    let webId = (n.fields.WebID?.value ?? "").trim();
    const hanzi = (n.fields.Hanzi?.value ?? "").replace(/<[^>]+>/g, "").trim();
    if (!hanzi) continue;
    if (!webId) {
      plan.missingWebId.push(n);
      const w = byHanzi.get(hanzi);
      webId = w?.id ?? `mine-${hanzi}`;
    }
    const existing = byId.get(webId) ?? byHanzi.get(hanzi);
    const ankiMod = (n.mod ?? 0) * 1000;
    if (!existing) {
      plan.newInAnki.push({ note: n, word: fieldsToWord(n.fields, n.tags, n.noteId, n.mod) });
      continue;
    }
    seenWeb.add(existing.id);
    const ankiWord = fieldsToWord(n.fields, n.tags, n.noteId, n.mod, existing);
    const differs = contentDiffers(existing, ankiWord);
    if (!differs) {
      plan.unchanged++;
      continue;
    }
    const webChanged = existing.updatedAt > lastSync;
    const ankiChanged = ankiMod > lastSync || !existing.ankiMod || (n.mod ?? 0) !== existing.ankiMod;
    if (webChanged && ankiChanged) {
      plan.conflicts.push({ web: existing, anki: ankiWord, note: n, winner: existing.updatedAt >= ankiMod ? "web" : "anki" });
    } else if (ankiChanged) {
      plan.conflicts.push({ web: existing, anki: ankiWord, note: n, winner: "anki" });
    } else {
      plan.conflicts.push({ web: existing, anki: ankiWord, note: n, winner: "web" });
    }
  }
  for (const w of webWords) if (!seenWeb.has(w.id)) plan.newInWeb.push(w);
  return plan;
}

function contentDiffers(a: Word, b: Word): boolean {
  const keys: (keyof Word)[] = ["hanzi", "pinyin", "meaning", "category", "example", "examplePinyin", "exampleTranslation", "notes", "createProduction"];
  return keys.some((k) => (a[k] ?? "") !== (b[k] ?? ""));
}

export interface ApplyOptions {
  importNewFromAnki: boolean;
  pushNewToAnki: boolean;
  conflictResolution: "auto" | "web" | "anki";
}

export async function applySync(plan: SyncPlan, opts: ApplyOptions, invoke: AnkiInvoker = invoker()): Promise<{ imported: number; pushed: number; resolved: number }> {
  let imported = 0;
  let pushed = 0;
  let resolved = 0;
  const now = Date.now();
  // Notas sin WebID → escribir de vuelta
  for (const n of plan.missingWebId) {
    const hanzi = (n.fields.Hanzi?.value ?? "").replace(/<[^>]+>/g, "").trim();
    const w = await db.words.where("hanzi").equals(hanzi).first();
    const id = w?.id ?? `mine-${hanzi}`;
    await invoke("updateNoteFields", { note: { id: n.noteId, fields: { WebID: id } } }).catch(() => undefined);
  }
  if (opts.importNewFromAnki) {
    const words = plan.newInAnki.map(({ word }) => ({ ...word, source: "anki" as const }));
    const cards: Card[] = [];
    for (const w of words) for (const t of ["recognition", "production", "listening"] as const) cards.push(newCard(w.id, t, now));
    await db.transaction("rw", db.words, db.cards, db.categories, async () => {
      await db.words.bulkPut(words);
      await db.cards.bulkPut(cards.filter(Boolean));
      for (const w of words) {
        const catId = slugify(w.category);
        if (!(await db.categories.get(catId))) await db.categories.put({ id: catId, name: w.category, color: "#7a7064", icon: "Tag", order: 50, builtin: false });
      }
    });
    imported = words.length;
    if (imported) await bumpDaily({ newWords: imported });
  }
  for (const c of plan.conflicts) {
    const winner = opts.conflictResolution === "auto" ? c.winner : opts.conflictResolution;
    if (winner === "anki") {
      await db.words.put({ ...c.anki, updatedAt: now });
    } else {
      await invoke("updateNoteFields", { note: { id: c.note.noteId, fields: wordToFields(c.web) } });
      await db.words.update(c.web.id, { ankiNoteId: c.note.noteId, ankiMod: c.note.mod });
    }
    resolved++;
  }
  if (opts.pushNewToAnki && plan.newInWeb.length) {
    const r = await pushWordsToAnki(plan.newInWeb, invoke);
    pushed = r.created + r.updated;
  }
  await db.syncState.put({ key: "anki:lastSync", value: now, updatedAt: now });
  return { imported, pushed, resolved };
}

/* ------------------------ Estado de aprendizaje ------------------------ */

const ORD_TO_TYPE: Record<number, Card["type"]> = { 0: "recognition", 1: "production", 2: "listening" };

/** Lee el estado de las tarjetas en Anki y lo vuelca en las tarjetas locales (ankiState/ankiInterval). */
export async function pullCardStates(invoke: AnkiInvoker = invoker()): Promise<number> {
  const noteIds = await invoke<number[]>("findNotes", { query: `"note:${MODEL_NAME}"` });
  if (!noteIds.length) return 0;
  const cardIds = await invoke<number[]>("findCards", { query: `"note:${MODEL_NAME}"` });
  const infos = await invoke<AnkiCardInfo[]>("cardsInfo", { cards: cardIds });
  const notes = await invoke<AnkiNoteInfo[]>("notesInfo", { notes: noteIds });
  const noteToWebId = new Map<number, string>();
  for (const n of notes) {
    const id = (n.fields.WebID?.value ?? "").trim();
    if (id) noteToWebId.set(n.noteId, id);
  }
  let updated = 0;
  const now = Date.now();
  await db.transaction("rw", db.cards, db.words, async () => {
    for (const c of infos) {
      const webId = noteToWebId.get(c.note);
      if (!webId) continue;
      const type = ORD_TO_TYPE[c.ord];
      if (!type) continue;
      const cardId = `${webId}:${type}`;
      const local = await db.cards.get(cardId);
      const state: Card["ankiState"] = c.queue === -1 ? "suspended" : c.type === 0 ? "new" : c.type === 1 ? "learning" : c.type === 3 ? "relearning" : "review";
      if (local) {
        await db.cards.update(cardId, { ankiState: state, ankiInterval: c.interval, ankiDue: c.due, updatedAt: now });
      } else if (await db.words.get(webId)) {
        await db.cards.put({ ...newCard(webId, type, now), ankiState: state, ankiInterval: c.interval, ankiDue: c.due });
      } else continue;
      updated++;
    }
  });
  await db.syncState.put({ key: "anki:lastPull", value: now, updatedAt: now });
  return updated;
}

export async function ankiWebSync(invoke: AnkiInvoker = invoker()): Promise<void> {
  await invoke("sync");
}

export { DECK_ROOT };
