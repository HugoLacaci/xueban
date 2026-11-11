import { describe, expect, it } from "vitest";
import { liveTones, liveTonesText } from "@/lib/correction/live-tones";
import { isPinyinRun, liveToneAtCaret } from "@/lib/correction/live-tones-global";

describe("tonos con números en cualquier campo (modo prudente)", () => {
  const type = (s: string) => liveToneAtCaret(s, s.length)?.value ?? s;
  it("convierte la sílaba de pinyin que acaba en el cursor", () => {
    expect(type("ni3")).toBe("nǐ");
    expect(type("nǐ hao3")).toBe("nǐ hǎo");
    expect(type("Zhong1")).toBe("Zhōng");
    expect(type("lv4")).toBe("lǜ");
    expect(type("nu:3")).toBe("nǚ");
    expect(type("de5")).toBe("de");
    expect(type("我的 peng2")).toBe("我的 péng");
  });
  it("con el número en mitad de la sílaba", () => {
    expect(liveToneAtCaret("xǐhua4", 6)?.value).toBe("xǐhuà");
  });
  it("solo toca lo que hay justo antes del cursor y lo recoloca", () => {
    const r = liveToneAtCaret("ni3 clase3", 3);
    expect(r).toEqual({ value: "nǐ clase3", caret: 2 });
    expect(liveToneAtCaret("ni3 hao", 7)).toBeNull();
  });
  it("no toca el español, las siglas ni los números", () => {
    for (const s of ["clase3", "covid1", "mp3", "A1", "U3", "HSK1", "B2", "tema 3", "p. 23", "a0", "2025", "我有3", "qwen3", "localhost:3"])
      expect(type(s)).toBe(s);
  });
  it("reconoce las sílabas de pinyin", () => {
    for (const s of ["ni", "hao", "zhuang", "xiong", "nihao", "er", "lv", "nü", "wanr"]) expect(isPinyinRun(s)).toBe(true);
    for (const s of ["clase", "str", "what", "HSK", "A", ""]) expect(isPinyinRun(s)).toBe(false);
  });
});

describe("tonos en vivo", () => {
  it("convierte el número en tilde, también con el número en mitad de la sílaba", () => {
    expect(liveTonesText("xi3hua4n")).toBe("xǐhuàn");
    expect(liveTonesText("wo3 xi3 hua4n ni3 de yi1fu2")).toBe("wǒ xǐ huàn nǐ de yīfú");
    expect(liveTonesText("ni3hao3")).toBe("nǐhǎo");
  });
  it("ü con v o u:, y tono neutro con 5", () => {
    expect(liveTonesText("lv4")).toBe("lǜ");
    expect(liveTonesText("nu:3")).toBe("nǚ");
    expect(liveTonesText("ma5")).toBe("ma");
  });
  it("no toca números de verdad ni hanzi", () => {
    expect(liveTonesText("我有3个")).toBe("我有3个");
    expect(liveTonesText("136 5512")).toBe("136 5512");
  });
  it("mantiene el cursor en su sitio", () => {
    const r = liveTones("ni3 hao", 3);
    expect(r.value).toBe("nǐ hao");
    expect(r.caret).toBe(2);
  });
});
