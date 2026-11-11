import type { Skill } from "@/lib/db/schema";
/** Tono (zh) o índice de patrón de prosodia (ja: 1–4, ko: 1–3) */
export type Tone = 1 | 2 | 3 | 4 | 5;

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
  | "classifier"
  | "conjugation"
  | "particle"
  // tipos de los bancos (chino): escucha, diálogo, situación, error, transformación, traducción, huecos, velocidad, tonos, oral
  | "listen-answer"
  | "listen-tf"
  | "dictation-pinyin"
  | "dialogue-complete"
  | "dialogue-order"
  | "dialogue-who"
  | "situation"
  | "find-error"
  | "transform"
  | "build-question"
  | "translate-free"
  | "cloze"
  | "radical-meaning"
  | "speed-pinyin-hanzi"
  | "speed-match"
  | "tone-sandhi"
  | "speak-answer";

/** Tipos añadidos con los bancos de ejercicios (no exigidos por la paridad ja/ko). */
export const BANK_EXERCISE_TYPES: ExerciseType[] = ["listen-answer", "listen-tf", "dictation-pinyin", "dialogue-complete", "dialogue-order", "dialogue-who", "situation", "find-error", "transform", "build-question", "translate-free", "cloze", "radical-meaning", "speed-pinyin-hanzi", "speed-match", "tone-sandhi", "speak-answer"];

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
  "conjugation",
  "particle",
  "listen-answer",
  "listen-tf",
  "dictation-pinyin",
  "dialogue-complete",
  "dialogue-order",
  "dialogue-who",
  "situation",
  "find-error",
  "transform",
  "build-question",
  "translate-free",
  "cloze",
  "radical-meaning",
  "speed-pinyin-hanzi",
  "speed-match",
  "tone-sandhi",
  "speak-answer",
];

/** Los 20 tipos comunes a los tres idiomas (paridad). */
export const COMMON_EXERCISE_TYPES: ExerciseType[] = EXERCISE_TYPES.filter((t) => t !== "conjugation" && t !== "particle" && !BANK_EXERCISE_TYPES.includes(t));

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
  conjugation: "Conjugación",
  particle: "Partículas",
  "listen-answer": "Escucha y responde",
  "listen-tf": "Escucha: verdadero o falso",
  "dictation-pinyin": "Dictado en pinyin",
  "dialogue-complete": "Completar el diálogo",
  "dialogue-order": "Ordenar el diálogo",
  "dialogue-who": "¿Quién dice qué?",
  situation: "¿Qué dices cuando…?",
  "find-error": "Encuentra el error",
  transform: "Transformar la frase",
  "build-question": "Construir la pregunta",
  "translate-free": "Traducir libre",
  cloze: "Texto con huecos",
  "radical-meaning": "Significado del radical",
  "speed-pinyin-hanzi": "Velocidad: pinyin → hanzi",
  "speed-match": "Emparejar contrarreloj",
  "tone-sandhi": "Sandhi de tonos",
  "speak-answer": "Responder oralmente",
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
  type: "choose-meaning" | "choose-character" | "similar-characters" | "listen-choose" | "component" | "classifier" | "tone-pair" | "comprehension" | "listen-answer" | "dialogue-complete" | "dialogue-who" | "situation" | "radical-meaning" | "tone-sandhi";
  display: { zh?: string; es?: string; audio?: string; pinyin?: string; dialogue?: { speaker?: string; zh: string; es: string; missing?: boolean; py?: string }[]; voice?: Voice };
  options: Option[];
  answer: number;
}

/** Voz para el audio pregenerado: mujer / hombre / niño (zh-CN-Xiaoxiao / Yunxi / Xiaoyou). */
export type Voice = "f" | "m" | "child";

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
  /** Opciones de prosodia propias del idioma (ja: grave/agudo por mora; ko: lisa/aspirada/tensa). Sin ellas: los 5 tonos del chino. */
  choices?: { value: Tone; label: string; short: string }[];
  /** Nombre de cada unidad («sílaba», «mora», «consonante inicial») */
  unitName?: string;
}

export interface TilesExercise extends Base {
  type: "order-words" | "build-sentence" | "dialogue-order";
  tiles: string[]; // barajadas (incluye distractores si los hay)
  answer: string[]; // orden correcto (solo fichas correctas)
  alternatives?: string[][]; // otros órdenes válidos
  zh: string;
  es: string;
  pinyin?: string;
}

export interface FillBlankExercise extends Base {
  type: "fill-blank" | "particle";
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
  type: "dictation" | "dictation-pinyin" | "transform" | "build-question";
  zh: string; // respuesta esperada (hanzi)
  es?: string;
  pinyin?: string;
  /** transform / build-question: lo que se muestra (frase de partida o respuesta dada) */
  source?: { zh: string; py?: string; es?: string };
  alternatives?: string[];
  voice?: Voice;
}

export interface ReadingTFExercise extends Base {
  type: "reading-tf" | "listen-tf";
  text: string;
  es?: string;
  pinyin?: string;
  statements: { s: string; truth: boolean; why?: string }[];
  voice?: Voice;
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
  type: "speaking" | "speak-answer";
  zh: string; // frase modelo (speak-answer: respuesta modelo)
  pinyin: string;
  es: string;
  mode: "shadow" | "recognize" | "read" | "answer";
  /** speak-answer: la pregunta que se oye y las palabras clave esperadas */
  question?: { zh: string; py?: string; es?: string };
  keywords?: string[];
}

export interface FindErrorExercise extends Base {
  type: "find-error";
  tokens: string[]; // frase con error, segmentada
  wrongIndex: number;
  correct: string;
  es?: string;
}

export interface ClozeExercise extends Base {
  type: "cloze";
  text: string; // con ＿＿ por hueco
  blanks: { answer: string; options: string[] }[];
  es?: string;
}

export interface FreeTranslateExercise extends Base {
  type: "translate-free";
  es: string;
  answers: string[]; // referencias (puede ser vacío)
  pinyin?: string;
  hint?: string;
  grammarIds?: string[];
}

export interface SpeedExercise extends Base {
  type: "speed-pinyin-hanzi" | "speed-match";
  pairs: { left: string; right: string; leftPinyin?: string }[]; // izquierda: pinyin / zh · derecha: zh / es
  seconds: number;
}

export interface ConjugationExercise extends Base {
  type: "conjugation";
  zh: string; // forma de diccionario
  pinyin: string;
  meaning: string;
  form: string; // nombre de la forma en español
  formNative: string; // ます形, 아요체…
  answer: string;
  alternatives?: string[];
  cls?: string; // clase de la palabra (godan, ichimdan, ㅂ불규칙…)
  hint?: string;
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
  | FindErrorExercise
  | ClozeExercise
  | FreeTranslateExercise
  | SpeedExercise
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
  | BuildCharacterExercise
  | ConjugationExercise;

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
  | { kind: "self"; correct: boolean; text?: string }
  | { kind: "findError"; index: number; correction: string }
  | { kind: "cloze"; answers: string[] }
  | { kind: "speed"; correct: number; total: number; seconds: number; finished: boolean };

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
  /** categorías adicionales de la palabra */
  alsoIn?: string[];
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
