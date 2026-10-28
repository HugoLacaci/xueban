/**
 * Generadores de ejercicios a partir de un pool (palabras, frases, gramática).
 * Deterministas si se pasa un rng con semilla. Devuelven null si no hay material suficiente.
 */
import { normalizePinyin, stripTones, syllablesOf, tonesOf } from "@/lib/pinyin/tones";
import { hanziOnly, isHanzi } from "@/lib/pinyin/convert";
import { SIMILAR_CHARS, TONE_PAIRS } from "@/lib/course/data/pronunciation";
import { shuffle, pick } from "@/lib/utils";
import type { Exercise, ExerciseType, MultipleChoiceExercise, Pool, PoolSentence, PoolWord, TilesExercise } from "./types";

type RNG = () => number;
let counter = 0;
const uid = (t: string) => `${t}-${(counter++).toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;

function others(pool: Pool, w: PoolWord): PoolWord[] {
  return (pool.allWords ?? pool.words).filter((x) => x.hanzi !== w.hanzi && x.meaning !== w.meaning);
}

/** Distractores inteligentes: misma categoría > carácter compartido > mismo pinyin inicial > aleatorio. */
function distractors(pool: Pool, w: PoolWord, n: number, rng: RNG): PoolWord[] {
  const rest = others(pool, w);
  const scored = rest.map((x) => {
    let s = rng() * 0.5;
    if (x.category && x.category === w.category) s += 2;
    if (Array.from(x.hanzi).some((c) => w.hanzi.includes(c))) s += 2.5;
    if (normalizePinyin(x.pinyin).slice(0, 2) === normalizePinyin(w.pinyin).slice(0, 2)) s += 1.5;
    if (stripTones(x.pinyin) === stripTones(w.pinyin)) s += 3;
    if (x.hanzi.length === w.hanzi.length) s += 0.5;
    return { x, s };
  });
  const sorted = scored.sort((a, b) => b.s - a.s).map((z) => z.x);
  const top = sorted.slice(0, 2);
  const rest2 = shuffle(sorted.slice(2, 10), rng).slice(0, Math.max(0, n - top.length));
  const out = [...top, ...rest2];
  const seen = new Set<string>([w.meaning]);
  return out.filter((x) => (seen.has(x.meaning) ? false : (seen.add(x.meaning), true))).slice(0, n);
}

function withAnswer<T>(correct: T, wrong: T[], rng: RNG): { options: T[]; answer: number } {
  const options = shuffle([correct, ...wrong], rng);
  return { options, answer: options.indexOf(correct) };
}

export function genChooseMeaning(pool: Pool, w: PoolWord, rng: RNG): MultipleChoiceExercise | null {
  const d = distractors(pool, w, 3, rng);
  if (d.length < 2) return null;
  const { options, answer } = withAnswer(w, d, rng);
  return {
    id: uid("cm"),
    type: "choose-meaning",
    skill: "vocabulary",
    itemId: w.id,
    itemKind: "word",
    prompt: "¿Qué significa?",
    display: { zh: w.hanzi, pinyin: w.pinyin },
    options: options.map((o) => ({ text: o.meaning })),
    answer,
    explain: `${w.hanzi} (${w.pinyin}) = ${w.meaning}.`,
  };
}

export function genChooseCharacter(pool: Pool, w: PoolWord, rng: RNG, fromAudio = false): MultipleChoiceExercise | null {
  const d = distractors(pool, w, 3, rng);
  if (d.length < 2) return null;
  const { options, answer } = withAnswer(w, d, rng);
  return {
    id: uid("cc"),
    type: fromAudio ? "listen-choose" : "choose-character",
    skill: fromAudio ? "listening" : "reading",
    itemId: w.id,
    itemKind: "word",
    prompt: fromAudio ? "Escucha y elige la palabra" : "¿Cómo se escribe?",
    display: fromAudio ? { audio: w.hanzi } : { es: w.meaning },
    options: options.map((o) => ({ text: o.hanzi, zh: true, sub: fromAudio ? o.meaning : undefined })),
    answer,
    explain: `${w.meaning} → ${w.hanzi} (${w.pinyin}).`,
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

const PUNCT_RE = /[，。！？、：；,.!?:;“”"]/g;

/** Separa una frase en fichas (palabras) usando un segmentador opcional. */
export function tilesFromSentence(zh: string, segmenter?: (s: string) => string[]): string[] {
  const clean = zh.replace(PUNCT_RE, "");
  const parts = segmenter ? segmenter(clean) : Array.from(clean);
  return parts.map((p) => p.trim()).filter(Boolean);
}

export function genOrderWords(s: PoolSentence, rng: RNG, segmenter?: (s: string) => string[], extraTiles: string[] = []): TilesExercise | null {
  const answer = tilesFromSentence(s.zh, segmenter);
  if (answer.length < 3 || answer.length > 12) return null;
  const tiles = shuffle([...answer, ...extraTiles], rng);
  if (tiles.join("") === answer.join("") && tiles.length > 2) [tiles[0], tiles[1]] = [tiles[1], tiles[0]];
  return {
    id: uid("ow"),
    type: extraTiles.length ? "build-sentence" : "order-words",
    skill: "grammar",
    itemId: s.grammarId ?? s.zh,
    itemKind: s.grammarId ? "grammar" : "sentence",
    prompt: extraTiles.length ? "Construye la frase en chino" : "Ordena las fichas para formar la frase",
    tiles,
    answer,
    alternatives: s.alternatives?.map((a) => tilesFromSentence(a, segmenter)),
    zh: s.zh,
    es: s.es,
    pinyin: s.py,
  };
}

export function genBuildSentence(pool: Pool, s: PoolSentence, rng: RNG, segmenter?: (s: string) => string[]): TilesExercise | null {
  const answer = tilesFromSentence(s.zh, segmenter);
  const all = pool.allWords ?? pool.words;
  const extras = pick(
    all.filter((w) => !answer.includes(w.hanzi) && w.hanzi.length <= 2).map((w) => w.hanzi),
    Math.min(3, Math.max(1, Math.floor(answer.length / 2))),
    rng,
  );
  return genOrderWords(s, rng, segmenter, extras);
}

export function genFillBlank(pool: Pool, s: PoolSentence, rng: RNG, segmenter?: (s: string) => string[], target?: string): Exercise | null {
  const words = tilesFromSentence(s.zh, segmenter).filter((t) => isHanzi(t[0]));
  const all = pool.allWords ?? pool.words;
  const candidates = target && s.zh.includes(target) ? [target] : words.filter((w) => w.length <= 3 && all.some((x) => x.hanzi === w));
  if (!candidates.length) return null;
  const answer = candidates[Math.floor(rng() * candidates.length)];
  const w = all.find((x) => x.hanzi === answer);
  const dis = w ? distractors(pool, w, 3, rng).map((d) => d.hanzi) : pick(all.map((x) => x.hanzi).filter((h) => h !== answer), 3, rng);
  const options = shuffle([answer, ...dis], rng);
  return {
    id: uid("fb"),
    type: "fill-blank",
    skill: "grammar",
    itemId: w?.id ?? s.zh,
    itemKind: w ? "word" : "sentence",
    prompt: "Elige la palabra que completa la frase",
    zh: s.zh.replace(answer, "＿".repeat(Math.max(2, Array.from(answer).length))),
    answer,
    options,
    es: s.es,
    pinyin: s.py,
    explain: w ? `${answer} (${w.pinyin}) = ${w.meaning}.` : undefined,
  };
}

export function genTranslate(s: PoolSentence): Exercise {
  return { id: uid("tr"), type: "translate-to-es", skill: "reading", itemId: s.zh, itemKind: "sentence", prompt: "Traduce al español", zh: s.zh, pinyin: s.py, answers: [s.es, ...(s.alternatives ?? [])] };
}

export function genDictation(s: PoolSentence | PoolWord): Exercise {
  const isSentence = "zh" in s;
  const zh = isSentence ? s.zh : s.hanzi;
  return { id: uid("di"), type: "dictation", skill: "listening", itemId: isSentence ? zh : s.id, itemKind: isSentence ? "sentence" : "word", prompt: "Escucha y escribe en caracteres (usa tu teclado pinyin)", zh, es: isSentence ? s.es : s.meaning, pinyin: isSentence ? s.py : s.pinyin };
}

export type MatchKind = "hanzi" | "pinyin" | "meaning" | "audio";

export function genMatching(pool: Pool, rng: RNG, n = 5, kinds: [MatchKind, MatchKind] = ["hanzi", "meaning"]): Exercise | null {
  const ws = pick(pool.words, n, rng);
  if (ws.length < 3) return null;
  const opt = (w: PoolWord, k: MatchKind) => (k === "hanzi" ? { text: w.hanzi, zh: true } : k === "pinyin" ? { text: w.pinyin, pinyin: w.pinyin } : k === "audio" ? { text: w.hanzi, zh: true, sub: "audio" } : { text: w.meaning });
  return {
    id: uid("ma"),
    type: "matching",
    skill: "vocabulary",
    itemId: ws.map((w) => w.id).join(","),
    itemKind: "word",
    prompt: "Empareja",
    pairs: ws.map((w) => ({ left: opt(w, kinds[0]), right: opt(w, kinds[1]) })),
    leftKind: kinds[0],
    rightKind: kinds[1],
  };
}

export function genWriting(w: PoolWord): Exercise | null {
  const h = hanziOnly(w.hanzi);
  if (!h || h.length > 2) return null;
  return { id: uid("wr"), type: "writing", skill: "writing", itemId: w.id, itemKind: "word", prompt: "Escribe el carácter trazo a trazo", hanzi: h, pinyin: w.pinyin, meaning: w.meaning };
}

export function genSpeaking(s: PoolSentence | PoolWord, mode: "shadow" | "recognize" = "recognize"): Exercise {
  const isSentence = "zh" in s;
  const zh = isSentence ? s.zh : s.hanzi;
  return { id: uid("sp"), type: "speaking", skill: "speaking", itemId: isSentence ? zh : s.id, itemKind: isSentence ? "sentence" : "word", prompt: mode === "shadow" ? "Escucha y repite (shadowing)" : "Di la frase en voz alta", zh, pinyin: (isSentence ? s.py : s.pinyin) ?? "", es: isSentence ? s.es : s.meaning, mode };
}

export function genComponent(w: PoolWord, radicalMeaning: (r: string) => string | undefined, allRadicals: string[], rng: RNG): MultipleChoiceExercise | null {
  if (!w.radical) return null;
  const wrong = pick(
    allRadicals.filter((r) => r !== w.radical),
    3,
    rng,
  );
  if (wrong.length < 3) return null;
  const { options, answer } = withAnswer(w.radical, wrong, rng);
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
    explain: `El radical de ${ch} es ${w.radical}${radicalMeaning(w.radical) ? ` («${radicalMeaning(w.radical)}»)` : ""}: suele indicar el campo de significado.`,
  };
}

export function genBuildCharacter(w: PoolWord, components: (ch: string) => string[], allComponents: string[], rng: RNG): Exercise | null {
  const ch = Array.from(w.hanzi)[0];
  const comps = components(ch).filter((c) => c !== ch);
  if (comps.length < 2 || comps.length > 4) return null;
  const distractorsList = pick(
    allComponents.filter((c) => !comps.includes(c) && c !== ch),
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
  const correct = w.cl?.[0];
  if (!correct) return null;
  const wrong = pick(
    Object.keys(CLASSIFIER_HINTS).filter((c) => !w.cl?.includes(c)),
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
    explain: `一${correct}${w.hanzi}: ${correct} se usa con ${CLASSIFIER_HINTS[correct] ?? "esta clase de nombres"}.${(w.cl?.length ?? 0) > 1 ? ` También valen: ${w.cl!.slice(1).join(", ")}.` : ""}`,
  };
}

export interface GenContext {
  segmenter?: (s: string) => string[];
  radicalMeaning?: (r: string) => string | undefined;
  allRadicals?: string[];
  components?: (ch: string) => string[];
  allComponents?: string[];
  speechAvailable?: boolean;
}

/** Genera una sesión mezclada (interleaving) de n ejercicios de los tipos pedidos. */
export function generateSession(pool: Pool, n: number, types: ExerciseType[], rng: RNG, ctx: GenContext = {}): Exercise[] {
  const out: Exercise[] = [];
  const words = shuffle(pool.words, rng);
  const sentences = shuffle(pool.sentences, rng);
  const usable = types.filter((t) => (t === "speaking" ? ctx.speechAvailable !== false : true));
  if (!usable.length || (!words.length && !sentences.length)) return out;
  let wi = 0;
  let si = 0;
  const nextWord = () => (words.length ? words[wi++ % words.length] : undefined);
  const nextSentence = () => (sentences.length ? sentences[si++ % sentences.length] : undefined);
  let guard = 0;
  let lastType: ExerciseType | null = null;
  while (out.length < n && guard++ < n * 10) {
    const pickable = usable.length > 1 ? usable.filter((t) => t !== lastType) : usable;
    const t = pickable[Math.floor(rng() * pickable.length)];
    let ex: Exercise | null = null;
    switch (t) {
      case "choose-meaning": {
        const w = nextWord();
        ex = w ? genChooseMeaning(pool, w, rng) : null;
        break;
      }
      case "choose-character": {
        const w = nextWord();
        ex = w ? genChooseCharacter(pool, w, rng) : null;
        break;
      }
      case "listen-choose": {
        const w = nextWord();
        ex = w ? genChooseCharacter(pool, w, rng, true) : null;
        break;
      }
      case "similar-characters": {
        const w = nextWord();
        ex = w ? genSimilarCharacters(pool, w, rng) : null;
        break;
      }
      case "pinyin-input": {
        const w = nextWord();
        ex = w ? genPinyinInput(w) : null;
        break;
      }
      case "tone-choice": {
        const w = nextWord();
        ex = w ? genToneChoice(w) : null;
        break;
      }
      case "tone-pair":
        ex = genTonePair(rng);
        break;
      case "order-words": {
        const s = nextSentence();
        ex = s ? genOrderWords(s, rng, ctx.segmenter) : null;
        break;
      }
      case "build-sentence": {
        const s = nextSentence();
        ex = s ? genBuildSentence(pool, s, rng, ctx.segmenter) : null;
        break;
      }
      case "fill-blank": {
        const s = nextSentence();
        ex = s ? genFillBlank(pool, s, rng, ctx.segmenter) : null;
        break;
      }
      case "translate-to-es": {
        const s = nextSentence();
        ex = s ? genTranslate(s) : null;
        break;
      }
      case "dictation": {
        const s = rng() < 0.6 ? nextSentence() : undefined;
        const w = s ? undefined : nextWord();
        ex = s ? genDictation(s) : w ? genDictation(w) : null;
        break;
      }
      case "matching":
        ex = genMatching(pool, rng, 5, rng() < 0.5 ? ["hanzi", "meaning"] : rng() < 0.5 ? ["hanzi", "pinyin"] : ["audio", "hanzi"]);
        break;
      case "writing": {
        const w = nextWord();
        ex = w ? genWriting(w) : null;
        break;
      }
      case "speaking": {
        const s = rng() < 0.7 ? nextSentence() : undefined;
        const w = s ? undefined : nextWord();
        ex = s ? genSpeaking(s, rng() < 0.5 ? "shadow" : "recognize") : w ? genSpeaking(w) : null;
        break;
      }
      case "component": {
        const w = nextWord();
        ex = w && ctx.radicalMeaning && ctx.allRadicals ? genComponent(w, ctx.radicalMeaning, ctx.allRadicals, rng) : null;
        break;
      }
      case "build-character": {
        const w = nextWord();
        ex = w && ctx.components && ctx.allComponents ? genBuildCharacter(w, ctx.components, ctx.allComponents, rng) : null;
        break;
      }
      case "classifier": {
        const w = nextWord();
        ex = w ? genClassifier(w, rng) : null;
        break;
      }
      case "comprehension":
      case "reading-tf":
        ex = null; // vienen del contenido de las lecciones
        break;
    }
    if (ex) {
      out.push(ex);
      lastType = t;
    }
  }
  return out;
}
