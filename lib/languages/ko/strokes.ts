/**
 * Trazos de hangul (propios; no existe un conjunto abierto equivalente a KanjiVG): líneas centrales de
 * los jamo básicos en una caja de 100×100 con el orden estándar (de arriba abajo, de izquierda a derecha;
 * ㅇ en sentido antihorario desde arriba). Las consonantes dobles, las vocales compuestas y las sílabas
 * se componen colocando jamo escalados en las posiciones del bloque (inicial, vocal, final).
 */
import type { StrokeData } from "@/components/target/stroke-writer";
import { decompose, isHangulSyllable } from "./phonology";

type Paths = string[];

/** Jamo básicos (caja 0–100). */
const J: Record<string, Paths> = {
  ㄱ: ["M18 24 L80 24 C82 50 76 72 60 90"],
  ㄴ: ["M24 18 L24 80 L86 80"],
  ㄷ: ["M24 24 L82 24", "M24 24 L24 80 L86 80"],
  ㄹ: ["M22 18 L78 18 L78 48", "M22 48 L78 48", "M22 48 L22 84 L86 84"],
  ㅁ: ["M24 22 L24 82", "M24 22 L78 22 L78 82", "M24 82 L78 82"],
  ㅂ: ["M26 18 L26 84", "M76 18 L76 84", "M26 50 L76 50", "M26 84 L76 84"],
  ㅅ: ["M52 16 C50 46 38 70 16 88", "M54 48 C64 64 76 78 90 88"],
  ㅇ: ["M52 18 C30 18 18 34 18 52 C18 72 34 86 52 86 C72 86 86 72 86 52 C86 34 72 18 52 18"],
  ㅈ: ["M20 22 L78 22 C64 50 44 70 16 88", "M50 50 C62 66 76 78 90 88"],
  ㅊ: ["M44 8 L60 16", "M20 30 L78 30 C64 56 44 74 16 90", "M50 56 C62 70 76 80 90 90"],
  ㅋ: ["M18 22 L80 22 C82 50 76 72 60 90", "M20 54 L80 54"],
  ㅌ: ["M26 20 L84 20", "M26 50 L80 50", "M26 20 L26 82 L88 82"],
  ㅍ: ["M16 22 L86 22", "M36 22 L36 80", "M66 22 L66 80", "M14 82 L88 82"],
  ㅎ: ["M50 8 L54 20", "M18 32 L84 32", "M51 48 C38 48 32 58 32 66 C32 76 40 84 51 84 C62 84 70 76 70 66 C70 58 62 48 51 48"],
  ㅏ: ["M44 6 L44 96", "M44 50 L78 50"],
  ㅑ: ["M42 6 L42 96", "M42 36 L76 36", "M42 64 L76 64"],
  ㅓ: ["M22 50 L58 50", "M58 6 L58 96"],
  ㅕ: ["M22 36 L58 36", "M22 64 L58 64", "M58 6 L58 96"],
  ㅗ: ["M50 30 L50 62", "M6 62 L94 62"],
  ㅛ: ["M36 30 L36 62", "M64 30 L64 62", "M6 62 L94 62"],
  ㅜ: ["M6 38 L94 38", "M50 38 L50 82"],
  ㅠ: ["M6 38 L94 38", "M36 38 L36 82", "M64 38 L64 82"],
  ㅡ: ["M6 50 L94 50"],
  ㅣ: ["M50 6 L50 96"],
  ㅐ: ["M34 6 L34 96", "M34 50 L62 50", "M66 6 L66 96"],
  ㅒ: ["M34 6 L34 96", "M34 38 L62 38", "M34 62 L62 62", "M66 6 L66 96"],
  ㅔ: ["M16 50 L40 50", "M44 6 L44 96", "M72 6 L72 96"],
  ㅖ: ["M16 38 L40 38", "M16 62 L40 62", "M44 6 L44 96", "M72 6 L72 96"],
};

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Transforma un path con comandos absolutos M/L/C de la caja 0–100 a otra caja. */
function place(d: string, b: Box): string {
  return d.replace(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, (_, x: string, y: string) => `${round(b.x + (Number(x) * b.w) / 100)} ${round(b.y + (Number(y) * b.h) / 100)}`);
}
const round = (n: number) => Math.round(n * 10) / 10;

const DOUBLE_CONS: Record<string, string> = { ㄲ: "ㄱ", ㄸ: "ㄷ", ㅃ: "ㅂ", ㅆ: "ㅅ", ㅉ: "ㅈ" };
const FINAL_PAIRS: Record<string, [string, string]> = { ㄳ: ["ㄱ", "ㅅ"], ㄵ: ["ㄴ", "ㅈ"], ㄶ: ["ㄴ", "ㅎ"], ㄺ: ["ㄹ", "ㄱ"], ㄻ: ["ㄹ", "ㅁ"], ㄼ: ["ㄹ", "ㅂ"], ㄽ: ["ㄹ", "ㅅ"], ㄾ: ["ㄹ", "ㅌ"], ㄿ: ["ㄹ", "ㅍ"], ㅀ: ["ㄹ", "ㅎ"], ㅄ: ["ㅂ", "ㅅ"] };
const COMPOUND_V: Record<string, [string, string]> = { ㅘ: ["ㅗ", "ㅏ"], ㅙ: ["ㅗ", "ㅐ"], ㅚ: ["ㅗ", "ㅣ"], ㅝ: ["ㅜ", "ㅓ"], ㅞ: ["ㅜ", "ㅔ"], ㅟ: ["ㅜ", "ㅣ"], ㅢ: ["ㅡ", "ㅣ"] };

