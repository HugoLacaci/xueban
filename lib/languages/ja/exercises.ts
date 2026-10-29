/** Adaptadores de ejercicios del japonés. */
import type { ExerciseAdapters, RNG } from "@/lib/languages/types";
import type { Exercise, ExerciseType, MultipleChoiceExercise, Pool, PoolSentence, PoolWord } from "@/lib/exercises/types";
import { uid, withAnswer } from "@/lib/exercises/generators";
import { pick, shuffle } from "@/lib/utils";
import * as wanakana from "wanakana";
import { isKanji, isKana, moras, SIMILAR_SETS, toHiragana } from "./kana";
import { lookupFirstJa } from "./dictionary";
import { PATTERN_INFO, PITCH_PAIRS, patternOf, pitchLevels } from "./pitch";
import { alternatives, conjugate, FORMS, guessClass, type WordClass } from "./conjugation";
import { jaCharacters, jaCounters, JA_COUNTERS, counterReading, kanjiInfo } from "./characters";
import { segmentJa } from "./analyzer";

export const JA_TYPES: ExerciseType[] = ["choose-meaning", "choose-character", "similar-characters", "pinyin-input", "tone-choice", "tone-pair", "order-words", "fill-blank", "build-sentence", "translate-to-es", "comprehension", "dictation", "listen-choose", "reading-tf", "matching", "writing", "speaking", "component", "build-character", "classifier", "conjugation", "particle"];

const normJa = (s: string) => toHiragana(s.normalize("NFKC")).replace(/[\s、。！？・「」『』（）,.!?~〜ー]/g, (c) => (c === "ー" ? "ー" : ""));

/** Lectura correcta (comparación en hiragana, tolera katakana/rōmaji). */
function readingEquals(user: string, expected: string, opts?: { lenient?: boolean }): boolean {
  const u = normJa(wanakana.toKana(user.trim()));
  const e = normJa(expected);
  if (u === e) return true;
  if (opts?.lenient) return u.replace(/[っー]/g, "").replace(/(.)\1/g, "$1") === e.replace(/[っー]/g, "").replace(/(.)\1/g, "$1");
  return false;
}

function readingDiff(user: string, expected: string) {
  const u = moras(normJa(wanakana.toKana(user.trim())));
  const e = moras(normJa(expected));
  return e.map((m, i) => {
    const got = u[i] ?? "";
    const ok = got === m;
    const partial = !ok && ((m === "っ" || m === "ー" || /^[あいうえおう]$/.test(m)) || (got === "っ" || /^[あいうえお]$/.test(got)));
    return { unit: m, got, ok, partial };
  });
}

export function genReadingInput(w: PoolWord): Exercise | null {
  if (!Array.from(w.hanzi).some(isKanji) && !/[ァ-ヶ]/.test(w.hanzi)) {
    // palabra en hiragana: pedir rōmaji no tiene sentido; se practica escribirla a partir del audio
    return { id: uid("rd"), type: "pinyin-input", skill: "reading", itemId: w.id, itemKind: "word", prompt: "Escucha y escribe la palabra en hiragana (puedes teclear en rōmaji)", zh: w.hanzi, answer: w.pinyin, meaning: w.meaning };
  }
  return { id: uid("rd"), type: "pinyin-input", skill: "reading", itemId: w.id, itemKind: "word", prompt: "Escribe la lectura en hiragana (puedes teclear en rōmaji: taberu → たべる)", zh: w.hanzi, answer: toHiragana(w.pinyin), meaning: w.meaning };
}

const PITCH_CHOICES = [
  { value: 1 as const, label: "bajo", short: "L" },
  { value: 2 as const, label: "alto", short: "H" },
];

