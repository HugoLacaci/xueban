"use client";
/**
 * Sincronización bidireccional web ⇄ Anki vía AnkiConnect, por idioma (un tipo de nota por idioma,
 * definido en pack.anki). Clave compartida: campo WebID. Conflictos: último modificado gana.
 */
import { db, type Card, type Word, newCard, slugify, bumpDaily } from "@/lib/db";
import { useSettings } from "@/lib/settings";
import { getActivePack } from "@/lib/languages/registry";
import type { AnkiModelSpec, Lang } from "@/lib/languages/types";
import { createInvoker, type AnkiInvoker } from "./client";

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

/** Spec y nombres de categoría de la semilla del paquete activo. */
export function activeSpec(): { spec: AnkiModelSpec; lang: Lang; categoryNames: string[] } {
  const pack = getActivePack();
  const names: string[] = [];
  for (const w of pack.seed.words) if (!names.includes(w.category)) names.push(w.category);
  return { spec: pack.anki, lang: pack.id, categoryNames: names };
}

export function deckFor(word: Word, ctx = activeSpec()): string {
  return ctx.spec.deckFor(word, ctx.categoryNames);
}

export function wordToFields(w: Word, spec = activeSpec().spec): Record<string, string> {
  return spec.toFields(w);
}

export function tagsFor(w: Word, spec = activeSpec().spec): string[] {
  return spec.tags(w);
}

export function fieldsToWord(fields: Record<string, { value: string }>, tags: string[], noteId: number, mod: number | undefined, existing?: Word, spec = activeSpec().spec): Word {
  return spec.fromFields(fields, tags, noteId, mod, existing);
}

/* ------------------------ Modelo y mazos ------------------------ */

