import { describe, expect, it } from "vitest";
import { check } from "@/lib/exercises/check";
import { generateSession, genChooseMeaning, genFillBlank, genOrderWords, genToneChoice, genClassifier, tilesFromSentence } from "@/lib/exercises/generators";
import type { Pool, PoolWord } from "@/lib/exercises/types";
import { seededRandom } from "@/lib/utils";
import { seedWords } from "@/lib/db/repo";
import { TONE_PAIRS, SYLLABLES } from "@/lib/course/data/pronunciation";

const words: PoolWord[] = seedWords()
  .slice(0, 80)
  .map((w) => ({ id: w.id, hanzi: w.hanzi, pinyin: w.pinyin, meaning: w.meaning, category: w.category, example: w.example, exampleTranslation: w.example_translation, radical: w.radical || undefined }));
const pool: Pool = {
  words,
  sentences: [
    { zh: "我是学生。", es: "Soy estudiante.", py: "Wǒ shì xuésheng." },
    { zh: "你好，我叫大卫。", es: "Hola, me llamo David." },
    { zh: "他不是老师。", es: "Él no es profesor.", grammarId: "shi" },
  ],
};
const seg = (s: string) => ["我", "是", "学生", "你好", "我", "叫", "大卫", "他", "不", "老师"].reduce<string[]>((acc, w) => acc, tilesNaive(s));
function tilesNaive(s: string): string[] {
  const lex = ["你好", "学生", "大卫", "老师", "不是"];
  const out: string[] = [];
  let i = 0;
  while (i < s.length) {
    const two = s.slice(i, i + 2);
    if (lex.includes(two) && two !== "不是") {
      out.push(two);
      i += 2;
    } else {
      out.push(s[i]);
      i++;
    }
  }
  return out;
}

describe("generadores", () => {
  const rng = seededRandom(42);

  it("elige significado con 4 opciones y distractores de la misma categoría", () => {
    const w = words.find((x) => x.hanzi === "谢谢")!;
    const ex = genChooseMeaning(pool, w, rng)!;
    expect(ex.options.length).toBe(4);
    expect(ex.options[ex.answer].text).toBe("gracias");
    expect(new Set(ex.options.map((o) => o.text)).size).toBe(4);
  });

  it("ordenar palabras produce fichas barajadas y respuesta correcta", () => {
    const ex = genOrderWords(pool.sentences[0], rng, seg)!;
    expect(ex.answer).toEqual(["我", "是", "学生"]);
    expect(ex.tiles.slice().sort()).toEqual(ex.answer.slice().sort());
    expect(check(ex, { kind: "tiles", tiles: ["我", "是", "学生"] }).correct).toBe(true);
    const r = check(ex, { kind: "tiles", tiles: ["是", "我", "学生"] });
    expect(r.correct).toBe(false);
    expect(r.explanation).toMatch(/orden falla/);
  });

  it("rellenar hueco sustituye la palabra y ofrece opciones", () => {
    const ex = genFillBlank(pool, pool.sentences[2], rng, seg, "老师");
    expect(ex && ex.type === "fill-blank" && ex.zh.includes("＿")).toBe(true);
    if (ex && ex.type === "fill-blank") {
      expect(ex.answer).toBe("老师");
      expect(ex.options).toContain("老师");
      expect(check(ex, { kind: "choice", index: ex.options!.indexOf("老师") }).correct).toBe(true);
    }
  });

  it("tono: valida sílabas y explica el fallo", () => {
    const w = words.find((x) => x.hanzi === "你好")!;
    const ex = genToneChoice(w)!;
    expect(ex.type === "tone-choice" && ex.answer).toEqual([3, 3]);
    const bad = check(ex, { kind: "tones", tones: [2, 3] });
    expect(bad.correct).toBe(false);
    expect(bad.explanation).toMatch(/ni/);
  });

  it("clasificador usa el clasificador de la palabra", () => {
    const ex = genClassifier({ id: "x", hanzi: "书", pinyin: "shū", meaning: "libro", cl: ["本"] }, rng)!;
    expect(ex.options[ex.answer].text).toBe("本");
    expect(ex.options.length).toBe(4);
  });

  it("genera una sesión intercalada sin repetir tipo consecutivo", () => {
    const session = generateSession(pool, 12, ["choose-meaning", "choose-character", "pinyin-input", "order-words", "matching", "tone-choice", "listen-choose"], rng, { segmenter: seg });
    expect(session.length).toBe(12);
    for (let i = 1; i < session.length; i++) expect(session[i].type).not.toBe(session[i - 1].type);
  });

  it("fichas: quita puntuación", () => {
    expect(tilesFromSentence("你好，我叫大卫。", seg)).toEqual(["你好", "我", "叫", "大卫"]);
  });
});

