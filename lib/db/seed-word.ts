/**
 * Conversión SeedWord → Word (pura, sin Dexie). La usan ensureSeeded (web) y scripts/build-anki.ts
 * (mazos .apkg), para que el WebID de las notas sea idéntico al id de las palabras de la web.
 */
import type { Word } from "./schema";
import type { Lang, SeedWord } from "@/lib/languages/types";

export function seedToWord(w: SeedWord, lang: Lang, levelTag: string, now = Date.now()): Word {
  return {
    id: w.id,
    lang,
    hanzi: w.hanzi,
    traditional: w.traditional && w.traditional !== w.hanzi ? w.traditional : undefined,
    pinyin: w.pinyin,
    romanization: w.romanization,
    meaning: w.meaning,
    category: w.category,
    example: w.example,
    examplePinyin: w.example_pinyin,
    exampleTranslation: w.example_translation,
    radical: w.radical || undefined,
    hsk: w.hsk,
    level: w.level,
    frequency: w.frequency,
    tags: [levelTag, ...w.hsk.filter((h) => h !== "Extra"), `cat::${w.category.replace(/\s+/g, "_")}`],
    source: "seed",
    createProduction: true,
    createdAt: now,
    updatedAt: now,
    extra: w.extra,
  };
}
