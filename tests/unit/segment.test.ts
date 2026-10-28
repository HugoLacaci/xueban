import { describe, expect, it } from "vitest";
import { comprehension, lexiconFromSet, segment, wordsOf } from "@/lib/segment";

const lex = lexiconFromSet(new Set(["你好", "我", "叫", "大卫", "中国", "中国人", "是", "学生", "北京", "大学", "北京大学", "喜欢", "吃", "苹果", "不", "很", "好"]));

describe("segmentación", () => {
  it("usa máxima coincidencia con el léxico", () => {
    expect(wordsOf("你好，我叫大卫。", lex)).toEqual(["你好", "我", "叫", "大卫"]);
    expect(wordsOf("我是中国人", lex)).toEqual(["我", "是", "中国人"]);
    expect(wordsOf("北京大学的学生", lex)).toEqual(["北京大学", "的", "学生"]);
  });

  it("mantiene la puntuación y el texto no chino como tokens separados", () => {
    const t = segment("你好, Hugo!", lex);
    expect(t.map((x) => x.text)).toEqual(["你好", ", Hugo!"]);
    expect(t[1].isWord).toBe(false);
    expect(t[0].start).toBe(0);
  });

  it("calcula el % de comprensión", () => {
    const known = new Set(["我", "是", "中国人", "学生"]);
    const c = comprehension("我是中国人，我是学生。", known, lex);
    expect(c.ratio).toBe(1);
    const c2 = comprehension("我喜欢吃苹果", known, lex);
    expect(c2.total).toBe(4);
    expect(c2.unknown).toEqual(["喜欢", "吃", "苹果"]);
    expect(c2.ratio).toBeCloseTo(0.25);
  });

  it("sin léxico usa Intl.Segmenter", () => {
    const w = wordsOf("我是学生");
    expect(w.join("")).toBe("我是学生");
    expect(w.length).toBeGreaterThan(1);
  });
});
