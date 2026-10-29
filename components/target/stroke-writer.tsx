"use client";
/**
 * <StrokeWriter>: animación y quiz de orden de trazos para datos de líneas centrales
 * (KanjiVG: kanji y kana; trazos de jamo). Formato de datos: { strokes: string[] (paths SVG en un
 * viewBox 0–1024, y hacia abajo), medians: [x,y][][] } — el mismo que genera scripts/data/ja.ts.
 * El quiz compara el trazo dibujado con la mediana (inicio, fin, longitud y dirección), como Hanzi Writer.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Play, PenLine, RotateCcw, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePack } from "@/lib/languages/provider";
import { getActivePack } from "@/lib/languages/registry";
import type { StrokeOrderProps } from "./stroke-order";
import { GRID_CLASS } from "./stroke-order";

export interface StrokeData {
  strokes: string[];
  medians: [number, number][][];
  /** Ancho del trazo en unidades del viewBox (por defecto 52 sobre 1024) */
  width?: number;
  /** Tamaño del viewBox (KanjiVG: 109; por defecto 1024) */
  size?: number;
}

const cache = new Map<string, Promise<StrokeData | null>>();

export function loadStrokeData(char: string): Promise<StrokeData | null> {
  const key = `${getActivePack().id}:${char}`;
  let p = cache.get(key);
  if (!p) {
    const sp = getActivePack().strokeData;
    if (sp.load) {
      p = sp.load(char).then((d) => (d as StrokeData | null) ?? null);
      cache.set(key, p);
      return p;
    }
    p = fetch(sp.url(char))
      .then((r) => (r.ok ? (r.json() as Promise<StrokeData>) : null))
      .catch(() => null);
    cache.set(key, p);
  }
  return p;
}

type Pt = [number, number];
const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function length(pts: Pt[]): number {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += dist(pts[i - 1], pts[i]);
  return l;
}
function resample(pts: Pt[], n: number): Pt[] {
  if (pts.length < 2) return Array.from({ length: n }, () => pts[0] ?? [0, 0]);
  const total = length(pts);
  const step = total / (n - 1);
  const out: Pt[] = [pts[0]];
  let acc = 0;
  let i = 0;
  let cur = pts[0];
  while (out.length < n && i < pts.length - 1) {
    const next = pts[i + 1];
    const d = dist(cur, next);
    if (acc + d >= step && d > 0) {
      const t = (step - acc) / d;
      cur = [cur[0] + (next[0] - cur[0]) * t, cur[1] + (next[1] - cur[1]) * t];
      out.push(cur);
      acc = 0;
    } else {
      acc += d;
      cur = next;
      i++;
    }
  }
  while (out.length < n) out.push(pts[pts.length - 1]);
  return out;
}

/** Compara el trazo del usuario con la mediana (0–1). Umbrales relativos al tamaño del carácter (1024). */
export function matchStroke(userIn: Pt[], medianIn: Pt[], size = 1024): boolean {
  if (userIn.length < 2) return false;
  const k = 1024 / size;
  const u = resample(userIn.map(([x, y]) => [x * k, y * k] as Pt), 12);
  const m = resample(medianIn.map(([x, y]) => [x * k, y * k] as Pt), 12);
  const startOk = dist(u[0], m[0]) < 180;
  const endOk = dist(u[u.length - 1], m[m.length - 1]) < 180;
  const lu = length(u);
  const lm = length(m);
  const lenOk = lm < 120 ? lu < 300 : lu / lm > 0.45 && lu / lm < 1.9;
  let avg = 0;
  for (let i = 0; i < 12; i++) avg += dist(u[i], m[i]);
  avg /= 12;
  const shapeOk = avg < 150;
  return startOk && endOk && lenOk && shapeOk;
}

