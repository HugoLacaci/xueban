/**
 * Bancos de ejercicios del chino (content/zh/exercises/*.json): tipos de los ítems, carga diferida por unidad o
 * punto gramatical, y conversión al modelo del motor (Exercise). Lógica pura salvo la carga (import dinámico).
 */
import type { Exercise, ExerciseType, Option, Voice } from "./types";
import { shuffle } from "@/lib/utils";

export interface BankLine {
  speaker: string;
  zh: string;
  py?: string;
  es?: string;
}

export interface BankItem {
  id: string;
  type: string;
  skill?: string;
  level?: number;
  grammarIds?: string[];
  explain?: string;
  tags?: string[];
  new?: string[];
  voice?: Voice;
  // campos según tipo (ver docs/EXERCISE_BANK_SPEC.md)
  zh?: string;
  py?: string;
  es?: string;
  options?: string[];
  answer?: number | string;
  question?: string;
  questionPy?: string;
  questionEs?: string;
  answerEs?: string;
  statements?: { s: string; truth: boolean; why?: string }[];
  lines?: BankLine[];
  missing?: number;
  ask?: number;
  situation?: string;
  tokens?: string[];
  wrongIndex?: number;
  correct?: string;
  target?: string;
  alternatives?: string[];
  tiles?: string[];
  answers?: string[];
  hint?: string;
  text?: string;
  blanks?: { answer: string; options: string[] }[];
  questions?: { q: string; options: string[]; answer: number; explain?: string }[];
  hanzi?: string;
  meaning?: string;
  components?: string[];
  distractors?: string[];
  radical?: string;
  examples?: string[];
  pairs?: { py?: string; zh: string; es?: string }[];
  pattern?: string;
  lexical?: string;
  spoken?: string;
  rule?: string;
  sample?: string;
  samplePy?: string;
  sampleEs?: string;
  keywords?: string[];
}

export interface Bank {
  id: string;
  unitId?: string;
  grammarId?: string;
  title: string;
  items: BankItem[];
}

/** Ids de bancos disponibles (se completan a medida que existen los archivos). */
export const UNIT_BANKS = ["u0", "u01", "u02", "u03", "u04", "u05", "u06", "u07", "u08", "u09", "u10", "u11", "u12", "u13", "u14"];
export const GRAMMAR_BANKS = ["shi", "ma", "ne", "ba", "question-words", "de", "bu-mei", "you", "zai", "le", "modal-verbs", "numbers", "measure-words", "demonstratives", "dates-time", "tai-le", "hen-adj", "he", "ye-dou", "word-order", "lai-qu", "yidianr-youdianr", "reduplication", "yixia", "shi-de", "qing", "gei", "complements", "mei", "price-age"];

const cache = new Map<string, Promise<Bank | null>>();

/** Carga un banco (`u03` o `g-bu-mei`); null si no existe todavía. */
export function loadBank(id: string): Promise<Bank | null> {
  if (!cache.has(id)) {
    cache.set(
      id,
      import(`@/content/zh/exercises/${id}.json`)
        .then((m) => (m.default ?? m) as Bank)
        .catch(() => null),
    );
  }
  return cache.get(id)!;
}

export async function loadUnitBank(unitId: string): Promise<Bank | null> {
  const id = unitId.startsWith("u0-") ? "u0" : unitId;
  return loadBank(id);
}

export async function loadGrammarBank(grammarId: string): Promise<Bank | null> {
  return loadBank(`g-${grammarId}`);
}

/** Tipos del motor por cada tipo del banco (los que coinciden se mantienen). */
const TYPE_MAP: Record<string, ExerciseType> = {
  "choose-meaning": "choose-meaning",
  "choose-character": "choose-character",
  "listen-choose": "listen-choose",
  "listen-answer": "listen-answer",
  "dictation-pinyin": "dictation-pinyin",
  "dictation-hanzi": "dictation",
  "listen-tf": "listen-tf",
  "dialogue-complete": "dialogue-complete",
  "dialogue-order": "dialogue-order",
  "dialogue-who": "dialogue-who",
  situation: "situation",
  "find-error": "find-error",
  transform: "transform",
  "build-question": "build-question",
  "translate-bank": "build-sentence",
  "translate-free": "translate-free",
  cloze: "cloze",
  reading: "comprehension",
  "fill-blank": "fill-blank",
  "order-words": "order-words",
  "build-character": "build-character",
  "radical-meaning": "radical-meaning",
  "speed-pinyin-hanzi": "speed-pinyin-hanzi",
  "speed-match": "speed-match",
  "tone-pair": "tone-pair",
  "tone-sandhi": "tone-sandhi",
  "speak-repeat": "speaking",
  "speak-read": "speaking",
  "speak-answer": "speak-answer",
  "pinyin-input": "pinyin-input",
  matching: "matching",
};

