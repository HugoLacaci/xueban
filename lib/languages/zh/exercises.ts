/** Adaptadores de ejercicios del chino: pinyin, tonos, caracteres parecidos, radicales, componentes, clasificadores, escritura. */
import type { ExerciseAdapters } from "@/lib/languages/types";
import type { Exercise, ExerciseType, MultipleChoiceExercise, Pool, PoolWord } from "@/lib/exercises/types";
import { uid, withAnswer } from "@/lib/exercises/generators";
import { pick } from "@/lib/utils";
import { normalizeZh } from "@/lib/utils";
import { numberedToMarked, pinyinDiff, pinyinEquals, stripTones, syllablesOf, tonesOf } from "./pinyin/tones";
import { hanziOnly, isHanzi } from "./pinyin/convert";
import { SIMILAR_CHARS, TONE_PAIRS } from "./data/pronunciation";
import { componentsOf, charInfoLoaded, getLexicon, lookupFirst, RADICALS, radicalInfo } from "./dictionary";
import { segment } from "@/lib/segment";

type RNG = () => number;

const TONE_NAMES = ["", "1.º (alto)", "2.º (ascendente)", "3.º (bajo)", "4.º (descendente)", "neutro"];

export const ZH_TYPES: ExerciseType[] = ["choose-meaning", "choose-character", "similar-characters", "pinyin-input", "tone-choice", "tone-pair", "order-words", "fill-blank", "build-sentence", "translate-to-es", "comprehension", "dictation", "listen-choose", "reading-tf", "matching", "writing", "speaking", "component", "build-character", "classifier"];

export const ALL_COMPONENTS = ["亻", "氵", "口", "女", "子", "日", "月", "木", "土", "心", "讠", "辶", "扌", "艹", "宀", "门", "马", "又", "力", "大", "小", "山", "火", "田", "目", "耳", "手", "车", "贝", "钅"];

export function genPinyinInput(w: PoolWord): Exercise {
  return { id: uid("py"), type: "pinyin-input", skill: "tones", itemId: w.id, itemKind: "word", prompt: "Escribe el pinyin con tonos (puedes usar números: ni3 hao3)", zh: w.hanzi, answer: w.pinyin, meaning: w.meaning };
}

export function genToneChoice(w: PoolWord): Exercise | null {
  const syl = syllablesOf(w.pinyin);
  if (!syl.length || syl.length > 3) return null;
  return {
    id: uid("tc"),
    type: "tone-choice",
    skill: "tones",
    itemId: w.id,
    itemKind: "tone",
    prompt: "Escucha y elige el tono de cada sílaba",
    zh: w.hanzi,
    syllables: syl.map((s) => stripTones(s)),
    answer: tonesOf(w.pinyin),
    audio: w.hanzi,
    explain: `${w.hanzi} se pronuncia ${w.pinyin} (${w.meaning}).`,
  };
}

export function genTonePair(rng: RNG): MultipleChoiceExercise {
  const target = TONE_PAIRS[Math.floor(rng() * TONE_PAIRS.length)];
  const wrong = pick(
    TONE_PAIRS.filter((p) => p.pattern !== target.pattern),
    3,
    rng,
  );
  const { options, answer } = withAnswer(target, wrong, rng);
  const fmt = (p: string) => p.split("").map((t) => (t === "0" ? "neutro" : `${t}.º`)).join(" + ");
  return {
    id: uid("tp"),
    type: "tone-pair",
    skill: "tones",
    itemId: `pair-${target.pattern}`,
    itemKind: "tone",
    prompt: "Escucha la palabra: ¿qué combinación de tonos oyes?",
    display: { audio: target.word },
    options: options.map((o) => ({ text: fmt(o.pattern), sub: o.label })),
    answer,
    explain: `${target.word} ${target.pinyin} = ${fmt(target.pattern)}.`,
  };
}

export function genSimilarCharacters(pool: Pool, w: PoolWord, rng: RNG): MultipleChoiceExercise | null {
  const ch = Array.from(w.hanzi).find((c) => SIMILAR_CHARS.some((set) => set.includes(c)));
  if (!ch) return null;
  const set = SIMILAR_CHARS.find((s) => s.includes(ch))!;
  const wrong = set.filter((c) => c !== ch);
  const all = pool.allWords ?? pool.words;
  const meaningOf = (c: string) => all.find((x) => x.hanzi === c)?.meaning;
  const { options, answer } = withAnswer(ch, pick(wrong, 3, rng), rng);
  return {
    id: uid("sc"),
    type: "similar-characters",
    skill: "characters",
    itemId: ch,
    itemKind: "character",
    prompt: w.hanzi.length > 1 ? `¿Qué carácter aparece en «${w.meaning}» (${w.pinyin})?` : `¿Cuál es «${w.meaning}» (${w.pinyin})?`,
    display: { es: w.meaning, pinyin: w.pinyin },
    options: options.map((c) => ({ text: c, zh: true, sub: meaningOf(c) })),
    answer,
    explain: `Caracteres parecidos: ${set.join(" · ")}. Fíjate en los trazos que los distinguen.`,
  };
}

export function genWriting(w: PoolWord): Exercise | null {
  const h = hanziOnly(w.hanzi);
  if (!h || h.length > 2) return null;
  return { id: uid("wr"), type: "writing", skill: "writing", itemId: w.id, itemKind: "word", prompt: "Escribe el carácter trazo a trazo", hanzi: h, pinyin: w.pinyin, meaning: w.meaning };
}

function lookupRadical(hanzi: string): string | undefined {
  const w = Array.from(hanzi)[0];
  const r = RADICALS.find((x) => x.radical === w || x.variants.includes(w));
  return r?.radical;
}