export function StrokeWriter({ char, size = 160, mode = "animate", grid = true, autoplay = true, showOutline = true, onQuizComplete, onMistake, className, controls = true, strokeColor, speed = 1 }: StrokeOrderProps) {
  const pack = usePack();
  const [data, setData] = useState<StrokeData | null | undefined>(undefined);
  const [outline, setOutline] = useState(showOutline);
  const [quiz, setQuiz] = useState(mode === "quiz");
  const [animKey, setAnimKey] = useState(0);
  const [drawn, setDrawn] = useState(0); // trazos completados en el quiz
  const [current, setCurrent] = useState<Pt[]>([]);
  const [hint, setHint] = useState(false);
  const [flash, setFlash] = useState<"ok" | "bad" | null>(null);
  const missesRef = useRef(0);
  const totalRef = useRef(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const vb = data?.size ?? 1024;
  const strokeW = data?.width ?? 52;

  // al cambiar de carácter o de modo se reinicia el estado (ajuste durante el render, sin efecto)
  const [prevKey, setPrevKey] = useState(`${char}|${mode}`);
  if (prevKey !== `${char}|${mode}`) {
    setPrevKey(`${char}|${mode}`);
    setData(undefined);
    setDrawn(0);
    setQuiz(mode === "quiz");
  }

  useEffect(() => {
    let alive = true;
    missesRef.current = 0;
    totalRef.current = 0;
    void loadStrokeData(char).then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, [char, mode]);

  const toSvgPoint = useCallback((e: React.PointerEvent): Pt => {
    const svg = svgRef.current!;
    const r = svg.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * vb, ((e.clientY - r.top) / r.height) * vb];
  }, [vb]);

  const finishStroke = () => {
    if (!data || !quiz || current.length < 2) {
      setCurrent([]);
      return;
    }
    const ok = matchStroke(current, data.medians[drawn], vb);
    if (ok) {
      const n = drawn + 1;
      setDrawn(n);
      setHint(false);
      missesRef.current = 0;
      setFlash("ok");
      if (n >= data.strokes.length) {
        setQuiz(false);
        onQuizComplete?.({ totalMistakes: totalRef.current });
      }
    } else {
      missesRef.current++;
      totalRef.current++;
      onMistake?.({ strokeNum: drawn, mistakesOnStroke: missesRef.current, totalMistakes: totalRef.current });
      if (missesRef.current >= 2) setHint(true);
      setFlash("bad");
    }
    setTimeout(() => setFlash(null), 250);
    setCurrent([]);
  };

  const startQuiz = () => {
    setDrawn(0);
    setQuiz(true);
    setHint(false);
    missesRef.current = 0;
    totalRef.current = 0;
  };

  const ink = strokeColor ?? "rgb(var(--ink))";
  const total = data?.strokes.length ?? 0;
  const dur = 0.5 / speed;

  return (
    <div className={cn("inline-flex flex-col items-center gap-2", className)}>
      <div className={cn("relative rounded-lg", grid && GRID_CLASS[pack.strokeData.grid])} style={{ width: size, height: size }}>
        {data ? (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${vb} ${vb}`}
            width={size}
            height={size}
            className={cn("absolute inset-0 touch-none select-none", quiz && "cursor-crosshair")}
            lang={pack.bcp47}
            aria-label={`Orden de trazos de ${char}`}
            onPointerDown={(e) => {
              if (!quiz) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              setCurrent([toSvgPoint(e)]);
            }}
            onPointerMove={(e) => {
              if (!quiz || !current.length) return;
              setCurrent((c) => [...c, toSvgPoint(e)]);
            }}
            onPointerUp={finishStroke}
            onPointerCancel={() => setCurrent([])}
          >
            {/* contorno tenue */}
            {outline || !quiz
              ? data.strokes.map((d, i) => <path key={`o${i}`} d={d} fill="none" stroke="rgb(var(--line))" strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round" opacity={quiz ? 0.9 : 0.35} />)
              : null}
            {/* trazos ya escritos (quiz) o animación */}
            {quiz
              ? data.strokes.slice(0, drawn).map((d, i) => <path key={`d${i}`} d={d} fill="none" stroke={ink} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round" />)
              : data.strokes.map((d, i) => (
                  <path
                    key={`a${animKey}-${i}`}
                    d={d}
                    fill="none"
                    stroke={ink}
                    strokeWidth={strokeW}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    pathLength={100}
                    className={autoplay || animKey > 0 ? "stroke-anim" : undefined}
                    style={{ animationDelay: `${i * (dur + 0.18)}s`, animationDuration: `${dur}s` }}
                  />
                ))}
            {/* pista: siguiente trazo en bermellón */}
            {quiz && hint && drawn < total ? <path d={data.strokes[drawn]} fill="none" stroke="rgb(var(--cinnabar))" strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round" opacity={0.55} className="motion-safe:animate-breathe" /> : null}
            {/* trazo en curso */}
            {current.length > 1 ? (
              <polyline points={current.map((p) => p.join(",")).join(" ")} fill="none" stroke={flash === "bad" ? "rgb(var(--danger))" : "rgb(var(--cinnabar))"} strokeWidth={Math.max(vb * 0.03, strokeW * 0.9)} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
            ) : null}
            {flash === "ok" ? <circle cx={vb * 0.93} cy={vb * 0.08} r={vb * 0.025} fill="rgb(var(--celadon))" opacity="0.8" /> : null}
          </svg>
        ) : null}
        {data === undefined ? <div className="absolute inset-0 flex items-center justify-center text-xs text-muted">…</div> : null}
        {data === null ? (
          <div className="absolute inset-0 flex items-center justify-center p-2 text-center text-xs text-muted">
            Sin datos de trazos para{" "}
            <span lang={pack.bcp47} className={cn(pack.meta.cssClass, "ml-1 text-base")}>
              {char}
            </span>
          </div>
        ) : null}
        {quiz && total ? (
          <span className="absolute -bottom-1 right-1 rounded bg-paper-raised/80 px-1 text-[10px] tabular text-ink-faint" aria-live="polite">
            {drawn}/{total}
          </span>
        ) : null}
      </div>
      {controls && data ? (
        <div className="flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => {
              setQuiz(false);
              setAnimKey((k) => k + 1);
            }}
            aria-label="Animar trazos"
            title="Animar"
          >
            <Play />
          </Button>
          <Button size="icon-sm" variant={quiz ? "soft" : "ghost"} onClick={startQuiz} aria-label="Practicar escritura" title="Escribir">
            <PenLine />
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={() => setOutline((o) => !o)} aria-label="Mostrar u ocultar contorno" title="Contorno">
            <Eye className={cn(!outline && "opacity-40")} />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => {
              setQuiz(false);
              setDrawn(0);
              setAnimKey(0);
            }}
            aria-label="Reiniciar"
            title="Reiniciar"
          >
            <RotateCcw />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
