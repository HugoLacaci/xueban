"use client";
/**
 * Construye sesiones de ejercicios para lecciones, checkpoints, gramática y práctica libre,
 * conectando el contenido del curso, el mazo del usuario, el diccionario y los generadores.
 */
import { db, type Word } from "@/lib/db";
import { GRAMMAR, grammarById, lessonPool, sentencesOf, UNITS, vocabUpTo } from "@/lib/course";
import type { GrammarPoint, Lesson, Question, Unit } from "@/lib/course/types";
import { componentsOf, charInfoLoaded, getLexicon, lookupFirst, RADICALS, radicalInfo } from "@/lib/dictionary/service";
import { segment } from "@/lib/segment";
import { speechRecognitionAvailable } from "@/lib/tts";
import { seededRandom, shuffle, pick } from "@/lib/utils";
import { generateSession, type GenContext } from "./generators";
import type { Exercise, ExerciseType, Pool, PoolSentence, PoolWord } from "./types";

export const CORE_TYPES: ExerciseType[] = ["choose-meaning", "choose-character", "listen-choose", "pinyin-input", "tone-choice", "order-words", "fill-blank", "matching", "dictation", "translate-to-es", "build-sentence", "similar-characters", "speaking", "writing", "classifier"];

export const SKILL_TYPES: Record<string, ExerciseType[]> = {
  listening: ["listen-choose", "dictation", "tone-choice", "tone-pair"],
  reading: ["choose-meaning", "translate-to-es", "fill-blank", "similar-characters", "reading-tf"],
  writing: ["writing", "dictation", "build-character", "choose-character"],
  speaking: ["speaking"],
  tones: ["tone-choice", "tone-pair", "pinyin-input"],
  characters: ["similar-characters", "component", "build-character", "writing"],
  grammar: ["order-words", "fill-blank", "build-sentence", "classifier"],
  vocabulary: ["choose-meaning", "choose-character", "matching", "pinyin-input"],
};

export function genContext(): GenContext {
  const lex = getLexicon();
  const allRadicals = RADICALS.slice(0, 80).map((r) => r.radical);
  const comps = charInfoLoaded() ? (ch: string) => componentsOf(ch) : undefined;
  return {
    segmenter: lex ? (s) => segment(s, lex).map((t) => t.text) : undefined,
    radicalMeaning: (r) => radicalInfo(r)?.meaning,
    allRadicals,
    components: comps,
    allComponents: ["亻", "氵", "口", "女", "子", "日", "月", "木", "土", "心", "讠", "辶", "扌", "艹", "宀", "门", "马", "又", "力", "大", "小", "山", "火", "田", "目", "耳", "手", "车", "贝", "钅"],
    speechAvailable: speechRecognitionAvailable(),
  };
}

/** Enriquecer palabras del pool con clasificador y radical del diccionario. */
function enrich(words: PoolWord[]): PoolWord[] {
  return words.map((w) => {
    const e = lookupFirst(w.hanzi);
    return { ...w, cl: w.cl ?? e?.cl, radical: w.radical ?? lookupRadical(w.hanzi) };
  });
}
function lookupRadical(hanzi: string): string | undefined {
  const w = Array.from(hanzi)[0];
  const r = RADICALS.find((x) => x.radical === w || x.variants.includes(w));
  return r?.radical;
}

export function readingQuestionsToExercises(text: string, es: string, questions: Question[], itemId: string): Exercise[] {
  return questions.map((q, i) => ({
    id: `rq-${itemId}-${i}`,
    type: "comprehension" as const,
    skill: "reading" as const,
    itemId,
    itemKind: "sentence" as const,
    prompt: q.q,
    display: { dialogue: [{ zh: text, es }] },
    options: q.options.map((o) => ({ text: o })),
    answer: q.answer,
    explain: q.explain,
  }));
}

export function grammarExercises(g: GrammarPoint, allWords: PoolWord[], rng: () => number, n = 6): Exercise[] {
  const ctx = genContext();
  const out: Exercise[] = [];
  for (const f of g.practice.fill ?? []) {
    out.push({ id: `gf-${g.id}-${out.length}`, type: "fill-blank", skill: "grammar", itemId: g.id, itemKind: "grammar", prompt: "Elige la palabra que completa la frase", zh: f.zh, answer: f.answer, options: shuffle(f.options, rng), es: f.es, explain: g.summary });
  }
  const sentences: PoolSentence[] = [...(g.practice.order ?? []), ...g.examples.slice(0, 4)].map((s) => ({ zh: s.zh, py: s.py, es: s.es, grammarId: g.id }));
  const pool: Pool = { words: [], allWords, sentences };
  out.push(...generateSession(pool, Math.max(2, n - out.length), ["order-words", "build-sentence", "translate-to-es", "dictation"], rng, ctx));
  return shuffle(out, rng).slice(0, n);
}

/** Ejercicios de un paso "exercises" de una lección. */
export function lessonExercises(lesson: Lesson, count: number, types: ExerciseType[] | undefined, seed: number, deckWords: PoolWord[] = []): Exercise[] {
  const rng = seededRandom(seed);
  const ctx = genContext();
  const pool = lessonPool(lesson, deckWords);
  pool.words = enrich(pool.words);
  pool.allWords = enrich(pool.allWords ?? pool.words);
  const t = types?.length ? types : CORE_TYPES;
  const out: Exercise[] = [];
  // ejercicios de los puntos de gramática de la lección (fill/order con sus frases)
  for (const step of lesson.steps) {
    if (step.type === "grammar") {
      const g = grammarById(step.id);
      if (g) out.push(...grammarExercises(g, pool.allWords, rng, 2));
    }
  }
  const generated = generateSession(pool, Math.max(0, count - out.length), t, rng, ctx);
  return interleaveShuffle([...out, ...generated], rng).slice(0, count);
}

