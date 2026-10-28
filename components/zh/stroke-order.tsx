"use client";
import { useEffect, useRef, useState } from "react";
import type HanziWriter from "hanzi-writer";
import { Play, PenLine, RotateCcw, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Writer = HanziWriter;

/** Cargador de datos de trazos: primero local (/data/hanzi), luego CDN de hanzi-writer. */
export function charDataLoader(char: string, onComplete: (data: never) => void, onError?: (e?: unknown) => void) {
  fetch(`/data/hanzi/${encodeURIComponent(char)}.json`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error("local miss"))))
    .catch(() => fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${encodeURIComponent(char)}.json`).then((r) => (r.ok ? r.json() : Promise.reject(new Error("no data")))))
    .then((json) => onComplete(json as never))
    .catch((e) => onError?.(e));
}

function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!raw) return fallback;
  // tokens como tripleta RGB («28 25 21») o rgb(var(--x)) sin comas → hanzi-writer necesita hex o rgb(r, g, b)
  const m = raw.match(/^(?:rgb\()?\s*(\d+)\s+(\d+)\s+(\d+)\s*\)?$/);
  if (m) return `rgb(${m[1]}, ${m[2]}, ${m[3]})`;
  return raw;
}

export interface StrokeOrderProps {
  char: string;
  size?: number;
  mode?: "animate" | "quiz";
  grid?: boolean;
  autoplay?: boolean;
  showOutline?: boolean;
  onQuizComplete?: (r: { totalMistakes: number }) => void;
  onMistake?: (r: { strokeNum: number; mistakesOnStroke: number; totalMistakes: number }) => void;
  className?: string;
  controls?: boolean;
  strokeColor?: string;
  speed?: number;
}

/** Animación / quiz de orden de trazos con Hanzi Writer (datos offline). */
export function StrokeOrder({
  char,
  size = 160,
  mode = "animate",
  grid = true,
  autoplay = true,
  showOutline = true,
  onQuizComplete,
  onMistake,
  className,
  controls = true,
  strokeColor,
  speed = 1,
}: StrokeOrderProps) {
  const ref = useRef<HTMLDivElement>(null);
  const writerRef = useRef<Writer | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [outline, setOutline] = useState(showOutline);
  const [quizActive, setQuizActive] = useState(mode === "quiz");

  useEffect(() => {
    let cancelled = false;
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";
    setStatus("loading");
    import("hanzi-writer").then(({ default: HW }) => {
      if (cancelled || !ref.current) return;
      const w = HW.create(ref.current, char, {
        width: size,
        height: size,
        padding: Math.round(size * 0.08),
        showOutline: outline,
        showCharacter: mode !== "quiz",
        strokeAnimationSpeed: speed,
        delayBetweenStrokes: 220,
        strokeColor: strokeColor ?? cssVar("--ink", "#1c1915"),
        outlineColor: cssVar("--line", "#cfc4b1"),
        radicalColor: cssVar("--cinnabar", "#c0392b"),
        highlightColor: cssVar("--celadon", "#2f8f6f"),
        drawingColor: cssVar("--cinnabar", "#c0392b"),
        drawingWidth: Math.max(4, size / 28),
        charDataLoader: (c, onComplete) => charDataLoader(c, onComplete, () => !cancelled && setStatus("error")),
        onLoadCharDataSuccess: () => !cancelled && setStatus("ready"),
        onLoadCharDataError: () => !cancelled && setStatus("error"),
      });
      writerRef.current = w;
      if (mode === "quiz") {
        w.quiz({
          showHintAfterMisses: 2,
          onMistake: (r) => onMistake?.(r),
          onComplete: (r) => {
            onQuizComplete?.(r);
            setQuizActive(false);
          },
        });
      } else if (autoplay) {
        w.animateCharacter();
      }
    });
    return () => {
      cancelled = true;
      writerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [char, size, mode, speed]);

  const animate = () => writerRef.current?.animateCharacter();
  const startQuiz = () => {
    setQuizActive(true);
    writerRef.current?.quiz({
      showHintAfterMisses: 2,
      onMistake: (r) => onMistake?.(r),
      onComplete: (r) => {
        onQuizComplete?.(r);
        setQuizActive(false);
      },
    });
  };
  const toggleOutline = () => {
    const next = !outline;
    setOutline(next);
    if (next) writerRef.current?.showOutline();
    else writerRef.current?.hideOutline();
  };

  return (
    <div className={cn("inline-flex flex-col items-center gap-2", className)}>
      <div className={cn("relative rounded-lg", grid && "tianzige")} style={{ width: size, height: size }}>
        <div ref={ref} className="absolute inset-0" lang="zh-CN" aria-label={`Orden de trazos de ${char}`} />
        {status === "loading" ? <div className="absolute inset-0 flex items-center justify-center text-xs text-muted">…</div> : null}
        {status === "error" ? (
          <div className="absolute inset-0 flex items-center justify-center p-2 text-center text-xs text-muted">
            Sin datos de trazos para <span lang="zh-CN" className="zh ml-1 text-base">{char}</span>
          </div>
        ) : null}
      </div>
      {controls && status === "ready" ? (
        <div className="flex items-center gap-1">
          <Button size="icon-sm" variant="ghost" onClick={animate} aria-label="Animar trazos" title="Animar">
            <Play />
          </Button>
          <Button size="icon-sm" variant={quizActive ? "soft" : "ghost"} onClick={startQuiz} aria-label="Practicar escritura" title="Escribir">
            <PenLine />
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={toggleOutline} aria-label="Mostrar u ocultar contorno" title="Contorno">
            <Eye className={cn(!outline && "opacity-40")} />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => {
              writerRef.current?.cancelQuiz();
              setQuizActive(false);
              writerRef.current?.showCharacter();
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
