/** Adaptadores de ejercicios del coreano. */
import type { ExerciseAdapters, RNG } from "@/lib/languages/types";
import type { Exercise, ExerciseType, MultipleChoiceExercise, Pool, PoolSentence, PoolWord } from "@/lib/exercises/types";
import { uid, withAnswer } from "@/lib/exercises/generators";
import { pick, shuffle } from "@/lib/utils";
import { decompose, pronounce, romanizeRR, RULE_INFO, isHangulSyllable } from "./phonology";
import { conjugateKo, guessIrregular, KO_FORMS } from "./conjugation";
import { koCounters, KO_COUNTERS, NATIVE_ATTR, SINO_NUMBERS, SIMILAR_KO, hanjaInfo } from "./characters";
import { lookupFirstKo } from "./dictionary";
import { PARTICLES } from "./analyzer";

export const KO_TYPES: ExerciseType[] = ["choose-meaning", "choose-character", "similar-characters", "pinyin-input", "tone-choice", "tone-pair", "order-words", "fill-blank", "build-sentence", "translate-to-es", "comprehension", "dictation", "listen-choose", "reading-tf", "matching", "writing", "speaking", "component", "build-character", "classifier", "conjugation", "particle"];

const normKo = (s: string) => s.normalize("NFC").replace(/[\s.,!?·~"'“”‘’()]/g, "");
const normRoman = (s: string) => s.toLowerCase().replace(/[\s'\-·.,!?]/g, "");

/** En coreano «escribir la lectura» = escribir en hangul lo que se oye/ve en romanización, o la romanización. */
export function genReadingInput(w: PoolWord): Exercise | null {
  if (!Array.from(w.hanzi).every(isHangulSyllable)) return null;
  return { id: uid("rd"), type: "pinyin-input", skill: "reading", itemId: w.id, itemKind: "word", prompt: "Escucha y escribe la palabra en hangul (teclado coreano o el de pantalla)", zh: w.hanzi, answer: w.hanzi, meaning: w.meaning };
}

function readingEquals(user: string, expected: string, opts?: { lenient?: boolean }): boolean {
  if (/[a-z]/i.test(user)) return normRoman(user) === normRoman(romanizeRR(expected)) || normRoman(user) === normRoman(expected);
  const u = normKo(user);
  const e = normKo(expected);
  if (u === e) return true;
  if (opts?.lenient) return pronounce(u).pron === pronounce(e).pron;
  return false;
}

function readingDiff(user: string, expected: string) {
  const u = Array.from(normKo(user));
  return Array.from(normKo(expected)).map((s, i) => {
    const got = u[i] ?? "";
    const ok = got === s;
    const a = decompose(s);
    const b = decompose(got);
    const partial = !ok && Boolean(a && b && a.cho === b.cho && a.jung === b.jung);
    return { unit: s, got, ok, partial };
  });
}

/** Discriminación de consonante inicial (lisa / aspirada / tensa) por sílaba. */
const TYPE_OF: Record<string, 1 | 2 | 3> = { ㄱ: 1, ㄷ: 1, ㅂ: 1, ㅈ: 1, ㅅ: 1, ㅋ: 2, ㅌ: 2, ㅍ: 2, ㅊ: 2, ㄲ: 3, ㄸ: 3, ㅃ: 3, ㅉ: 3, ㅆ: 3 };
const LAT_CHOICES = [
  { value: 1 as const, label: "lisa", short: "ㄱ" },
  { value: 2 as const, label: "aspirada", short: "ㅋ" },
  { value: 3 as const, label: "tensa", short: "ㄲ" },
];

export function genConsonantChoice(w: PoolWord): Exercise | null {
  const syl = Array.from(w.hanzi).filter(isHangulSyllable);
  const idx = syl.map((s, i) => ({ s, i, t: TYPE_OF[decompose(s)!.cho] })).filter((x) => x.t);
  if (!idx.length || syl.length > 4) return null;
  const units = idx.map((x) => x.s);
  return {
    id: uid("cs"),
    type: "tone-choice",
    skill: "tones",
    itemId: w.id,
    itemKind: "tone",
    prompt: "Escucha: ¿la consonante inicial de cada sílaba es lisa, aspirada o tensa?",
    zh: w.hanzi,
    syllables: units,
    answer: idx.map((x) => x.t as 1 | 2 | 3),
    audio: w.hanzi,
    choices: LAT_CHOICES,
    unitName: "sílaba",
    explain: `${w.hanzi} [${pronounce(w.hanzi).pron}]: lisa (ㄱㄷㅂㅈ) sin aire, aspirada (ㅋㅌㅍㅊ) con golpe de aire, tensa (ㄲㄸㅃㅉ) con la garganta apretada.`,
  };
}

const TRIPLETS: [string, string, string, string][] = [
  ["달", "탈", "딸", "luna / máscara / hija"],
  ["불", "풀", "뿔", "fuego / hierba / cuerno"],
  ["자다", "차다", "짜다", "dormir / patear / salado"],
  ["고", "코", "꼬", "y / nariz / enroscar"],
  ["방", "팡", "빵", "habitación / ¡pum! / pan"],
];
const VOWEL_PAIRS: [string, string, string][] = [
  ["거리", "고리", "calle / anillo"],
  ["서", "소", "de pie / vaca"],
  ["개", "게", "perro / cangrejo"],
  ["어머니", "오머니", "madre / (inexistente)"],
];

export function genTriplet(rng: RNG): MultipleChoiceExercise {
  if (rng() < 0.6) {
    const t = TRIPLETS[Math.floor(rng() * TRIPLETS.length)];
    const k = Math.floor(rng() * 3);
    const { options, answer } = withAnswer(t[k], t.filter((_, i) => i !== k && i < 3), rng);
    return { id: uid("tr"), type: "tone-pair", skill: "listening", itemId: `triplet-${t[0]}`, itemKind: "tone", prompt: "Escucha: ¿qué palabra oyes?", display: { audio: t[k] }, options: options.map((o) => ({ text: o, zh: true })), answer, explain: `${t[0]} · ${t[1]} · ${t[2]} (${t[3]}): consonante lisa, aspirada y tensa.` };
  }
  const v = VOWEL_PAIRS[Math.floor(rng() * VOWEL_PAIRS.length)];
  const k = rng() < 0.5 ? 0 : 1;
  const { options, answer } = withAnswer(v[k], [v[1 - k]], rng);
  return { id: uid("vp"), type: "tone-pair", skill: "listening", itemId: `vowel-${v[0]}`, itemKind: "tone", prompt: "Escucha: ¿qué palabra oyes?", display: { audio: v[k] }, options: options.map((o) => ({ text: o, zh: true })), answer, explain: `${v[0]} / ${v[1]} (${v[2]}): ㅓ es una «o» muy abierta; ㅗ, redonda y cerrada.` };
}

export function genSimilar(pool: Pool, w: PoolWord, rng: RNG): MultipleChoiceExercise | null {
  const sylls = Array.from(w.hanzi).filter(isHangulSyllable);
  if (!sylls.length) return null;
  const s = sylls[Math.floor(rng() * sylls.length)];
  const d = decompose(s)!;
  const set = SIMILAR_KO.find((g) => g.includes(d.cho) || g.includes(d.jung));
  if (!set) return null;
  const which = set.includes(d.cho) ? "cho" : "jung";
  const variants = set.filter((x) => x !== d[which]).map((x) => {
    const k = { ...d, [which]: x };
    const base = 0xac00;
    const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
    const JUNG = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";
    const JONG = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
    return String.fromCharCode(base + CHO.indexOf(k.cho) * 588 + JUNG.indexOf(k.jung) * 28 + JONG.indexOf(k.jong));
  });
  const { options, answer } = withAnswer(s, pick(variants, 3, rng), rng);
  return { id: uid("sm"), type: "similar-characters", skill: "characters", itemId: s, itemKind: "character", prompt: `¿Qué sílaba aparece en «${w.meaning}»?`, display: { es: w.meaning, audio: w.hanzi }, options: options.map((o) => ({ text: o, zh: true, sub: romanizeRR(o) })), answer, explain: `${w.hanzi}: ${s} = ${d.cho} + ${d.jung}${d.jong ? ` + ${d.jong}` : ""}. Se confunden ${set.join(" · ")}.` };
}

/** «Componentes»: ¿qué jamo forman la sílaba? (o el hanja de una palabra sino-coreana) */
export function genComponent(pool: Pool, w: PoolWord, rng: RNG): MultipleChoiceExercise | null {
  const hanja = (lookupFirstKo(w.hanzi)?.t ?? "").slice(0, Array.from(w.hanzi).length);
  if (hanja && Array.from(hanja).length === Array.from(w.hanzi).length && rng() < 0.5) {
    const i = Math.floor(rng() * Array.from(hanja).length);
    const hc = Array.from(hanja)[i];
    const syl = Array.from(w.hanzi)[i];
    const others = (pool.allWords ?? pool.words).flatMap((x) => Array.from(lookupFirstKo(x.hanzi)?.t ?? "")).filter((c) => c !== hc && /[一-鿿]/.test(c));
    const wrong = pick(Array.from(new Set(others)), 3, rng);
    if (wrong.length < 3) return null;
    const { options, answer } = withAnswer(hc, wrong, rng);
    return { id: uid("hj"), type: "component", skill: "characters", itemId: w.id, itemKind: "radical", prompt: `¿Qué hanja corresponde a «${syl}» en ${w.hanzi} (${w.meaning})?`, display: { zh: w.hanzi }, options: options.map((o) => ({ text: o, zh: true, sub: hanjaInfo(o) ? `${hanjaInfo(o)![0]} ${hanjaInfo(o)![1]}` : undefined })), answer, explain: `${w.hanzi} = ${hanja}: ${hc}${hanjaInfo(hc) ? ` (${hanjaInfo(hc)![0]} ${hanjaInfo(hc)![1]})` : ""}.` };
  }
  const s = Array.from(w.hanzi).find(isHangulSyllable);
  if (!s) return null;
  const d = decompose(s)!;
  const target = d.jong ? d.jong : d.jung;
  const pool2 = d.jong ? ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅎ", "ㅆ"] : ["ㅏ", "ㅓ", "ㅗ", "ㅜ", "ㅡ", "ㅣ", "ㅐ", "ㅔ", "ㅑ", "ㅕ"];
  const { options, answer } = withAnswer(target, pick(pool2.filter((x) => x !== target), 3, rng), rng);
  return { id: uid("jm"), type: "component", skill: "characters", itemId: s, itemKind: "character", prompt: d.jong ? `¿Cuál es la consonante final (받침) de «${s}»?` : `¿Qué vocal lleva «${s}»?`, display: { zh: s }, options: options.map((o) => ({ text: o, zh: true })), answer, explain: `${s} = ${d.cho} + ${d.jung}${d.jong ? ` + ${d.jong}` : ""}.` };
}

/** Construir la sílaba: elegir sus jamo (bloques de bojagi que encajan). */
export function genBuildSyllable(pool: Pool, w: PoolWord, rng: RNG): Exercise | null {
  const s = Array.from(w.hanzi).find(isHangulSyllable);
  if (!s) return null;
  const d = decompose(s)!;
  const comps = [d.cho, d.jung, ...(d.jong ? [d.jong] : [])];
  const all = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅎ", "ㅏ", "ㅓ", "ㅗ", "ㅜ", "ㅡ", "ㅣ"];
  return { id: uid("bs"), type: "build-character", skill: "characters", itemId: s, itemKind: "character", prompt: `Elige los jamo que forman «${s}» (${romanizeRR(s)})`, hanzi: s, pinyin: romanizeRR(s), meaning: w.meaning, components: comps, distractors: pick(all.filter((x) => !comps.includes(x)), 3, rng) };
}

export function genCounter(pool: Pool, w: PoolWord, rng: RNG): MultipleChoiceExercise | null {
  const c = koCounters.of(w.hanzi)?.[0];
  if (!c) return null;
  const info = KO_COUNTERS.find((x) => x.counter === c)!;
  const n = 1 + Math.floor(rng() * 5);
  const num = info.system === "nativo" ? NATIVE_ATTR[n - 1] : SINO_NUMBERS[n - 1];
  const wrong = pick(KO_COUNTERS.map((x) => x.counter).filter((x) => x !== c), 3, rng);
  const { options, answer } = withAnswer(c, Array.from(new Set(wrong)), rng);
  return { id: uid("cl"), type: "classifier", skill: "grammar", itemId: w.id, itemKind: "word", prompt: `¿Qué clasificador va con «${w.hanzi}» (${w.meaning})?`, display: { zh: `${w.hanzi} ${num} ＿` }, options: options.map((o) => ({ text: o, zh: true, sub: koCounters.hint(o) })), answer, explain: `${w.hanzi} ${num} ${c}: ${info.es}; usa números ${info.system === "nativo" ? "nativos (한, 두, 세…)" : "sino-coreanos (일, 이, 삼…)"}.` };
}

export function genWriting(w: PoolWord): Exercise | null {
  const s = Array.from(w.hanzi).filter(isHangulSyllable);
  if (!s.length || s.length > 3) return null;
  return { id: uid("wr"), type: "writing", skill: "writing", itemId: w.id, itemKind: "word", prompt: "Escribe la palabra jamo a jamo (orden de trazos)", hanzi: s.join(""), pinyin: romanizeRR(w.hanzi), meaning: w.meaning };
}

const FORMS_T1 = ["ayo", "past", "seumnida", "future", "want", "please", "neg"];

export function genConjugation(pool: Pool, rng: RNG): Exercise | null {
  const words = shuffle(pool.allWords ?? pool.words, rng).filter((w) => /다$/.test(w.hanzi) && Array.from(w.hanzi).length >= 2);
  for (const w of words) {
    const form = FORMS_T1[Math.floor(rng() * FORMS_T1.length)];
    const irr = guessIrregular(w.hanzi);
    const ans = conjugateKo(w.hanzi, form, irr);
    if (!ans) continue;
    const f = KO_FORMS.find((x) => x.id === form)!;
    return { id: uid("cj"), type: "conjugation", skill: "grammar", itemId: w.id, itemKind: "word", prompt: `Conjuga en ${f.name.toLowerCase()} (${f.native})`, zh: w.hanzi, pinyin: romanizeRR(w.hanzi), meaning: w.meaning, form: f.name, formNative: f.native, answer: ans, alternatives: [ans.replace(/\?$/, "")], cls: irr ?? "regular", explain: `${w.hanzi}${irr ? ` (irregular ${irr})` : ""}: ${f.description}` };
  }
  return null;
}

const PARTICLE_OPTIONS = ["은", "는", "이", "가", "을", "를", "에", "에서", "의", "도", "와", "과", "하고", "으로", "로", "부터", "까지"];

export function genParticle(pool: Pool, s: PoolSentence, rng: RNG): Exercise | null {
  const words = s.zh.split(/\s+/);
  const cands: { i: number; p: string }[] = [];
  words.forEach((w, i) => {
    const clean = w.replace(/[.,!?]/g, "");
    for (const p of PARTICLES) {
      if (p === "요" || !PARTICLE_OPTIONS.includes(p)) continue;
      if (clean.length > p.length && clean.endsWith(p)) {
        cands.push({ i, p });
        break;
      }
    }
  });
  if (!cands.length) return null;
  const c = cands[Math.floor(rng() * cands.length)];
  const word = words[c.i];
  const idx = word.lastIndexOf(c.p);
  const blanked = words.map((w, k) => (k === c.i ? `${word.slice(0, idx)}＿${word.slice(idx + c.p.length)}` : w)).join(" ");
  const pair: Record<string, string> = { 은: "는", 는: "은", 이: "가", 가: "이", 을: "를", 를: "을", 와: "과", 과: "와", 으로: "로", 로: "으로", 에: "에서", 에서: "에" };
  const wrong = pick(PARTICLE_OPTIONS.filter((x) => x !== c.p && x !== pair[c.p]), 2, rng);
  const opts = shuffle([c.p, pair[c.p] ?? wrong.pop()!, ...wrong].slice(0, 4), rng);
  return { id: uid("pa"), type: "particle", skill: "grammar", itemId: s.grammarId ?? s.zh, itemKind: s.grammarId ? "grammar" : "sentence", prompt: "Elige la partícula correcta (ojo con el 받침)", zh: blanked, answer: c.p, options: Array.from(new Set(opts)), es: s.es, pinyin: s.py, explain: `«${s.zh}»: ${c.p}${pair[c.p] ? ` (y no ${pair[c.p]}: depende de si la palabra anterior acaba en consonante)` : ""}.` };
}

export const koAdapters: ExerciseAdapters = {
  types: KO_TYPES,
  labels: { "pinyin-input": "Escribir en hangul", "tone-choice": "Lisa · aspirada · tensa", "tone-pair": "Pares mínimos", "similar-characters": "Sílabas parecidas", component: "Jamo y hanja", "build-character": "Construir la sílaba", classifier: "Clasificadores", writing: "Escritura (trazos)" },
  readingInput: genReadingInput,
  prosodyChoice: (_p, w) => genConsonantChoice(w),
  prosodyPair: (_p, rng) => genTriplet(rng),
  similar: genSimilar,
  component: genComponent,
  buildCharacter: genBuildSyllable,
  classifier: genCounter,
  writing: genWriting,
  conjugation: genConjugation,
  particle: genParticle,
  tiles: (t) => t.replace(/[.,!?]/g, "").split(/\s+/).filter(Boolean),
  readingEquals,
  readingDiff,
  explainPartial: (wrong) => `Casi: revisa el 받침 en ${wrong.map((d) => `«${d.got || "—"}» → «${d.unit}»`).join(", ")} (suenan igual por las reglas de pronunciación, pero se escriben distinto).`,
  normalizeText: normKo,
  normalizeInput: (s) => s,
};

export { RULE_INFO };
