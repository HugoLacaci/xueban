/**
 * Apuntes del profesor (compendios de referencia) del chino. Cada archivo JSON es una lista de apuntes con la forma
 * de NewNoteInput (lib/notes/repo.ts) + id fijo. Se cargan en db.notes con builtin: true y reviewed: false.
 */
import type { NoteType, NoteCue } from "@/lib/db/schema";

export interface BuiltinNote {
  id: string;
  type: NoteType;
  title: string;
  fields?: Record<string, unknown>;
  markdown?: string;
  tags?: string[];
  grammarIds?: string[];
  unitId?: string;
  level?: number;
  cues?: NoteCue[];
  summary?: string;
  reviewed?: boolean;
  pinned?: boolean;
}

import questions from "./questions.json";
import particles from "./particles.json";
import classifiers from "./classifiers.json";
import grammar from "./grammar.json";
import contrasts from "./contrasts.json";
import numbers from "./numbers.json";
import errors from "./errors.json";
import phrases from "./phrases.json";

export const BUILTIN_NOTES_VERSION = 3;
export const BUILTIN_NOTES: BuiltinNote[] = [...(questions as BuiltinNote[]), ...(particles as BuiltinNote[]), ...(classifiers as BuiltinNote[]), ...(grammar as BuiltinNote[]), ...(contrasts as BuiltinNote[]), ...(numbers as BuiltinNote[]), ...(errors as BuiltinNote[]), ...(phrases as BuiltinNote[])];
export const BUILTIN_NOTE_IDS: string[] = BUILTIN_NOTES.map((n) => n.id);
