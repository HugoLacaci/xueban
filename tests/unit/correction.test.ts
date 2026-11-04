import { describe, expect, it } from "vitest";
import { correct, lint, RULES, normalizeAnswer, parsePinyin, needlemanWunsch, alignHanzi, canonicalize } from "@/lib/correction";
import { normalizePunctuation, detectKind } from "@/lib/correction/normalize";

describe("normalización", () => {
  it("detecta hanzi, pinyin y mezcla", () => {
    expect(detectKind("我在家吃饭。")).toBe("hanzi");
    expect(detectKind("wo3 zai4 jia1")).toBe("pinyin");
    expect(detectKind("我 zai 家")).toBe("mixed");
    expect(detectKind("  ")).toBe("empty");
  });
  it("normaliza puntuación de ancho medio y espacios", () => {
    expect(normalizePunctuation("我 在 家 吃饭 ,你呢?")).toBe("我在家吃饭，你呢？");
    expect(normalizeAnswer("我在家吃饭。").text).toBe("我在家吃饭");
  });
  it("analiza pinyin con números, tildes, sin tonos y ü/v/u:", () => {
    const a = parsePinyin("wo3 zai4 jia1 chi1fan4");
    expect(a.syllables.map((s) => s.marked)).toEqual(["wǒ", "zài", "jiā", "chī", "fàn"]);
    expect(a.hasTones).toBe(true);
    const b = parsePinyin("ni hao");
    expect(b.syllables.map((s) => s.base)).toEqual(["ni", "hao"]);
    expect(b.hasTones).toBe(false);
    expect(parsePinyin("lv4").syllables[0].marked).toBe("lǜ");
    expect(parsePinyin("nu:3").syllables[0].marked).toBe("nǚ");
    expect(parsePinyin("nǐ hǎo").syllables.map((s) => s.tone)).toEqual([3, 3]);
  });
  it("acepta variantes equivalentes", () => {
    expect(canonicalize("我要一点水")).toBe("我要一点儿水");
    expect(canonicalize("你去哪里")).toBe("你去哪儿");
  });
});

describe("alineación (Needleman-Wunsch)", () => {
  it("alinea secuencias iguales sin huecos", () => {
    const p = needlemanWunsch(["a", "b", "c"], ["a", "b", "c"]);
    expect(p.every((x) => x.i !== null && x.j !== null)).toBe(true);
  });
  it("detecta palabra que falta y que sobra", () => {
    const r = alignHanzi("我在吃饭", "我在家吃饭");
    expect(r.errors.map((e) => e.type)).toContain("missing");
    const r2 = alignHanzi("我也在家吃饭", "我在家吃饭");
    expect(r2.errors.map((e) => e.type)).toContain("extra");
  });
  it("detecta reordenamientos como «order», no como falta + sobra", () => {
    const r = alignHanzi("我吃饭在家", "我在家吃饭");
    const types = r.errors.map((e) => e.type);
    expect(types).toContain("order");
    expect(types.filter((t) => t === "missing")).toHaveLength(0);
  });
  it("detecta homófonos como carácter equivocado", () => {
    const r = alignHanzi("我再家", "我在家");
    expect(r.errors[0].type).toBe("char");
    expect(r.errors[0].expected).toBe("在");
  });
});

