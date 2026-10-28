/** Tipos del contenido del curso (content/course/*.json) y de la gramática (content/grammar.json). */
import type { ExerciseType } from "@/lib/exercises/types";

export interface Sentence {
  zh: string;
  py?: string; // pinyin de la frase (opcional; si falta se calcula)
  es: string;
  speaker?: string; // A / B / nombre
  note?: string;
}

export interface LessonVocab {
  hanzi: string;
  pinyin: string;
  es: string;
  note?: string;
}

export interface Question {
  q: string; // en español (o chino con traducción)
  options: string[];
  answer: number;
  explain?: string;
}

export type LessonStep =
  | { type: "explain"; title: string; markdown: string }
  | { type: "vocab"; title?: string; words: string[] }
  | { type: "dialogue"; title: string; lines: Sentence[]; notes?: string }
  | { type: "grammar"; id: string }
  | { type: "exercises"; count?: number; types?: ExerciseType[]; focus?: string[] }
  | { type: "reading"; title: string; text: string; es: string; questions: Question[] }
  | { type: "review" }
  | { type: "pinyin-table" }
  | { type: "tones" }
  | { type: "tone-pairs" }
  | { type: "strokes" }
  | { type: "radicals"; radicals: string[] }
  | { type: "spanish-errors" };

export interface Lesson {
  id: string;
  title: string;
  zh?: string;
  goal: string; // objetivo único de la lección
  minutes: number;
  vocab: LessonVocab[];
  steps: LessonStep[];
  reviewed: boolean; // false → pendiente de validar con el profesor
}

export interface Unit {
  id: string;
  order: number;
  title: string;
  zh: string;
  description: string;
  icon: string;
  level: 0 | 1 | 2 | 3;
  category?: string; // categoría de la semilla asociada
  lessons: Lesson[];
  checkpoint?: { exercises: number };
}

export interface GrammarMistake {
  wrong: string;
  right: string;
  why: string;
}

export interface GrammarPoint {
  id: string;
  title: string; // en español
  zh: string; // nombre/fórmula en chino
  pattern: string; // estructura en fórmula: Sujeto + 是 + Nombre
  level: 1 | 2 | 3;
  summary: string; // una frase
  explanation: string; // markdown en español
  examples: Sentence[]; // 5+
  mistakes: GrammarMistake[];
  practice: {
    order?: Sentence[]; // frases para ordenar
    fill?: { zh: string; answer: string; options: string[]; es: string }[]; // hueco con ＿
    translate?: Sentence[]; // español → chino (construir con fichas)
  };
  related?: string[];
  source?: string; // enlace a Chinese Grammar Wiki
  reviewed: boolean;
}
