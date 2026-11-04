"use client";
/**
 * 错题本 · cuaderno de errores: cada error de un ejercicio o corrección se guarda como apunte de tipo «error»
 * (lo que escribí, lo correcto, el porqué, la regla, mi reflexión) y entra en el SRS como tarjeta.
 */
import { db, type Note, type NoteSource } from "@/lib/db";
import { getActiveLang } from "@/lib/languages/registry";
import { createNote } from "./repo";
import { newNoteCard } from "./practice";
import type { ErrorType } from "@/lib/correction/types";

export interface RecordErrorInput {
  mine: string; // lo que escribí
  correct: string; // lo correcto
  es?: string; // frase en español
  explanation: string; // por qué
  errorType?: ErrorType | "grammar" | "other";
  ruleId?: string; // id de regla del linter / apunte de gramática
  noteId?: string; // apunte enlazado
  origin: string; // «cuaderno · Clase 3 nov», «ejercicio: transformar», «tutor»
  source?: NoteSource;
  tip?: string;
  tags?: string[];
}

const TYPE_MAP: Record<string, string> = { missing: "missing", extra: "extra", order: "order", char: "char", tone: "tone", pinyin: "tone", word: "word", grammar: "grammar", register: "register", other: "other" };

/** Guarda el error (sin duplicar el mismo par mine/correct) y su tarjeta SRS. Devuelve el apunte. */
export async function recordError(input: RecordErrorInput): Promise<Note> {
  const lang = getActiveLang();
  const key = `${input.mine.trim()}→${input.correct.trim()}`;
  const existing = await db.notes.where("[lang+type]").equals([lang, "error"]).filter((n) => `${n.fields.mine}→${n.fields.correct}` === key).first();
  if (existing) {
    const times = Number(existing.fields.times ?? 1) + 1;
    await db.notes.update(existing.id, { fields: { ...existing.fields, times, lastAt: Date.now() }, updatedAt: Date.now() });
    return { ...existing, fields: { ...existing.fields, times } };
  }
  const note = await createNote({
    type: "error",
    title: input.correct.trim(),
    fields: { origin: input.origin, mine: input.mine.trim(), correct: input.correct.trim(), es: input.es ?? "", errorType: TYPE_MAP[input.errorType ?? "other"] ?? "other", explanation: input.explanation, ruleId: input.ruleId ?? "", reflection: "", tip: input.tip ?? "", times: 1, lastAt: Date.now() },
    tags: Array.from(new Set(["错题", "errores", ...(input.tags ?? [])])),
    source: input.source ?? { kind: "correction" },
    grammarIds: input.ruleId ? [input.ruleId] : [],
  });
  if (input.noteId) await db.notes.update(note.id, { links: [input.noteId] });
  await db.noteCards.put(newNoteCard({ id: `${note.id}:error:main`, noteId: note.id, kind: "error", front: `❌ ${input.mine.trim()}${input.es ? `\n${input.es}` : ""}\n¿Cómo se dice bien?`, back: input.correct.trim(), hint: input.explanation }));
  return note;
}

/** Errores más repetidos (por tipo y por regla) para el repaso semanal. */
export async function errorStats(lang = getActiveLang()): Promise<{ total: number; byType: [string, number][]; byRule: [string, number][]; recent: Note[] }> {
  const notes = await db.notes.where("[lang+type]").equals([lang, "error"]).toArray();
  const byType = new Map<string, number>();
  const byRule = new Map<string, number>();
  for (const n of notes) {
    const t = String(n.fields.errorType ?? "other");
    const times = Number(n.fields.times ?? 1);
    byType.set(t, (byType.get(t) ?? 0) + times);
    const r = String(n.fields.ruleId ?? "");
    if (r) byRule.set(r, (byRule.get(r) ?? 0) + times);
  }
  const sortDesc = (m: Map<string, number>) => Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  return { total: notes.length, byType: sortDesc(byType), byRule: sortDesc(byRule), recent: notes.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 10) };
}
