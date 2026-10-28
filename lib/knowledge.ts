"use client";
/**
 * Estado global de "qué sabe el usuario": palabras del mazo, palabras conocidas (SRS) y
 * caracteres conocidos. Se refresca desde Dexie con liveQuery en los providers.
 */
import { create } from "zustand";
import { liveQuery } from "dexie";
import { db, type Word } from "@/lib/db";
import { setUserWords } from "@/lib/dictionary/service";

interface KnowledgeState {
  deck: Map<string, Word>; // hanzi → palabra del usuario
  known: Set<string>; // hanzi de palabras conocidas (estado review)
  learning: Set<string>; // en aprendizaje (new/learning con alguna repetición)
  knownChars: Set<string>;
  ready: boolean;
}

export const useKnowledge = create<KnowledgeState>(() => ({
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
export function subscribeKnowledge() {
  if (subscribed || typeof window === "undefined") return;
  subscribed = true;
  const compute = async () => {
    const [words, cards, chars] = await Promise.all([db.words.toArray(), db.cards.toArray(), db.characters.toArray()]);
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
    for (const w of known) if (w.length === 1) knownChars.add(w);
    setUserWords(words);
    useKnowledge.setState({ deck: new Map(words.map((w) => [w.hanzi, w])), known, learning, knownChars, ready: true });
  };
  liveQuery(() => Promise.all([db.words.count(), db.cards.count(), db.characters.count()])).subscribe({
    next: () => void compute(),
    error: (e) => console.error(e),
  });
  // Cambios en el contenido de tarjetas (estado) no cambian el count: observamos también updatedAt máximo.
  liveQuery(() => db.cards.orderBy("due").last()).subscribe({ next: () => void compute() });
  liveQuery(() => db.words.orderBy("updatedAt").last()).subscribe({ next: () => void compute() });
  void compute();
}