export function genPitchChoice(w: PoolWord): Exercise | null {
  const e = lookupFirstJa(w.hanzi);
  const acc = (e?.extra?.pitch as number[] | undefined)?.[0];
  const kana = toHiragana(w.pinyin);
  const m = moras(kana);
  if (acc === undefined || m.length < 2 || m.length > 5) return null;
  const { levels } = pitchLevels(kana, acc);
  const p = patternOf(acc, m.length);
  return {
    id: uid("pt"),
    type: "tone-choice",
    skill: "tones",
    itemId: w.id,
    itemKind: "tone",
    prompt: "Escucha: ¿cada mora es alta o baja?",
    zh: w.hanzi,
    syllables: m,
    answer: levels.map((l) => (l === "H" ? 2 : 1)),
    audio: w.hanzi,
    choices: PITCH_CHOICES,
    unitName: "mora",
    explain: `${w.hanzi} (${kana}) es ${PATTERN_INFO[p].native} ${PATTERN_INFO[p].name}: ${levels.join("")}. ${PATTERN_INFO[p].description}`,
  };
}

export function genPitchPair(rng: RNG): MultipleChoiceExercise | null {
  // pares mínimos: acento tonal (はし 箸/橋) o vocal larga / っ
  const LONG: { a: [string, string, string]; b: [string, string, string] }[] = [
    { a: ["おばさん", "おばさん", "tía; señora"], b: ["おばあさん", "おばあさん", "abuela; anciana"] },
    { a: ["おじさん", "おじさん", "tío; señor"], b: ["おじいさん", "おじいさん", "abuelo; anciano"] },
    { a: ["来て", "きて", "ven"], b: ["切って", "きって", "corta"] },
    { a: ["いた", "いた", "estaba"], b: ["いった", "いった", "fue"] },
    { a: ["ビル", "びる", "edificio"], b: ["ビール", "びーる", "cerveza"] },
    { a: ["雪", "ゆき", "nieve"], b: ["勇気", "ゆうき", "valor"] },
    { a: ["ここ", "ここ", "aquí"], b: ["高校", "こうこう", "instituto"] },
  ];
  if (rng() < 0.5) {
    const pair = PITCH_PAIRS[Math.floor(rng() * PITCH_PAIRS.length)];
    const target = rng() < 0.5 ? pair.a : pair.b;
    const other = target === pair.a ? pair.b : pair.a;
    const { options, answer } = withAnswer(target, [other], rng);
    return { id: uid("pp"), type: "tone-pair", skill: "tones", itemId: `pitch-${target.text}`, itemKind: "tone", prompt: `Escucha «${target.reading}»: ¿qué palabra es?`, display: { audio: target.text }, options: options.map((o) => ({ text: o.text, zh: true, sub: `${o.es} · ${pitchLevels(o.reading, o.accent).levels.join("")}` })), answer, explain: `${pair.a.text} (${pitchLevels(pair.a.reading, pair.a.accent).levels.join("")}) y ${pair.b.text} (${pitchLevels(pair.b.reading, pair.b.accent).levels.join("")}) se distinguen solo por el acento tonal.` };
  }
  const pair = LONG[Math.floor(rng() * LONG.length)];
  const target = rng() < 0.5 ? pair.a : pair.b;
  const other = target === pair.a ? pair.b : pair.a;
  const { options, answer } = withAnswer(target, [other], rng);
  return { id: uid("lv"), type: "tone-pair", skill: "listening", itemId: `long-${target[0]}`, itemKind: "tone", prompt: "Escucha: ¿qué palabra oyes?", display: { audio: target[0] }, options: options.map((o) => ({ text: o[0], zh: true, sub: `${o[1]} · ${o[2]}` })), answer, explain: `${pair.a[0]} (${pair.a[1]}) frente a ${pair.b[0]} (${pair.b[1]}): en japonés la duración de la vocal y la pausa de っ cambian el significado.` };
}

export function genSimilar(pool: Pool, w: PoolWord, rng: RNG): MultipleChoiceExercise | null {
  const ch = Array.from(w.hanzi).find((c) => SIMILAR_SETS.some((s) => s.includes(c)));
  if (!ch) return null;
  const set = SIMILAR_SETS.find((s) => s.includes(ch))!;
  const { options, answer } = withAnswer(ch, pick(set.filter((c) => c !== ch), 3, rng), rng);
  return { id: uid("sc"), type: "similar-characters", skill: "characters", itemId: ch, itemKind: "character", prompt: Array.from(w.hanzi).length > 1 ? `¿Qué carácter aparece en «${w.meaning}» (${w.pinyin})?` : `¿Cuál es «${w.meaning}» (${w.pinyin})?`, display: { es: w.meaning, pinyin: w.pinyin }, options: options.map((c) => ({ text: c, zh: true, sub: isKana(c) ? wanakana.toRomaji(c) : kanjiInfo(c)?.es[0] })), answer, explain: `Se confunden: ${set.join(" · ")}. Fíjate en la dirección y el número de los trazos.` };
}

