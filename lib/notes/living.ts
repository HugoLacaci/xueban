"use client";
/**
 * Apuntes vivos: carga del contenido base por idioma (JSON versionado) y aportaciones del usuario (Dexie,
 * tabla livingNoteAdds, nunca se mezclan con la base). La lógica de desbloqueo está en ./living-model.
 */
import { db, uuid } from "@/lib/db";
import type { Lang } from "@/lib/languages/types";
import type { LivingNote, UserAddition } from "./living-model";

const LOADERS: Partial<Record<Lang, () => Promise<LivingNote[]>>> = {
  zh: () => import("@/content/zh/living").then((m) => m.LIVING_NOTES),
};

const cache = new Map<Lang, Promise<LivingNote[]>>();
export function loadLivingNotes(lang: Lang): Promise<LivingNote[]> {
  if (!cache.has(lang))
    cache.set(
      lang,
      (LOADERS[lang]?.() ?? Promise.resolve([])).catch(() => []),
    );
  return cache.get(lang)!;
}

export async function livingAdds(lang: Lang, noteId: string): Promise<UserAddition[]> {
  return db.livingNoteAdds.where("[lang+noteId]").equals([lang, noteId]).toArray();
}

export async function saveLivingAdd(
  lang: Lang,
  add: Omit<UserAddition, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<string> {
  const now = Date.now();
  const id = add.id ?? `living-${uuid()}`;
  const cur = add.id ? await db.livingNoteAdds.get(add.id) : undefined;
  await db.livingNoteAdds.put({
    ...add,
    id,
    lang,
    createdAt: cur?.createdAt ?? now,
    updatedAt: now,
  });
  return id;
}

export async function deleteLivingAdd(id: string): Promise<void> {
  await db.livingNoteAdds.delete(id);
}

/* ------------------------------------------------------------------ mis frases modelo */

export interface ModelSentence {
  zh: string;
  es: string;
  slots: number;
  lessonId: string;
  at: number;
}
const MODEL_KEY = (lang: Lang) => `${lang}:model-sentences`;

/** Guarda una frase construida correctamente («Construye la frase»); sin duplicados. */
export async function saveModelSentence(lang: Lang, s: Omit<ModelSentence, "at">): Promise<void> {
  const row = await db.settings.get(MODEL_KEY(lang));
  const list = ((row?.value as ModelSentence[]) ?? []).filter((x) => x.zh !== s.zh);
  list.push({ ...s, at: Date.now() });
  await db.settings.put({ key: MODEL_KEY(lang), value: list, updatedAt: Date.now() });
}

/** Mis frases modelo, de la más sencilla a la más compleja (número de huecos, luego longitud). */
export async function modelSentences(lang: Lang): Promise<ModelSentence[]> {
  const row = await db.settings.get(MODEL_KEY(lang));
  return [...((row?.value as ModelSentence[]) ?? [])].sort(
    (a, b) => a.slots - b.slots || [...a.zh].length - [...b.zh].length,
  );
}
