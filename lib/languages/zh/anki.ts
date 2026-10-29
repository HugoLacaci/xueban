/**
 * Especificación Anki del chino: el tipo de nota «中文 · Vocabulario (Hugo)» tal cual está en
 * lib/anki/model.ts (sin cambios, para no romper la sincronización) + las funciones de mapeo.
 */
import type { AnkiModelSpec } from "@/lib/languages/types";
import type { Word } from "@/lib/db/schema";
import { CSS, DECK_HSK1, DECK_MINE, DECK_ROOT, FIELDS, MODEL_ID, MODEL_NAME, TEMPLATES, type NoteFields } from "@/lib/anki/model";
import { uuid } from "@/lib/db/ids";

export function wordToFields(w: Word): NoteFields {
  return {
    Hanzi: w.hanzi,
    Pinyin: w.pinyin,
    Significado: w.meaning,
    Categoria: w.category,
    Ejemplo: w.example ?? "",
    EjemploPinyin: w.examplePinyin ?? "",
    EjemploTraduccion: w.exampleTranslation ?? "",
    Tradicional: w.traditional && w.traditional !== w.hanzi ? w.traditional : "",
    Radical: w.radical ?? "",
    Audio: w.audio ? `[sound:${w.audio.split("/").pop()}]` : "",
    Imagen: w.image ?? "",
    Notas: w.notes ?? "",
    HSK: w.hsk.filter((h) => h !== "Extra").join(" "),
    WebID: w.id,
    CrearProduccion: w.createProduction ? "y" : "",
  };
}

export function tagsFor(w: Word): string[] {
  const tags = new Set<string>(w.tags);
  if (w.level === 1 || w.hsk.length) tags.add("HSK1");
  for (const h of w.hsk) if (h !== "Extra") tags.add(h);
  tags.add(`cat::${w.category.replace(/\s+/g, "_")}`);
  if (w.source === "class") tags.add("clase");
  return Array.from(tags);
}

export function fieldsToWord(fields: Record<string, { value: string }>, tags: string[], noteId: number, mod: number | undefined, existing?: Word): Word {
  const f = (k: string) => (fields[k]?.value ?? "").replace(/<[^>]+>/g, "").trim();
  const now = Date.now();
  const hsk = f("HSK").split(/\s+/).filter(Boolean);
  const audio = f("Audio").match(/\[sound:([^\]]+)\]/)?.[1];
  const level = tags.includes("HSK1") || hsk.length ? 1 : existing?.level;
  return {
    id: existing?.id ?? (f("WebID") || (f("Hanzi") ? `mine-${f("Hanzi")}` : uuid())),
    lang: "zh",
    hanzi: f("Hanzi"),
    traditional: f("Tradicional") || existing?.traditional,
    pinyin: f("Pinyin"),
    meaning: f("Significado"),
    meaningEn: existing?.meaningEn,
    category: f("Categoria") || existing?.category || "Clase",
    example: f("Ejemplo") || undefined,
    examplePinyin: f("EjemploPinyin") || undefined,
    exampleTranslation: f("EjemploTraduccion") || undefined,
    radical: f("Radical") || undefined,
    hsk: hsk.length ? hsk : (existing?.hsk ?? []),
    level,
    frequency: existing?.frequency,
    tags: Array.from(new Set([...tags.filter((t) => !t.startsWith("cat::")), ...(existing?.tags ?? [])])),
    notes: f("Notas") || undefined,
    audio: audio ? `/audio/${audio}` : existing?.audio,
    image: f("Imagen") || undefined,
    source: existing?.source ?? "anki",
    sourceRef: existing?.sourceRef,
    createProduction: f("CrearProduccion").toLowerCase() === "y",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    ankiNoteId: noteId,
    ankiMod: mod,
  };
}

export const zhAnki: AnkiModelSpec = {
  modelName: MODEL_NAME,
  modelId: MODEL_ID,
  deckRoot: DECK_ROOT,
  deckMine: DECK_MINE,
  deckLevel: DECK_HSK1,
  fields: FIELDS,
  keyField: "Hanzi",
  css: CSS,
  templates: TEMPLATES,
  req: [
    [0, "any", [0]],
    [1, "all", [14]],
    [2, "any", [0]],
  ],
  ordToType: { 0: "recognition", 1: "production", 2: "listening" },
  cardOrds: (w) => (w.createProduction ? [0, 1, 2] : [0, 2]),
  toFields: wordToFields,
  fromFields: fieldsToWord,
  tags: tagsFor,
  deckFor(w, names) {
    const idx = names.indexOf(w.category);
    if (w.source === "seed" && idx >= 0) return `${DECK_HSK1}::${String(idx + 1).padStart(2, "0")} ${w.category}`;
    return DECK_MINE;
  },
  minePrefix: "mine-",
  apkgFileName: "Chino_HSK1_Hugo",
};
