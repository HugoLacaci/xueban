/**
 * Ejercicios generados al vuelo desde un apunte (sin guardar): transformación de estructuras (negativa/pregunta),
 * elegir A o B en contrastes, completar la fórmula, huecos en ejemplos, minitest, preguntas Cornell como elección.
 * Lógica pura sobre el contenido del apunte; usa el segmentador del paquete activo para las fichas.
 */
import type { Note } from "@/lib/db/schema";
import type { Exercise, ExerciseType } from "@/lib/exercises/types";
import { genOrderWords, tilesFromSentence } from "@/lib/exercises/generators";
import type { Example, FormulaPart, MiniTestItem, Pair, QA } from "./templates";
import { seededRandom, shuffle } from "@/lib/utils";

const str = (v: unknown) => (typeof v === "string" ? v : "");
const list = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
let n = 0;
const uid = (p: string) => `note-${p}-${(n++).toString(36)}`;

function exampleSet(fields: Record<string, unknown>): Example[] {
  const out: Example[] = [];
  for (const k of ["examples", "ok", "variants", "phrases", "negative", "question", "pairs"]) out.push(...list<Example>(fields[k]).filter((e) => e && e.zh));
  for (const qa of list<QA>(fields.qa)) {
    out.push({ zh: qa.q, es: qa.qes });
    out.push({ zh: qa.a, es: qa.aes });
  }
  for (const l of list<{ zh: string; es?: string }>(fields.lines)) if (l.zh) out.push({ zh: l.zh, es: l.es });
  return out;
}

/** Negación con 不/没 y pregunta con 吗 a partir de una afirmativa sencilla (HSK 1). */
function transformations(zh: string): { kind: "neg" | "ma"; answer: string; prompt: string }[] {
  const clean = zh.replace(/[。！]$/, "");
  const out: { kind: "neg" | "ma"; answer: string; prompt: string }[] = [];
  if (!/[吗呢吧？?]/.test(clean) && clean.length >= 3) out.push({ kind: "ma", answer: `${clean}吗？`, prompt: "Convierte en pregunta con 吗" });
  const neg = negate(clean);
  if (neg) out.push({ kind: "neg", answer: `${neg}。`, prompt: "Pon la frase en negativa" });
  return out;
}

const VERBS = ["是", "有", "去", "来", "吃", "喝", "看", "买", "学习", "喜欢", "想", "要", "会", "能", "认识", "叫", "住", "工作", "说", "听", "读", "写", "做", "坐", "在"];
function negate(s: string): string | null {
  if (/[不没]/.test(s)) return null;
  if (/了$/.test(s)) {
    const base = s.replace(/了$/, "");
    const v = VERBS.find((x) => base.includes(x) && x !== "是" && x !== "在");
    return v ? base.replace(v, `没${v}`) : null;
  }
  if (s.includes("有")) return s.replace("有", "没有");
  if (/很/.test(s)) return s.replace("很", "不");
  const v = VERBS.find((x) => s.includes(x));
  return v ? s.replace(v, `不${v}`) : null;
}

export interface NoteExerciseOptions {
  max?: number;
  seed?: number;
  tiles?: (s: string) => string[];
  types?: ExerciseType[];
}

