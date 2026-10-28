/** Acceso al contenido del curso y la gramática (JSON estático en content/). */
import type { GrammarPoint, Lesson, LessonStep, Unit, Sentence } from "./types";
import type { Pool, PoolSentence, PoolWord } from "@/lib/exercises/types";
import grammarJson from "@/content/grammar.json";
import u0Pron from "@/content/course/u0-pronunciacion.json";
import u0Chars from "@/content/course/u0-caracteres.json";
import u01 from "@/content/course/u01-saludos.json";
import u02 from "@/content/course/u02-numeros.json";
import u03 from "@/content/course/u03-familia.json";
import u04 from "@/content/course/u04-tiempo.json";
import u05 from "@/content/course/u05-comida.json";
import u06 from "@/content/course/u06-compras.json";
import u07 from "@/content/course/u07-lugares.json";
import u08 from "@/content/course/u08-transporte.json";
import u09 from "@/content/course/u09-escuela.json";
import u10 from "@/content/course/u10-clima.json";
import u11 from "@/content/course/u11-salud.json";
import u12 from "@/content/course/u12-ocio.json";
import u13 from "@/content/course/u13-rutina.json";
import u14 from "@/content/course/u14-telefono.json";

export const UNITS: Unit[] = ([u0Pron, u0Chars, u01, u02, u03, u04, u05, u06, u07, u08, u09, u10, u11, u12, u13, u14] as Unit[]).sort((a, b) => a.order - b.order);

export const GRAMMAR: GrammarPoint[] = grammarJson as GrammarPoint[];
const grammarMap = new Map(GRAMMAR.map((g) => [g.id, g]));

export function grammarById(id: string): GrammarPoint | undefined {
  return grammarMap.get(id);
}

export function unitById(id: string): Unit | undefined {
  return UNITS.find((u) => u.id === id);
}

export function lessonById(lessonId: string): { unit: Unit; lesson: Lesson; index: number } | undefined {
  for (const unit of UNITS) {
    const index = unit.lessons.findIndex((l) => l.id === lessonId);
    if (index >= 0) return { unit, lesson: unit.lessons[index], index };
  }
  return undefined;
}

export function nextLesson(lessonId: string): { unit: Unit; lesson: Lesson } | undefined {
  const cur = lessonById(lessonId);
  if (!cur) return undefined;
  if (cur.index + 1 < cur.unit.lessons.length) return { unit: cur.unit, lesson: cur.unit.lessons[cur.index + 1] };
  const ui = UNITS.indexOf(cur.unit);
  const nu = UNITS[ui + 1];
  return nu?.lessons[0] ? { unit: nu, lesson: nu.lessons[0] } : undefined;
}

/** Todas las palabras del curso hasta (e incluyendo) una lección: vocabulario controlado. */
export function vocabUpTo(lessonId: string): Map<string, PoolWord> {
  const out = new Map<string, PoolWord>();
  for (const unit of UNITS) {
    for (const lesson of unit.lessons) {
      for (const v of lesson.vocab) if (!out.has(v.hanzi)) out.set(v.hanzi, { id: `course-${v.hanzi}`, hanzi: v.hanzi, pinyin: v.pinyin, meaning: v.es });
      if (lesson.id === lessonId) return out;
    }
  }
  return out;
}

export function sentencesOf(lesson: Lesson): PoolSentence[] {
  const out: PoolSentence[] = [];
  for (const step of lesson.steps) {
    if (step.type === "dialogue") for (const l of step.lines) out.push({ zh: l.zh, py: l.py, es: l.es });
    if (step.type === "grammar") {
      const g = grammarById(step.id);
      if (g) {
        for (const e of g.examples) out.push({ zh: e.zh, py: e.py, es: e.es, grammarId: g.id });
        for (const o of g.practice.order ?? []) out.push({ zh: o.zh, py: o.py, es: o.es, grammarId: g.id });
      }
    }
    if (step.type === "reading") {
      for (const s of splitSentences(step.text)) out.push({ zh: s, es: "" });
    }
  }
  // sin traducción no sirven para traducir/ordenar: filtra las vacías salvo para dictado
  return out.filter((s) => s.es);
}

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[。！？])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

/** Pool de ejercicios de una lección: su vocabulario + frases; distractores de todo el vocabulario visto. */
export function lessonPool(lesson: Lesson, extraWords: PoolWord[] = []): Pool {
  const words: PoolWord[] = lesson.vocab.map((v) => ({ id: `course-${v.hanzi}`, hanzi: v.hanzi, pinyin: v.pinyin, meaning: v.es }));
  const seen = vocabUpTo(lesson.id);
  const allWords = Array.from(new Map([...Array.from(seen.values()), ...extraWords].map((w) => [w.hanzi, w])).values());
  return { words: words.length ? words : allWords.slice(-10), allWords, sentences: sentencesOf(lesson) };
}

export function grammarPool(g: GrammarPoint, allWords: PoolWord[]): Pool {
  const sentences: PoolSentence[] = [...g.examples, ...(g.practice.order ?? []), ...(g.practice.translate ?? [])].map((s) => ({ zh: s.zh, py: s.py, es: s.es, grammarId: g.id }));
  return { words: [], allWords, sentences };
}

export function stepLabel(step: LessonStep): string {
  switch (step.type) {
    case "explain":
      return step.title;
    case "vocab":
      return step.title ?? "Vocabulario";
    case "dialogue":
      return step.title;
    case "grammar":
      return grammarById(step.id)?.title ?? "Gramática";
    case "exercises":
      return "Ejercicios";
    case "reading":
      return step.title;
    case "review":
      return "Repaso";
    case "pinyin-table":
      return "Tabla de pinyin";
    case "tones":
      return "Los tonos";
    case "tone-pairs":
      return "Pares de tonos";
    case "strokes":
      return "Trazos";
    case "radicals":
      return "Radicales";
    case "spanish-errors":
      return "Errores típicos";
  }
}

export type { Sentence };
