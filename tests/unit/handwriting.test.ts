import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { normalizeStrokes, recognize, resampleStroke, type Stroke } from "@/lib/handwriting";

const mediansPath = path.resolve(import.meta.dirname, "../../public/data/medians.json");
const medians = existsSync(mediansPath) ? (JSON.parse(readFileSync(mediansPath, "utf8")) as Record<string, number[][][]>) : null;

describe("reconocimiento de escritura", () => {
  it("remuestrea trazos a 8 puntos", () => {
    const s = resampleStroke([
      [0, 0],
      [1, 0],
    ]);
    expect(s.length).toBe(8);
    expect(s[0]).toEqual([0, 0]);
    expect(s[7][0]).toBeCloseTo(1);
  });

  it("normaliza al cuadro 0–1 centrado", () => {
    const n = normalizeStrokes([
      [
        [100, 100],
        [300, 100],
      ],
    ]);
    const xs = n[0].map((p) => p[0]);
    expect(Math.min(...xs)).toBeCloseTo(0.09, 1);
    expect(Math.max(...xs)).toBeCloseTo(0.91, 1);
  });

  it.skipIf(!medians)("reconoce 一, 十 y 人 dibujados con trazos ideales", () => {
    const m = medians!;
    const draw = (ch: string): Stroke[] => m[ch].map((s) => s.map(([x, y]) => [x + 0.02 * Math.sin(x * 9), y + 0.01] as [number, number]));
    for (const ch of ["一", "十", "人", "大", "我"]) {
      const c = recognize(draw(ch), m, 5);
      expect(c.map((x) => x.char).slice(0, 3)).toContain(ch);
    }
  });
});
