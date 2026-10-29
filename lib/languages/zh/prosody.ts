/** Prosodia del chino: tonos, pares de tonos y sandhi. */
import type { ProsodyModule } from "@/lib/languages/types";
import { TONES, TONE_PAIRS, SPANISH_ERRORS } from "./data/pronunciation";
import { tonesOf } from "./pinyin/tones";

const TONE_WORDS = ["", "1.º", "2.º", "3.º", "4.º", "neutro"];

export const zhProsody: ProsodyModule = {
  kind: "tones",
  name: "Tonos",
  items: TONES.map((t) => ({ id: `tone-${t.tone}`, name: t.name, description: t.description, tip: t.tip, example: { text: t.example.zh, reading: t.example.py, es: t.example.es }, cls: `tone-${t.tone}` })),
  legend: [
    { cls: "tone-1", label: "1.º tono (alto y plano)" },
    { cls: "tone-2", label: "2.º tono (ascendente)" },
    { cls: "tone-3", label: "3.er tono (bajo)" },
    { cls: "tone-4", label: "4.º tono (descendente)" },
    { cls: "tone-5", label: "tono neutro" },
  ],
  minimalPairs: SPANISH_ERRORS.flatMap((e) => e.minimalPairs.map((p) => ({ a: { text: p.a.zh, reading: p.a.py, es: p.a.es }, b: { text: p.b.zh, reading: p.b.py, es: p.b.es }, feature: e.title }))),
  describe(_text, reading) {
    const tones = tonesOf(reading);
    if (!tones.length) return "";
    return tones.map((t) => TONE_WORDS[t]).join(" + ");
  },
};

export { TONE_PAIRS };
