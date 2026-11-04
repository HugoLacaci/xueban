"use client";
/**
 * Repositorio de apuntes: creación con plantilla, guardado (recalcula markdown, enlaces, etiquetas y palabras
 * vinculadas), bandeja de entrada, backlinks y apuntes del profesor (compendios).
 */
import { db, uuid, type Lang, type Note, type NoteCue, type NoteSource, type NoteStatus, type NoteType } from "@/lib/db";
import { getActiveLang, getActivePackOrNull } from "@/lib/languages/registry";
import { docRefs, docToMarkdown, docToText, markdownToDoc, type PMDoc } from "./markdown";
import { defaultsFor, templateFor, titleFromFields } from "./templates";

export interface NewNoteInput {
  type?: NoteType;
  title?: string;
  fields?: Record<string, unknown>;
  doc?: PMDoc;
  markdown?: string;
  status?: NoteStatus;
  tags?: string[];
  source?: NoteSource;
  unitId?: string;
  grammarIds?: string[];
  level?: number;
  cues?: NoteCue[];
  summary?: string;
  lang?: Lang;
  id?: string;
  builtin?: boolean;
  reviewed?: boolean;
  pinned?: boolean;
  classDate?: string;
}

export function emptyDoc(): PMDoc {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

/** Construye un apunte completo (sin guardarlo). */
export function buildNote(input: NewNoteInput): Note {
  const now = Date.now();
  const lang = input.lang ?? getActiveLang();
  const type = input.type ?? "free";
  const tpl = templateFor(type);
  const fields = { ...defaultsFor(type), ...(input.fields ?? {}) };
  const doc = input.doc ?? (input.markdown ? markdownToDoc(input.markdown) : emptyDoc());
  const refs = docRefs(doc);
  const title = (input.title ?? "").trim() || titleFromFields(type, fields) || tpl.defaultTitle;
  return {
    id: input.id ?? uuid(),
    lang,
    title,
    type,
    status: input.status ?? "active",
    doc,
    fields,
    markdown: input.markdown ?? docToMarkdown(doc),
    cues: input.cues ?? [],
    summary: input.summary,
    tags: Array.from(new Set([...(input.tags ?? []), ...refs.tags])),
    wordIds: [],
    links: refs.links,
    grammarIds: input.grammarIds ?? [],
    unitId: input.unitId,
    level: input.level,
    pinned: input.pinned ?? false,
    builtin: input.builtin ?? false,
    reviewed: input.reviewed ?? true,
    source: input.source,
    kind: type === "class" ? "class" : "note",
    classDate: input.classDate ?? (type === "class" ? (fields.date as string | undefined) : undefined),
    createdAt: now,
    updatedAt: now,
  };
}

/** Palabras del mazo que aparecen en el texto del apunte. */
async function linkedWordIds(n: Note): Promise<string[]> {
  const words = await db.words.where("lang").equals(n.lang).toArray();
  const text = `${n.title}\n${docToText(n.doc as PMDoc)}\n${Object.values(n.fields)
    .map((v) => (typeof v === "string" ? v : Array.isArray(v) ? JSON.stringify(v) : ""))
    .join("\n")}`;
  const pack = getActivePackOrNull();
  return words.filter((w) => w.hanzi.length > (pack?.id === "zh" ? 1 : 0) && text.includes(w.hanzi)).map((w) => w.id);
}

export async function createNote(input: NewNoteInput): Promise<Note> {
  const n = buildNote(input);
  n.wordIds = await linkedWordIds(n);
  await db.notes.put(n);
  return n;
}

/** Guarda cambios de un apunte recalculando markdown, enlaces, etiquetas y palabras. */
export async function saveNote(id: string, patch: Partial<Note>): Promise<Note | undefined> {
  const cur = await db.notes.get(id);
  if (!cur) return undefined;
  const next: Note = { ...cur, ...patch, updatedAt: Date.now() };
  if (patch.doc !== undefined) {
    const refs = docRefs(next.doc as PMDoc);
    next.markdown = docToMarkdown(next.doc as PMDoc);
    next.links = refs.links;
    next.tags = Array.from(new Set([...(patch.tags ?? cur.tags.filter((t) => !docRefs(cur.doc as PMDoc).tags.includes(t))), ...refs.tags]));
  }
  if (!next.title.trim()) next.title = titleFromFields(next.type, next.fields) || templateFor(next.type).defaultTitle;
  next.kind = next.type === "class" ? "class" : "note";
  if (next.type === "class" && typeof next.fields.date === "string") next.classDate = next.fields.date;
  next.wordIds = await linkedWordIds(next);
  await db.notes.put(next);
  return next;
}

export async function deleteNote(id: string): Promise<void> {
  await db.transaction("rw", db.notes, db.noteCards, db.assets, async () => {
    await db.notes.delete(id);
    await db.noteCards.where("noteId").equals(id).delete();
    await db.assets.where("noteId").equals(id).delete();
  });
}

/** Duplica un apunte (p. ej. uno del profesor para anotarlo). */
export async function duplicateNote(id: string): Promise<Note | undefined> {
  const cur = await db.notes.get(id);
  if (!cur) return undefined;
  const copy: Note = { ...cur, id: uuid(), title: `${cur.title} (mi copia)`, builtin: false, pinned: false, reviewed: true, createdAt: Date.now(), updatedAt: Date.now(), source: { kind: "manual", ref: cur.id } };
  copy.cues = cur.cues.map((c) => ({ ...c, id: uuid() }));
  await db.notes.put(copy);
  return copy;
}

/** Captura rápida a la bandeja de entrada. */
export async function captureToInbox(input: { text?: string; title?: string; source?: NoteSource; tags?: string[]; type?: NoteType; fields?: Record<string, unknown> }): Promise<Note> {
  const text = (input.text ?? "").trim();
  return createNote({
    type: input.type ?? "free",
    status: "inbox",
    title: input.title ?? (text ? text.split("\n")[0].slice(0, 60) : "Captura"),
    markdown: text,
    source: input.source ?? { kind: "capture" },
    tags: input.tags,
    fields: input.fields,
  });
}

/** Apuntes que enlazan a este (por id o por título). */
export async function backlinksOf(note: Note): Promise<Note[]> {
  const byId = await db.notes.where("links").equals(note.id).toArray();
  const byTitle = await db.notes.where("links").equals(note.title).toArray();
  const seen = new Set<string>();
  return [...byId, ...byTitle].filter((n) => n.id !== note.id && !seen.has(n.id) && (seen.add(n.id), true));
}

/** Resuelve el destino de un [[enlace]]: id exacto, título exacto (sin mayúsculas) o palabra. */
export async function resolveLink(target: string, lang: Lang = getActiveLang()): Promise<{ kind: "note"; note: Note } | { kind: "word"; text: string } | { kind: "missing"; title: string }> {
  const t = target.trim();
  const direct = await db.notes.get(t);
  if (direct && direct.lang === lang) return { kind: "note", note: direct };
  const all = await db.notes.where("lang").equals(lang).toArray();
  const low = t.toLowerCase();
  const byTitle = all.find((n) => n.title.toLowerCase() === low) ?? all.find((n) => n.title.toLowerCase().startsWith(low));
  if (byTitle) return { kind: "note", note: byTitle };
  const pack = getActivePackOrNull();
  if (pack?.hasTargetText(t) && t.length <= 6) return { kind: "word", text: t };
  return { kind: "missing", title: t };
}

export async function inboxCount(lang: Lang = getActiveLang()): Promise<number> {
  return db.notes.where("[lang+status]").equals([lang, "inbox"]).count();
}

/** Apuntes que «necesitan repaso»: nunca repasados o con más de 7 días desde el último repaso. */
export function needsReview(n: Note, now = Date.now()): boolean {
  if (n.status !== "active") return false;
  const last = n.lastReviewed ?? n.createdAt;
  return now - last > 7 * 86400000;
}

/** Carga (o actualiza) los apuntes del profesor incluidos en la app. Idempotente: respeta las copias del usuario. */
export async function ensureBuiltinNotes(lang: Lang, notes: Omit<NewNoteInput, "lang">[], version: number): Promise<number> {
  const key = `notes:builtin:${lang}`;
  const row = await db.syncState.get(key);
  if (row && row.value === version) return 0;
  let n = 0;
  await db.transaction("rw", db.notes, db.syncState, async () => {
    for (const input of notes) {
      if (!input.id) continue;
      const existing = await db.notes.get(input.id);
      const built = buildNote({ ...input, lang, builtin: true, reviewed: input.reviewed ?? false });
      // se conservan fijado, estado, último repaso y preguntas añadidas por el usuario
      if (existing) {
        built.pinned = existing.pinned;
        built.status = existing.status;
        built.lastReviewed = existing.lastReviewed;
        built.createdAt = existing.createdAt;
        const extra = existing.cues.filter((c) => !built.cues.some((b) => b.q === c.q));
        built.cues = [...built.cues, ...extra];
      }
      await db.notes.put(built);
      n++;
    }
    await db.syncState.put({ key, value: version, updatedAt: Date.now() });
  });
  return n;
}

export async function markReviewed(id: string): Promise<void> {
  await db.notes.update(id, { lastReviewed: Date.now() });
}
