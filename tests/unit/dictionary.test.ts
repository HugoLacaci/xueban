import { beforeAll, describe, expect, it } from "vitest";
import { ingest, lookup, resetDictionaryForTests, search, setUserWords, type CompactEntry, radicalInfo, RADICALS } from "@/lib/dictionary/service";
import { segment, wordsOf } from "@/lib/segment";
import { getLexicon } from "@/lib/dictionary/service";

const SAMPLE: CompactEntry[] = [
  ["你好", "", "nǐ hǎo", ["hello", "hi"], 1, 1, 9314],
  ["谢谢", "謝謝", "xiè xie", ["to thank", "thanks", "thank you"], 1, 1, 6753, ["v"], []],
  ["东西", "東西", "dōng xī", ["east and west"], 1, 1, 388, ["n"], []],
  ["东西", "東西", "dōng xi", ["thing", "stuff", "person"], 1, 1, 388, ["n"], ["个", "件"]],
  ["学生", "學生", "xué sheng", ["student", "schoolchild"], 1, 1, 500, ["n"], ["个", "位", "名"]],
  ["学", "學", "xué", ["to learn", "to study", "science"], 1, 1, 120, ["v"], []],
  ["生", "", "shēng", ["to be born", "to give birth", "life"], 1, 1, 200],
  ["北京大学", "北京大學", "Běi jīng Dà xué", ["Peking University"], 0, 0, 30000],
  ["北京", "", "Běi jīng", ["Beijing"], 1, 1, 900],
  ["大学", "大學", "dà xué", ["university"], 1, 1, 1500, ["n"], ["所"]],
  ["绿", "綠", "lǜ", ["green"], 2, 2, 3000],
];

describe("servicio de diccionario", () => {
  beforeAll(() => {
    resetDictionaryForTests();
    ingest(SAMPLE);
  });

  it("busca por hanzi exacto y ordena lecturas (clasificador primero)", () => {
    const r = lookup("东西");
    expect(r[0].p).toBe("dōng xi");
    expect(r[1].p).toBe("dōng xī");
  });

  it("busca por pinyin sin tonos, con tonos y numérico", () => {
    expect(search("nihao")[0].s).toBe("你好");
    expect(search("nǐ hǎo")[0].s).toBe("你好");
    expect(search("ni3hao3")[0].s).toBe("你好");
    expect(search("ní hǎo").find((e) => e.s === "你好")).toBeUndefined();
    expect(search("lv")[0].s).toBe("绿");
    expect(search("xue").map((e) => e.s)).toContain("学生");
  });

  it("busca por inglés", () => {
    expect(search("student")[0].s).toBe("学生");
    expect(search("university").map((e) => e.s)).toContain("大学");
  });

  it("prioriza las palabras del usuario y busca en español", () => {
    setUserWords([
      {
        id: "hsk1-学生",
        hanzi: "学生",
        pinyin: "xuésheng",
        meaning: "estudiante",
        category: "Escuela y trabajo",
        hsk: ["HSK2.0"],
        tags: [],
        source: "seed",
        createProduction: true,
        createdAt: 0,
        updatedAt: 0,
      },
    ]);
    const r = search("estudiante");
    expect(r[0].s).toBe("学生");
    expect(r[0].es).toBe("estudiante");
    const l = lookup("学生");
    expect(l[0].es).toBe("estudiante");
    expect(l[0].en).toContain("student");
    expect(l[0].cl).toEqual(["个", "位", "名"]);
  });

  it("segmenta con el léxico del diccionario", () => {
    const lex = getLexicon()!;
    expect(wordsOf("我是北京大学的学生", lex)).toEqual(["我", "是", "北京大学", "的", "学生"]);
    expect(segment("你好！", lex).map((t) => t.text)).toEqual(["你好", "！"]);
  });

  it("conoce los 214 radicales y sus variantes", () => {
    expect(RADICALS.length).toBe(214);
    expect(radicalInfo("氵")?.radical).toBe("水");
    expect(radicalInfo("亻")?.meaning).toBe("persona");
    expect(radicalInfo("讠")?.number).toBe(149);
  });
});
