/** Paquete de clase inventado (no es de ninguna clase real) para los tests. */
import type { ClassPackage } from "@/lib/classes/package-schema";

export function validPackage(over: Partial<ClassPackage> = {}): ClassPackage {
  return {
    version: 1,
    classDate: "2026-10-14",
    title: "Los números y la edad",
    source: { file: "2026-10-14_numeros.opus", transcript: "2026-10-14_numeros.json", durationSec: 3600, method: "graph" },
    summary: "Repasamos los números del 1 al 99 y cómo preguntar la edad.",
    topics: ["números", "edad"],
    vocab: [
      { hanzi: "岁", pinyin: "suì", es: "años (de edad)", category: "Números", example: { zh: "我二十岁。", es: "Tengo veinte años." }, t: 300, clip: "vocab-1.opus" },
      { hanzi: "多大", es: "qué edad", category: "Preguntas", t: 420 },
    ],
    grammar: [
      {
        grammarId: "g-age",
        title: "Preguntar la edad",
        pattern: "你多大？／你几岁？",
        explanationEs: "几岁 se usa con niños; 多大 con adultos.",
        examples: [{ zh: "你多大？", es: "¿Cuántos años tienes?" }],
        t: 500,
      },
    ],
    phrases: [{ zh: "你今年多大？", es: "¿Cuántos años tienes este año?", t: 520 }],
    teacherTips: [{ text: "No uses 是 delante de la edad.", t: 610, clip: "tip-1.opus" }],
    myDoubts: [{ q: "¿Se puede decir 我是二十岁？", a: "Se entiende, pero suena raro.", t: 640 }],
    homework: "Ejercicios 3 y 4 de la página 21.",
    cues: [{ q: "¿Cómo se pregunta la edad a un adulto?", a: "你多大？" }],
    exercises: [
      {
        es: "Tengo veinte años.",
        myAnswer: "我是二十岁。",
        teacherAnswer: ["我二十岁。"],
        explanationEs: "Con la edad no se usa 是.",
        errorTypes: ["verbo sobrante"],
        t: 700,
        clip: "ex-1.opus",
        confidence: "alta",
      },
      { es: "Mi hermano tiene doce años.", teacherAnswer: ["我哥哥十二岁。"], t: 900, confidence: "baja", claudeProposal: "我弟弟十二岁。" },
    ],
    livingNoteAdds: [{ noteId: "living-numeros", markdown: "El profesor insiste: **sin 是** con la edad.", t: 610 }],
    uncertain: [{ what: "No se oye si dice 哥哥 o 弟弟", t: 905 }],
    clips: [
      { file: "ex-1.opus", start: 698, end: 708, kind: "exercise", ref: 0 },
      { file: "vocab-1.opus", start: 299, end: 303, kind: "vocab", ref: 0 },
      { file: "tip-1.opus", start: 609, end: 615, kind: "tip", ref: 0 },
    ],
    ...over,
  };
}
