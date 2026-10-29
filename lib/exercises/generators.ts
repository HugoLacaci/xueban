/**
 * Generadores de ejercicios a partir de un pool (palabras, frases, gramática), independientes del idioma.
 * Los tipos que dependen de la lengua (lectura, prosodia, caracteres, clasificadores, escritura,
 * conjugación, partículas) se delegan en `ctx.adapters` (pack.exerciseAdapters).
 * Deterministas si se pasa un rng con semilla. Devuelven null si no hay material suficiente.
 */
import { shuffle, pick } from "@/lib/utils";
import type { ExerciseAdapters } from "@/lib/languages/types";
import { getActivePackOrNull } from "@/lib/languages/registry";
import type { Exercise, ExerciseType, MultipleChoiceExercise, Pool, PoolSentence, PoolWord, TilesExercise } from "./types";

type RNG = () => number;
let counter = 0;
export const uid = (t: string) => `${t}-${(counter++).toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;

/** Normaliza una lectura para comparar (quita diacríticos, espacios y separadores). */
export function readingKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[\s'’\-·]/g, "");
}

function others(pool: Pool, w: PoolWord): PoolWord[] {
  return (pool.allWords ?? pool.words).filter((x) => x.hanzi !== w.hanzi && x.meaning !== w.meaning);
}

/** Distractores inteligentes: misma categoría > carácter compartido > mismo inicio de lectura > aleatorio. */
export function distractors(pool: Pool, w: PoolWord, n: number, rng: RNG): PoolWord[] {
  const rest = others(pool, w);
  const wk = readingKey(w.pinyin);
  const scored = rest.map((x) => {
    let s = rng() * 0.5;
    const xk = readingKey(x.pinyin);
    if (x.category && x.category === w.category) s += 2;
    if (Array.from(x.hanzi).some((c) => w.hanzi.includes(c))) s += 2.5;
    if (xk.slice(0, 2) === wk.slice(0, 2)) s += 1.5;
    if (xk === wk) s += 3;
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

export function withAnswer<T>(correct: T, wrong: T[], rng: RNG): { options: T[]; answer: number } {
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

const PUNCT_RE = /[，。！？、：；,.!?:;“”"「」『』…～]/g;

/** Separa una frase en fichas (palabras) usando un segmentador opcional. */
export function tilesFromSentence(zh: string, segmenter?: (s: string) => string[]): string[] {
  const clean = zh.replace(PUNCT_RE, "");
  const parts = segmenter ? segmenter(clean) : Array.from(clean);
  return parts.map((p) => p.trim()).filter(Boolean);
}

export function genOrderWords(s: PoolSentence, rng: RNG, segmenter?: (s: string) => string[], extraTiles: string[] = []): TilesExercise | null {
  const answer = tilesFromSentence(s.zh, segmenter);
  if (answer.length < 3 || answer.length > 14) return null;
  const tiles = shuffle([...answer, ...extraTiles], rng);
  if (tiles.join("") === answer.join("") && tiles.length > 2) [tiles[0], tiles[1]] = [tiles[1], tiles[0]];
  return {
    id: uid("ow"),
    type: extraTiles.length ? "build-sentence" : "order-words",
    skill: "grammar",
    itemId: s.grammarId ?? s.zh,
    itemKind: s.grammarId ? "grammar" : "sentence",
    prompt: extraTiles.length ? "Construye la frase" : "Ordena las fichas para formar la frase",
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
    all.filter((w) => !answer.includes(w.hanzi) && Array.from(w.hanzi).length <= 3).map((w) => w.hanzi),
    Math.min(3, Math.max(1, Math.floor(answer.length / 2))),
    rng,
  );
  return genOrderWords(s, rng, segmenter, extras);
}

export function genFillBlank(pool: Pool, s: PoolSentence, rng: RNG, segmenter?: (s: string) => string[], target?: string): Exercise | null {
  const words = tilesFromSentence(s.zh, segmenter);
  const all = pool.allWords ?? pool.words;
  const candidates = target && s.zh.includes(target) ? [target] : words.filter((w) => Array.from(w).length <= 4 && all.some((x) => x.hanzi === w));
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

/**
 * Verdadero o falso sobre un texto corto: se juntan 3 frases del pool y cada afirmación es su traducción
 * (verdadera) o la traducción de otra frase que no está en el texto (falsa).
 */
export function genReadingTF(pool: Pool, rng: RNG): Exercise | null {
  const withEs = pool.sentences.filter((x) => x.es && x.zh);
  if (withEs.length < 5) return null;
  const picked = shuffle(withEs, rng).slice(0, 3);
  const others = withEs.filter((x) => !picked.includes(x) && !picked.some((p) => p.es === x.es));
  if (!others.length) return null;
  const statements = picked.map((p, i) => {
    const truth = i === 0 ? true : i === 1 ? false : rng() < 0.5;
    if (truth) return { s: p.es, truth: true };
    const o = others[Math.floor(rng() * others.length)];
    return { s: o.es, truth: false, why: `el texto dice «${p.es}»` };
  });
  const order = shuffle(statements, rng);
  return { id: uid("tf"), type: "reading-tf", skill: "reading", itemId: picked[0].zh, itemKind: "sentence", prompt: "Lee y marca verdadero o falso", text: picked.map((p) => p.zh).join("\n"), es: picked.map((p) => p.es).join(" "), statements: order };
}

export function genDictation(s: PoolSentence | PoolWord): Exercise {
  const isSentence = "zh" in s;
  const zh = isSentence ? s.zh : s.hanzi;
  return { id: uid("di"), type: "dictation", skill: "listening", itemId: isSentence ? zh : s.id, itemKind: isSentence ? "sentence" : "word", prompt: "Escucha y escribe lo que oyes", zh, es: isSentence ? s.es : s.meaning, pinyin: isSentence ? s.py : s.pinyin };
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

export function genSpeaking(s: PoolSentence | PoolWord, mode: "shadow" | "recognize" = "recognize"): Exercise {
  const isSentence = "zh" in s;
  const zh = isSentence ? s.zh : s.hanzi;
  return { id: uid("sp"), type: "speaking", skill: "speaking", itemId: isSentence ? zh : s.id, itemKind: isSentence ? "sentence" : "word", prompt: mode === "shadow" ? "Escucha y repite (shadowing)" : "Di la frase en voz alta", zh, pinyin: (isSentence ? s.py : s.pinyin) ?? "", es: isSentence ? s.es : s.meaning, mode };
}

export interface GenContext {
  adapters?: ExerciseAdapters;
  segmenter?: (s: string) => string[];
  speechAvailable?: boolean;
}

/** Genera una sesión mezclada (interleaving) de n ejercicios de los tipos pedidos. */
export function generateSession(pool: Pool, n: number, types: ExerciseType[], rng: RNG, ctx: GenContext = {}): Exercise[] {
  const out: Exercise[] = [];
  const words = shuffle(pool.words, rng);
  const sentences = shuffle(pool.sentences, rng);
  const ad = ctx.adapters ?? getActivePackOrNull()?.exerciseAdapters;
  const segmenter = ctx.segmenter ?? (ad ? (s: string) => ad.tiles(s) : undefined);
  const usable = types.filter((t) => (t === "speaking" ? ctx.speechAvailable !== false : true)).filter((t) => !ad || ad.types.includes(t) || !LANG_TYPES.has(t));
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
        ex = w && ad ? ad.similar(pool, w, rng) : null;
        break;
      }
      case "pinyin-input": {
        const w = nextWord();
        ex = w && ad ? ad.readingInput(w) : null;
        break;
      }
      case "tone-choice": {
        const w = nextWord();
        ex = w && ad ? ad.prosodyChoice(pool, w, rng) : null;
        break;
      }
      case "tone-pair":
        ex = ad ? ad.prosodyPair(pool, rng) : null;
        break;
      case "order-words": {
        const s = nextSentence();
        ex = s ? genOrderWords(s, rng, segmenter) : null;
        break;
      }
      case "build-sentence": {
        const s = nextSentence();
        ex = s ? genBuildSentence(pool, s, rng, segmenter) : null;
        break;
      }
      case "fill-blank": {
        const s = nextSentence();
        ex = s ? genFillBlank(pool, s, rng, segmenter) : null;
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
        ex = w && ad ? ad.writing(w) : null;
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
        ex = w && ad ? ad.component(pool, w, rng) : null;
        break;
      }
      case "build-character": {
        const w = nextWord();
        ex = w && ad ? ad.buildCharacter(pool, w, rng) : null;
        break;
      }
      case "classifier": {
        const w = nextWord();
        ex = w && ad ? ad.classifier(pool, w, rng) : null;
        break;
      }
      case "conjugation":
        ex = ad?.conjugation ? ad.conjugation(pool, rng) : null;
        break;
      case "particle": {
        const s = nextSentence();
        ex = s && ad?.particle ? ad.particle(pool, s, rng) : null;
        break;
      }
      case "reading-tf":
        ex = genReadingTF(pool, rng);
        break;
      case "comprehension":
        ex = null; // vienen de las preguntas de las lecturas y diálogos
        break;
    }
    if (ex) {
      out.push(ex);
      lastType = t;
    }
  }
  return out;
}

/** Tipos cuya generación depende del paquete de idioma. */
export const LANG_TYPES = new Set<ExerciseType>(["pinyin-input", "tone-choice", "tone-pair", "similar-characters", "writing", "component", "build-character", "classifier", "conjugation", "particle"]);
