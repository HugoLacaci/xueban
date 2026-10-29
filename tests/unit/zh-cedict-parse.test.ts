import { describe, expect, it } from "vitest";
import { parseCedictLine } from "@/lib/languages/zh/parse";

describe("parseCedictLine", () => {
  it("parsea una entrada con clasificador", () => {
    const e = parseCedictLine("傳統 传统 [chuan2 tong3] /tradition/CL:個|个[ge4]/")!;
    expect(e.simp).toBe("传统");
    expect(e.trad).toBe("傳統");
    expect(e.pinyin).toBe("chuán tǒng");
    expect(e.defs).toEqual(["tradition"]);
    expect(e.cl).toEqual(["个"]);
  });

  it("convierte tono neutro y ü", () => {
    const e = parseCedictLine("謝謝 谢谢 [xie4 xie5] /to thank/thanks/thank you/\r")!;
    expect(e.pinyin).toBe("xiè xie");
    const g = parseCedictLine("綠 绿 [lu:4] /green/")!;
    expect(g.pinyin).toBe("lǜ");
  });

  it("ignora comentarios y líneas vacías", () => {
    expect(parseCedictLine("# CC-CEDICT")).toBeNull();
    expect(parseCedictLine("")).toBeNull();
  });
});
