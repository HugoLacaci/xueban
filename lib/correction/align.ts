/**
 * Capa 2 del motor de corrección: comparación con las respuestas de referencia.
 * - segmentación por palabras (léxico) y alineación de secuencias Needleman-Wunsch a nivel de palabra
 *   (con coste reducido para sustituciones «parecidas»: homófonos, misma lectura sin tono, carácter compartido);
 * - detección de reordenamientos (palabra que falta aquí y sobra allí), faltas, sobras, homófonos y errores de tono;
 * - acepta cualquiera de las respuestas válidas y elige la más cercana.
 * Lógica pura.
 */
import type { Lexicon } from "@/lib/segment";
import { wordPinyin } from "@/lib/languages/zh/pinyin/convert";
import { normalizePinyin, syllablesOf, toneOf } from "@/lib/languages/zh/pinyin/tones";
import type { AlignedToken, CorrectionError, SpanRef } from "./types";
import { canonicalize, detectKind, parsePinyin, type PinyinSyllable, words } from "./normalize";

export interface AlignResult {
  tokens: AlignedToken[];
  errors: CorrectionError[];
  /** 0–1: proporción de la referencia bien cubierta */
  similarity: number;
  reference: string;
  userWords: string[];
  refWords: string[];
}

const pyKey = (w: string) => normalizePinyin(wordPinyin(w));
const pyToned = (w: string) => syllablesOf(wordPinyin(w)).map((s) => normalizePinyin(s) + toneOf(s)).join("");

/** Coste de sustituir a por b: 0 igual; 0.3 homófono (misma lectura); 0.5 comparte carácter; 1 distinto. */
function subCost(a: string, b: string): number {
  if (a === b) return 0;
  if (pyToned(a) === pyToned(b)) return 0.3;
  if (pyKey(a) === pyKey(b)) return 0.4;
  if (Array.from(a).some((c) => b.includes(c))) return 0.6;
  return 1;
}

/** Needleman-Wunsch sobre dos listas de palabras. Devuelve pares (i del usuario, j de la referencia) o huecos. */
export function needlemanWunsch(u: string[], r: string[], cost: (a: string, b: string) => number = subCost, gap = 0.9): { i: number | null; j: number | null }[] {
  const n = u.length;
  const m = r.length;
  const D: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 1; i <= n; i++) D[i][0] = i * gap;
  for (let j = 1; j <= m; j++) D[0][j] = j * gap;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      D[i][j] = Math.min(D[i - 1][j - 1] + cost(u[i - 1], r[j - 1]), D[i - 1][j] + gap, D[i][j - 1] + gap);
    }
  }
  const path: { i: number | null; j: number | null }[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && Math.abs(D[i][j] - (D[i - 1][j - 1] + cost(u[i - 1], r[j - 1]))) < 1e-9) {
      path.push({ i: i - 1, j: j - 1 });
      i--;
      j--;
    } else if (i > 0 && Math.abs(D[i][j] - (D[i - 1][j] + gap)) < 1e-9) {
      path.push({ i: i - 1, j: null });
      i--;
    } else {
      path.push({ i: null, j: j - 1 });
      j--;
    }
  }
  return path.reverse();
}

function span(i: number, text: string): SpanRef {
  return { from: i, to: i + 1, text };
}

/** Alinea la respuesta (hanzi) con una referencia y explica cada diferencia. */
export function alignHanzi(user: string, reference: string, lexicon?: Lexicon): AlignResult {
  const uw = words(canonicalize(user), lexicon);
  const rw = words(canonicalize(reference), lexicon);
  const path = needlemanWunsch(uw, rw);
  const tokens: AlignedToken[] = [];
  const errors: CorrectionError[] = [];
  // primera pasada: marcar
  const missing: { j: number; word: string; pos: number }[] = [];
  const extra: { i: number; word: string; pos: number }[] = [];
  for (const p of path) {
    if (p.i !== null && p.j !== null) {
      const a = uw[p.i];
      const b = rw[p.j];
      if (a === b) tokens.push({ user: a, ref: b, status: "ok" });
      else {
        const homophone = pyKey(a) === pyKey(b);
        tokens.push({ user: a, ref: b, status: "sub", userPy: wordPinyin(a), refPy: wordPinyin(b) });
        errors.push({
          type: homophone ? "char" : "word",
          span: span(p.i, a),
          expected: b,
          explanation: homophone ? `«${a}» suena igual que «${b}» (${wordPinyin(b)}) pero es otro carácter: aquí va «${b}».` : `Aquí va «${b}» (${wordPinyin(b)}), no «${a}».`,
          severity: "error",
          source: "align",
        });
      }
    } else if (p.i !== null) {
      tokens.push({ user: uw[p.i], status: "extra" });
      extra.push({ i: p.i, word: uw[p.i], pos: tokens.length - 1 });
    } else if (p.j !== null) {
      tokens.push({ ref: rw[p.j], status: "missing" });
      missing.push({ j: p.j, word: rw[p.j], pos: tokens.length - 1 });
    }
  }
  // reordenamientos: una palabra que sobra en un sitio y falta en otro
  for (const e of extra) {
    const m = missing.find((x) => x.word === e.word);
    if (!m) continue;
    missing.splice(missing.indexOf(m), 1);
    tokens[e.pos] = { user: e.word, ref: e.word, status: "moved" };
    tokens[m.pos] = { ref: e.word, status: "missing" };
    const before = rw[m.j - 1];
    const after = rw[m.j + 1];
    errors.push({
      type: "order",
      span: span(e.i, e.word),
      moveTo: m.j,
      expected: reference,
      explanation: `«${e.word}» está en otro sitio: debería ir ${before ? `después de «${before}»` : after ? `antes de «${after}»` : "al principio"}.`,
      severity: "error",
      source: "align",
    });
  }
  for (const m of missing) {
    errors.push({ type: "missing", span: { from: m.j, to: m.j, text: "" }, expected: m.word, explanation: `Falta «${m.word}» (${wordPinyin(m.word)}).`, severity: "error", source: "align" });
  }
  for (const e of extra) {
    if (tokens[e.pos].status !== "extra") continue;
    errors.push({ type: "extra", span: span(e.i, e.word), explanation: `Sobra «${e.word}».`, severity: "error", source: "align" });
  }
  const okCount = tokens.filter((t) => t.status === "ok").length;
  const similarity = rw.length ? Math.max(0, (okCount - 0.5 * tokens.filter((t) => t.status === "moved").length) / Math.max(rw.length, uw.length)) : 0;
  return { tokens, errors, similarity, reference, userWords: uw, refWords: rw };
}

