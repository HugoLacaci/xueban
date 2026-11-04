/** Tipos del motor de corrección por capas (normalización → alineación → linter → tutor IA). */

export type AnswerModeIn = "hanzi" | "pinyin" | "speech" | "handwriting";

export type ErrorType =
  | "missing" // falta una palabra
  | "extra" // sobra una palabra
  | "order" // orden incorrecto
  | "char" // carácter equivocado (homófono, parecido)
  | "tone" // tono equivocado (respuesta en pinyin)
  | "pinyin" // sílaba equivocada (respuesta en pinyin)
  | "word" // palabra o registro poco natural
  | "grammar"; // regla del linter

export interface SpanRef {
  /** Índices (en palabras de la respuesta del usuario) afectados. */
  from: number;
  to: number; // exclusivo
  /** Texto afectado tal como lo escribió el usuario */
  text: string;
}

export interface CorrectionError {
  type: ErrorType;
  span?: SpanRef;
  /** Para «order»: índice de palabra al que debería ir */
  moveTo?: number;
  /** Lo que debería haber (palabra correcta, tono correcto…) */
  expected?: string;
  explanation: string; // español, sencillo
  ruleId?: string; // id de la regla del linter / apunte de gramática
  noteId?: string; // apunte de gramática enlazado
  tip?: string; // truco para no repetirlo
  severity: "error" | "warn";
  source: "align" | "linter" | "tutor";
}

export interface Alternative {
  zh: string;
  py?: string;
  es_literal?: string;
  es?: string;
  register: "neutral" | "colloquial" | "formal";
  note?: string;
}

export interface AlignedToken {
  user?: string; // palabra del usuario (undefined = falta)
  ref?: string; // palabra de referencia (undefined = sobra)
  status: "ok" | "missing" | "extra" | "sub" | "moved" | "tone";
  userPy?: string;
  refPy?: string;
}

export interface CorrectionReport {
  verdict: "correct" | "improvable" | "wrong" | "partial";
  score: number; // 0–100
  /** Respuesta del usuario normalizada (hanzi si la escribió en hanzi; hanzi propuestos si pinyin) */
  answer: string;
  answerPy?: string;
  /** Frase correcta elegida (la referencia más cercana) o la corrección propuesta */
  corrected?: string;
  correctedPy?: string;
  alignment: AlignedToken[];
  errors: CorrectionError[];
  alternatives: Alternative[];
  tip?: string;
  extraPractice: { es: string; zh: string; py?: string }[];
  /** Qué capas se han ejecutado */
  layers: { normalize: true; align: boolean; linter: boolean; tutor: boolean };
  /** Discrepancias entre el tutor y las reglas verificadas (prevalece la regla) */
  disagreements?: string[];
  mode: AnswerModeIn;
}

export interface CorrectionInput {
  es: string; // frase en español
  answer: string; // respuesta del usuario (hanzi, pinyin con números/tildes/sin tonos)
  references?: string[]; // respuestas correctas (opcional)
  mode?: AnswerModeIn;
  hint?: string;
  grammarIds?: string[];
  /** Usar el tutor IA si está configurado (capa 4) */
  useTutor?: boolean;
}