export function genComponent(w: PoolWord, rng: RNG): MultipleChoiceExercise | null {
  const radical = w.radical ?? lookupRadical(w.hanzi);
  if (!radical) return null;
  const allRadicals = RADICALS.slice(0, 80).map((r) => r.radical);
  const radicalMeaning = (r: string) => radicalInfo(r)?.meaning;
  const wrong = pick(
    allRadicals.filter((r) => r !== radical),
    3,
    rng,
  );
  if (wrong.length < 3) return null;
  const { options, answer } = withAnswer(radical, wrong, rng);
  const ch = Array.from(w.hanzi)[0];
  return {
    id: uid("co"),
    type: "component",
    skill: "characters",
    itemId: ch,
    itemKind: "radical",
    prompt: `¿Cuál es el radical de ${w.hanzi.length > 1 ? `«${w.hanzi}» (primer carácter)` : w.hanzi}?`,
    display: { zh: w.hanzi, pinyin: w.pinyin },
    options: options.map((r) => ({ text: r, zh: true, sub: radicalMeaning(r) })),
    answer,
    explain: `El radical de ${ch} es ${radical}${radicalMeaning(radical) ? ` («${radicalMeaning(radical)}»)` : ""}: suele indicar el campo de significado.`,
  };
}

export function genBuildCharacter(w: PoolWord, rng: RNG): Exercise | null {
  if (!charInfoLoaded()) return null;
  const ch = Array.from(w.hanzi)[0];
  const comps = componentsOf(ch).filter((c) => c !== ch);
  if (comps.length < 2 || comps.length > 4) return null;
  const distractorsList = pick(
    ALL_COMPONENTS.filter((c) => !comps.includes(c) && c !== ch),
    3,
    rng,
  );
  return { id: uid("bc"), type: "build-character", skill: "characters", itemId: ch, itemKind: "character", prompt: `Selecciona los componentes que forman ${ch} (${w.pinyin}, «${w.meaning}»)`, hanzi: ch, pinyin: w.pinyin, meaning: w.meaning, components: comps, distractors: distractorsList };
}

export const CLASSIFIER_HINTS: Record<string, string> = {
  个: "genérico (personas y cosas)",
  本: "libros, cuadernos",
  块: "trozos, dinero (yuanes)",
  件: "ropa (de arriba), asuntos",
  口: "miembros de la familia",
  杯: "vasos, tazas",
  瓶: "botellas",
  只: "animales pequeños, uno de un par",
  岁: "años de edad",
  张: "cosas planas (mesas, papel, fotos)",
  条: "cosas alargadas (pantalones, peces, calles)",
  位: "personas (respetuoso)",
  辆: "vehículos",
  家: "tiendas, empresas",
  次: "veces",
  些: "algunos",
  元: "yuanes",
  点: "horas",
  把: "cosas con mango",
  双: "pares",
  碗: "cuencos",
};

export function genClassifier(w: PoolWord, rng: RNG): MultipleChoiceExercise | null {
  const cl = w.cl ?? lookupFirst(w.hanzi)?.cl;
  const correct = cl?.[0];
  if (!correct) return null;
  const wrong = pick(
    Object.keys(CLASSIFIER_HINTS).filter((c) => !cl?.includes(c)),
    3,
    rng,
  );
  const { options, answer } = withAnswer(correct, wrong, rng);
  return {
    id: uid("cl"),
    type: "classifier",
    skill: "grammar",
    itemId: w.id,
    itemKind: "word",
    prompt: `¿Qué clasificador va con «${w.hanzi}» (${w.meaning})?`,
    display: { zh: `一＿${w.hanzi}` },
    options: options.map((c) => ({ text: c, zh: true, sub: CLASSIFIER_HINTS[c] })),
    answer,
    explain: `一${correct}${w.hanzi}: ${correct} se usa con ${CLASSIFIER_HINTS[correct] ?? "esta clase de nombres"}.${(cl?.length ?? 0) > 1 ? ` También valen: ${cl!.slice(1).join(", ")}.` : ""}`,
  };
}

export const zhAdapters: ExerciseAdapters = {
  types: ZH_TYPES,
  labels: {},
  readingInput: genPinyinInput,
  prosodyChoice: (_pool, w) => genToneChoice(w),
  prosodyPair: (_pool, rng) => genTonePair(rng),
  similar: genSimilarCharacters,
  component: (_pool, w, rng) => genComponent(w, rng),
  buildCharacter: (_pool, w, rng) => genBuildCharacter(w, rng),
  classifier: (_pool, w, rng) => genClassifier(w, rng),
  writing: genWriting,
  tiles(text) {
    const lex = getLexicon();
    return lex ? segment(text, lex).map((t) => t.text) : Array.from(text).filter((c) => isHanzi(c) || /\w/.test(c));
  },
  readingEquals: (user, expected, opts) => pinyinEquals(numberedToMarked(user.trim()), expected, { requireTones: !opts?.lenient }),
  readingDiff: (user, expected) => pinyinDiff(numberedToMarked(user.trim()), expected).map((d) => ({ unit: d.syllable, got: d.got, ok: d.ok, partial: d.toneOnly })),
  explainPartial: (wrong) => `Sílabas correctas, pero falla el tono en: ${wrong.map((d) => `${d.got || "—"} → ${d.unit} (${TONE_NAMES[tonesOf(d.unit)[0]]})`).join(", ")}.`,
  normalizeText: normalizeZh,
  normalizeInput: (s) => numberedToMarked(s),
};
