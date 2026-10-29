/** Tipos del contenido del curso (content/course/*.json) y de la gramática (content/grammar.json). */
import type { ExerciseType } from "@/lib/exercises/types";

export interface Sentence {
  zh: string; // texto en la lengua meta
  py?: string; // lectura de la frase (pinyin / kana / romanización; opcional)
  es: string;
  speaker?: string; // A / B / nombre
  note?: string;
}

export interface LessonVocab {
  hanzi: string; // forma escrita
  pinyin: string; // lectura
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
  | { type: "spanish-errors" }
  | { type: "module"; id: string; title?: string; params?: Record<string, unknown> }; // paso propio del paquete (kana, hangul, acento…)

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
  lang?: string;
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
