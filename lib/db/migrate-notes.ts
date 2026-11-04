/**
 * Migración de notas v≤4 (Markdown plano / cuaderno de clase) al modelo de apuntes v5.
 * Pura (sin Dexie) para poder usarla en la actualización de esquema, en la importación de copias y en los tests.
 */
import type { LegacyNote, Note } from "./schema";
import { markdownToDoc, docRefs } from "@/lib/notes/markdown";

export function legacyNoteToV5(n: LegacyNote & Partial<Note>): Note {
  const isClass = n.kind === "class";
  const doc = isClass ? markdownToDoc(n.grammar ?? "") : markdownToDoc(n.markdown ?? "");
  const refs = docRefs(doc);
  return {
    id: n.id,
    lang: n.lang ?? "zh",
    title: n.title || (isClass ? "Clase" : "Sin título"),
    type: isClass ? "class" : "free",
    status: "active",
    doc,
    fields: isClass ? { date: n.classDate ?? "", vocabText: n.markdown ?? "", grammar: n.grammar ?? "", homework: n.homework ?? "" } : {},
    markdown: n.markdown ?? "",
    cues: [],
    summary: undefined,
    tags: Array.from(new Set([...(n.tags ?? []), ...refs.tags, ...(isClass ? ["clase"] : [])])),
    wordIds: n.wordIds ?? [],
    links: refs.links,
    grammarIds: [],
    unitId: undefined,
    level: undefined,
    pinned: false,
    builtin: false,
    reviewed: true,
    source: isClass ? { kind: "class" } : { kind: "manual" },
    kind: n.kind ?? "note",
    classDate: n.classDate,
    homework: n.homework,
    grammar: n.grammar,
    createdAt: n.createdAt ?? Date.now(),
    updatedAt: n.updatedAt ?? Date.now(),
  };
}
