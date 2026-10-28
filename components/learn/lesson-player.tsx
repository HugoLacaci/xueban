"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, X } from "lucide-react";
import { lessonById, nextLesson, stepLabel } from "@/lib/course";
import { markCompleted, markStarted } from "@/lib/course/progress";
import { useSettings } from "@/lib/settings";
import { playFeedback } from "@/lib/sounds";
import { Button } from "@/components/ui/button";
import { Badge, PageHeader, Progress } from "@/components/ui/primitives";
import { InkDivider, PetalRain, Seal } from "@/components/ornament";
import { cn } from "@/lib/utils";
import { ExplainStep, VocabStep, DialogueStep, GrammarStep, ExercisesStep, ReadingStep, ReviewStep } from "./steps";
import { PinyinTableStep, TonesStep, TonePairsStep, StrokesStep, RadicalsStep, SpanishErrorsStep } from "./special-steps";

/** Cuenta de 0 a `target` con rAF (~700 ms). Sin movimiento → valor final directo. */
function useCountUp(target: number, duration = 700): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = setTimeout(() => setV(target), 0);
      return () => clearTimeout(t);
    }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      setV(Math.round(target * eased));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

/** Pantalla de fin de lección: tinta que se extiende, sello 完成 estampado, cifras que suben, pétalos. */
function LessonDone({ title, zh, score, words, onNext, nextTitle }: { title: string; zh?: string; score: number | null; words: number; onNext?: () => void; nextTitle?: string }) {
  const sounds = useSettings((s) => s.settings.sounds);
  const [stage, setStage] = useState<0 | 1 | 2>(0); // 0 tinta · 1 sello · 2 cifras
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t1 = setTimeout(() => setStage(1), reduce ? 50 : 350);
    const t2 = setTimeout(() => setStage(2), reduce ? 100 : 900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);
  useEffect(() => {
    if (stage === 1) playFeedback("stamp", sounds);
  }, [stage, sounds]);
  const n = useCountUp(stage === 2 ? (score ?? words) : 0);

  return (
    <div className="relative mx-auto max-w-lg">
      {stage >= 1 ? <PetalRain duration={1400} count={32} /> : null}
      <div className="card-paper relative overflow-hidden px-6 pb-8 pt-10 text-center sm:px-10">
        {/* tinta que se extiende desde el centro */}
        <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-24 size-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink/10 motion-safe:animate-[ink-spread_900ms_var(--ease-ink)_forwards] motion-reduce:scale-[28] motion-reduce:opacity-0" />
        <style>{`@keyframes ink-spread { 0% { transform: translate(-50%,-50%) scale(0.2); opacity: .35; } 100% { transform: translate(-50%,-50%) scale(30); opacity: 0; } }`}</style>

        <div className="relative mx-auto flex h-24 items-center justify-center">
          {stage >= 1 ? <Seal text="完成" size={92} stamped rotate={-4} title="Lección completada" /> : <span className="size-[92px]" />}
        </div>
        <h1 className="font-serif-es mt-4 text-[26px] font-semibold leading-tight text-ink">¡Lección completada!</h1>
        <p className="mt-1 text-ink-soft">
          {title}
          {zh ? (
            <span lang="zh-CN" className="zh-kai ml-2 text-cinnabar">
              {zh}
            </span>
          ) : null}
        </p>

        <InkDivider label="成绩" className="my-5" />

        <div className={cn("grid grid-cols-2 gap-3 transition-opacity duration-500", stage < 2 && "opacity-0")} aria-live="polite">
          <div className="card-sunk p-3">
            <p className="font-serif-es text-3xl font-semibold text-ink tabular">
              {score !== null ? `${n} %` : n}
            </p>
            <p className="text-xs text-ink-faint">{score !== null ? "acierto en ejercicios" : "palabras vistas"}</p>
          </div>
          <div className="card-sunk p-3">
            <p className="font-serif-es text-3xl font-semibold text-celadon-ink tabular">{words}</p>
            <p className="text-xs text-ink-faint">palabras en tu mazo</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-ink-faint">El vocabulario nuevo ya está en tus tarjetas. Lo verás en el repaso de mañana.</p>

        <div className={cn("mt-6 flex flex-wrap justify-center gap-2 transition-opacity duration-500", stage < 2 && "opacity-0")}>
          {onNext ? (
            <Button size="lg" onClick={onNext}>
              Siguiente: {nextTitle} <ArrowRight />
            </Button>
          ) : null}
          <Button variant="secondary" size="lg" asChild>
            <Link href="/aprender">Volver al curso</Link>
          </Button>
          <Button variant="ghost" size="lg" asChild>
            <Link href="/">Hoy</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function LessonPlayer({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  const found = useMemo(() => lessonById(lessonId), [lessonId]);
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (found) void markStarted(found.unit.id, found.lesson.id);
  }, [found]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  if (!found) {
    return (
      <div>
        <PageHeader title="Lección no encontrada" />
        <Button asChild variant="secondary">
          <Link href="/aprender">
            <ArrowLeft /> Volver al curso
          </Link>
        </Button>
      </div>
    );
  }
  const { unit, lesson } = found;
  const steps = lesson.steps;
  const cur = steps[step];
  const isLast = step === steps.length - 1;
  const next = nextLesson(lesson.id);

  const finish = async () => {
    const vals = Object.values(scores);
    const score = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : undefined;
    await markCompleted(unit.id, lesson.id, score);
    setDone(true);
  };

  const goNext = () => {
    if (isLast) void finish();
    else setStep((s) => s + 1);
  };

  if (done) {
    const vals = Object.values(scores);
    const score = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) : null;
    return <LessonDone title={lesson.title} zh={lesson.zh} score={score} words={lesson.vocab.length} nextTitle={next?.lesson.title} onNext={next ? () => router.push(`/aprender/leccion/${next.lesson.id}`) : undefined} />;
  }

  const pct = ((step + 1) / steps.length) * 100;

  return (
    <div className="mx-auto max-w-3xl">
      {/* cabecera: cerrar · unidad · paso, con pincelada de progreso */}
      <div className="mb-4">
        <div className="flex items-center gap-2 text-sm">
          <Button variant="ghost" size="icon-sm" asChild aria-label="Cerrar la lección y volver al curso">
            <Link href="/aprender">
              <X />
            </Link>
          </Button>
          <Link href="/aprender" className="flex min-w-0 items-center gap-1 text-ink-faint hover:text-ink">
            <ChevronLeft className="size-4 shrink-0" /> <span className="truncate">{unit.title}</span>
          </Link>
          <span className="ml-auto shrink-0 text-xs text-ink-faint tabular">
            {lesson.minutes} min · paso {step + 1} / {steps.length}
          </span>
        </div>
        <Progress value={pct} brush className="mt-2 h-1.5" color={isLast ? "rgb(var(--celadon))" : "rgb(var(--ink))"} />
      </div>

      <h1 className="font-serif-es text-[26px] font-semibold leading-tight tracking-tight text-ink sm:text-3xl">
        {lesson.title}
        {lesson.zh ? (
          <span lang="zh-CN" className="zh-kai ml-2 text-xl font-normal text-cinnabar">
            {lesson.zh}
          </span>
        ) : null}
      </h1>
      <p className="mb-4 mt-1 text-sm text-ink-faint">
        <span className="font-medium text-ink-soft">Objetivo:</span> {lesson.goal}
        {!lesson.reviewed ? (
          <Badge variant="muted" className="ml-2">
            contenido pendiente de revisar con tu profesor
          </Badge>
        ) : null}
      </p>

      {/* barra de pasos: scroll horizontal con bordes desvanecidos */}
      <div className="relative -mx-4 mb-5 sm:mx-0">
        <ol className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 py-1 sm:px-0 [mask-image:linear-gradient(90deg,transparent,#000_14px,#000_calc(100%-14px),transparent)]" aria-label="Pasos de la lección">
          {steps.map((s, i) => (
            <li key={i} className="shrink-0">
              <button
                onClick={() => setStep(i)}
                aria-current={i === step ? "step" : undefined}
                aria-label={stepLabel(s)}
                className={cn(
                  "flex h-8 items-center gap-1 rounded-full border px-3 text-xs transition-colors duration-[var(--dur-ui)]",
                  i === step ? "border-ink bg-ink text-paper" : i < step ? "border-celadon/50 bg-celadon/12 text-celadon-ink" : "border-line bg-paper-raised text-ink-faint hover:border-ink/30 hover:text-ink",
                )}
              >
                {i < step ? <Check className="size-3" /> : <span className="tabular">{i + 1}</span>}
                {stepLabel(s)}
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div key={step} className="motion-safe:animate-ink-in">
        {cur.type === "explain" ? <ExplainStep step={cur} /> : null}
        {cur.type === "vocab" ? <VocabStep lesson={lesson} step={cur} /> : null}
        {cur.type === "dialogue" ? <DialogueStep step={cur} /> : null}
        {cur.type === "grammar" ? <GrammarStep id={cur.id} /> : null}
        {cur.type === "exercises" ? (
          <ExercisesStep
            lesson={lesson}
            step={cur}
            seed={step}
            onFinish={(s) => {
              setScores((sc) => ({ ...sc, [step]: s }));
              goNext();
            }}
          />
        ) : null}
        {cur.type === "reading" ? (
          <ReadingStep
            lesson={lesson}
            step={cur}
            onFinish={(s) => {
              setScores((sc) => ({ ...sc, [step]: s }));
              goNext();
            }}
          />
        ) : null}
        {cur.type === "review" ? <ReviewStep lesson={lesson} scores={scores} /> : null}
        {cur.type === "pinyin-table" ? <PinyinTableStep /> : null}
        {cur.type === "tones" ? <TonesStep /> : null}
        {cur.type === "tone-pairs" ? <TonePairsStep /> : null}
        {cur.type === "strokes" ? <StrokesStep /> : null}
        {cur.type === "radicals" ? <RadicalsStep radicals={cur.radicals} /> : null}
        {cur.type === "spanish-errors" ? <SpanishErrorsStep /> : null}
      </div>

      {cur.type !== "exercises" && cur.type !== "reading" ? (
        <div className="mt-6 flex items-center justify-between gap-2">
          <Button variant="ghost" size="lg" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ArrowLeft /> Anterior
          </Button>
          <Button onClick={goNext} size="lg" variant={isLast ? "jade" : "default"}>
            {isLast ? (
              <>
                <Check /> Terminar lección
              </>
            ) : (
              <>
                Siguiente <ArrowRight />
              </>
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
