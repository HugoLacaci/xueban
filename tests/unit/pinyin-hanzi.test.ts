import { beforeAll, describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { ingest, resetDictionaryForTests, useDictionary } from "@/lib/languages/zh/dictionary";
import { pinyinToHanzi } from "@/lib/correction/pinyin-hanzi";
import { pinyinReferenceSyllables } from "@/lib/correction/align";
import { correct } from "@/lib/correction";

// necesita los datos de npm run data:build (no están en git)
describe.skipIf(!existsSync("public/data/zh/cedict-core.json"))("pinyin → hanzi probable (diccionario real)", () => {
  beforeAll(() => {
    resetDictionaryForTests();
    ingest(JSON.parse(readFileSync("public/data/zh/cedict-core.json", "utf8")));
    useDictionary.setState({ status: "ready" } as never);
  });
  const CASES: [string, string][] = [
    ["ni3 shi4 xue2sheng ma", "你是学生吗"],
    ["wo3 xi3huan ni3 de yi1fu", "我喜欢你的衣服"],
    ["wo3 zuo2tian1 mei2 qu4", "我昨天没去"],
    ["wo3 you3 liang3 ben3 shu1", "我有两本书"],
    ["ni3 jiao4 shen2me ming2zi", "你叫什么名字"],
  ];
  for (const [py, zh] of CASES) it(`${py} → ${zh}`, () => expect(pinyinToHanzi(pinyinReferenceSyllables(py))).toBe(zh));
  it("la solución en pinyin se oye en hanzi y huàn (欢 es huān) es error de tono", async () => {
    const r = await correct({ es: "Me gusta tu ropa.", answer: "wo3 xi3hua4n ni3 de yi1fu2", references: ["wo3 xi3huan ni3 de yi1fu"] });
    expect(r.correctedHanzi).toBe("我喜欢你的衣服");
    expect(r.errors.some((e) => e.type === "tone" && e.severity === "error")).toBe(true);
  });
});
