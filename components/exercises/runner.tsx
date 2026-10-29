"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { ArrowRight, Lightbulb, Minus, SkipForward, X } from "lucide-react";
import { check } from "@/lib/exercises/check";
import type { CheckResult, Exercise, Response } from "@/lib/exercises/types";
import { EXERCISE_LABELS } from "@/lib/exercises/types";
import { logAttempt, logStudy } from "@/lib/db";
import { useSettings } from "@/lib/settings";
import { playFeedback } from "@/lib/sounds";
import { Button } from "@/components/ui/button";
import { Kbd, Progress } from "@/components/ui/primitives";
import { BrushCheck } from "@/components/ornament/ink-divider";
import { InkRipple } from "@/components/ornament/celebration";
import { cn } from "@/lib/utils";
import { ExerciseView } from "./exercise-view";
import { targetLang } from "@/lib/languages/registry";
import { ui } from "@/lib/languages/ui-text";

export interface RunnerResult {
  exercise: Exercise;
  result: CheckResult;
  response: Response;
  durationMs: number;
}

export interface SessionSummary {
  total: number;
  correct: number;
  partial: number;
  wrong: number;
  skipped: number;
  results: RunnerResult[];
  minutes: number;
}

/** Posición del último puntero (para la onda de tinta del acierto). */
interface Pointer {
  x: number;
  y: number;
  t: number;
}