/** Alinea una respuesta en pinyin (sílabas) con la referencia (hanzi → pinyin) y detecta errores de tono/sílaba. */
/**
 * Sílabas de una referencia escrita en pinyin (números o tildes). Si la frase lleva tonos, las sílabas sin tono
 * son tono neutro (5); si no lleva ninguno, el tono es desconocido (0) y no se corrige.
 */
export function pinyinReferenceSyllables(reference: string): { base: string; tone: number; marked: string; word: string; wi: number }[] {
  const p = parsePinyin(reference);
  return p.syllables.map((s, wi) => ({ base: s.base, tone: s.tone || (p.hasTones ? 5 : 0), marked: s.marked, word: s.marked, wi }));
}

/**
 * @param refHanzi si la referencia está en pinyin, su versión probable en hanzi (para conocer el tono léxico de cada
 *   sílaba: 欢 es huān, así que «huàn» es un error aunque el profesor escribiera «huan» en tono neutro).
 */
export function alignPinyin(userSyl: PinyinSyllable[], reference: string, lexicon?: Lexicon, refHanzi?: string | null): AlignResult {
  const refIsPinyin = detectKind(reference) === "pinyin";
  const rw = refIsPinyin ? [] : words(canonicalize(reference), lexicon);
  // sílabas de referencia con su palabra
  const refSyl: { base: string; tone: number; marked: string; word: string; wi: number; ch?: string }[] = [];
  if (refIsPinyin) {
    const chars = refHanzi ? Array.from(refHanzi) : [];
    const syl = pinyinReferenceSyllables(reference);
    refSyl.push(...syl.map((s, k) => ({ ...s, ch: chars.length === syl.length ? chars[k] : undefined })));
  }
  rw.forEach((w, wi) => {
    const chars = Array.from(w);
    const syl = syllablesOf(wordPinyin(w));
    syl.forEach((s, k) => refSyl.push({ base: normalizePinyin(s), tone: toneOf(s), marked: s, word: w, wi, ch: chars.length === syl.length ? chars[k] : undefined }));
  });
  if (refIsPinyin) rw.push(...refSyl.map((s) => s.marked));
  const u = userSyl.map((s) => s.base);
  const r = refSyl.map((s) => s.base);
  const path = needlemanWunsch(u, r, (a, b) => (a === b ? 0 : similarSyllable(a, b) ? 0.5 : 1));
  const tokens: AlignedToken[] = [];
  const errors: CorrectionError[] = [];
  let ok = 0;
  for (const p of path) {
    if (p.i !== null && p.j !== null) {
      const us = userSyl[p.i];
      const rs = refSyl[p.j];
      if (us.base === rs.base) {
        const neutral = (us.tone === 5) !== (rs.tone === 5);
        // tono léxico del carácter (欢 → huān): con tono neutro solo se acepta el tono original de verdad
        const lexical = rs.ch ? toneOf(wordPinyin(rs.ch)) : 0;
        const wrongLexical = neutral && us.tone !== 5 && lexical >= 1 && lexical <= 4 && us.tone !== lexical;
        if (us.tone && rs.tone && us.tone !== rs.tone && neutral && !wrongLexical) {
          // tono neutro frente a tono léxico (xǐhuan / xǐhuān, yīfu / yīfú): aviso, no error
          tokens.push({ user: us.marked, ref: rs.marked, status: "ok" });
          ok++;
          errors.push({ type: "tone", span: span(p.i, us.raw), expected: rs.marked, explanation: `«${us.marked}» / «${rs.marked}»: en el habla esta sílaba suele ir en tono neutro y muchos libros la escriben con su tono original. No cuenta como error.`, severity: "info", source: "align" });
        } else if (us.tone && rs.tone && us.tone !== rs.tone) {
          tokens.push({ user: us.marked, ref: rs.marked, status: "tone", userPy: us.marked, refPy: rs.marked });
          const why = wrongLexical
            ? `«${us.marked}» → «${rs.marked}»: ${rs.ch} se pronuncia con ${toneName(lexical)} (y aquí suele ir en tono neutro), no con ${toneName(us.tone)}.`
            : `«${us.marked}» → «${rs.marked}»: ${refIsPinyin ? "lleva" : `${rs.word} lleva`} ${toneName(rs.tone)}.`;
          errors.push({ type: "tone", span: span(p.i, us.raw), expected: rs.marked, explanation: why, severity: "error", source: "align" });
        } else {
          tokens.push({ user: us.marked, ref: rs.marked, status: "ok" });
          ok++;
        }
      } else {
        tokens.push({ user: us.marked, ref: rs.marked, status: "sub", userPy: us.marked, refPy: rs.marked });
        errors.push({ type: "pinyin", span: span(p.i, us.raw), expected: rs.marked, explanation: `«${us.marked}» no es «${rs.marked}» (${rs.word}). ${hint(us.base, rs.base)}`.trim(), severity: "error", source: "align" });
      }
    } else if (p.i !== null) {
      tokens.push({ user: userSyl[p.i].marked, status: "extra" });
      errors.push({ type: "extra", span: span(p.i, userSyl[p.i].raw), explanation: `Sobra «${userSyl[p.i].marked}».`, severity: "error", source: "align" });
    } else if (p.j !== null) {
      tokens.push({ ref: refSyl[p.j].marked, status: "missing" });
      errors.push({ type: "missing", span: { from: p.j, to: p.j, text: "" }, expected: refSyl[p.j].marked, explanation: `Falta «${refSyl[p.j].marked}» (${refSyl[p.j].word}).`, severity: "error", source: "align" });
    }
  }
  const similarity = refSyl.length ? ok / Math.max(refSyl.length, userSyl.length) : 0;
  return { tokens, errors, similarity, reference, userWords: userSyl.map((s) => s.marked), refWords: rw };
}

