"use client";
/**
 * Frases de ejemplo del idioma activo: semilla (con español) + Tatoeba (pack.examples).
 */
import { getActivePack } from "@/lib/languages/registry";

export interface Example {
  zh: string; // texto en la lengua meta
  pinyin?: string;
  es?: string;
  en?: string;
  source: "seed" | "tatoeba" | "lesson";
}

const loaded = new Set<string>();

export async function loadTatoeba(): Promise<void> {
  const pack = getActivePack();
  await pack.examples.load();
  loaded.add(pack.id);
}

export function tatoebaLoaded(): boolean {
  return loaded.has(getActivePack().id);
}

function seedExamples(): Example[] {
  return getActivePack()
    .seed.words.filter((w) => w.example)
    .map((w) => ({ zh: w.example, pinyin: w.example_pinyin, es: w.example_translation, source: "seed" as const }));
}

/** Primer ejemplo que contiene la palabra (semilla primero; luego Tatoeba, prefiriendo frases cortas). */
export function findExampleFor(word: string): Example | undefined {
  const s = seedExamples().find((e) => e.zh.includes(word));
  if (s) return s;
  return examplesFor(word, 1)[0];
}

export function examplesFor(word: string, limit = 10): Example[] {
  const out: Example[] = seedExamples().filter((e) => e.zh.includes(word));
  for (const t of getActivePack().examples.find(word, limit)) out.push({ zh: t.text, es: t.es, source: "tatoeba" });
  return out.slice(0, limit);
}