export function ExerciseRunner({
  exercises,
  context,
  onFinish,
  title,
  allowSkip = true,
  timerSeconds,
  deferFeedback = false,
}: {
  exercises: Exercise[];
  context: string; // lessonId | "practice" | "exam" | grammar id
  onFinish: (s: SessionSummary) => void;
  title?: string;
  allowSkip?: boolean;
  timerSeconds?: number;
  /** modo examen: no muestra la corrección y pasa a la siguiente pregunta */
  deferFeedback?: boolean;
}) {
  const settings = useSettings((s) => s.settings);
  const [idx, setIdx] = useState(0);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [results, setResults] = useState<RunnerResult[]>([]);
  const [remaining, setRemaining] = useState(timerSeconds ?? 0);
  const [ripple, setRipple] = useState<(Pointer & { key: number }) | null>(null);
  const started = useRef(0);
  const shownAt = useRef(0);
  const pointer = useRef<Pointer>({ x: 0, y: 0, t: 0 });
  const ex = exercises[idx];
  const continueRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    started.current = Date.now();
    shownAt.current = Date.now();
    const onPointer = (e: PointerEvent) => {
      pointer.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    };
    document.addEventListener("pointerdown", onPointer, { passive: true });
    return () => document.removeEventListener("pointerdown", onPointer);
  }, []);

  useEffect(() => {
    if (!ripple) return;
    const t = setTimeout(() => setRipple(null), 650);
    return () => clearTimeout(t);
  }, [ripple]);

  const finish = useCallback(
    (all: RunnerResult[]) => {
      const minutes = (Date.now() - started.current) / 60000;
      if (minutes > 0.3) void logStudy({ start: started.current, end: Date.now(), minutes, kind: context === "practice" ? "practice" : context === "exam" ? "practice" : "lesson", ref: context });
      const counted = all.filter((r) => !r.result.skip);
      onFinish({
        total: counted.length,
        correct: counted.filter((r) => r.result.correct).length,
        partial: counted.filter((r) => !r.result.correct && r.result.partial).length,
        wrong: counted.filter((r) => !r.result.correct && !r.result.partial).length,
        skipped: all.length - counted.length,
        results: all,
        minutes,
      });
    },
    [context, onFinish],
  );

  // temporizador (simulacro)
  useEffect(() => {
    if (!timerSeconds) return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t);
          finish(results);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerSeconds]);

  const submit = useCallback(
    (response: Response) => {
      if (!ex || result) return;
      const r = check(ex, response);
      const durationMs = Date.now() - shownAt.current;
      setResult(r);
      if (!r.skip) {
        if (!deferFeedback) {
          playFeedback(r.correct ? "ok" : "fail", settings.sounds);
          const p = pointer.current;
          if (r.correct && Date.now() - p.t < 1500) setRipple({ ...p, key: Date.now() });
        }
        void logAttempt({ exerciseType: ex.type, itemId: ex.itemId, itemKind: ex.itemKind, skill: ex.skill, correct: r.correct, answer: responseText(response), expected: r.expected, context, durationMs });
      }
      const all = [...results, { exercise: ex, result: r, response, durationMs }];
      setResults(all);
      if (deferFeedback) {
        if (idx + 1 >= exercises.length) finish(all);
        else {
          setIdx(idx + 1);
          setResult(null);
          shownAt.current = Date.now();
        }
        return;
      }
      setTimeout(() => continueRef.current?.focus(), 50);
    },
    [ex, result, settings.sounds, context, results, deferFeedback, idx, exercises.length, finish],
  );

  const next = useCallback(() => {
    if (idx + 1 >= exercises.length) {
      finish(results);
      return;
    }
    setIdx(idx + 1);
    setResult(null);
    shownAt.current = Date.now();
  }, [idx, exercises.length, results, finish]);

  const skip = () => {
    if (!ex) return;
    const r: CheckResult = { correct: false, expected: "", explanation: "Saltado", skip: true };
    setResults((rs) => [...rs, { exercise: ex, result: r, response: { kind: "self", correct: false }, durationMs: 0 }]);
    next();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && result) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [result, next]);

  const pct = useMemo(() => (exercises.length ? (idx / exercises.length) * 100 : 0), [idx, exercises.length]);

  if (!ex) return null;

  const tone = result?.skip ? "skip" : result?.correct ? "ok" : result?.partial ? "partial" : "fail";
  const last = idx + 1 >= exercises.length;

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto flex w-full max-w-2xl flex-col min-h-[calc(100dvh-10.5rem)] md:min-h-0">
        {/* cabecera silenciosa: título, tipo, cronómetro, contador y saltar */}
        <div className="mb-2 flex items-center justify-between gap-3 text-xs text-ink-faint">
          <span className="flex min-w-0 items-center gap-2">
            {title ? <span className="truncate font-medium text-ink-soft">{title}</span> : null}
            {title ? <span aria-hidden="true">·</span> : null}
            <span className="truncate">{EXERCISE_LABELS[ex.type]}</span>
          </span>
          <span className="flex shrink-0 items-center gap-3">
            {timerSeconds ? (
              <span className={cn("tabular font-medium", remaining < 60 ? "text-danger" : "text-ink-soft")} aria-live="polite">
                {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
              </span>
            ) : null}
            <span className="tabular text-ink-soft">
              {idx + 1} / {exercises.length}
            </span>
            {allowSkip && !result ? (
              <Button variant="ghost" size="sm" onClick={skip} className="-mr-2 h-7 px-2 text-xs text-ink-faint hover:text-ink">
                <SkipForward className="size-3.5" /> Saltar
              </Button>
            ) : null}
          </span>
        </div>
        <Progress value={pct} className="mb-6 h-1.5" />

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={ex.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }} className="flex-1">
            <ExerciseView ex={ex} onSubmit={submit} result={result} />
          </motion.div>
        </AnimatePresence>

        {/* panel de corrección: sube desde abajo, en la zona del pulgar en móvil */}
        <div className="mt-auto pt-5">
          <AnimatePresence>
            {result ? (
              <motion.div
                key={ex.id + "-fb"}
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                role="status"
                aria-live="polite"
                className={cn(
                  "sticky bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-20 rounded-[14px] border p-4 shadow-[var(--shadow-float)] backdrop-blur-[2px] md:static",
                  tone === "ok" && "border-celadon/50 bg-[color-mix(in_oklab,rgb(var(--celadon))_14%,rgb(var(--paper-raised)))]",
                  tone === "fail" && "border-danger/40 bg-[color-mix(in_oklab,rgb(var(--danger))_10%,rgb(var(--paper-raised)))]",
                  tone === "partial" && "border-gold/50 bg-[color-mix(in_oklab,rgb(var(--gold))_12%,rgb(var(--paper-raised)))]",
                  tone === "skip" && "border-line bg-paper-raised",
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
                      tone === "ok" && "bg-celadon/15",
                      tone === "fail" && "bg-danger/12 text-danger",
                      tone === "partial" && "bg-gold/15 text-gold-ink",
                      tone === "skip" && "bg-paper-sunk text-ink-faint",
                    )}
                    aria-hidden="true"
                  >
                    {tone === "ok" ? <BrushCheck size={26} /> : tone === "partial" ? <Lightbulb className="size-[18px]" /> : tone === "skip" ? <Minus className="size-[18px]" /> : <X className="size-[18px]" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn("flex flex-wrap items-baseline gap-x-2 font-semibold", tone === "ok" && "text-celadon-ink", tone === "fail" && "text-danger", tone === "partial" && "text-gold-ink", tone === "skip" && "text-ink-soft")}>
                      <span>{tone === "skip" ? "Sin evaluar" : tone === "ok" ? "¡Correcto!" : tone === "partial" ? "Casi" : "Incorrecto"}</span>
                      {tone !== "skip" ? (
                        <span lang={targetLang()} className="zh text-sm font-normal opacity-80">
                          {tone === "ok" ? ui().feedback.ok : tone === "partial" ? ui().feedback.partial : ui().feedback.wrong}
                        </span>
                      ) : null}
                    </p>
                    {result.explanation ? <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{result.explanation}</p> : null}
                    {!result.correct && result.expected && !result.skip ? (
                      <p className="mt-1.5 text-sm">
                        <span className="text-ink-faint">Respuesta: </span>
                        <span lang={targetLang()} className="zh-serif text-lg font-medium text-ink">
                          {result.expected}
                        </span>
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button ref={continueRef} onClick={next} variant={tone === "ok" ? "jade" : "ink"} size="lg" className="w-full sm:w-auto">
                    {last ? "Terminar" : "Continuar"} <ArrowRight />
                    <Kbd className="ml-1 border-paper/30 bg-paper/15 text-paper">Enter</Kbd>
                  </Button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
        {ripple ? <InkRipple key={ripple.key} x={ripple.x} y={ripple.y} /> : null}
      </div>
    </MotionConfig>
  );
}

function responseText(r: Response): string {
  switch (r.kind) {
    case "choice":
      return String(r.index);
    case "text":
      return r.text;
    case "tones":
      return r.tones.join("");
    case "tiles":
      return r.tiles.join(" ");
    case "tf":
      return r.values.map((v) => (v ? "V" : "F")).join("");
    case "matching":
      return `${r.mistakes} fallos`;
    case "writing":
      return `${r.mistakes} fallos`;
    case "speaking":
      return r.transcript;
    case "self":
      return r.correct ? "auto:ok" : "auto:fail";
  }
}