export function noteExercises(note: Note, opts: NoteExerciseOptions = {}): Exercise[] {
  const rng = seededRandom(opts.seed ?? 7);
  const tiles = opts.tiles ?? ((s: string) => Array.from(s.replace(/[，。！？、]/g, "")));
  const f = note.fields;
  const out: Exercise[] = [];
  const itemId = note.id;
  const examples = exampleSet(f);

  // 1) ordenar / construir desde los ejemplos
  for (const e of examples.slice(0, 6)) {
    const ex = genOrderWords({ zh: e.zh, es: e.es ?? "", py: e.py }, rng, tiles);
    if (ex) out.push({ ...ex, itemId, itemKind: "sentence", id: uid("ord") });
  }
  // 2) transformar (negativa / pregunta con 吗) → escribir
  if (note.lang === "zh") {
    for (const e of examples.slice(0, 5)) {
      for (const t of transformations(e.zh)) {
        out.push({ id: uid("tr"), type: "dictation", skill: "grammar", itemId, itemKind: "sentence", prompt: `${t.prompt}: ${e.zh}`, zh: t.answer, es: e.es, explain: t.kind === "ma" ? "吗 se añade al final de la afirmativa; el orden no cambia." : "不 niega el presente/hábito; 没 niega el pasado (没有, 没去)." });
      }
    }
  }
  // 3) contraste A vs B: elegir
  const a = str(f.a);
  const b = str(f.b);
  if (a && b) {
    for (const t of list<MiniTestItem>(f.minitest)) {
      if (!t.zh.includes("＿")) continue;
      const opts = t.options?.length ? t.options : [a, b];
      if (!opts.includes(t.answer)) continue;
      out.push({ id: uid("ab"), type: "fill-blank", skill: "grammar", itemId, itemKind: "grammar", prompt: opts.length === 2 ? `¿${a} o ${b}?` : `¿${opts.join(", ")}?`, zh: t.zh, answer: t.answer, options: shuffle(opts, rng), es: t.es ?? "", explain: str(f.rule) });
    }
    for (const p of list<Pair>(f.bad)) {
      if (!p.wrong || !p.right) continue;
      const options = shuffle([{ text: p.right, zh: true }, { text: p.wrong, zh: true }], rng);
      out.push({ id: uid("abc"), type: "choose-meaning", skill: "grammar", itemId, itemKind: "grammar", prompt: "¿Cuál es la forma correcta?", display: { es: p.why ?? str(f.rule) }, options, answer: options.findIndex((o) => o.text === p.right), explain: p.why ?? str(f.rule) });
    }
  }
  // 4) errores típicos (gramática/partícula): elegir la correcta
  for (const p of list<Pair>(f.mistakes).slice(0, 4)) {
    if (!p.wrong || !p.right) continue;
    const options = shuffle([{ text: p.right, zh: true }, { text: p.wrong, zh: true }], rng);
    out.push({ id: uid("mis"), type: "choose-meaning", skill: "grammar", itemId, itemKind: "grammar", prompt: "Una de las dos está mal. ¿Cuál es la correcta?", display: { es: str(f.function) || note.title }, options, answer: options.findIndex((o) => o.text === p.right), explain: p.why });
  }
  // 5) completar la fórmula: hueco en la ficha fija (在, 了, 吗…) de un ejemplo
  const parts = list<FormulaPart>(f.formula);
  const fixed = parts.map((p) => p.text.trim()).filter((t) => /[㐀-鿿]/.test(t) && t.length <= 2);
  if (fixed.length) {
    for (const e of examples.slice(0, 4)) {
      const key = fixed.find((k) => e.zh.includes(k));
      if (!key) continue;
      const distract = ["是", "在", "有", "了", "的", "吗", "呢", "也", "都", "很", "不", "没"].filter((d) => d !== key && !e.zh.includes(d));
      out.push({ id: uid("fml"), type: "fill-blank", skill: "grammar", itemId, itemKind: "grammar", prompt: "Completa la fórmula", zh: e.zh.replace(key, "＿".repeat(key.length)), answer: key, options: shuffle([key, ...shuffle(distract, rng).slice(0, 3)], rng), es: e.es ?? "", explain: str(f.function) });
    }
  }
  // 6) palabra: elegir significado / escribir pinyin
  const hanzi = str(f.hanzi) || str(f.char) || str(f.particle);
  const meaning = str(f.meaning);
  if (hanzi && meaning) out.push({ id: uid("py"), type: "pinyin-input", skill: "tones", itemId, itemKind: "word", prompt: "Escribe el pinyin con tonos", zh: hanzi, answer: str(f.pinyin) || "", meaning });
  // 7) preguntas con respuesta: dada la pregunta, elegir la respuesta
  const qas = list<QA>(f.qa).filter((q) => q.q && q.a);
  if (qas.length >= 2) {
    for (const q of qas.slice(0, 4)) {
      const others = shuffle(qas.filter((x) => x !== q), rng).slice(0, 2);
      const options = shuffle([q, ...others], rng).map((x) => ({ text: x.a, zh: true, sub: x.aes }));
      out.push({ id: uid("qa"), type: "comprehension", skill: "reading", itemId, itemKind: "sentence", prompt: "¿Cuál es la respuesta a esta pregunta?", display: { zh: q.q, es: q.qes }, options, answer: options.findIndex((o) => o.text === q.a), explain: str(f.answer) });
    }
  }
  // 8) frase: traducir al español
  for (const e of examples.filter((x) => x.es).slice(0, 3)) out.push({ id: uid("tes"), type: "translate-to-es", skill: "reading", itemId, itemKind: "sentence", prompt: "Traduce al español", zh: e.zh, pinyin: e.py, answers: [e.es!] });
  // 9) huecos en los ejemplos (cloze): se tapa la palabra del apunte
  if (hanzi) {
    for (const e of examples.filter((x) => x.zh.includes(hanzi)).slice(0, 3)) {
      const wrong = ["是", "在", "有", "很", "好", "吃", "去", "看", "买", "喝"].filter((w) => w !== hanzi && !e.zh.includes(w));
      out.push({ id: uid("clz"), type: "fill-blank", skill: "vocabulary", itemId, itemKind: "word", prompt: "Completa con la palabra del apunte", zh: e.zh.replace(hanzi, "＿".repeat(Array.from(hanzi).length)), answer: hanzi, options: shuffle([hanzi, ...shuffle(wrong, rng).slice(0, 3)], rng), es: e.es ?? "", explain: `${hanzi} = ${meaning}` });
    }
  }
  const types = opts.types;
  const filtered = types ? out.filter((e) => types.includes(e.type)) : out;
  const uniq = new Map<string, Exercise>();
  for (const e of filtered) uniq.set(`${e.type}:${"zh" in e ? e.zh : e.id}`, e);
  const all = shuffle(Array.from(uniq.values()), rng);
  // comprobar que las fichas de ordenar tienen ≥3 piezas útiles
  return all.filter((e) => e.type !== "order-words" || tilesFromSentence(e.zh, tiles).length >= 3).slice(0, opts.max ?? 20);
}
