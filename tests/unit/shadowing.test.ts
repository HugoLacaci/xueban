import { describe, expect, it } from "vitest";
import { scoreShadowing, scoreTone, splitBySyllables } from "@/lib/shadowing";
import { idealContour } from "@/lib/pitch";
import type { Tone } from "@/lib/exercises/types";

const syl = (hanzi: string, pinyin: string, tone: Tone) => ({ hanzi, pinyin, tone });

describe("shadowing: comparación por sílaba", () => {
  it("parte la curva en N tramos por tiempo de voz", () => {
    const c = idealContour([1, 4]);
    const { segments, range } = splitBySyllables(c, 2);
    expect(segments).toHaveLength(2);
    expect(segments[0].length).toBeGreaterThan(3);
    expect(range).toBeGreaterThan(0);
  });
  it("puntúa alto los contornos ideales de cada tono y bajo los contrarios", () => {
    for (const t of [1, 2, 3, 4] as Tone[]) {
      const { segments, range } = splitBySyllables(idealContour([t]), 1);
      const good = scoreTone(segments[0], t, range)!;
      expect(good, `tono ${t}`).toBeGreaterThanOrEqual(0.7);
    }
    const rising = splitBySyllables(idealContour([2]), 1);
    expect(scoreTone(rising.segments[0], 4, rising.range)!).toBeLessThan(0.5);
    const falling = splitBySyllables(idealContour([4]), 1);
    expect(scoreTone(falling.segments[0], 2, falling.range)!).toBeLessThan(0.5);
  });
  it("marca en verde lo reconocido con buen tono, en rojo lo no reconocido con mal tono", () => {
    // 你好 se pronuncia 2 + 3 (sandhi): los tonos esperados son los hablados
    const r = scoreShadowing({ text: "你好", syllables: [syl("你", "ní", 2), syl("好", "hǎo", 3)], transcript: "你好", contour: idealContour([2, 3]) });
    expect(r.syllables.map((s) => s.recognized)).toEqual([true, true]);
    expect(r.syllables.every((s) => s.verdict !== "bad")).toBe(true);
    const bad = scoreShadowing({ text: "你好", syllables: [syl("你", "nǐ", 3), syl("好", "hǎo", 3)], transcript: "李", contour: idealContour([1, 1]) });
    expect(bad.syllables.filter((s) => s.verdict === "bad").length).toBe(2);
    expect(bad.overall).toBeLessThan(0.4);
  });
  it("sin transcripción ni voz suficiente devuelve ámbar (orientativo), no falla", () => {
    const r = scoreShadowing({ text: "你好", syllables: [syl("你", "nǐ", 3), syl("好", "hǎo", 3)] });
    expect(r.syllables.every((s) => s.verdict === "ok")).toBe(true);
    expect(r.recognizedRatio).toBeNull();
    expect(r.toneRatio).toBeNull();
  });
});
