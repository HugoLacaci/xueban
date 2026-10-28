"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { BookOpen, Check, ChevronRight, Lock, Play, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { UNITS } from "@/lib/course";
import { nextRecommended, unitStats } from "@/lib/course/progress";
import { Button } from "@/components/ui/button";
import { Badge, PageHeader } from "@/components/ui/primitives";
import { Enso, Seal, ShanShui, dayPhase, type DayPhase } from "@/components/ornament";
import { cn } from "@/lib/utils";
import { Paifang, PathSegment, Pavilion, zhNumeral } from "./map-art";

const noop = () => () => undefined;
const serverPhase = (): DayPhase => "day";

/** Posición horizontal (0–100) del nodo de la unidad i en el carril: zigzag en escritorio, recto en móvil. */
const xDesk = (i: number) => (i % 2 === 0 ? 30 : 70);
const xMob = (_i: number) => 50; // eslint-disable-line @typescript-eslint/no-unused-vars

export function UnitMap() {
  const rows = useLiveQuery(() => db.lessonProgress.toArray(), []);
  const progress = useMemo(() => new Map((rows ?? []).map((r) => [r.lessonId, r])), [rows]);
  const next = useMemo(() => nextRecommended(progress), [progress]);
  const totalLessons = UNITS.reduce((a, u) => a + u.lessons.length, 0);
  const doneLessons = Array.from(progress.values()).filter((p) => p.status === "completed").length;
  const phase = useSyncExternalStore(noop, dayPhase, serverPhase);
  const bgRef = useRef<HTMLDivElement>(null);

  // Parallax sutil del paisaje (solo escritorio, solo transform, respeta reduced-motion)
  useEffect(() => {
    const el = bgRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !window.matchMedia("(min-width: 768px)").matches) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.transform = `translate3d(0, ${Math.min(240, window.scrollY * 0.22)}px, 0)`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const pct = totalLessons ? doneLessons / totalLessons : 0;

  return (
    <div className="space-y-2">
      <PageHeader
        title="Aprender"
        zh="学习"
        subtitle={`Curso HSK 1 por temas: ${UNITS.length} unidades · ${totalLessons} lecciones cortas (10–15 min). Cada lección: vocabulario → diálogo → gramática → ejercicios → repaso.`}
        action={
          <>
            <Button variant="secondary" asChild>
              <Link href="/aprender/gramatica">
                <BookOpen /> Gramática
              </Link>
            </Button>
            {next ? (
              <Button asChild>
                <Link href={`/aprender/leccion/${next.lessonId}`}>
                  <Play /> Continuar
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="relative">
        {/* 山水: paisaje de fondo con parallax */}
        <div ref={bgRef} className="pointer-events-none absolute inset-x-0 top-0 -mx-4 h-[340px] opacity-60 motion-safe:will-change-transform sm:-mx-6" aria-hidden="true">
          <ShanShui phase={phase} height={340} seed={11} layers={4} />
        </div>

        {/* Cima: ensō de progreso + pabellón de meta */}
        <section className="relative mb-8 mt-2 flex flex-wrap items-center gap-5 rounded-[14px] border border-line/70 bg-paper-raised/85 p-4 shadow-[var(--shadow-paper)] backdrop-blur-[3px] sm:gap-8 sm:p-5" aria-label="Progreso del curso">
          <Enso size={104} progress={pct} stroke={pct >= 1 ? "rgb(var(--cinnabar))" : "rgb(var(--ink))"} label="Progreso del curso">
            <span className="block font-serif-es text-2xl font-semibold leading-none text-ink tabular">{Math.round(pct * 100)}%</span>
            <span className="mt-1 block text-[10px] uppercase tracking-wider text-ink-faint">curso</span>
          </Enso>
          <div className="min-w-0 flex-1">
            <p className="font-serif-es text-lg font-medium text-ink">Camino del curso</p>
            <p className="text-sm text-ink-faint">
              <span className="tabular">{doneLessons}</span> de <span className="tabular">{totalLessons}</span> lecciones completadas
              {next ? "" : " · ¡curso terminado!"}
            </p>
            <p className="mt-1 text-xs text-ink-faint">
              <span lang="zh-CN" className="zh-kai text-sm text-ink-soft">
                千里之行，始于足下
              </span>
              <span className="ml-2">Un viaje de mil li empieza con un paso.</span>
            </p>
          </div>
          <div className="hidden flex-col items-center sm:flex" aria-hidden="true">
            <Pavilion size={64} tone={next ? "ink" : "cinnabar"} />
            <span className="text-[10px] uppercase tracking-wider text-ink-faint">HSK 1</span>
          </div>
        </section>

        {/* Camino de montaña: nodos (sellos) + tramos */}
        <ol className="relative" aria-label="Unidades del curso">
          {UNITS.map((u, ui) => {
            const st = unitStats(u.id, progress);
            const completed = st.total > 0 && st.done === st.total;
            const isNextUnit = next?.unitId === u.id;
            const prevDone = ui === 0 || unitStats(UNITS[ui - 1].id, progress).done === UNITS[ui - 1].lessons.length;
            const locked = !prevDone && st.done === 0 && !isNextUnit;
            const numeral = u.level === 0 ? Array.from(u.zh)[0] ?? "零" : zhNumeral(u.order - 1);
            const isLast = ui === UNITS.length - 1;
            return (
              <li key={u.id} className="relative flex gap-2 pb-6 sm:gap-4">
                {/* carril */}
                <div className="relative w-12 shrink-0 sm:w-16 md:w-28" aria-hidden="true">
                  <div className="absolute inset-x-0 bottom-[-24px] top-6">
                    <PathSegment from={xMob(ui)} to={isLast ? 50 : xMob(ui + 1)} done={completed} className="md:hidden" />
                    <PathSegment from={xDesk(ui)} to={isLast ? 50 : xDesk(ui + 1)} done={completed} className="hidden md:block" />
                  </div>
                  <div className="absolute top-6 -translate-x-1/2 -translate-y-1/2 md:[left:var(--xd)] [left:var(--xm)]" style={{ ["--xm" as string]: `${xMob(ui)}%`, ["--xd" as string]: `${xDesk(ui)}%` }}>
                    {isNextUnit ? <span className="absolute -inset-2 rounded-full border-2 border-cinnabar/60 motion-safe:animate-breathe" /> : null}
                    <Seal text={numeral} size={48} tone={completed ? "cinnabar" : "ink"} rotate={ui % 2 === 0 ? -3 : 3} className={cn(locked && "opacity-40")} title={`Unidad ${u.level === 0 ? 0 : u.order - 1}${completed ? " completada" : locked ? " (recomendada después)" : ""}`} />
                  </div>
                </div>

                {/* ficha de la unidad */}
                <article className={cn("card-paper min-w-0 flex-1 overflow-hidden p-0", isNextUnit && "border-cinnabar/50 shadow-[var(--shadow-float)]", locked && "opacity-80")}>
                  <header className="flex items-start gap-3 p-4 pb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h2 className="font-serif-es text-lg font-semibold leading-tight text-ink">
                          <span className="text-ink-faint">{u.level === 0 ? "Unidad 0 · " : `Unidad ${u.order - 1} · `}</span>
                          {u.title}
                        </h2>
                        <span lang="zh-CN" className="zh-kai text-base text-cinnabar">
                          {u.zh}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-ink-faint">{u.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {u.level === 0 ? <Badge variant="gold">base</Badge> : <Badge variant="jade">HSK 1</Badge>}
                        {completed ? (
                          <Badge variant="lacquer">
                            <Check className="size-3" /> completada
                          </Badge>
                        ) : null}
                        {isNextUnit ? (
                          <Badge variant="lacquer">
                            <Sparkles className="size-3" /> siguiente
                          </Badge>
                        ) : null}
                        {locked ? (
                          <Badge variant="muted">
                            <Lock className="size-3" /> recomendado después
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-paper-sunk px-2 py-0.5 text-xs text-ink-soft tabular">
                      {st.done}/{st.total}
                    </span>
                  </header>

                  <ol className="divide-y divide-line border-t border-line">
                    {u.lessons.map((l, li) => {
                      const p = progress.get(l.id);
                      const done = p?.status === "completed";
                      const isNext = next?.lessonId === l.id;
                      return (
                        <li key={l.id}>
                          <Link
                            href={`/aprender/leccion/${l.id}`}
                            aria-current={isNext ? "step" : undefined}
                            className={cn("group flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-paper-sunk/60", isNext && "bg-cinnabar/[0.06]")}
                          >
                            <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium tabular", done ? "bg-celadon text-paper-raised" : p?.status === "started" ? "bg-gold/25 text-gold-ink" : "bg-paper-sunk text-ink-faint")}>
                              {done ? <Check className="size-3.5" /> : li + 1}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-medium text-ink">{l.title}</span>
                              <span className="block truncate text-xs text-ink-faint">{l.goal}</span>
                            </span>
                            {p?.score !== undefined ? <span className="hidden text-xs text-ink-faint tabular sm:inline">{Math.round(p.score * 100)} %</span> : null}
                            <span className="text-xs text-ink-faint tabular">{l.minutes} min</span>
                            <ChevronRight className="size-4 text-ink-faint transition-transform group-hover:translate-x-0.5" />
                          </Link>
                        </li>
                      );
                    })}
                    {u.checkpoint ? (
                      <li>
                        <Link href={`/aprender/checkpoint/${u.id}`} className="group flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-paper-sunk/60">
                          <Paifang size={28} tone="gold" className="-my-1 shrink-0" />
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium text-ink">Checkpoint de la unidad</span>
                            <span className="block text-xs text-ink-faint">Pasa por el 牌坊: ejercicios mezclados de toda la unidad.</span>
                          </span>
                          <span className="text-xs text-ink-faint tabular">{u.checkpoint.exercises} ej.</span>
                          <ChevronRight className="size-4 text-ink-faint transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </li>
                    ) : null}
                  </ol>
                </article>
              </li>
            );
          })}
          {/* destino: pabellón en la cima */}
          <li className="relative flex gap-2 sm:gap-4" aria-hidden="true">
            <div className="flex w-12 shrink-0 justify-center sm:w-16 md:w-28">
              <Pavilion size={56} tone={next ? "faint" : "cinnabar"} />
            </div>
            <p className="self-center text-sm text-ink-faint">{next ? "Meta: HSK 1 completo." : "Has llegado a la cima. 恭喜！"}</p>
          </li>
        </ol>
      </div>
    </div>
  );
}
