import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { zhAnki } from "@/lib/languages/zh/anki";
import { CATEGORY_META } from "@/lib/languages/zh/content";
import { NEW_CATEGORIES } from "@/lib/hanzi/vocab-categories";
import type { Word } from "@/lib/db";

const ROOT = path.resolve(import.meta.dirname, "../..");
const seed = JSON.parse(readFileSync(path.join(ROOT, "content/zh/seed/hsk1_vocab.json"), "utf8")) as { words: { id: string; hanzi: string; category: string }[] };
const seedCats: string[] = [];
for (const w of seed.words) if (!seedCats.includes(w.category)) seedCats.push(w.category);
const names = [...seedCats, ...Object.keys(CATEGORY_META).filter((c) => c !== "Clase" && !seedCats.includes(c))];
const word = (p: Partial<Word>): Word => ({ id: "x", lang: "zh", hanzi: "x", pinyin: "", meaning: "", category: "Clase", hsk: [], tags: [], source: "manual", createdAt: 0, updatedAt: 0, ...p }) as Word;

describe("vocabulario por niveles y submazos de Anki", () => {
  it("las 21 categorías de la semilla conservan su número; las nuevas van detrás", () => {
    expect(seedCats).toHaveLength(21);
    expect(names.slice(0, 21)).toEqual(seedCats);
    for (const c of NEW_CATEGORIES) expect(names.indexOf(c.name)).toBeGreaterThanOrEqual(21);
  });

  it("submazos: semilla igual que antes; temario por nivel; extras aparte; lo demás a Mis palabras", () => {
    const sw = seed.words[0];
    const seedDeck = zhAnki.deckFor(word({ source: "seed", category: sw.category }), names);
    expect(seedDeck).toBe(`中文 Chino::HSK 1::${String(seedCats.indexOf(sw.category) + 1).padStart(2, "0")} ${sw.category}`);
    expect(zhAnki.deckFor(word({ tags: ["curso"], category: "Viajes", level: 2, hsk: ["HSK3.0"] }), names)).toMatch(/^中文 Chino::HSK 2::\d{2} Viajes$/);
    expect(zhAnki.deckFor(word({ tags: ["curso"], category: "Vida digital en China", hsk: ["Extra"] }), names)).toMatch(/^中文 Chino::Vida en China::\d{2} Vida digital en China$/);
    expect(zhAnki.deckFor(word({ tags: ["curso"], category: "Comida y bebida", level: 1, hsk: ["HSK3.0"] }), names)).toBe(`中文 Chino::HSK 1::${String(seedCats.indexOf("Comida y bebida") + 1).padStart(2, "0")} Comida y bebida`);
    expect(zhAnki.deckFor(word({ category: "Clase" }), names)).toBe("中文 Chino::Mis palabras (clase)");
  });

  const levelsPath = path.join(ROOT, "content/zh/seed/zh_vocab_levels.json");
  it.runIf(existsSync(levelsPath))("el conjunto por niveles respeta los WebID de la semilla y cubre los niveles 1 y 2", () => {
    const data = JSON.parse(readFileSync(levelsPath, "utf8")) as { words: { id: string; hanzi: string; level: number; lesson: string; unit: string }[] };
    const byHanzi = new Map(data.words.map((w) => [w.hanzi, w]));
    for (const s of seed.words) {
      const w = byHanzi.get(s.hanzi);
      if (w) expect(w.id, s.hanzi).toBe(s.id);
    }
    expect(new Set(data.words.map((w) => w.id)).size).toBe(data.words.length);
    for (const w of data.words) expect(w.lesson.startsWith(w.unit === "e0" ? "e0-" : w.unit)).toBe(true);
    const hskPath = path.join(ROOT, "public/data/zh/hsk.json");
    if (existsSync(hskPath)) {
      const std = (JSON.parse(readFileSync(hskPath, "utf8")) as { words: { std: Record<string, string[]> } }).words.std;
      const missing1 = std["1"].filter((w) => !byHanzi.has(w));
      expect(missing1, `nivel 1 sin lección: ${missing1.join(" ")}`).toEqual([]);
      const missing2 = std["2"].filter((w) => !byHanzi.has(w));
      expect(missing2.length, `nivel 2 sin lección: ${missing2.join(" ")}`).toBeLessThanOrEqual(5);
    }
  });
});