export function genComponent(pool: Pool, w: PoolWord, rng: RNG): MultipleChoiceExercise | null {
  const ch = Array.from(w.hanzi).find(isKanji);
  if (!ch) return null;
  const comps = jaCharacters.components(ch);
  if (!comps.length) return null;
  const correct = comps[0];
  const wrong = pick(jaCharacters.allComponents.filter((c) => !comps.includes(c) && c !== ch), 3, rng);
  const { options, answer } = withAnswer(correct, wrong, rng);
  return { id: uid("co"), type: "component", skill: "characters", itemId: ch, itemKind: "radical", prompt: `¿Qué componente forma parte de ${ch}?`, display: { zh: ch, pinyin: w.pinyin }, options: options.map((c) => ({ text: c, zh: true, sub: kanjiInfo(c)?.es[0] ?? kanjiInfo(c)?.en[0] })), answer, explain: `${ch} = ${comps.join(" + ")} (KRADFILE). Los componentes ayudan a buscarlo y a recordarlo.` };
}

export function genBuildKanji(pool: Pool, w: PoolWord, rng: RNG): Exercise | null {
  const ch = Array.from(w.hanzi).find(isKanji);
  if (!ch) return null;
  const comps = jaCharacters.components(ch);
  if (comps.length < 2 || comps.length > 4) return null;
  return { id: uid("bc"), type: "build-character", skill: "characters", itemId: ch, itemKind: "character", prompt: `Selecciona los componentes que forman ${ch} («${kanjiInfo(ch)?.es[0] ?? w.meaning}»)`, hanzi: ch, pinyin: w.pinyin, meaning: w.meaning, components: comps, distractors: pick(jaCharacters.allComponents.filter((c) => !comps.includes(c)), 3, rng) };
}

export function genCounter(pool: Pool, w: PoolWord, rng: RNG): MultipleChoiceExercise | null {
  const c = jaCounters.of(w.hanzi)?.[0];
  if (!c) return null;
  const n = 1 + Math.floor(rng() * 8);
  const reading = counterReading(c, n);
  const wrong = pick(JA_COUNTERS.map((x) => x.counter).filter((x) => x !== c), 3, rng);
  const { options, answer } = withAnswer(c, wrong, rng);
  return { id: uid("cl"), type: "classifier", skill: "grammar", itemId: w.id, itemKind: "word", prompt: `¿Qué contador va con «${w.hanzi}» (${w.meaning})?`, display: { zh: `${w.hanzi}を${n}＿` }, options: options.map((o) => ({ text: o, zh: true, sub: jaCounters.hint(o) })), answer, explain: `${w.hanzi}を${n}${c}${reading ? ` (${reading})` : ""}: ${c} se usa con ${jaCounters.hint(c)}.` };
}

export function genWriting(w: PoolWord): Exercise | null {
  const chars = Array.from(w.hanzi);
  const kanji = chars.filter(isKanji);
  const target = kanji.length ? kanji.slice(0, 2).join("") : chars.length <= 3 && chars.every(isKana) ? w.hanzi : "";
  if (!target) return null;
  return { id: uid("wr"), type: "writing", skill: "writing", itemId: w.id, itemKind: "word", prompt: kanji.length ? "Escribe el kanji trazo a trazo" : "Escribe los kana trazo a trazo", hanzi: target, pinyin: w.pinyin, meaning: w.meaning };
}

const VERB_FORMS = FORMS.filter((f) => f.appliesTo.includes("verb") && f.level === "N5").map((f) => f.id);
const ADJ_FORMS = ["nai", "ta", "nakatta", "te", "adj-neg-polite", "adj-past-polite"];