export async function ensureModel(invoke: AnkiInvoker = invoker(), spec = activeSpec().spec): Promise<void> {
  const models = await invoke<string[]>("modelNames");
  if (models.includes(spec.modelName)) return;
  await invoke("createModel", {
    modelName: spec.modelName,
    inOrderFields: [...spec.fields],
    css: spec.css,
    isCloze: false,
    cardTemplates: spec.templates,
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

export async function pushWordsToAnki(words: Word[], invoke: AnkiInvoker = invoker(), ctx = activeSpec()): Promise<PushResult> {
  const { spec } = ctx;
  const result: PushResult = { created: 0, updated: 0, errors: [] };
  if (!words.length) return result;
  await ensureModel(invoke, spec);
  const decks = new Set(words.map((w) => deckFor(w, ctx)));
  for (const d of decks) await ensureDeck(d, invoke);

  const existingIds = new Map<string, number>();
  const query = words.map((w) => `WebID:${escapeQuery(w.id)}`).join(" or ");
  const found = await invoke<number[]>("findNotes", { query: `"note:${spec.modelName}" (${query})` });
  if (found.length) {
    const infos = await invoke<AnkiNoteInfo[]>("notesInfo", { notes: found });
    for (const n of infos) existingIds.set(n.fields.WebID?.value ?? "", n.noteId);
  }

  const toAdd: Word[] = [];
  for (const w of words) {
    const noteId = existingIds.get(w.id) ?? w.ankiNoteId;
    if (noteId) {
      try {
        await invoke("updateNoteFields", { note: { id: noteId, fields: spec.toFields(w) } });
        await invoke("addTags", { notes: [noteId], tags: spec.tags(w).join(" ") });
        await db.words.update(w.id, { ankiNoteId: noteId });
        result.updated++;
      } catch (e) {
        result.errors.push(`${w.hanzi}: ${(e as Error).message}`);
      }
    } else toAdd.push(w);
  }
  if (toAdd.length) {
    const notes = toAdd.map((w) => ({
      deckName: deckFor(w, ctx),
      modelName: spec.modelName,
      fields: spec.toFields(w),
      tags: spec.tags(w),
      options: { allowDuplicate: false, duplicateScope: "deck" },
    }));
    const ids = await invoke<(number | null)[]>("addNotes", { notes });
    for (let i = 0; i < toAdd.length; i++) {
      const id = ids[i];
      if (id) {
        await db.words.update(toAdd[i].id, { ankiNoteId: id });
        result.created++;
        const w = toAdd[i];
        if (w.audio) await storeAudio(w.audio, invoke).catch(() => undefined);
      } else {
        const dup = await invoke<number[]>("findNotes", { query: `"note:${spec.modelName}" ${spec.keyField}:${escapeQuery(toAdd[i].hanzi)}` });
        if (dup.length) {
          await invoke("updateNoteFields", { note: { id: dup[0], fields: spec.toFields(toAdd[i]) } });
          await db.words.update(toAdd[i].id, { ankiNoteId: dup[0] });
          result.updated++;
        } else result.errors.push(`${toAdd[i].hanzi}: Anki no aceptó la nota`);
      }
    }
  }
  await db.syncState.put({ key: `anki:lastPush:${ctx.lang}`, value: Date.now(), updatedAt: Date.now() });
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

/** Clave de syncState compatible con la instalación anterior (chino sin sufijo). */
export function syncKey(base: string, lang: Lang): string {
  return lang === "zh" ? base : `${base}:${lang}`;
}

export async function planSync(invoke: AnkiInvoker = invoker(), ctx = activeSpec()): Promise<SyncPlan> {
  const { spec, lang } = ctx;
  const ids = await invoke<number[]>("findNotes", { query: `"note:${spec.modelName}"` });
  const notes = ids.length ? await invoke<AnkiNoteInfo[]>("notesInfo", { notes: ids }) : [];
  const webWords = await db.words.where("lang").equals(lang).toArray();
  const byId = new Map(webWords.map((w) => [w.id, w]));
  const byHanzi = new Map(webWords.map((w) => [w.hanzi, w]));
  const seenWeb = new Set<string>();
  const plan: SyncPlan = { newInAnki: [], newInWeb: [], conflicts: [], unchanged: 0, missingWebId: [] };
  const lastSync = ((await db.syncState.get(syncKey("anki:lastSync", lang)))?.value as number | undefined) ?? 0;

  for (const n of notes) {
    let webId = (n.fields.WebID?.value ?? "").trim();
    const hanzi = (n.fields[spec.keyField]?.value ?? "").replace(/<[^>]+>/g, "").trim();
    if (!hanzi) continue;
    if (!webId) {
      plan.missingWebId.push(n);
      const w = byHanzi.get(hanzi);
      webId = w?.id ?? `${spec.minePrefix}${hanzi}`;
    }
    const existing = byId.get(webId) ?? byHanzi.get(hanzi);
    const ankiMod = (n.mod ?? 0) * 1000;
    if (!existing) {
      plan.newInAnki.push({ note: n, word: spec.fromFields(n.fields, n.tags, n.noteId, n.mod) });
      continue;
    }
    seenWeb.add(existing.id);
    const ankiWord = spec.fromFields(n.fields, n.tags, n.noteId, n.mod, existing);
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

export async function applySync(plan: SyncPlan, opts: ApplyOptions, invoke: AnkiInvoker = invoker(), ctx = activeSpec()): Promise<{ imported: number; pushed: number; resolved: number }> {
  const { spec, lang } = ctx;
  let imported = 0;
  let pushed = 0;
  let resolved = 0;
  const now = Date.now();
  for (const n of plan.missingWebId) {
    const hanzi = (n.fields[spec.keyField]?.value ?? "").replace(/<[^>]+>/g, "").trim();
    const w = await db.words.where("[lang+hanzi]").equals([lang, hanzi]).first();
    const id = w?.id ?? `${spec.minePrefix}${hanzi}`;
    await invoke("updateNoteFields", { note: { id: n.noteId, fields: { WebID: id } } }).catch(() => undefined);
  }
  if (opts.importNewFromAnki) {
    const words = plan.newInAnki.map(({ word }) => ({ ...word, lang, source: "anki" as const }));
    const cards: Card[] = [];
    for (const w of words) for (const t of ["recognition", "production", "listening"] as const) cards.push(newCard(w.id, t, now, lang));
    await db.transaction("rw", db.words, db.cards, db.categories, async () => {
      await db.words.bulkPut(words);
      await db.cards.bulkPut(cards.filter(Boolean));
      for (const w of words) {
        const catId = lang === "zh" ? slugify(w.category) : `${lang}:${slugify(w.category)}`;
        if (!(await db.categories.get(catId))) await db.categories.put({ id: catId, lang, name: w.category, color: "#7a7064", icon: "Tag", order: 50, builtin: false });
      }
    });
    imported = words.length;
    if (imported) await bumpDaily({ newWords: imported }, lang);
  }
  for (const c of plan.conflicts) {
    const winner = opts.conflictResolution === "auto" ? c.winner : opts.conflictResolution;
    if (winner === "anki") {
      await db.words.put({ ...c.anki, lang, updatedAt: now });
    } else {
      await invoke("updateNoteFields", { note: { id: c.note.noteId, fields: spec.toFields(c.web) } });
      await db.words.update(c.web.id, { ankiNoteId: c.note.noteId, ankiMod: c.note.mod });
    }
    resolved++;
  }
  if (opts.pushNewToAnki && plan.newInWeb.length) {
    const r = await pushWordsToAnki(plan.newInWeb, invoke, ctx);
    pushed = r.created + r.updated;
  }
  await db.syncState.put({ key: syncKey("anki:lastSync", lang), value: now, updatedAt: now });
  return { imported, pushed, resolved };
}

/* ------------------------ Estado de aprendizaje ------------------------ */

/** Lee el estado de las tarjetas en Anki y lo vuelca en las tarjetas locales (ankiState/ankiInterval). */
export async function pullCardStates(invoke: AnkiInvoker = invoker(), ctx = activeSpec()): Promise<number> {
  const { spec, lang } = ctx;
  const noteIds = await invoke<number[]>("findNotes", { query: `"note:${spec.modelName}"` });
  if (!noteIds.length) return 0;
  const cardIds = await invoke<number[]>("findCards", { query: `"note:${spec.modelName}"` });
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
      const type = spec.ordToType[c.ord];
      if (!type) continue;
      const cardId = `${webId}:${type}`;
      const local = await db.cards.get(cardId);
      const state: Card["ankiState"] = c.queue === -1 ? "suspended" : c.type === 0 ? "new" : c.type === 1 ? "learning" : c.type === 3 ? "relearning" : "review";
      if (local) {
        await db.cards.update(cardId, { ankiState: state, ankiInterval: c.interval, ankiDue: c.due, updatedAt: now });
      } else if (await db.words.get(webId)) {
        await db.cards.put({ ...newCard(webId, type, now, lang), ankiState: state, ankiInterval: c.interval, ankiDue: c.due });
      } else continue;
      updated++;
    }
  });
  await db.syncState.put({ key: syncKey("anki:lastPull", lang), value: now, updatedAt: now });
  return updated;
}

export async function ankiWebSync(invoke: AnkiInvoker = invoker()): Promise<void> {
  await invoke("sync");
}