export function bankTypeToEngine(t: string): ExerciseType | undefined {
  return TYPE_MAP[t];
}

const SKILL_OF: Record<string, Exercise["skill"]> = { listening: "listening", reading: "reading", writing: "writing", speaking: "speaking", tones: "tones", vocabulary: "vocabulary", grammar: "grammar", characters: "characters" };
const TRANSFORM_PROMPT: Record<string, string> = { "negative-bu": "Pon la frase en negativa con 不", "negative-mei": "Pon la frase en negativa con 没", "question-ma": "Convierte en pregunta con 吗", "question-a-not-a": "Convierte en pregunta A不A", "question-word": "Convierte en pregunta con un pronombre interrogativo", "past-le": "Añade 了 (acción completada)" };
const TONE_LABEL = (p: string) => p.split("").map((t) => (t === "0" ? "neutro" : `${t}.º`)).join(" + ");

const hasHan = (s: string) => /[㐀-鿿]/.test(s);
const opts = (list: string[] | undefined, zh = true, subs?: (string | undefined)[]): Option[] => (list ?? []).map((text, i) => ({ text, zh: zh && hasHan(text), sub: subs?.[i] }));

/** Convierte un ítem del banco en uno o varios ejercicios del motor (reading → varias preguntas). */
export function bankItemToExercises(item: BankItem, bank: { id: string; unitId?: string; grammarId?: string }, rng: () => number = Math.random): Exercise[] {
  const type = TYPE_MAP[item.type];
  if (!type) return [];
  const base = { id: `${bank.id}:${item.id}`, itemId: item.id, skill: SKILL_OF[item.skill ?? ""] ?? "grammar", explain: item.explain } as const;
  const grammarKind = item.grammarIds?.length ? ("grammar" as const) : ("sentence" as const);
  const answerIdx = typeof item.answer === "number" ? item.answer : 0;
  switch (type) {
    case "choose-meaning":
      return [{ ...base, type, itemKind: "word", prompt: "¿Qué significa?", display: { zh: item.zh, pinyin: item.py }, options: opts(item.options, false), answer: answerIdx }];
    case "choose-character":
      return [{ ...base, type, itemKind: "word", prompt: "¿Cómo se escribe?", display: { es: item.es }, options: opts(item.options), answer: answerIdx }];
    case "listen-choose":
      return [{ ...base, type, itemKind: "word", prompt: "Escucha y elige lo que oyes", display: { audio: item.zh, voice: item.voice }, options: opts(item.options), answer: answerIdx }];
    case "listen-answer":
      return [{ ...base, type, itemKind: grammarKind, prompt: "Escucha la pregunta y elige la respuesta adecuada", display: { audio: item.question, voice: item.voice }, options: opts(item.options), answer: answerIdx, explain: `Pregunta: ${item.question}${item.questionPy ? ` (${item.questionPy})` : ""}${item.questionEs ? ` «${item.questionEs}»` : ""} → ${item.answerEs ?? ""}. ${item.explain ?? ""}`.trim() }];
    case "dictation-pinyin":
      return [{ ...base, type, itemKind: "sentence", prompt: "Escucha y escribe el pinyin con tonos", zh: item.zh!, pinyin: item.py, es: item.es, voice: item.voice }];
    case "dictation":
      return [{ ...base, type, itemKind: "sentence", prompt: "Escucha y escribe los hanzi", zh: item.zh!, pinyin: item.py, es: item.es, voice: item.voice }];
    case "listen-tf":
      return [{ ...base, type, itemKind: "sentence", prompt: "Escucha y marca verdadero o falso", text: item.zh!, pinyin: item.py, statements: item.statements ?? [], voice: item.voice }];
    case "dialogue-complete": {
      const lines = (item.lines ?? []).map((l, i) => ({ speaker: l.speaker, zh: i === item.missing ? "＿＿＿" : l.zh, es: i === item.missing ? "" : (l.es ?? ""), py: l.py, missing: i === item.missing }));
      return [{ ...base, type, itemKind: grammarKind, prompt: "Completa la línea que falta", display: { dialogue: lines }, options: opts(item.options), answer: answerIdx }];
    }
    case "dialogue-order": {
      const lines = item.lines ?? [];
      const answer = lines.map((l) => `${l.speaker}：${l.zh}`);
      let tiles = shuffle(answer, rng);
      if (tiles.join("") === answer.join("") && tiles.length > 1) tiles = [...tiles.slice(1), tiles[0]];
      return [{ ...base, type, itemKind: "sentence", prompt: "Ordena las líneas del diálogo", tiles, answer, zh: answer.join("\n"), es: lines.map((l) => l.es ?? "").join(" / "), pinyin: undefined }];
    }
    case "dialogue-who": {
      const lines = (item.lines ?? []).map((l, i) => ({ speaker: i === item.ask ? "?" : l.speaker, zh: l.zh, es: l.es ?? "", py: l.py, missing: i === item.ask }));
      return [{ ...base, type, itemKind: "sentence", prompt: "¿Quién dice la línea marcada?", display: { dialogue: lines }, options: opts(item.options), answer: answerIdx }];
    }
    case "situation":
      return [{ ...base, type, itemKind: grammarKind, prompt: "¿Qué dices cuando…?", display: { es: item.situation }, options: opts(item.options), answer: answerIdx, explain: `${item.py ? `${item.py}. ` : ""}${item.explain ?? ""}`.trim() }];
    case "find-error":
      return [{ ...base, type, itemKind: grammarKind, prompt: "Encuentra el error y corrígelo", tokens: item.tokens ?? [], wrongIndex: item.wrongIndex ?? 0, correct: item.correct ?? "", es: item.es }];
    case "transform":
      return [{ ...base, type, itemKind: grammarKind, prompt: TRANSFORM_PROMPT[item.target ?? ""] ?? "Transforma la frase", zh: item.answer as string, source: { zh: item.zh!, py: item.py, es: item.es }, alternatives: item.alternatives }];
    case "build-question":
      return [{ ...base, type, itemKind: grammarKind, prompt: "Construye la pregunta que corresponde a esta respuesta", zh: item.question!, pinyin: item.questionPy, source: { zh: item.answer as string, es: item.answerEs }, alternatives: item.alternatives }];
    case "build-sentence": {
      const answer = (item.tiles ?? []).filter((t) => item.zh!.includes(t));
      const ordered = orderTiles(item.zh!, answer);
      return [{ ...base, type, itemKind: grammarKind, prompt: "Traduce con las fichas", tiles: shuffle(item.tiles ?? [], rng), answer: ordered, alternatives: item.alternatives?.map((a) => orderTiles(a, (item.tiles ?? []).filter((t) => a.includes(t)))), zh: item.zh!, es: item.es ?? "", pinyin: item.py }];
    }
    case "translate-free":
      return [{ ...base, type, itemKind: grammarKind, prompt: "Traduce al chino", es: item.es!, answers: item.answers ?? [], pinyin: item.py, hint: item.hint, grammarIds: item.grammarIds }];
    case "cloze":
      return [{ ...base, type, itemKind: grammarKind, prompt: "Completa los huecos", text: item.text!, blanks: item.blanks ?? [], es: item.es }];
    case "comprehension":
      return (item.questions ?? []).map((q, i) => ({ ...base, id: `${base.id}:${i}`, type, itemKind: "sentence" as const, prompt: q.q, display: { dialogue: [{ zh: item.text!, es: item.es ?? "" }] }, options: q.options.map((o) => ({ text: o })), answer: q.answer, explain: q.explain ?? item.explain }));
    case "fill-blank":
      return [{ ...base, type, itemKind: grammarKind, prompt: "Elige la palabra que completa la frase", zh: item.zh!, answer: item.answer as string, options: shuffle(item.options ?? [], rng), es: item.es ?? "", pinyin: item.py }];
    case "order-words": {
      const tiles = item.tiles?.length ? item.tiles : null;
      return [{ ...base, type, itemKind: grammarKind, prompt: "Ordena las fichas para formar la frase", tiles: tiles ? shuffle(tiles, rng) : [], answer: tiles ?? [], alternatives: undefined, zh: item.zh!, es: item.es ?? "", pinyin: item.py, needsTiles: !tiles } as Exercise & { needsTiles?: boolean }];
    }
    case "build-character":
      return [{ ...base, type, itemKind: "character", prompt: `Selecciona los componentes que forman ${item.hanzi}`, hanzi: item.hanzi!, pinyin: item.py ?? "", meaning: item.meaning ?? "", components: item.components ?? [], distractors: item.distractors ?? [] }];
    case "radical-meaning":
      return [{ ...base, type, itemKind: "radical", prompt: `¿Qué significa el radical ${item.radical}?`, display: { zh: item.radical, es: item.examples?.length ? `Aparece en: ${item.examples.join(" · ")}` : undefined }, options: opts(item.options, false), answer: answerIdx }];
    case "speed-pinyin-hanzi":
      return [{ ...base, type, itemKind: "word", prompt: "Pinyin → hanzi, contrarreloj", pairs: (item.pairs ?? []).map((p) => ({ left: p.py ?? "", right: p.zh })), seconds: Math.max(20, (item.pairs?.length ?? 6) * 5) }];
    case "speed-match":
      return [{ ...base, type, itemKind: "word", prompt: "Empareja contrarreloj", pairs: (item.pairs ?? []).map((p) => ({ left: p.zh, right: p.es ?? "" })), seconds: Math.max(20, (item.pairs?.length ?? 6) * 5) }];
    case "tone-pair": {
      const options = item.options ?? [];
      return [{ ...base, type, itemKind: "tone", prompt: "Escucha: ¿qué combinación de tonos oyes?", display: { audio: item.zh, voice: item.voice }, options: options.map((p) => ({ text: TONE_LABEL(p), sub: p })), answer: Math.max(0, options.indexOf(item.pattern ?? "")) }];
    }
    case "tone-sandhi": {
      const correct = item.spoken ?? "";
      const wrong = [item.lexical ?? "", correct.replace(/[āáǎà]/, (m) => ({ ā: "á", á: "ǎ", ǎ: "à", à: "ā" })[m] ?? m)].filter((x) => x && x !== correct);
      const options = shuffle([correct, ...Array.from(new Set(wrong))].slice(0, 3), rng);
      return [{ ...base, type, itemKind: "tone", prompt: `¿Cómo se pronuncia de verdad «${item.zh}» (sandhi ${item.rule === "33" ? "3+3" : item.rule})?`, display: { zh: item.zh, audio: item.zh }, options: options.map((o) => ({ text: o, pinyin: o })), answer: options.indexOf(correct) }];
    }
    case "speaking":
      return [{ ...base, type, itemKind: "sentence", prompt: item.type === "speak-read" ? "Lee en voz alta" : "Escucha y repite (shadowing)", zh: item.zh ?? item.text ?? "", pinyin: item.py ?? "", es: item.es ?? "", mode: item.type === "speak-read" ? "read" : "shadow" }];
    case "speak-answer":
      return [{ ...base, type, itemKind: "sentence", prompt: "Escucha la pregunta y responde en voz alta", zh: item.sample ?? "", pinyin: item.samplePy ?? "", es: item.sampleEs ?? "", mode: "answer", question: { zh: item.question ?? "", py: item.questionPy, es: item.questionEs }, keywords: item.keywords ?? [] }];
    case "pinyin-input":
      return [{ ...base, type, itemKind: "word", prompt: "Escribe el pinyin con tonos", zh: item.zh!, answer: item.py ?? "", meaning: item.meaning ?? item.es }];
    case "matching": {
      const pairs = (item.pairs ?? []).slice(0, 6);
      return [{ ...base, type, itemKind: "word", prompt: "Empareja", pairs: pairs.map((p) => ({ left: { text: p.zh, zh: true }, right: { text: p.es ?? p.py ?? "" } })), leftKind: "hanzi", rightKind: "meaning" }];
    }
    default:
      return [];
  }
}

/** Ordena las fichas según su aparición en la frase (para translate-bank). */
function orderTiles(zh: string, tiles: string[]): string[] {
  const used = tiles.slice();
  const out: string[] = [];
  let rest = zh.replace(/[，。！？、]/g, "");
  while (rest.length) {
    const next = used.filter((t) => rest.startsWith(t)).sort((a, b) => b.length - a.length)[0];
    if (!next) {
      rest = rest.slice(1);
      continue;
    }
    out.push(next);
    used.splice(used.indexOf(next), 1);
    rest = rest.slice(next.length);
  }
  return out;
}

export const LISTENING_BANK_TYPES = ["listen-choose", "listen-answer", "dictation-pinyin", "dictation-hanzi", "listen-tf", "tone-pair", "tone-sandhi"];
export const SPEAKING_BANK_TYPES = ["speak-repeat", "speak-read", "speak-answer"];