export function genConjugation(pool: Pool, rng: RNG): Exercise | null {
  const words = shuffle(pool.allWords ?? pool.words, rng);
  for (const w of words) {
    const cls = guessClass(w.hanzi, (w as PoolWord & { wordType?: string }).wordType ?? (lookupFirstJa(w.hanzi)?.pos?.some((p) => /^v5/.test(p)) ? "godan" : lookupFirstJa(w.hanzi)?.pos?.includes("v1") ? "ichidan" : lookupFirstJa(w.hanzi)?.pos?.includes("adj-i") ? "i-adj" : lookupFirstJa(w.hanzi)?.pos?.includes("adj-na") ? "na-adj" : undefined));
    if (!cls) continue;
    const isAdj = cls === "i-adj" || cls === "na-adj";
    const formId = isAdj ? ADJ_FORMS[Math.floor(rng() * ADJ_FORMS.length)] : VERB_FORMS[Math.floor(rng() * VERB_FORMS.length)];
    const ans = conjugate(w.hanzi, formId, cls as WordClass);
    const ansKana = conjugate(toHiragana(w.pinyin), formId, cls as WordClass);
    if (!ans) continue;
    const f = FORMS.find((x) => x.id === formId)!;
    return { id: uid("cj"), type: "conjugation", skill: "grammar", itemId: w.id, itemKind: "word", prompt: `Conjuga en ${f.name.toLowerCase()} (${f.native})`, zh: w.hanzi, pinyin: w.pinyin, meaning: w.meaning, form: f.name, formNative: f.native, answer: ans, alternatives: [...alternatives(ans), ...(ansKana ? [ansKana, ...alternatives(ansKana)] : [])], cls, explain: `${w.hanzi} es ${cls === "godan" ? "un verbo godan" : cls === "ichidan" ? "un verbo ichidan" : cls === "suru" ? "un verbo con する" : cls === "kuru" ? "来る (irregular)" : cls === "i-adj" ? "un adjetivo い" : "un adjetivo な"}: ${f.description}` };
  }
  return null;
}

const PARTICLES = ["は", "が", "を", "に", "で", "へ", "と", "も", "の", "か", "から", "まで"];

export function genParticle(pool: Pool, s: PoolSentence, rng: RNG): Exercise | null {
  const toks = segmentJa(s.zh);
  const idxs = toks.map((t, i) => (PARTICLES.includes(t) ? i : -1)).filter((i) => i >= 0);
  if (!idxs.length) return null;
  const i = idxs[Math.floor(rng() * idxs.length)];
  const answer = toks[i];
  const opts = shuffle([answer, ...pick(PARTICLES.filter((p) => p !== answer), 3, rng)], rng);
  const zh = toks.map((t, k) => (k === i ? "＿" : t)).join("");
  return { id: uid("pa"), type: "particle", skill: "grammar", itemId: s.grammarId ?? s.zh, itemKind: s.grammarId ? "grammar" : "sentence", prompt: "Elige la partícula correcta", zh, answer, options: opts, es: s.es, pinyin: s.py, explain: `«${s.zh}»: aquí va ${answer}.` };
}

export const jaAdapters: ExerciseAdapters = {
  types: JA_TYPES,
  labels: { "pinyin-input": "Escribir la lectura", "tone-choice": "Acento tonal", "tone-pair": "Pares mínimos", "similar-characters": "Kana y kanji parecidos", classifier: "Contadores", component: "Componentes del kanji", "build-character": "Construir el kanji", writing: "Escritura (trazos)" },
  readingInput: genReadingInput,
  prosodyChoice: (_p, w) => genPitchChoice(w),
  prosodyPair: (_p, rng) => genPitchPair(rng),
  similar: genSimilar,
  component: genComponent,
  buildCharacter: genBuildKanji,
  classifier: genCounter,
  writing: genWriting,
  conjugation: genConjugation,
  particle: genParticle,
  tiles: (t) => segmentJa(t.replace(/[、。！？「」]/g, "")),
  readingEquals,
  readingDiff,
  explainPartial: (wrong) => `Casi: revisa ${wrong.map((d) => `«${d.got || "—"}» → «${d.unit}»`).join(", ")} (vocales largas, っ y ん cambian el significado).`,
  normalizeText: normJa,
  normalizeInput: (s) => (/[a-zA-Z]/.test(s) ? wanakana.toKana(s, { IMEMode: true }) : s),
};