describe("corrección", () => {
  it("pinyin: acepta números, detecta error de tono vs sílaba", () => {
    const ex = { id: "1", type: "pinyin-input" as const, skill: "tones" as const, itemId: "w", itemKind: "word" as const, prompt: "", zh: "谢谢", answer: "xièxie" };
    expect(check(ex, { kind: "text", text: "xie4xie5" }).correct).toBe(true);
    expect(check(ex, { kind: "text", text: "xie4 xie" }).correct).toBe(true);
    const tone = check(ex, { kind: "text", text: "xie2xie" });
    expect(tone.correct).toBe(false);
    expect(tone.partial).toBe(true);
    expect(tone.explanation).toMatch(/tono/);
    const syl = check(ex, { kind: "text", text: "xia4xie" });
    expect(syl.partial).toBe(false);
  });

  it("traducción libre: tolera variaciones pequeñas", () => {
    const ex = { id: "2", type: "translate-to-es" as const, skill: "reading" as const, itemId: "s", itemKind: "sentence" as const, prompt: "", zh: "我是学生。", answers: ["Soy estudiante.", "Yo soy estudiante."] };
    expect(check(ex, { kind: "text", text: "soy estudiante" }).correct).toBe(true);
    expect(check(ex, { kind: "text", text: "Yo soy estudiante" }).correct).toBe(true);
    expect(check(ex, { kind: "text", text: "soy profesor" }).correct).toBe(false);
    expect(check(ex, { kind: "self", correct: true }).correct).toBe(true);
  });

  it("dictado: señala caracteres que faltan", () => {
    const ex = { id: "3", type: "dictation" as const, skill: "listening" as const, itemId: "s", itemKind: "sentence" as const, prompt: "", zh: "我是学生。" };
    expect(check(ex, { kind: "text", text: "我是学生" }).correct).toBe(true);
    const r = check(ex, { kind: "text", text: "我是学" });
    expect(r.correct).toBe(false);
    expect(r.explanation).toContain("生");
  });

  it("verdadero/falso y escritura", () => {
    const tf = { id: "4", type: "reading-tf" as const, skill: "reading" as const, itemId: "t", itemKind: "sentence" as const, prompt: "", text: "我有一个弟弟。", statements: [{ s: "Tiene un hermano menor", truth: true }, { s: "Tiene dos hermanos", truth: false, why: "solo uno" }] };
    expect(check(tf, { kind: "tf", values: [true, false] }).correct).toBe(true);
    const r = check(tf, { kind: "tf", values: [true, true] });
    expect(r.partial).toBe(true);
    expect(r.explanation).toMatch(/solo uno/);
    const wr = { id: "5", type: "writing" as const, skill: "writing" as const, itemId: "w", itemKind: "word" as const, prompt: "", hanzi: "我", pinyin: "wǒ", meaning: "yo" };
    expect(check(wr, { kind: "writing", mistakes: 1 }).correct).toBe(true);
    expect(check(wr, { kind: "writing", mistakes: 4 }).correct).toBe(false);
  });

  it("hablar: compara caracteres reconocidos", () => {
    const sp = { id: "6", type: "speaking" as const, skill: "speaking" as const, itemId: "s", itemKind: "sentence" as const, prompt: "", zh: "我是学生。", pinyin: "", es: "", mode: "recognize" as const };
    expect(check(sp, { kind: "speaking", transcript: "我是学生" }).correct).toBe(true);
    const r = check(sp, { kind: "speaking", transcript: "我是" });
    expect(r.correct).toBe(false);
    expect((r.detail as { missed: string[] }).missed).toEqual(["学", "生"]);
  });
});

describe("datos de pronunciación", () => {
  it("tiene 20 pares de tonos y una tabla de sílabas completa", () => {
    expect(TONE_PAIRS.length).toBe(20);
    expect(new Set(TONE_PAIRS.map((p) => p.pattern)).size).toBe(20);
    const all = Object.values(SYLLABLES).flat();
    expect(all.length).toBeGreaterThan(400);
    expect(new Set(all).size).toBe(all.length);
    expect(all).toContain("nü");
    expect(all).toContain("zhuang");
  });
});
