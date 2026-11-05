"use client";
import Link from "@/lib/languages/link";
import { Fragment, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { BookOpen, Check, ChevronRight, FileText, Lock, Play, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { usePack } from "@/lib/languages/provider";
import { nextRecommended, unitStats } from "@/lib/course/progress";
import { Button } from "@/components/ui/button";
import { Badge, PageHeader } from "@/components/ui/primitives";
import { Enso, Seal, ShanShui, dayPhase, type DayPhase } from "@/components/ornament";
import { cn } from "@/lib/utils";
import { Paifang, PathSegment, Pavilion, mapNumeral as zhNumeral } from "./map-art";
import { getActiveLang } from "@/lib/languages/registry";
import { targetLang } from "@/lib/languages/registry";
import { ui as uiText, pageNative, culture, numeral as numeralOf } from "@/lib/languages/ui-text";
import { Mixed } from "@/components/target/mixed";

const noop = () => () => undefined;

/** Temario v2: etapas (pestañas del mapa). */
const STAGES: { id: string; es: string; zh: string }[] = [
  { id: "e0", es: "Etapa 0 · sonidos", zh: "发音" },
  { id: "a1", es: "A1 · HSK 1", zh: "一级" },
  { id: "a2", es: "A2 · HSK 2", zh: "二级" },
  { id: "b1", es: "B1 · HSK 3", zh: "三级" },
];
/** Número de la unidad dentro de su etapa (a1-u05 → 5) y etiqueta corta. */
const unitNum = (id: string) => Number(id.match(/-u(\d+)$/)?.[1] ?? 0);
const unitLabel = (id: string) =>
  id === "e0"
    ? "Etapa 0"
    : id.startsWith("a1-")
      ? `Unidad ${unitNum(id)}`
      : `${id.slice(0, 2).toUpperCase()} · Unidad ${unitNum(id)}`;
const serverPhase = (): DayPhase => "day";

/** Posición horizontal (0–100) del nodo de la unidad i en el carril: zigzag en escritorio, recto en móvil. */
const xDesk = (i: number) => (i % 2 === 0 ? 30 : 70);
const xMob = (_i: number) => 50; // eslint-disable-line @typescript-eslint/no-unused-vars

export function UnitMap() {
  const pack = usePack();
  const allUnits = pack.curriculum.units;
  const hasStages = allUnits.some((u) => u.stage);
  const levelTitle = pack.curriculum.levelTitle;
  const rows = useLiveQuery(
    () => db.lessonProgress.where("lang").equals(getActiveLang()).toArray(),
    [],
  );
  const progress = useMemo(() => new Map((rows ?? []).map((r) => [r.lessonId, r])), [rows]);
  const next = useMemo(() => nextRecommended(progress), [progress]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const nextStage = allUnits.find((u) => u.id === next?.unitId)?.stage ?? "e0";
  // todas las etapas en el mismo camino; las pestañas saltan a cada una y marcan la etapa actual
  const stage = nextStage;
  const units = allUnits;
  const goStage = (id: string) =>
    document.getElementById(`etapa-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const totalLessons = allUnits.reduce((a, u) => a + u.lessons.length, 0);
  const doneLessons = Array.from(progress.values()).filter((p) => p.status === "completed").length;
  const phase = useSyncExternalStore(noop, dayPhase, serverPhase);
  const bgRef = useRef<HTMLDivElement>(null);

  // Parallax sutil del paisaje (solo escritorio, solo transform, respeta reduced-motion)
  useEffect(() => {
    const el = bgRef.current;
    if (!el) return;
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !window.matchMedia("(min-width: 768px)").matches
    )
      return;
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
        zh={pageNative("learn")}
        subtitle={
          hasStages
            ? `De cero a HSK 3 en ${allUnits.length} unidades y ${totalLessons} lecciones de 10–15 min. Cada lección: objetivo → vocabulario → pronunciación → carácter del día → gramática con el esqueleto de la frase → diálogo → práctica → construye la frase.`
            : `Curso ${levelTitle} por temas: ${units.length} unidades · ${totalLessons} lecciones cortas (10–15 min). Cada lección: vocabulario → diálogo → gramática → ejercicios → repaso.`
        }
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
      {pack.ui.extraPages?.length ? (
        <div className="flex flex-wrap gap-2 pb-2">
          {pack.ui.extraPages.map((p) => (
            <Link
              key={p.href}
              href={`/aprender/modulo/${p.href}`}
              className="card-paper hover:border-ink/40 flex items-center gap-2 px-3 py-2 text-sm"
            >
              <span lang={pack.bcp47} className={`${pack.meta.cssClass} text-cinnabar`}>
                <Mixed>{p.native}</Mixed>
              </span>
              <span className="text-ink">
                <Mixed>{p.title}</Mixed>
              </span>
              <span className="text-ink-faint hidden text-xs sm:inline">
                · <Mixed>{p.description}</Mixed>
              </span>
            </Link>
          ))}
        </div>
      ) : null}

      <div className="relative">
        {/* 山水: paisaje de fondo con parallax */}
        <div
          ref={bgRef}
          className="pointer-events-none absolute inset-x-0 top-0 -mx-4 h-[340px] opacity-60 motion-safe:will-change-transform sm:-mx-6"
          aria-hidden="true"
        >
          <ShanShui phase={phase} height={340} seed={11} layers={4} />
        </div>

        {/* Cima: ensō de progreso + pabellón de meta */}
        <section
          className="border-line/70 bg-paper-raised/85 relative mt-2 mb-8 flex flex-wrap items-center gap-5 rounded-[14px] border p-4 shadow-[var(--shadow-paper)] backdrop-blur-[3px] sm:gap-8 sm:p-5"
          aria-label="Progreso del curso"
        >
          <Enso
            size={104}
            progress={pct}
            stroke={pct >= 1 ? "rgb(var(--cinnabar))" : "rgb(var(--ink))"}
            label="Progreso del curso"
          >
            <span className="font-serif-es text-ink tabular block text-2xl leading-none font-semibold">
              {Math.round(pct * 100)}%
            </span>
            <span className="text-ink-faint mt-1 block text-[10px] tracking-wider uppercase">
              curso
            </span>
          </Enso>
          <div className="min-w-0 flex-1">
            <p className="font-serif-es text-ink text-lg font-medium">Camino del curso</p>
            <p className="text-ink-faint text-sm">
              <span className="tabular">{doneLessons}</span> de{" "}
              <span className="tabular">{totalLessons}</span> lecciones completadas
              {next ? "" : " · ¡curso terminado!"}
            </p>
            <p className="text-ink-faint mt-1 text-xs">
              <span lang={targetLang()} className="zh-kai text-ink-soft text-sm">
                <Mixed>{culture().onboarding.proverbs[0]}</Mixed>
              </span>
              <span className="ml-2">Un viaje de mil li empieza con un paso.</span>
            </p>
          </div>
          <div className="hidden flex-col items-center sm:flex" aria-hidden="true">
            <Pavilion size={64} tone={next ? "ink" : "cinnabar"} />
            <span className="text-ink-faint text-[10px] tracking-wider uppercase">
              <Mixed>{levelTitle}</Mixed>
            </span>
          </div>
        </section>

        {hasStages ? (
          <div
            className="relative mb-6 flex flex-wrap gap-1.5"
            aria-label="Ir a una etapa del temario"
          >
            {STAGES.filter((st) => allUnits.some((u) => u.stage === st.id)).map((st) => {
              const us = allUnits.filter((u) => u.stage === st.id);
              const tot = us.reduce((a, u) => a + u.lessons.length, 0);
              const dn = us.reduce((a, u) => a + unitStats(u.id, progress).done, 0);
              return (
                <button
                  key={st.id}
                  type="button"
                  aria-current={stage === st.id ? "step" : undefined}
                  title={stage === st.id ? "Tu etapa actual" : undefined}
                  onClick={() => goStage(st.id)}
                  className={cn(
                    "flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-sm transition-colors",
                    stage === st.id
                      ? "border-ink bg-ink text-paper"
                      : "border-line bg-paper-raised text-ink-soft hover:border-ink/40",
                  )}
                >
                  <span lang={targetLang()} className="zh-kai">
                    {st.zh}
                  </span>
                  {st.es}
                  <span
                    className={cn(
                      "tabular text-xs",
                      stage === st.id ? "text-paper/70" : "text-ink-faint",
                    )}
                  >
                    {dn}/{tot}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {/* Camino de montaña: nodos (sellos) + tramos */}
        <ol className="relative" aria-label="Unidades del curso">
          {units.map((u, ui) => {
            const st = unitStats(u.id, progress);
            const completed = st.total > 0 && st.done === st.total;
            const isNextUnit = next?.unitId === u.id;
            const prevDone =
              ui === 0 ||
              unitStats(units[ui - 1].id, progress).done === units[ui - 1].lessons.length;
            const locked = !prevDone && st.done === 0 && !isNextUnit;
            const numeral =
              u.level === 0
                ? (Array.from(u.zh)[0] ?? numeralOf(0))
                : hasStages
                  ? zhNumeral(unitNum(u.id))
                  : zhNumeral(u.order - 1);
            const open =
              !hasStages ||
              isNextUnit ||
              (st.done + st.started > 0 && !completed) ||
              expanded.has(u.id);
            const isLast = ui === units.length - 1;
            return (
              <Fragment key={u.id}>
                {hasStages && (ui === 0 || units[ui - 1].stage !== u.stage) ? (
                  <li
                    id={`etapa-${u.stage}`}
                    className="relative scroll-mt-20 pb-4 pl-14 sm:pl-20 md:pl-32"
                  >
                    <h2 className="font-serif-es text-ink text-xl font-semibold">
                      <span lang={targetLang()} className="zh-kai text-cinnabar mr-2">
                        {STAGES.find((x) => x.id === u.stage)?.zh}
                      </span>
                      {STAGES.find((x) => x.id === u.stage)?.es}
                      {u.stage === stage ? (
                        <Badge variant="lacquer" className="ml-2 align-middle">
                          tu etapa
                        </Badge>
                      ) : null}
                    </h2>
                  </li>
                ) : null}
                <li className="relative flex gap-2 pb-6 sm:gap-4">
                  {/* carril */}
                  <div className="relative w-12 shrink-0 sm:w-16 md:w-28" aria-hidden="true">
                    <div className="absolute inset-x-0 top-6 bottom-[-24px]">
                      <PathSegment
                        from={xMob(ui)}
                        to={isLast ? 50 : xMob(ui + 1)}
                        done={completed}
                        className="md:hidden"
                      />
                      <PathSegment
                        from={xDesk(ui)}
                        to={isLast ? 50 : xDesk(ui + 1)}
                        done={completed}
                        className="hidden md:block"
                      />
                    </div>
                    <div
                      className="absolute top-6 [left:var(--xm)] -translate-x-1/2 -translate-y-1/2 md:[left:var(--xd)]"
                      style={{
                        ["--xm" as string]: `${xMob(ui)}%`,
                        ["--xd" as string]: `${xDesk(ui)}%`,
                      }}
                    >
                      {isNextUnit ? (
                        <span className="border-cinnabar/60 motion-safe:animate-breathe absolute -inset-2 rounded-full border-2" />
                      ) : null}
                      <Seal
                        text={numeral}
                        size={48}
                        tone={completed ? "cinnabar" : "ink"}
                        rotate={ui % 2 === 0 ? -3 : 3}
                        className={cn(locked && "opacity-40")}
                        title={`${hasStages ? unitLabel(u.id) : `Unidad ${u.level === 0 ? 0 : u.order - 1}`}${completed ? " completada" : locked ? " (recomendada después)" : ""}`}
                      />
                    </div>
                  </div>

                  {/* ficha de la unidad */}
                  <article
                    className={cn(
                      "card-paper min-w-0 flex-1 overflow-hidden p-0",
                      isNextUnit && "border-cinnabar/50 shadow-[var(--shadow-float)]",
                      locked && "border-dashed shadow-none",
                    )}
                  >
                    <header className="flex items-start gap-3 p-4 pb-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <h2 className="font-serif-es text-ink text-lg leading-tight font-semibold">
                            <span className="text-ink-faint">
                              {hasStages
                                ? `${unitLabel(u.id)} · `
                                : u.level === 0
                                  ? "Unidad 0 · "
                                  : `Unidad ${u.order - 1} · `}
                            </span>
                            <Mixed>{u.title}</Mixed>
                          </h2>
                          <span lang={targetLang()} className="zh-kai text-cinnabar text-base">
                            <Mixed>{u.zh}</Mixed>
                          </span>
                        </div>
                        <p className="text-ink-faint mt-1 text-sm">
                          <Mixed>{u.description}</Mixed>
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {u.level === 0 ? (
                            <Badge variant="gold">base</Badge>
                          ) : (
                            <Badge variant="jade">
                              <Mixed>{hasStages && u.level ? `HSK ${u.level}` : levelTitle}</Mixed>
                            </Badge>
                          )}
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
                      <span className="bg-paper-sunk text-ink-soft tabular shrink-0 rounded-full px-2 py-0.5 text-xs">
                        {st.done}/{st.total}
                      </span>
                    </header>

                    {!open ? (
                      <button
                        type="button"
                        onClick={() => setExpanded((e) => new Set(e).add(u.id))}
                        className="border-line text-ink-soft hover:bg-paper-sunk/60 flex w-full items-center gap-2 border-t px-4 py-2.5 text-left text-sm"
                      >
                        <ChevronRight className="size-4" /> Ver las {u.lessons.length} lecciones
                        {u.checkpoint ? " y el checkpoint" : ""}
                      </button>
                    ) : null}
                    <ol
                      className={cn("divide-line border-line divide-y border-t", !open && "hidden")}
                    >
                      {u.lessons.map((l, li) => {
                        const p = progress.get(l.id);
                        const done = p?.status === "completed";
                        const isNext = next?.lessonId === l.id;
                        return (
                          <li key={l.id}>
                            <Link
                              href={`/aprender/leccion/${l.id}`}
                              aria-current={isNext ? "step" : undefined}
                              className={cn(
                                "group hover:bg-paper-sunk/60 flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                                isNext && "bg-cinnabar/[0.06]",
                              )}
                            >
                              <span
                                className={cn(
                                  "tabular flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium",
                                  done
                                    ? "bg-celadon text-paper-raised"
                                    : p?.status === "started"
                                      ? "bg-gold/25 text-gold-ink"
                                      : "bg-paper-sunk text-ink-faint",
                                )}
                              >
                                {done ? <Check className="size-3.5" /> : li + 1}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="text-ink block font-medium">
                                  <Mixed>{l.title}</Mixed>
                                </span>
                                <span className="text-ink-faint block truncate text-xs">
                                  <Mixed>{l.goal}</Mixed>
                                </span>
                              </span>
                              {p?.score !== undefined ? (
                                <span className="text-ink-faint tabular hidden text-xs sm:inline">
                                  {Math.round(p.score * 100)} %
                                </span>
                              ) : null}
                              <span className="text-ink-faint tabular text-xs">
                                {l.minutes} min
                              </span>
                              <ChevronRight className="text-ink-faint size-4 transition-transform group-hover:translate-x-0.5" />
                            </Link>
                          </li>
                        );
                      })}
                      {u.checkpoint ? (
                        <li>
                          <Link
                            href={`/aprender/checkpoint/${u.id}`}
                            className="group hover:bg-paper-sunk/60 flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                          >
                            <Paifang size={28} tone="gold" className="-my-1 shrink-0" />
                            <span className="min-w-0 flex-1">
                              <span className="text-ink block font-medium">
                                Checkpoint de la unidad
                              </span>
                              <span className="text-ink-faint block text-xs">
                                Pasa por el <span lang={targetLang()}>{uiText().gate}</span>:
                                ejercicios mezclados de toda la unidad.
                              </span>
                            </span>
                            <span className="text-ink-faint tabular text-xs">
                              {u.checkpoint.exercises} ej.
                            </span>
                            <ChevronRight className="text-ink-faint size-4 transition-transform group-hover:translate-x-0.5" />
                          </Link>
                        </li>
                      ) : null}
                      {hasStages && u.lessons.length ? (
                        <li>
                          <Link
                            href={`/aprender/ficha?u=${u.id}`}
                            className="group hover:bg-paper-sunk/60 flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                          >
                            <FileText className="text-ink-faint size-5 shrink-0" />
                            <span className="min-w-0 flex-1">
                              <span className="text-ink block font-medium">
                                Ficha resumen imprimible
                              </span>
                              <span className="text-ink-faint block text-xs">
                                Vocabulario, gramática con el esqueleto y frases modelo de la
                                unidad.
                              </span>
                            </span>
                            <ChevronRight className="text-ink-faint size-4 transition-transform group-hover:translate-x-0.5" />
                          </Link>
                        </li>
                      ) : null}
                    </ol>
                  </article>
                </li>
              </Fragment>
            );
          })}
          {/* destino: pabellón en la cima */}
          <li className="relative flex gap-2 sm:gap-4" aria-hidden="true">
            <div className="flex w-12 shrink-0 justify-center sm:w-16 md:w-28">
              <Pavilion size={56} tone={next ? "faint" : "cinnabar"} />
            </div>
            <p className="text-ink-faint self-center text-sm">
              {next
                ? `Meta: ${levelTitle} completo.`
                : `Has llegado a la cima. ${uiText().congrats}`}
            </p>
          </li>
        </ol>
      </div>
    </div>
  );
}
