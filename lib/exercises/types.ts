import type { Skill } from "@/lib/db/schema";
import type { Tone } from "@/lib/pinyin/tones";

export type ExerciseType =
  | "choose-meaning"
  | "choose-character"
  | "similar-characters"
  | "pinyin-input"
  | "tone-choice"
  | "tone-pair"
  | "order-words"
  | "fill-blank"
  | "build-sentence"
  | "translate-to-es"
  | "comprehension"
  | "dictation"
  | "listen-choose"
  | "reading-tf"
  | "matching"
  | "writing"
  | "speaking"
  | "component"
  | "build-character"
  | "classifier";

export const EXERCISE_TYPES: ExerciseType[] = [
  "choose-meaning",
  "choose-character",
  "similar-characters",
  "pinyin-input",
  "tone-choice",
  "tone-pair",
  "order-words",
  "fill-blank",
  "build-sentence",
  "translate-to-es",
  "comprehension",
  "dictation",
  "listen-choose",
  "reading-tf",
  "matching",
  "writing",
  "speaking",
  "component",
  "build-character",
  "classifier",
];

export const EXERCISE_LABELS: Record<ExerciseType, string> = {
  "choose-meaning": "Elegir significado",
  "choose-character": "Elegir carácter",
  "similar-characters": "Caracteres parecidos",
  "pinyin-input": "Escribir pinyin",
  "tone-choice": "Elegir tono",
  "tone-pair": "Pares de tonos",
  "order-words": "Ordenar la frase",
  "fill-blank": "Rellenar hueco",
  "build-sentence": "Construir la frase",
  "translate-to-es": "Traducir al español",
  comprehension: "Comprensión",
  dictation: "Dictado",
  "listen-choose": "Escucha y elige",
  "reading-tf": "Verdadero o falso",
  matching: "Emparejar",
  writing: "Escritura a mano",
  speaking: "Hablar",
  component: "Componentes",
  "build-character": "Construir carácter",
  classifier: "Clasificadores",
};

export interface Option {
  text: string;
  pinyin?: string;
  sub?: string; // texto secundario (traducción, pinyin)
  zh?: boolean; // renderizar como chino
}

interface Base {
  id: string;
  type: ExerciseType;
  skill: Skill;
  itemId: string; // palabra/carácter/gramática/frase que evalúa
  itemKind: "word" | "character" | "grammar" | "sentence" | "tone" | "radical";
  prompt: string; // instrucción en español
  explain?: string; // explicación mostrada tras responder
}

export interface MultipleChoiceExercise extends Base {
  type: "choose-meaning" | "choose-character" | "similar-characters" | "listen-choose" | "component" | "classifier" | "tone-pair" | "comprehension";
  display: { zh?: string; es?: string; audio?: string; pinyin?: string; dialogue?: { speaker?: string; zh: string; es: string }[] };
  options: Option[];
  answer: number;
}

export interface PinyinInputExercise extends Base {
  type: "pinyin-input";
  zh: string;
  answer: string; // pinyin con diacríticos
  meaning?: string;
}

export interface ToneChoiceExercise extends Base {
  type: "tone-choice";
  zh: string; // palabra (1–2 sílabas)
  syllables: string[]; // pinyin sin tono por sílaba
  answer: Tone[];
  audio: string;
}

export interface TilesExercise extends Base {
  type: "order-words" | "build-sentence";
  tiles: string[]; // barajadas (incluye distractores si los hay)
  answer: string[]; // orden correcto (solo fichas correctas)
  alternatives?: string[][]; // otros órdenes válidos
  zh: string;
  es: string;
  pinyin?: string;
}

export interface FillBlankExercise extends Base {
  type: "fill-blank";
  zh: string; // con ＿＿ como hueco
  answer: string;
  options?: string[]; // banco de palabras (incluye la respuesta) o escritura libre
  es: string;
  pinyin?: string;
}

export interface FreeTextExercise extends Base {
  type: "translate-to-es";
  zh: string;
  pinyin?: string;
  answers: string[]; // traducciones aceptadas
}

export interface DictationExercise extends Base {
  type: "dictation";
  zh: string;
  es?: string;
  pinyin?: string;
}

export interface ReadingTFExercise extends Base {
  type: "reading-tf";
  text: string;
  es?: string;
  statements: { s: string; truth: boolean; why?: string }[];
}

export interface MatchingExercise extends Base {
  type: "matching";
  pairs: { left: Option; right: Option }[]; // ≤ 6
  leftKind: "hanzi" | "pinyin" | "audio" | "meaning";
  rightKind: "hanzi" | "pinyin" | "audio" | "meaning";
}

export interface WritingExercise extends Base {
  type: "writing";
  hanzi: string; // 1–2 caracteres
  pinyin: string;
  meaning: string;
}

export interface SpeakingExercise extends Base {
  type: "speaking";
  zh: string;
  pinyin: string;
  es: string;
  mode: "shadow" | "recognize";
}

export interface BuildCharacterExercise extends Base {
  type: "build-character";
  hanzi: string;
  pinyin: string;
  meaning: string;
  components: string[]; // en orden de descomposición
  distractors: string[];
}

export type Exercise =
  | MultipleChoiceExercise
  | PinyinInputExercise
  | ToneChoiceExercise
  | TilesExercise
  | FillBlankExercise
  | FreeTextExercise
  | DictationExercise
  | ReadingTFExercise
  | MatchingExercise
  | WritingExercise
  | SpeakingExercise
  | BuildCharacterExercise;

/** Respuesta del usuario según el tipo. */
export type Response =
  | { kind: "choice"; index: number }
  | { kind: "text"; text: string }
  | { kind: "tones"; tones: Tone[] }
  | { kind: "tiles"; tiles: string[] }
  | { kind: "tf"; values: boolean[] }
  | { kind: "matching"; mistakes: number; completed: boolean }
  | { kind: "writing"; mistakes: number }
  | { kind: "speaking"; transcript: string; selfRating?: 1 | 2 | 3 }
  | { kind: "self"; correct: boolean; text?: string };

export interface CheckResult {
  correct: boolean;
  partial?: boolean;
  expected: string;
  explanation: string; // explica el porqué
  detail?: unknown; // diferencias (pinyin, fichas, palabras falladas)
  skip?: boolean; // no contar (p. ej. sin micrófono)
}

/** Palabra tal y como la ve el motor de ejercicios. */
export interface PoolWord {
  id: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  category?: string;
  example?: string;
  examplePinyin?: string;
  exampleTranslation?: string;
  radical?: string;
  cl?: string[];
}

export interface PoolSentence {
  zh: string;
  py?: string;
  es: string;
  grammarId?: string;
  alternatives?: string[]; // otras traducciones/órdenes válidos
}

export interface Pool {
  words: PoolWord[]; // palabras objetivo
  allWords?: PoolWord[]; // para distractores (por defecto = words)
  sentences: PoolSentence[];
  knownWords?: Set<string>; // para vocabulario controlado
}