function interleaveShuffle(list: Exercise[], rng: () => number): Exercise[] {
  const s = shuffle(list, rng);
  // evita dos iguales seguidos
  for (let i = 1; i < s.length; i++) {
    if (s[i].type === s[i - 1].type) {
      const j = s.findIndex((e, k) => k > i && e.type !== s[i - 1].type);
      if (j > 0) [s[i], s[j]] = [s[j], s[i]];
    }
  }
  return s;
}

/** Checkpoint de unidad: mezcla de todo el vocabulario y frases de la unidad. */
export function checkpointExercises(unit: Unit, count: number, seed: number): Exercise[] {
  const rng = seededRandom(seed);
  const ctx = genContext();
  const words: PoolWord[] = enrich(unit.lessons.flatMap((l) => l.vocab.map((v) => ({ id: `course-${v.hanzi}`, hanzi: v.hanzi, pinyin: v.pinyin, meaning: v.es }))));
  const last = unit.lessons[unit.lessons.length - 1];
  const allWords = enrich(Array.from(vocabUpTo(last.id).values()));
  const sentences = unit.lessons.flatMap(sentencesOf);
  const pool: Pool = { words, allWords, sentences };
  const out = generateSession(pool, count, CORE_TYPES, rng, ctx);
  for (const l of unit.lessons) for (const st of l.steps) if (st.type === "reading") out.push(...readingQuestionsToExercises(st.text, st.es, st.questions, l.id).slice(0, 1));
  return shuffle(out, rng).slice(0, count);
}

export interface PracticeOptions {
  mode: "topic" | "grammar" | "mistakes" | "random" | "skill" | "words";
  category?: string;
  grammarId?: string;
  skill?: string;
  count: number;
  wordIds?: string[];
  types?: ExerciseType[];
}

/** Práctica libre a partir del mazo del usuario + frases del curso. */
export async function practiceExercises(opts: PracticeOptions, seed = Date.now()): Promise<Exercise[]> {
  const rng = seededRandom(seed % 2147483647);
  const ctx = genContext();
  const words = await db.words.toArray();
  const toPool = (w: Word): PoolWord => ({ id: w.id, hanzi: w.hanzi, pinyin: w.pinyin, meaning: w.meaning, category: w.category, example: w.example, examplePinyin: w.examplePinyin, exampleTranslation: w.exampleTranslation, radical: w.radical });
  const allWords = enrich(words.map(toPool));
  const courseSentences: PoolSentence[] = UNITS.flatMap((u) => u.lessons.flatMap(sentencesOf));
  const exampleSentences: PoolSentence[] = words.filter((w) => w.example && w.exampleTranslation).map((w) => ({ zh: w.example!, py: w.examplePinyin, es: w.exampleTranslation! }));
  let target = allWords;
  let sentences = [...courseSentences, ...exampleSentences];
  let types = opts.types ?? CORE_TYPES;

  if (opts.mode === "topic" && opts.category) {
    target = allWords.filter((w) => w.category === opts.category);
    const hz = new Set(target.map((w) => w.hanzi));
    sentences = sentences.filter((s) => Array.from(hz).some((h) => s.zh.includes(h)));
  } else if (opts.mode === "grammar" && opts.grammarId) {
    const g = grammarById(opts.grammarId);
    if (!g) return [];
    return grammarExercises(g, allWords, rng, opts.count);
  } else if (opts.mode === "mistakes") {
    const attempts = await db.exerciseAttempts.orderBy("at").reverse().filter((a) => !a.correct).limit(300).toArray();
    const failedIds = new Set(attempts.map((a) => a.itemId));
    target = allWords.filter((w) => failedIds.has(w.id) || failedIds.has(w.hanzi));
    const failedSentences = sentences.filter((s) => failedIds.has(s.zh) || (s.grammarId && failedIds.has(s.grammarId)));
    sentences = failedSentences.length ? failedSentences : sentences;
    if (!target.length && !failedSentences.length) return [];
  } else if (opts.mode === "skill" && opts.skill) {
    types = SKILL_TYPES[opts.skill] ?? CORE_TYPES;
  } else if (opts.mode === "words" && opts.wordIds?.length) {
    const ids = new Set(opts.wordIds);
    target = allWords.filter((w) => ids.has(w.id));
  }
  // prioriza palabras en estudio (no nuevas) para la práctica aleatoria
  if (opts.mode === "random") {
    const cards = await db.cards.toArray();
    const studied = new Set(cards.filter((c) => c.reps > 0 || c.ankiState === "review" || c.ankiState === "learning").map((c) => c.wordId));
    const learning = allWords.filter((w) => studied.has(w.id));
    target = learning.length >= 8 ? learning : allWords;
  }
  const pool: Pool = { words: pick(target, 60, rng), allWords, sentences: pick(sentences, 80, rng) };
  // filtra tipos que no tienen material
  const usable = types.filter((t) => !(["order-words", "build-sentence", "fill-blank", "translate-to-es"].includes(t) && !pool.sentences.length));
  const out = generateSession(pool, opts.count, usable, rng, ctx);
  if (opts.mode === "random" && out.length < opts.count) {
    const g = pick(GRAMMAR, 2, rng);
    for (const gp of g) out.push(...grammarExercises(gp, allWords, rng, 2));
  }
  return shuffle(out, rng).slice(0, opts.count);
}
