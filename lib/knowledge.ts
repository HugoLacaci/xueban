"use client";
/**
 * Estado global de "qué sabe el usuario" en el idioma activo: palabras del mazo, palabras conocidas (SRS)
 * y caracteres conocidos. Se refresca desde Dexie con liveQuery y al cambiar de idioma.
 */
import { create } from "zustand";
import { liveQuery } from "dexie";
import { db, type Word } from "@/lib/db";
import { setUserWords } from "@/lib/dictionary/service";
import { getActiveLang, usePackStore } from "@/lib/languages/registry";

interface KnowledgeState {
  lang: string;
  deck: Map<string, Word>; // forma escrita → palabra del usuario
  known: Set<string>; // palabras conocidas (estado review)
  learning: Set<string>; // en aprendizaje (new/learning con alguna repetición)
  knownChars: Set<string>;
  ready: boolean;
}

export const useKnowledge = create<KnowledgeState>(() => ({
  lang: "zh",
  deck: new Map(),
  known: new Set(),
  learning: new Set(),
  knownChars: new Set(),
  ready: false,
}));

export function isKnownWord(word: string): boolean {
  const s = useKnowledge.getState();
  if (s.known.has(word)) return true;
  const chars = Array.from(word);
  return chars.length > 1 && chars.every((c) => s.known.has(c) || s.knownChars.has(c));
}

export function isInDeck(word: string): boolean {
  return useKnowledge.getState().deck.has(word);
}

let subscribed = false;
let computing = false;
let pending = false;

export async function computeKnowledge() {
  if (computing) {
    pending = true;
    return;
  }
  computing = true;
  try {
    const lang = getActiveLang();
    const [words, cards, chars] = await Promise.all([db.words.where("lang").equals(lang).toArray(), db.cards.where("lang").equals(lang).toArray(), db.charStates.where("lang").equals(lang).toArray()]);
    const byId = new Map(words.map((w) => [w.id, w]));
    const known = new Set<string>();
    const learning = new Set<string>();
    for (const c of cards) {
      const w = byId.get(c.wordId);
      if (!w) continue;
      const isReview = c.ankiState === "review" || (c.state === 2 && c.stability >= 1);
      if (isReview) known.add(w.hanzi);
      else if (c.reps > 0 || c.ankiState === "learning") learning.add(w.hanzi);
    }
    const knownChars = new Set<string>();
    for (const ch of chars) if (ch.known) knownChars.add(ch.hanzi);
    for (const w of known) if (Array.from(w).length === 1) knownChars.add(w);
    setUserWords(words);
    useKnowledge.setState({ lang, deck: new Map(words.map((w) => [w.hanzi, w])), known, learning, knownChars, ready: true });
  } finally {
    computing = false;
    if (pending) {
      pending = false;
      void computeKnowledge();
    }
  }
}

export function subscribeKnowledge() {
  if (subscribed || typeof window === "undefined") return;
  subscribed = true;
  liveQuery(() => Promise.all([db.words.count(), db.cards.count(), db.charStates.count()])).subscribe({
    next: () => void computeKnowledge(),
    error: (e) => console.error(e),
  });
  liveQuery(() => db.cards.orderBy("due").last()).subscribe({ next: () => void computeKnowledge() });
  liveQuery(() => db.words.orderBy("updatedAt").last()).subscribe({ next: () => void computeKnowledge() });
  liveQuery(() => db.charStates.count()).subscribe({ next: () => void computeKnowledge() });
  // cambio de idioma activo
  let last = getActiveLang();
  usePackStore.subscribe((s) => {
    if (s.active !== last && s.packs[s.active]) {
      last = s.active;
      useKnowledge.setState({ ready: false });
      void computeKnowledge();
    }
  });
  void computeKnowledge();
}