function toneName(t: number): string {
  return ["", "primer tono (alto)", "segundo tono (ascendente)", "tercer tono (bajo)", "cuarto tono (descendente)", "tono neutro"][t] ?? "";
}

const CONFUSABLE: [RegExp, RegExp, string][] = [
  [/^zh/, /^z(?!h)/, "zh es retrofleja (lengua hacia atrás); z es dental."],
  [/^ch/, /^c(?!h)/, "ch es retrofleja; c es dental (como «ts»)."],
  [/^sh/, /^s(?!h)/, "sh es retrofleja; s es dental."],
  [/^x/, /^sh/, "x se pronuncia con la lengua plana (como «sh» suave); sh con la lengua hacia atrás."],
  [/^q/, /^ch/, "q es palatal (como «ch» suave); ch es retrofleja."],
  [/^j/, /^zh/, "j es palatal; zh es retrofleja."],
  [/n$/, /ng$/, "-n termina con la lengua en los dientes; -ng con la lengua atrás (como en «tengo»)."],
  [/^r/, /^l/, "r china es casi una «j» francesa suave, sin vibrar."],
  [/ü|v/, /u(?!e)/, "ü (como la «u» francesa) no es u."],
];
function hint(a: string, b: string): string {
  for (const [x, y, h] of CONFUSABLE) if ((x.test(a) && y.test(b)) || (y.test(a) && x.test(b))) return h;
  return "";
}
function similarSyllable(a: string, b: string): boolean {
  if (a.slice(1) === b.slice(1) || a.slice(0, -1) === b.slice(0, -1)) return true;
  return hint(a, b) !== "";
}

/** Elige la referencia más cercana a la respuesta. */
export function bestReference(user: string, refs: string[], lexicon?: Lexicon): AlignResult | null {
  let best: AlignResult | null = null;
  for (const r of refs) {
    const a = alignHanzi(user, r, lexicon);
    if (!best || a.similarity > best.similarity || (a.similarity === best.similarity && a.errors.length < best.errors.length)) best = a;
  }
  return best;
}

export function bestReferencePinyin(syl: PinyinSyllable[], refs: string[], lexicon?: Lexicon, hanziFor?: (ref: string) => string | null): AlignResult | null {
  let best: AlignResult | null = null;
  for (const r of refs) {
    const a = alignPinyin(syl, r, lexicon, hanziFor && detectKind(r) === "pinyin" ? hanziFor(r) : null);
    if (!best || a.similarity > best.similarity || (a.similarity === best.similarity && a.errors.length < best.errors.length)) best = a;
  }
  return best;
}
