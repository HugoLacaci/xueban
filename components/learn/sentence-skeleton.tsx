"use client";
/**
 * <SentenceSkeleton>: el esqueleto de la frase china como fila de huecos de colores.
 *  - `focus`: huecos que se estrenan en la explicación → se resaltan (con animación) y el resto se atenúa.
 *  - `at`: punto del temario (unidad o lección); los huecos que aún no se han enseñado no se dibujan.
 *  - Cada frase se coloca en sus huecos, con pinyin conmutable y audio.
 *  - `compare`: comparación con el orden español, con flechas para lo que cambia de sitio.
 * En móvil la fila se desplaza en horizontal (con indicador) sin cortar texto.
 */
import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, Languages } from "lucide-react";
import {
  columnsFor,
  filledSlots,
  joinPy,
  joinZh,
  moves,
  slotDef,
  type SkeletonSentence,
  type SlotId,
} from "@/lib/course/skeleton";
import { usePackOptional } from "@/lib/languages/provider";
import { useSettings } from "@/lib/settings";
import { AudioButton } from "@/components/target/audio-button";
import { Reading } from "@/components/target/reading";
import { cn } from "@/lib/utils";

const rgb = (token: string, a = 1) => `rgb(var(${token}) / ${a})`;

export function SentenceSkeleton({
  sentences,
  focus = [],
  at,
  compare = false,
  title,
  className,
}: {
  sentences: SkeletonSentence[];
  focus?: SlotId[];
  at?: string;
  compare?: boolean;
  title?: string;
  className?: string;
}) {
  const pinyinMode = useSettings((s) => s.settings.pinyinMode);
  const [showPy, setShowPy] = useState(pinyinMode !== "hide");
  const [showCompare, setShowCompare] = useState(compare);
  const cols = useMemo(() => columnsFor(sentences, at), [sentences, at]);
  const hasCompare = sentences.some((s) => s.esOrder?.length);
  const focusSet = new Set(focus);
  return (
    <figure
      className={cn("border-line bg-paper-raised rounded-[12px] border p-3", className)}
      data-skeleton
    >
      <figcaption className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-ink-faint text-[11px] font-semibold tracking-[0.12em] uppercase">
          {title ?? "Esqueleto de la frase"}
        </span>
        <span className="ml-auto flex gap-1">
          <button
            type="button"
            onClick={() => setShowPy((v) => !v)}
            aria-pressed={showPy}
            className={cn(
              "flex h-7 items-center gap-1 rounded-full border px-2 text-[11px]",
              showPy ? "border-ink/50 text-ink" : "border-line text-ink-faint",
            )}
          >
            <Languages className="size-3" /> pinyin
          </button>
          {hasCompare ? (
            <button
              type="button"
              onClick={() => setShowCompare((v) => !v)}
              aria-pressed={showCompare}
              className={cn(
                "flex h-7 items-center gap-1 rounded-full border px-2 text-[11px]",
                showCompare ? "border-ink/50 text-ink" : "border-line text-ink-faint",
              )}
            >
              <ArrowLeftRight className="size-3" /> vs. español
            </button>
          ) : null}
        </span>
      </figcaption>
      {/* móvil: cada frase es una fila de fichas que salta de línea (nada se corta) */}
      <ul className="space-y-2.5 sm:hidden">
        {sentences.map((sn, i) => (
          <li key={i}>
            <div className="flex flex-wrap items-end gap-1">
              {filledSlots(sn).map((id) => {
                const d = slotDef(id);
                const f = sn.slots[id]!;
                const on = !focus.length || focusSet.has(id);
                return (
                  <span
                    key={id}
                    className={cn(
                      "flex flex-col rounded-[8px] border px-1.5 py-0.5",
                      !on && "opacity-55",
                    )}
                    style={{
                      borderColor: rgb(d.color, focusSet.has(id) ? 0.9 : 0.45),
                      background: focusSet.has(id) ? rgb(d.color, 0.08) : undefined,
                    }}
                  >
                    <span
                      className="text-[9px] leading-tight font-semibold tracking-wide uppercase"
                      style={{ color: rgb(d.color === "--ink-faint" ? "--ink-soft" : d.color) }}
                    >
                      {d.es.replace(/ (.*)$/, "")}
                    </span>
                    <span lang="zh-CN" className="zh text-ink text-lg leading-snug">
                      {f.zh}
                    </span>
                    {showPy ? <SlotReading fill={f} /> : null}
                  </span>
                );
              })}
              <AudioButton text={joinZh(sn)} size="sm" label={`Escuchar: ${joinZh(sn)}`} />
            </div>
            <p className="text-ink-soft mt-0.5 text-xs">{sn.es}</p>
          </li>
        ))}
      </ul>
      <div className="relative -mx-3 hidden sm:block">
        <div
          className="[scrollbar-width:thin] overflow-x-auto px-3 pb-1"
          role="region"
          aria-label="Huecos de la frase (desliza en horizontal)"
          tabIndex={0}
        >
          <table className="border-separate border-spacing-x-1 border-spacing-y-1.5">
            <thead>
              <tr>
                {cols.map((id) => {
                  const d = slotDef(id);
                  const on = !focus.length || focusSet.has(id);
                  return (
                    <th
                      key={id}
                      scope="col"
                      className={cn(
                        "rounded-[6px] px-2 py-1 text-left text-[10.5px] font-semibold tracking-wide whitespace-nowrap uppercase transition-opacity",
                        on ? "opacity-100" : "opacity-45",
                        focusSet.has(id) && "motion-safe:animate-[pop_.6s_var(--ease-ink)_both]",
                      )}
                      style={{
                        background: rgb(d.color, focusSet.has(id) ? 0.22 : 0.1),
                        color: rgb(d.color === "--ink-faint" ? "--ink-soft" : d.color),
                      }}
                    >
                      {d.es}
                      {focusSet.has(id) ? (
                        <span className="bg-cinnabar text-paper-raised ml-1 rounded-full px-1 text-[9px]">
                          nuevo
                        </span>
                      ) : null}
                    </th>
                  );
                })}
                <th className="w-8" aria-label="Audio" />
              </tr>
            </thead>
            <tbody>
              {sentences.map((s, i) => (
                <SkeletonRow key={i} s={s} cols={cols} focus={focusSet} showPy={showPy} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showCompare
        ? sentences
            .filter((s) => s.esOrder?.length)
            .slice(0, 2)
            .map((s, i) => <CompareSpanish key={i} s={s} />)
        : null}
    </figure>
  );
}

function SkeletonRow({
  s,
  cols,
  focus,
  showPy,
}: {
  s: SkeletonSentence;
  cols: SlotId[];
  focus: Set<SlotId>;
  showPy: boolean;
}) {
  const zh = joinZh(s);
  return (
    <>
      <tr>
        {cols.map((id) => {
          const f = s.slots[id];
          const d = slotDef(id);
          const dim = focus.size > 0 && !focus.has(id);
          return (
            <td
              key={id}
              className={cn(
                "rounded-[8px] border px-2 py-1 align-top whitespace-nowrap transition-opacity",
                f ? "" : "border-dashed",
                dim ? "opacity-55" : "",
              )}
              style={{
                borderColor: rgb(d.color, f ? (focus.has(id) ? 0.9 : 0.45) : 0.2),
                background: f && focus.has(id) ? rgb(d.color, 0.08) : undefined,
              }}
            >
              {f ? (
                <>
                  <span lang="zh-CN" className="zh text-ink block text-lg leading-snug">
                    {f.zh}
                  </span>
                  {showPy ? <SlotReading fill={f} /> : null}
                </>
              ) : (
                <span className="text-ink-faint/60 block text-center text-xs">·</span>
              )}
            </td>
          );
        })}
        <td className="align-middle">
          <AudioButton text={zh} size="sm" label={`Escuchar: ${zh}`} />
        </td>
      </tr>
      <tr>
        <td colSpan={cols.length + 1} className="text-ink-soft pb-1.5 pl-1 text-xs">
          <span lang="zh-CN" className="zh sr-only">
            {zh}
          </span>
          {s.es}
        </td>
      </tr>
    </>
  );
}

function SlotReading({ fill }: { fill: { zh: string; py?: string } }) {
  const pack = usePackOptional();
  const py = useMemo(() => {
    if (fill.py) return fill.py;
    try {
      return (
        pack
          ?.analyze(fill.zh)
          .tokens.map((t) => t.reading ?? "")
          .filter(Boolean)
          .join(" ") ?? ""
      );
    } catch {
      return "";
    }
  }, [fill, pack]);
  return py ? <Reading text={py} className="block text-[11px] leading-tight" /> : null;
}

/** Frase española arriba, china abajo; flechas de color para cada trozo que cambia de sitio. */
function CompareSpanish({ s }: { s: SkeletonSentence }) {
  const ref = useRef<HTMLDivElement>(null);
  const esRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const zhRefs = useRef<Partial<Record<SlotId, HTMLSpanElement | null>>>({});
  const [lines, setLines] = useState<
    { x1: number; y1: number; x2: number; y2: number; color: string; moved: boolean }[]
  >([]);
  const mv = useMemo(() => moves(s), [s]);
  const markerId = `sk-arrow-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const zhCols = filledSlots(s);
  useLayoutEffect(() => {
    const measure = () => {
      const root = ref.current?.getBoundingClientRect();
      if (!root) return;
      const out: typeof lines = [];
      for (const m of mv) {
        const a = esRefs.current[m.esIndex]?.getBoundingClientRect();
        const b = zhRefs.current[m.slot]?.getBoundingClientRect();
        if (!a || !b) continue;
        out.push({
          x1: a.left + a.width / 2 - root.left,
          y1: a.bottom - root.top,
          x2: b.left + b.width / 2 - root.left,
          y2: b.top - root.top,
          color: slotDef(m.slot).color,
          moved: m.moved,
        });
      }
      setLines(out);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, [mv]);
  const py = joinPy(s);
  return (
    <div className="mt-3 overflow-x-auto">
      <div ref={ref} className="relative min-w-max px-1 py-1">
        <p className="text-ink-faint mb-1 text-[10px] font-semibold tracking-wide uppercase">
          Español
        </p>
        <div className="flex flex-wrap gap-1">
          {s.esOrder!.map((t, i) => (
            <span
              key={i}
              ref={(el) => void (esRefs.current[i] = el)}
              className="text-ink rounded-[6px] border px-1.5 py-0.5 text-sm"
              style={{ borderColor: t.slot ? rgb(slotDef(t.slot).color, 0.6) : "transparent" }}
            >
              {t.text}
            </span>
          ))}
        </div>
        <div className="h-10" aria-hidden="true" />
        <p className="text-ink-faint mb-1 text-[10px] font-semibold tracking-wide uppercase">
          Chino
        </p>
        <div className="flex gap-1">
          {zhCols.map((id) => (
            <span
              key={id}
              ref={(el) => void (zhRefs.current[id] = el)}
              lang="zh-CN"
              className="zh text-ink rounded-[6px] border px-1.5 py-0.5 text-base"
              style={{
                borderColor: rgb(slotDef(id).color, 0.6),
                background: rgb(slotDef(id).color, 0.06),
              }}
            >
              {s.slots[id]!.zh}
            </span>
          ))}
          <span className="zh text-ink text-base">{s.end}</span>
        </div>
        {py ? <Reading text={py} className="mt-0.5 block text-xs" /> : null}
        <svg
          className="pointer-events-none absolute inset-0 size-full overflow-visible"
          aria-hidden="true"
        >
          <defs>
            <marker
              id={markerId}
              viewBox="0 0 6 6"
              refX="3"
              refY="3"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M0 0L6 3L0 6z" fill="currentColor" />
            </marker>
          </defs>
          {lines.map((l, i) => (
            <path
              key={i}
              d={`M${l.x1} ${l.y1 + 2} C ${l.x1} ${(l.y1 + l.y2) / 2}, ${l.x2} ${(l.y1 + l.y2) / 2}, ${l.x2} ${l.y2 - 3}`}
              fill="none"
              stroke={rgb(l.color, l.moved ? 0.9 : 0.3)}
              strokeWidth={l.moved ? 1.8 : 1}
              strokeDasharray={l.moved ? undefined : "3 3"}
              style={{ color: rgb(l.color, l.moved ? 0.9 : 0.3) }}
              markerEnd={`url(#${markerId})`}
            />
          ))}
        </svg>
        <p className="text-ink-faint mt-1 max-w-[calc(100vw-4rem)] text-[10.5px] whitespace-normal sm:max-w-none">
          Flecha continua = cambia de sitio respecto al español; discontinua = mismo orden.
        </p>
      </div>
    </div>
  );
}
