"use client";
/** Carga en db.notes los apuntes del profesor del chino (content/zh/notes). Idempotente por versión. */
import { ensureBuiltinNotes } from "./repo";

let done: Promise<number> | undefined;
export function ensureZhBuiltinNotes(): Promise<number> {
  if (!done) {
    done = import("@/content/zh/notes").then(({ BUILTIN_NOTES, BUILTIN_NOTES_VERSION }) => ensureBuiltinNotes("zh", BUILTIN_NOTES.map((n) => ({ ...n, builtin: true, reviewed: n.reviewed ?? false })), BUILTIN_NOTES_VERSION)).catch((e) => {
      console.warn("No se pudieron cargar los apuntes del profesor", e);
      return 0;
    });
  }
  return done;
}
