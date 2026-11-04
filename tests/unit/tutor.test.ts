import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseTurn, stripModelPinyin } from "@/lib/tutor/chat";
import { TutorCorrectionSchema } from "@/lib/tutor/corrector";
import { extractJson } from "@/lib/tutor/providers";
import { matchOption, type RoleplayFile } from "@/lib/tutor/roleplays";

describe("tutor · respuestas simuladas del modelo", () => {
  it("parseTurn extrae objetivos, fin, palabras nuevas y quita las marcas", () => {
    const r = parseTurn('<think>hmm</think>你好！你叫什么名字？<goal n="1"/> 我们说[[名字]]。<done/>');
    expect(r.goalsHit).toEqual([0]);
    expect(r.done).toBe(true);
    expect(r.newWords).toEqual(["名字"]);
    expect(r.text).not.toMatch(/<goal|<done|think/);
    expect(r.text).toContain("名字");
  });
  it("quita el pinyin que escribe el modelo y acepta palabras nuevas con un solo corchete", () => {
    const r = parseTurn("你是来自西班牙的[学生]吗？学生 是 xuésheng。你好 (nǐ hǎo)！Esto está bien.");
    expect(r.newWords).toContain("学生");
    expect(r.text).not.toMatch(/xuésheng|nǐ hǎo|\[/);
    expect(r.text).toContain("你是来自西班牙的学生吗？");
    expect(r.text).toContain("Esto está bien.");
    expect(stripModelPinyin("El tono de mā es alto.")).toBe("El tono de mā es alto.");
  });
  it("extractJson tolera bloque ```json y texto alrededor", () => {
    expect(extractJson('Claro:\n```json\n{"verdict":"wrong","score":40}\n```')).toEqual({ verdict: "wrong", score: 40 });
    expect(() => extractJson("sin json")).toThrow();
  });
  it("el esquema zod acepta una corrección válida y rellena valores por defecto", () => {
    const ok = TutorCorrectionSchema.safeParse({ verdict: "improvable", score: 70, corrected: "我很好。", errors: [{ explanation_es: "Falta 很 con adjetivo" }] });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.alternatives).toEqual([]);
      expect(ok.data.errors[0].type).toBe("word");
    }
  });
  it("el esquema zod rechaza JSON mal formado (puntuación fuera de rango, veredicto inventado)", () => {
    expect(TutorCorrectionSchema.safeParse({ score: 140 }).success).toBe(false);
    expect(TutorCorrectionSchema.safeParse({ verdict: "perfecto" }).success).toBe(false);
  });
});

describe("role-plays escritos a mano", () => {
  const dir = path.join(process.cwd(), "content", "zh", "roleplays");
  const files = readdirSync(dir).filter((f) => /^u\d\d\.json$/.test(f));
  it("hay ≥ 3 escenarios por unidad en las 14 unidades", () => {
    expect(files.length).toBe(14);
    for (const f of files) expect((JSON.parse(readFileSync(path.join(dir, f), "utf8")) as RoleplayFile).scenarios.length, f).toBeGreaterThanOrEqual(3);
  });
  it("decir la frase modelo de cada opción elige esa opción (sin ambigüedad de palabras clave)", () => {
    const bad: string[] = [];
    for (const f of files) {
      const rf = JSON.parse(readFileSync(path.join(dir, f), "utf8")) as RoleplayFile;
      for (const sc of rf.scenarios)
        for (const [id, node] of Object.entries(sc.nodes))
          for (const opt of node.user ?? []) if (matchOption(opt.zh, node) !== opt) bad.push(`${sc.id}/${id}: ${opt.zh}`);
    }
    expect(bad).toEqual([]);
  });
  it("todos los saltos apuntan a nodos existentes", () => {
    for (const f of files) {
      const rf = JSON.parse(readFileSync(path.join(dir, f), "utf8")) as RoleplayFile;
      for (const sc of rf.scenarios) {
        expect(sc.nodes[sc.start], `${sc.id} start`).toBeTruthy();
        for (const node of Object.values(sc.nodes)) for (const opt of node.user ?? []) expect(sc.nodes[opt.next], `${sc.id} → ${opt.next}`).toBeTruthy();
      }
    }
  });
});
