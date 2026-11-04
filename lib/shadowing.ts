/**
 * Shadowing: comparación por sílaba entre la grabación del alumno y el modelo.
 * - transcripción (Web Speech / Whisper) frente al texto: ¿se reconoció cada carácter?
 * - curva de tono (lib/pitch) partida en N sílabas: nivel y pendiente frente al contorno ideal de cada tono.
 * Lógica pura; devuelve verde / ámbar / rojo por sílaba. La nota es orientativa (el ASR «corrige» hacia frases plausibles).
 */
import type { Tone } from "@/lib/exercises/types";
import type { PitchPoint } from "@/lib/pitch";

export interface SyllableScore {
  hanzi: string;
  pinyin: string;
  tone: Tone;
  recognized: boolean | null; // null = sin transcripción
  toneScore: number | null; // 0–1, null si no hay voz suficiente
  verdict: "good" | "ok" | "bad";
  note?: string;
}

/** Rasgos de un tramo de curva (semitonos relativos): nivel medio, pendiente y forma de la mitad. */
function features(seg: number[]): { level: number; slope: number; dip: number } | null {
  const v = seg.filter((x) => Number.isFinite(x));
  if (v.length < 3) return null;
  const n = v.length;
  const level = v.reduce((a, b) => a + b, 0) / n;
  const start = v.slice(0, Math.max(1, Math.floor(n / 3))).reduce((a, b) => a + b, 0) / Math.max(1, Math.floor(n / 3));
  const end = v.slice(-Math.max(1, Math.floor(n / 3))).reduce((a, b) => a + b, 0) / Math.max(1, Math.floor(n / 3));
  const mid = v.slice(Math.floor(n / 3), Math.ceil((2 * n) / 3)).reduce((a, b) => a + b, 0) / Math.max(1, Math.ceil((2 * n) / 3) - Math.floor(n / 3));
  return { level, slope: end - start, dip: (start + end) / 2 - mid };
}

/** Puntuación 0–1 de un tramo frente al tono esperado (umbrales en semitonos). */
export function scoreTone(seg: number[], tone: Tone, globalRange: number): number | null {
  const f = features(seg);
  if (!f) return null;
  const R = Math.max(4, globalRange); // rango de voz del alumno en la frase
  const high = f.level > R * 0.15;
  const low = f.level < -R * 0.15;
  const rising = f.slope > R * 0.2;
  const falling = f.slope < -R * 0.2;
  const flat = Math.abs(f.slope) <= R * 0.2;
  const dipping = f.dip > R * 0.1;
  switch (tone) {
    case 1:
      // si toda la frase es plana (una sola sílaba o voz monótona) el nivel no es medible: cuenta la planitud
      return (high || globalRange < 3 ? 0.6 : f.level > 0 ? 0.35 : 0.1) + (flat ? 0.4 : 0.1);
    case 2:
      return (rising ? 0.7 : f.slope > 0 ? 0.4 : 0.05) + (!high ? 0.3 : 0.15);
    case 3:
      // un dip marcado ya indica el «valle» del tercer tono aunque el nivel medio no sea bajo (sílaba aislada)
      return (low || f.dip > R * 0.2 ? 0.5 : f.level < 0 ? 0.3 : 0.05) + (dipping || falling ? 0.5 : flat ? 0.25 : 0.05);
    case 4:
      return (falling ? 0.7 : f.slope < 0 ? 0.4 : 0.05) + (f.level >= -R * 0.1 ? 0.3 : 0.15);
    default:
      return 0.7 + (Math.abs(f.slope) < R * 0.3 ? 0.3 : 0); // neutro: corto y sin contorno marcado
  }
}

/** Parte la curva (puntos con hz) en N tramos por tiempo de voz, en semitonos relativos a la mediana. */
export function splitBySyllables(contour: PitchPoint[], n: number): { segments: number[][]; range: number } {
  const voiced = contour.filter((p) => p.hz > 0);
  if (voiced.length < n * 3) return { segments: Array.from({ length: n }, () => []), range: 0 };
  const semis = voiced.map((p) => 12 * Math.log2(p.hz));
  const sorted = semis.slice().sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const rel = semis.map((s) => s - median);
  const p10 = sorted[Math.floor(sorted.length * 0.1)];
  const p90 = sorted[Math.floor(sorted.length * 0.9)];
  // reparte por tiempo (los huecos sin voz separan sílabas cuando los hay)
  const t0 = voiced[0].t;
  const t1 = voiced[voiced.length - 1].t;
  const segs: number[][] = Array.from({ length: n }, () => []);
  voiced.forEach((p, i) => {
    const k = Math.min(n - 1, Math.floor(((p.t - t0) / Math.max(0.001, t1 - t0)) * n));
    segs[k].push(rel[i]);
  });
  return { segments: segs, range: p90 - p10 };
}

export interface ShadowInput {
  text: string; // hanzi
  syllables: { hanzi: string; pinyin: string; tone: Tone }[];
  transcript?: string;
  contour?: PitchPoint[];
}

export function scoreShadowing(input: ShadowInput): { syllables: SyllableScore[]; overall: number; recognizedRatio: number | null; toneRatio: number | null } {
  const n = input.syllables.length;
  const { segments, range } = input.contour ? splitBySyllables(input.contour, n) : { segments: Array.from({ length: n }, () => [] as number[]), range: 0 };
  const got = input.transcript ? Array.from(input.transcript.replace(/[\s，。！？、,.!?]/g, "")) : null;
  const syllables: SyllableScore[] = input.syllables.map((s, i) => {
    const recognized = got ? got.includes(s.hanzi) : null;
    const toneScore = segments[i]?.length ? scoreTone(segments[i], s.tone, range) : null;
    let verdict: SyllableScore["verdict"] = "ok";
    const t = toneScore ?? 0.5;
    if (recognized === false) verdict = t >= 0.7 ? "ok" : "bad";
    else if (recognized === true) verdict = t >= 0.55 || toneScore === null ? "good" : t >= 0.35 ? "ok" : "bad";
    else verdict = toneScore === null ? "ok" : t >= 0.7 ? "good" : t >= 0.4 ? "ok" : "bad";
    return { hanzi: s.hanzi, pinyin: s.pinyin, tone: s.tone, recognized, toneScore, verdict, note: recognized === false ? "no se reconoció" : toneScore !== null && toneScore < 0.4 ? toneHint(s.tone) : undefined };
  });
  const recognizedRatio = got ? syllables.filter((s) => s.recognized).length / Math.max(1, n) : null;
  const toneVals = syllables.map((s) => s.toneScore).filter((x): x is number => x !== null);
  const toneRatio = toneVals.length ? toneVals.reduce((a, b) => a + b, 0) / toneVals.length : null;
  const overall = recognizedRatio === null && toneRatio === null ? 0 : recognizedRatio === null ? toneRatio! : toneRatio === null ? recognizedRatio : 0.6 * recognizedRatio + 0.4 * toneRatio;
  return { syllables, overall, recognizedRatio, toneRatio };
}

function toneHint(t: Tone): string {
  return { 1: "mantén la voz alta y plana", 2: "sube como en una pregunta («¿sí?»)", 3: "baja y arrastra, sin subir mucho", 4: "cae de golpe, como una orden («¡no!»)", 5: "corta y suave, sin tono" }[t];
}
