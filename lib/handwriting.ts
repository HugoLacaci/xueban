/**
 * Reconocimiento de escritura a mano offline (caracteres HSK 1–4) por comparación de trazos
 * con las medianas de Make Me a Hanzi / hanzi-writer-data (public/data/medians.json).
 * No es una red neuronal: compara forma y orden de trazos, suficiente para buscar en el diccionario.
 */
export type Point = [number, number];
export type Stroke = Point[];

const N = 8;

export function resampleStroke(pts: Point[], n = N): Point[] {
  if (!pts.length) return [];
  if (pts.length === 1) return Array.from({ length: n }, () => pts[0]);
  const total = pts.slice(1).reduce((acc, p, i) => acc + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
  if (total === 0) return Array.from({ length: n }, () => pts[0]);
  const step = total / (n - 1);
  const res: Point[] = [pts[0]];
  let acc = 0;
  let i = 0;
  let cur = pts[0];
  while (res.length < n && i < pts.length - 1) {
    const next = pts[i + 1];
    const d = Math.hypot(next[0] - cur[0], next[1] - cur[1]);
    if (acc + d >= step) {
      const t = (step - acc) / d;
      cur = [cur[0] + (next[0] - cur[0]) * t, cur[1] + (next[1] - cur[1]) * t];
      res.push(cur);
      acc = 0;
    } else {
      acc += d;
      cur = next;
      i++;
    }
  }
  while (res.length < n) res.push(pts[pts.length - 1]);
  return res;
}

/** Normaliza los trazos del usuario al cuadro 0–1 conservando la proporción (centrado). */
export function normalizeStrokes(strokes: Stroke[]): Stroke[] {
  const all = strokes.flat();
  if (!all.length) return [];
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [x, y] of all) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const scale = 0.82 / Math.max(w, h);
  const ox = 0.5 - ((minX + maxX) / 2) * scale;
  const oy = 0.5 - ((minY + maxY) / 2) * scale;
  return strokes.map((s) => resampleStroke(s).map(([x, y]) => [x * scale + ox, y * scale + oy] as Point));
}

function strokeDistance(a: Point[], b: Point[]): number {
  let d = 0;
  for (let i = 0; i < N; i++) d += Math.hypot(a[i][0] - b[i][0], a[i][1] - b[i][1]);
  // dirección: comparar también el trazo invertido y penalizar (permite trazos dibujados al revés con coste)
  let dr = 0;
  for (let i = 0; i < N; i++) dr += Math.hypot(a[i][0] - b[N - 1 - i][0], a[i][1] - b[N - 1 - i][1]);
  return Math.min(d, dr * 1.3) / N;
}

export interface Candidate {
  char: string;
  score: number; // menor = mejor
}

/**
 * Devuelve los caracteres más parecidos. `medians` es el mapa char → trazos normalizados (8 puntos).
 * Tolera ±2 trazos de diferencia y orden ligeramente distinto (emparejamiento voraz).
 */
export function recognize(userStrokes: Stroke[], medians: Record<string, number[][][]>, limit = 8): Candidate[] {
  const strokes = normalizeStrokes(userStrokes.filter((s) => s.length > 0));
  if (!strokes.length) return [];
  const n = strokes.length;
  const out: Candidate[] = [];
  for (const [char, ref] of Object.entries(medians)) {
    const m = ref.length;
    if (Math.abs(m - n) > 2) continue;
    // emparejamiento en orden con ventana ±1, penalizando trazos sobrantes
    let total = 0;
    const used = new Set<number>();
    for (let i = 0; i < n; i++) {
      let best = Infinity;
      let bestJ = -1;
      for (let j = Math.max(0, i - 2); j <= Math.min(m - 1, i + 2); j++) {
        if (used.has(j)) continue;
        const d = strokeDistance(strokes[i], ref[j] as Point[]);
        if (d < best) {
          best = d;
          bestJ = j;
        }
      }
      if (bestJ >= 0) {
        used.add(bestJ);
        total += best + Math.abs(bestJ - i) * 0.03;
      } else total += 0.5;
    }
    total += Math.abs(m - n) * 0.25;
    out.push({ char, score: total / Math.max(n, 1) });
  }
  return out.sort((a, b) => a.score - b.score).slice(0, limit);
}

let mediansCache: Record<string, number[][][]> | undefined;
export async function loadMedians(): Promise<Record<string, number[][][]>> {
  if (mediansCache) return mediansCache;
  const res = await fetch("/data/medians.json");
  if (!res.ok) throw new Error("No se pudieron cargar las medianas (npm run data:build)");
  mediansCache = (await res.json()) as Record<string, number[][][]>;
  return mediansCache;
}
