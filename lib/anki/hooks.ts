"use client";
/**
 * Puntos de enganche entre la web y Anki: cuando se guarda una palabra, se envía a Anki
 * si está conectado y el usuario lo tiene activado. La implementación completa vive en sync.ts.
 */
import type { Word } from "@/lib/db";
import { ankiOnFor, useSettings } from "@/lib/settings";
import { useAnkiStatus } from "./client";

export async function onWordSaved(word: Word): Promise<void> {
  if (!ankiOnFor(useSettings.getState().settings, word.lang)) return;
  if (!useAnkiStatus.getState().connected) return;
  try {
    const { pushWordsToAnki } = await import("./sync");
    await pushWordsToAnki([word]);
  } catch (e) {
    console.warn("No se pudo enviar a Anki:", e);
  }
}
