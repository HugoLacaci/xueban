import { describe, expect, it } from "vitest";
import { categoryTags, cleanAlsoIn, inCategory, wordCategories } from "@/lib/db/word-categories";
import { tagsFor } from "@/lib/languages/zh/anki";
import type { Word } from "@/lib/db/schema";

describe("categorías de una palabra (principal + adicionales)", () => {
  const ji = { category: "Preguntas", alsoIn: ["Números y cantidades"] };
  it("la palabra está en todas sus categorías, la principal primero", () => {
    expect(wordCategories(ji)).toEqual(["Preguntas", "Números y cantidades"]);
    expect(inCategory(ji, "Preguntas")).toBe(true);
    expect(inCategory(ji, "Números y cantidades")).toBe(true);
    expect(inCategory(ji, "Lugares")).toBe(false);
    expect(wordCategories({ category: "Clase" })).toEqual(["Clase"]);
  });
  it("limpia repetidas, vacías y la principal", () => {
    expect(cleanAlsoIn("Preguntas", ["Preguntas", "Lugares", "", "Lugares"])).toEqual(["Lugares"]);
    expect(cleanAlsoIn("Preguntas", ["Preguntas"])).toBeUndefined();
    expect(cleanAlsoIn("Preguntas", undefined)).toBeUndefined();
  });
  it("Anki: una etiqueta cat:: por cada categoría", () => {
    expect(categoryTags(ji)).toEqual(["cat::Preguntas", "cat::Números_y_cantidades"]);
    const w = { ...ji, tags: [], hsk: ["HSK2.0"], level: 1, source: "seed" } as unknown as Word;
    expect(tagsFor(w)).toEqual(expect.arrayContaining(["cat::Preguntas", "cat::Números_y_cantidades"]));
  });
});
