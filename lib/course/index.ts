/**
 * Fachada del curso y la gramática del idioma activo. El contenido vive en cada paquete
 * (pack.curriculum / pack.grammar); aquí solo se despacha para que el núcleo no dependa del idioma.
 */
import type { GrammarPoint, Lesson, LessonStep, Unit, Sentence } from "./types";
import type { Pool, PoolSentence, PoolWord } from "@/lib/exercises/types";
import { getActivePack } from "@/lib/languages/registry";

export function getUnits(): Unit[] {
  return getActivePack().curriculum.units;
}

export function getGrammar(): GrammarPoint[] {
  return getActivePack().grammar.points;
}

export function grammarById(id: string): GrammarPoint | undefined {
  return getActivePack().grammar.byId(id);
}

export function unitById(id: string): Unit | undefined {
  return getActivePack().curriculum.unitById(id);
}

export function lessonById(lessonId: string): { unit: Unit; lesson: Lesson; index: number } | undefined {
  return getActivePack().curriculum.lessonById(lessonId);
}

export function nextLesson(lessonId: string): { unit: Unit; lesson: Lesson } | undefined {
  return getActivePack().curriculum.nextLesson(lessonId);
}

export function vocabUpTo(lessonId: string): Map<string, PoolWord> {
  return getActivePack().curriculum.vocabUpTo(lessonId);
}

export function sentencesOf(lesson: Lesson): PoolSentence[] {
  return getActivePack().curriculum.sentencesOf(lesson);
}

export function splitSentences(text: string): string[] {
  return getActivePack().curriculum.splitSentences(text);
}

export function lessonPool(lesson: Lesson, extraWords: PoolWord[] = []): Pool {
  return getActivePack().curriculum.lessonPool(lesson, extraWords);
}

export function grammarPool(g: GrammarPoint, allWords: PoolWord[]): Pool {
  return getActivePack().grammar.pool(g, allWords);
}

export function levelTitle(): string {
  return getActivePack().curriculum.levelTitle;
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
    case "module":
      return step.title ?? step.id;
  }
}

export type { Sentence };
