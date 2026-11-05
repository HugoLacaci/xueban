import { describe, expect, it } from "vitest";
import { alignTranslation, parseLrc, parseSubtitles } from "@/lib/videos/align";

describe("parseLrc", () => {
  it("lee marcas de tiempo y usa el inicio siguiente como fin", () => {
    const l = parseLrc("[ti:x]\n[00:01.50]你好\n[00:04.00]再见\n[00:06]\n");
    expect(l).toEqual([
      { start: 1.5, end: 4, zh: "你好" },
      { start: 4, end: 9, zh: "再见" },
    ]);
  });
  it("admite varias marcas en una línea (estribillos)", () => {
    const l = parseLrc("[00:10.00][00:30.00]啦啦啦\n[00:20.00]中间");
    expect(l.map((x) => x.start)).toEqual([10, 20, 30]);
  });
});

describe("parseSubtitles", () => {
  it("lee SRT", () => {
    const l = parseSubtitles("1\n00:00:01,000 --> 00:00:02,500\n<i>你好</i>\n\n2\n00:00:03,000 --> 00:00:04,000\n谢谢\n");
    expect(l).toEqual([
      { start: 1, end: 2.5, zh: "你好" },
      { start: 3, end: 4, zh: "谢谢" },
    ]);
  });
  it("detecta LRC", () => {
    expect(parseSubtitles("[00:01.00]月亮")[0].zh).toBe("月亮");
  });
});

describe("alignTranslation", () => {
  it("junta las traducciones que caen dentro de una línea fusionada", () => {
    const lines = [
      { start: 0, end: 4, zh: "你好，我叫小明" },
      { start: 4, end: 6, zh: "谢谢" },
    ];
    const tr = [
      { start: 0, end: 2, zh: "Hola," },
      { start: 2, end: 4, zh: "me llamo Xiaoming" },
      { start: 4.1, end: 6, zh: "Gracias" },
    ];
    const out = alignTranslation(lines, tr);
    expect(out[0].es).toBe("Hola, me llamo Xiaoming");
    expect(out[1].es).toBe("Gracias");
  });
});
