"use client";
/**
 * Fachada del diccionario del idioma activo. La implementación (índices, carga de datos) vive en
 * cada paquete (pack.dictionary); aquí se despacha y se expone un store React con el estado de carga.
 */
import { create } from "zustand";
import { db, type Word } from "@/lib/db";
import type { DictEntry, SearchResult } from "./types";
import type { Lexicon } from "@/lib/segment";
import { getActivePackOrNull, getActiveLang, usePackStore } from "@/lib/languages/registry";
import type { DictionaryProvider, DictStatus } from "@/lib/languages/types";

interface DictState {
  status: DictStatus;
  full: DictStatus;
  error?: string;
  entries: number;
  load: () => Promise<void>;
  loadFull: () => Promise<void>;
}

function provider(): DictionaryProvider | null {
  return getActivePackOrNull()?.dictionary ?? null;
}

export const useDictionary = create<DictState>((set) => ({
  status: "idle",
  full: "idle",
  entries: 0,
  load: async () => {
    const p = provider();
    if (!p) return;
    set({ status: p.status() === "ready" ? "ready" : "loading" });
    try {
      await p.load();
      set({ status: p.status(), entries: p.entryCount(), error: p.error() });
    } catch (e) {
      set({ status: "error", error: (e as Error).message });
    }
  },
  loadFull: async () => {
    const p = provider();
    if (!p?.loadFull) return;
    set({ full: "loading" });
    try {
      await p.loadFull();
      set({ full: "ready", entries: p.entryCount() });
    } catch (e) {
      set({ full: "error", error: (e as Error).message });
    }
  },
}));

// Al cambiar de idioma, refleja el estado del nuevo proveedor.
let unsubscribeProvider: (() => void) | undefined;
let lastLang: string | undefined;
usePackStore.subscribe((s) => {
  if (s.active === lastLang) return;
  lastLang = s.active;
  const p = s.packs[s.active]?.dictionary;
  unsubscribeProvider?.();
  if (!p) return;
  const sync = () => useDictionary.setState({ status: p.status(), entries: p.entryCount(), error: p.error(), full: "idle" });
  sync();
  unsubscribeProvider = p.subscribe(sync);
});

/** Actualiza la caché de palabras del usuario (llamar cuando cambie la tabla words). */
export function setUserWords(words: Word[]) {
  provider()?.setUserWords(words.filter((w) => (w.lang ?? "zh") === getActiveLang()));
}

export function getLexicon(): Lexicon | undefined {
  return provider()?.lexicon();
}

export function userWord(text: string): Word | undefined {
  return provider()?.userWord(text);
}

/** Entradas para una palabra exacta. Prioriza la del usuario. */
export function lookup(word: string): DictEntry[] {
  return provider()?.lookup(word) ?? [];
}

export function lookupFirst(word: string): DictEntry | undefined {
  return provider()?.lookupFirst(word);
}

export function isLoaded(): boolean {
  return provider()?.status() === "ready";
}

export function search(query: string, limit = 50): SearchResult[] {
  return provider()?.search(query, limit) ?? [];
}

export function wordsContaining(ch: string, limit = 30): DictEntry[] {
  return provider()?.wordsContaining?.(ch, limit) ?? [];
}

export function levelLabel(e: DictEntry): string | undefined {
  return provider()?.levelLabel(e);
}

export function externalLinks(word: string): { name: string; url: string }[] {
  return provider()?.externalLinks(word) ?? [];
}

/** Sincroniza la caché del usuario con Dexie (llamar al arrancar y tras cambios). */
export async function refreshUserWords() {
  setUserWords(await db.words.where("lang").equals(getActiveLang()).toArray());
}

export type { DictEntry, SearchResult };
