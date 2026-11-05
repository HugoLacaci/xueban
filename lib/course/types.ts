/** Tipos del contenido del curso (content/course/*.json) y de la gramática (content/grammar.json). */
import type { ExerciseType } from "@/lib/exercises/types";
import type { SkeletonSentence, SlotId } from "./skeleton";

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
  | {
      type: "exercises";
      count?: number;
      types?: ExerciseType[];
      focus?: string[];
      /** temario v2: bancos de content/<lang>/exercises (`g-ma`, `a1-u01`…) que aportan la mitad de los ejercicios */ bank?: string[];
    }
  | { type: "reading"; title: string; text: string; es: string; questions: Question[] }
  | { type: "review" }
  | { type: "pinyin-table" }
  | { type: "tones" }
  | { type: "tone-pairs" }
  | { type: "strokes" }
  | { type: "radicals"; radicals: string[] }
  | { type: "spanish-errors" }
  | { type: "module"; id: string; title?: string; params?: Record<string, unknown> } // paso propio del paquete (kana, hangul, acento…)
  // ---- temario v2 (docs/TEMARIO.md §6) ----
  /** objetivo y «¿qué sabré decir al acabar?» */
  | { type: "objective"; canSay: Sentence[] }
  /** pronunciación del día: un sonido, par de tonos o regla, con ejercicio corto (nunca desaparece) */
  | { type: "phonetics-drill"; title: string; markdown: string; items: PhoneticsItem[] }
  /** carácter del día: origen, componentes, mnemotecnia y trazos (lo pinta el paquete del idioma) */
  | { type: "char-of-day"; chars: string[]; mnemonics?: Record<string, string> }
  /** explicación con el esqueleto de la frase: resalta el hueco nuevo */
  | {
      type: "skeleton";
      title: string;
      markdown?: string;
      focus: SlotId[];
      sentences: SkeletonSentence[];
      compare?: boolean;
      negative?: SkeletonSentence[];
      question?: SkeletonSentence[];
      mistakes?: GrammarMistake[];
    }
  /** «Construye la frase»: ordenar trozos en el esqueleto (lo de hoy + todo lo anterior) */
  | {
      type: "sentence-builder";
      title?: string;
      items: { sentence: SkeletonSentence; distractors?: string[] }[];
    }
  /** escuchar y hablar: shadowing y responder */
  | { type: "listen-speak"; shadowing: Sentence[]; respond?: { q: Sentence; model: Sentence }[] }
  /** «Tus apuntes han crecido» (se calcula a partir de los apuntes vivos) */
  | { type: "notes-growth" };

/** Ítem del ejercicio de pronunciación: se oye `audio` (texto meta) y se elige la opción correcta. */
export interface PhoneticsItem {
  audio: string;
  prompt?: string;
  options: string[];
  answer: number;
  explain?: string;
}

export interface Lesson {
  id: string;
  title: string;
  zh?: string;
  goal: string; // objetivo único de la lección
  minutes: number;
  vocab: LessonVocab[];
  steps: LessonStep[];
  reviewed: boolean; // false → pendiente de validar con el profesor
  /** temario v2: palabras extra (fuera del HSK) marcadas como tales */
  extraVocab?: string[];
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
  /** temario v2: etapa (e0, a1, a2, b1) */
  stage?: "e0" | "a1" | "a2" | "b1";
  /** temario v2: role-play de cierre (id de content/<lang>/roleplays) */
  roleplay?: string;
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