describe("linter: cada regla dispara en sus ❌ y calla en sus ✅", () => {
  for (const rule of RULES) {
    it(`${rule.id} (${rule.name})`, () => {
      for (const ok of rule.ok) expect(lint(ok, undefined, [rule.id]).map((i) => i.ruleId), `✅ ${ok} no debería disparar ${rule.id}`).toEqual([]);
      for (const bad of rule.bad) expect(lint(bad, undefined, [rule.id]).map((i) => i.ruleId), `❌ ${bad} debería disparar ${rule.id}`).toContain(rule.id);
    });
  }
  it("propone corrección automática en reglas con fix", () => {
    expect(lint("我是很高兴")[0].fix).toBe("我很高兴");
    expect(lint("二个人")[0].fix).toBe("两个人");
    expect(lint("我不有钱").some((i) => i.fix === "我没有钱")).toBe(true);
  });
  it("enlaza cada regla con un apunte y con una explicación", () => {
    for (const r of RULES) {
      expect(r.explanation.length).toBeGreaterThan(20);
      expect(r.tip.length).toBeGreaterThan(10);
      expect(r.ok.length).toBeGreaterThanOrEqual(2);
      expect(r.bad.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("corrección completa", () => {
  it("respuesta exacta → correcta con 100", async () => {
    const r = await correct({ es: "Como en casa.", answer: "我在家吃饭。", references: ["我在家吃饭。"] });
    expect(r.verdict).toBe("correct");
    expect(r.score).toBe(100);
    expect(r.layers).toEqual({ normalize: true, align: true, linter: true, tutor: false });
    expect(r.correctedPy).toBe("Wǒ zài jiā chī fàn");
  });
  it("acepta cualquiera de las referencias y propone las otras como alternativas", async () => {
    const r = await correct({ es: "Hoy como en casa.", answer: "今天我在家吃饭", references: ["我今天在家吃饭。", "今天我在家吃饭。"] });
    expect(r.verdict).toBe("correct");
    expect(r.alternatives.map((a) => a.zh)).toEqual(["我今天在家吃饭。"]);
  });
  it("orden incorrecto → incorrecta con explicación de orden y práctica extra de la regla", async () => {
    const r = await correct({ es: "Como en casa.", answer: "我吃饭在家", references: ["我在家吃饭"] });
    expect(r.verdict).not.toBe("correct");
    expect(r.errors.some((e) => e.type === "order")).toBe(true);
    expect(r.errors.some((e) => e.ruleId === "zai-place-before-verb")).toBe(true);
    expect(r.extraPractice.length).toBeGreaterThan(0);
    expect(r.corrected).toBe("我在家吃饭");
  });
  it("homófono 再/在 → carácter equivocado", async () => {
    const r = await correct({ es: "Estoy en casa.", answer: "我再家", references: ["我在家"] });
    expect(r.errors[0].type).toBe("char");
    expect(r.verdict).toBe("improvable");
  });
  it("pinyin con tono equivocado → error de tono y hanzi propuestos", async () => {
    const r = await correct({ es: "Estoy en casa.", answer: "wo3 zai4 jia4", references: ["我在家"] });
    expect(r.mode).toBe("pinyin");
    expect(r.errors.some((e) => e.type === "tone")).toBe(true);
    expect(r.answer).toBe("我在家");
    expect(r.verdict).toBe("improvable");
  });
  it("pinyin sin tonos → se corrige a nivel de sílaba y avisa", async () => {
    const r = await correct({ es: "Estoy en casa.", answer: "wo zai jia", references: ["我在家"] });
    expect(r.errors.filter((e) => e.severity === "error")).toHaveLength(0);
    expect(r.errors.some((e) => e.type === "tone" && e.severity === "warn")).toBe(true);
    expect(r.verdict).toBe("improvable");
  });
  it("sin referencia: solo linter, informe parcial", async () => {
    const ok = await correct({ es: "Estoy contento.", answer: "我很高兴" });
    expect(ok.verdict).toBe("partial");
    expect(ok.layers.align).toBe(false);
    const bad = await correct({ es: "Estoy contento.", answer: "我是很高兴" });
    expect(bad.verdict).toBe("wrong");
    expect(bad.corrected).toBe("我很高兴");
    expect(bad.errors[0].ruleId).toBe("shi-adjective");
  });
  it("tutor simulado: añade errores y se registra la discrepancia si contradice la referencia", async () => {
    const r = await correct(
      { es: "Como en casa.", answer: "我在家吃饭", references: ["我在家吃饭"] },
      { tutor: async () => ({ corrected: "我在家里吃饭", errors: [{ type: "word", explanation: "Más natural con 里.", severity: "warn", source: "tutor" }], tip: "Añade 里 si quieres.", alternatives: [{ zh: "我在家里吃饭", register: "colloquial" }] }) },
    );
    expect(r.layers.tutor).toBe(true);
    expect(r.corrected).toBe("我在家吃饭");
    expect(r.disagreements?.length).toBe(1);
    expect(r.alternatives.some((a) => a.zh === "我在家里吃饭")).toBe(true);
    expect(r.tip).toBe("Añade 里 si quieres.");
  });
  it("el tutor no puede desmarcar una regla verificada", async () => {
    const r = await correct({ es: "Estoy contento.", answer: "我是很高兴" }, { tutor: async () => ({ verdict: "correct", score: 100, errors: [] }) });
    expect(r.errors.some((e) => e.ruleId === "shi-adjective")).toBe(true);
  });
});
