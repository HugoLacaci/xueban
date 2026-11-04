import { describe, expect, it } from "vitest";
import { liveTones, liveTonesText } from "@/lib/correction/live-tones";

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