/** Trazos de un jamo (incluidos dobles y compuestos) en una caja. */
export function jamoPaths(j: string, b: Box = { x: 0, y: 0, w: 100, h: 100 }): Paths {
  if (J[j]) return J[j].map((d) => place(d, b));
  const dbl = DOUBLE_CONS[j];
  if (dbl) return [...jamoPaths(dbl, { x: b.x, y: b.y, w: b.w * 0.52, h: b.h }), ...jamoPaths(dbl, { x: b.x + b.w * 0.48, y: b.y, w: b.w * 0.52, h: b.h })];
  const fp = FINAL_PAIRS[j];
  if (fp) return [...jamoPaths(fp[0], { x: b.x, y: b.y, w: b.w * 0.5, h: b.h }), ...jamoPaths(fp[1], { x: b.x + b.w * 0.5, y: b.y, w: b.w * 0.5, h: b.h })];
  const cv = COMPOUND_V[j];
  if (cv) return [...jamoPaths(cv[0], { x: b.x, y: b.y + b.h * 0.1, w: b.w * 0.62, h: b.h * 0.9 }), ...jamoPaths(cv[1], { x: b.x + b.w * 0.55, y: b.y, w: b.w * 0.45, h: b.h })];
  return [];
}

const VERTICAL = new Set(["ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅣ"]);
const HORIZONTAL = new Set(["ㅗ", "ㅛ", "ㅜ", "ㅠ", "ㅡ"]);

/** Posiciones en el bloque silábico (inicial, vocal, final) según el tipo de vocal. */
export function blockLayout(jung: string, hasFinal: boolean): { cho: Box; jung: Box; jong?: Box } {
  const H = hasFinal ? 62 : 100;
  const jong = hasFinal ? { x: 14, y: 62, w: 72, h: 36 } : undefined;
  if (VERTICAL.has(jung)) return { cho: { x: 2, y: 4, w: 56, h: H - 6 }, jung: { x: 52, y: 0, w: 46, h: H }, jong };
  if (HORIZONTAL.has(jung)) return { cho: { x: 18, y: 0, w: 64, h: H * 0.55 }, jung: { x: 0, y: H * 0.42, w: 100, h: H * 0.58 }, jong };
  return { cho: { x: 4, y: 0, w: 52, h: H * 0.5 }, jung: { x: 0, y: H * 0.35, w: 100, h: H * 0.65 }, jong };
}

/** Datos de trazos (formato StrokeWriter) de un jamo o de una sílaba completa. */
export function hangulStrokeData(ch: string): StrokeData | null {
  let strokes: Paths = [];
  if (isHangulSyllable(ch)) {
    const s = decompose(ch)!;
    const L = blockLayout(s.jung, Boolean(s.jong));
    strokes = [...jamoPaths(s.cho, L.cho), ...jamoPaths(s.jung, L.jung), ...(s.jong && L.jong ? jamoPaths(s.jong, L.jong) : [])];
  } else strokes = jamoPaths(ch);
  if (!strokes.length) return null;
  return { size: 100, width: 6, strokes, medians: strokes.map(sampleMedian) };
}

/** 8 puntos a lo largo de un path M/L/C (muestreo de las curvas de Bézier). */
export function sampleMedian(d: string): [number, number][] {
  const tokens = d.match(/[MLC]|-?\d+(?:\.\d+)?/g) ?? [];
  const pts: [number, number][] = [];
  let i = 0;
  let cur: [number, number] = [0, 0];
  let cmd = "M";
  while (i < tokens.length) {
    if (/[MLC]/.test(tokens[i])) cmd = tokens[i++];
    if (cmd === "C") {
      const n = tokens.slice(i, i + 6).map(Number);
      i += 6;
      const p0 = cur;
      for (let t = 0.25; t <= 1.0001; t += 0.25) {
        const u = 1 - t;
        pts.push([u * u * u * p0[0] + 3 * u * u * t * n[0] + 3 * u * t * t * n[2] + t * t * t * n[4], u * u * u * p0[1] + 3 * u * u * t * n[1] + 3 * u * t * t * n[3] + t * t * t * n[5]]);
      }
      cur = [n[4], n[5]];
    } else {
      cur = [Number(tokens[i]), Number(tokens[i + 1])];
      i += 2;
      pts.push(cur);
    }
  }
  // remuestreo a 8 puntos equidistantes
  const len = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  let total = 0;
  for (let k = 1; k < pts.length; k++) total += len(pts[k - 1], pts[k]);
  if (pts.length < 2 || total === 0) return Array.from({ length: 8 }, () => pts[0] ?? [0, 0]);
  const out: [number, number][] = [pts[0]];
  const step = total / 7;
  let acc = 0;
  let k = 1;
  let prev = pts[0];
  while (out.length < 8 && k < pts.length) {
    const seg = len(prev, pts[k]);
    if (acc + seg >= step) {
      const t = (step - acc) / seg;
      prev = [prev[0] + (pts[k][0] - prev[0]) * t, prev[1] + (pts[k][1] - prev[1]) * t];
      out.push(prev);
      acc = 0;
    } else {
      acc += seg;
      prev = pts[k];
      k++;
    }
  }
  while (out.length < 8) out.push(pts[pts.length - 1]);
  return out.map(([x, y]) => [round(x), round(y)]);
}

export const BASIC_CONSONANTS = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
export const TENSE_CONSONANTS = ["ㄲ", "ㄸ", "ㅃ", "ㅆ", "ㅉ"];
export const BASIC_VOWELS = ["ㅏ", "ㅑ", "ㅓ", "ㅕ", "ㅗ", "ㅛ", "ㅜ", "ㅠ", "ㅡ", "ㅣ"];
export const COMPOUND_VOWELS = ["ㅐ", "ㅒ", "ㅔ", "ㅖ", "ㅘ", "ㅙ", "ㅚ", "ㅝ", "ㅞ", "ㅟ", "ㅢ"];
