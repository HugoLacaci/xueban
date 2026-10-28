"use client";
/**
 * Frases de ejemplo: semilla HSK 1 (español) + Tatoeba cmn–spa (/data/tatoeba.json, Fase 2).
 */
import { seedWords } from "@/lib/db/repo";
import { withBase } from "@/lib/base-path";

export interface Example {
  zh: string;
  pinyin?: string;
  es?: string;
  en?: string;
  source: "seed" | "tatoeba" | "lesson";
}

let tatoeba: Example[] | undefined;
let loading: Promise<void> | undefined;

export async function loadTatoeba(): Promise<Example[]> {
  if (tatoeba) return tatoeba;
  if (!loading) {
    loading = (async () => {
      try {
        const res = await fetch(withBase("/data/tatoeba.json"));
        if (!res.ok) throw new Error("sin datos");
        const raw = (await res.json()) as [string, string][];
        tatoeba = raw.map(([zh, es]) => ({ zh, es, source: "tatoeba" as const }));
      } catch {
        tatoeba = [];
      }
    })();
  }
  await loading;
  return tatoeba ?? [];
}

export function tatoebaLoaded(): boolean {
  return Boolean(tatoeba);
}

const seedExamples: Example[] = seedWords()
  .filter((w) => w.example)
  .map((w) => ({ zh: w.example, pinyin: w.example_pinyin, es: w.example_translation, source: "seed" as const }));

/** Primer ejemplo que contiene la palabra (semilla primero; luego Tatoeba, prefiriendo frases cortas). */
export function findExampleFor(word: string): Example | undefined {
  const s = seedExamples.find((e) => e.zh.includes(word));
  if (s) return s;
  return examplesFor(word, 1)[0];
}

export function examplesFor(word: string, limit = 10): Example[] {
  const out: Example[] = seedExamples.filter((e) => e.zh.includes(word));
  if (tatoeba) {
    const t = tatoeba.filter((e) => e.zh.includes(word)).sort((a, b) => a.zh.length - b.zh.length);
    out.push(...t);
  }
  return out.slice(0, limit);
}
