"use client";
/**
 * <LangPortal>: la «puerta» de un idioma. Cada una lleva la piel completa de su cultura (`data-skin`):
 * ilustración por capas, patrón, glifo gigante, sello y rama que florece.
 *   size="hero"    → panel vertical de la portada (acordeón, parallax, placa de información).
 *   size="compact" → miniatura de ~88 px para la cabecera, el onboarding y /me.
 * state: active (estudiando) · recommended (activo y sugerido hoy) · inactive (puerta entornada).
 */
import { forwardRef, useCallback, useRef } from "react";
import NextLink from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import "@fontsource/zen-old-mincho/700.css";
import "@fontsource/gowun-batang/700.css";
import { LANG_META } from "@/lib/languages/registry";
import type { Lang } from "@/lib/languages/types";
import type { GlobalSummary } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { PortalArt } from "@/components/ornament/portal-art";
import type { DayPhase } from "@/components/ornament/shan-shui";
import { Seal } from "@/components/ornament/seal";
import { Lattice } from "@/components/ornament/lattice";
import { PlumBranch } from "@/components/ornament/plum-branch";
import { WagaraPattern, SakuraBranch } from "@/components/ornament/ja";
import { Bojagi, MugunghwaBranch } from "@/components/ornament/ko";

export type PortalStats = GlobalSummary["perLang"][Lang];
export type PortalState = "active" | "recommended" | "inactive";

/** Datos fijos de la puerta de cada idioma. */
export const PORTAL: Record<Lang, { glyph: string; level: string; target: number; due: string; benefit: string; accent: string }> = {
  zh: { glyph: "中", level: "HSK 1", target: 300, due: "复习", benefit: "3 min para oír tus primeros cuatro tonos", accent: "200 64 46" },
  ja: { glyph: "あ", level: "JLPT N5", target: 700, due: "復習", benefit: "3 min para leer tu primer hiragana", accent: "38 78 112" },
  ko: { glyph: "한", level: "TOPIK 1", target: 800, due: "복습", benefit: "3 min para leer tu primera sílaba en hangul", accent: "47 111 115" },
};

/** Nombre accesible completo de la puerta. */
export function portalLabel(lang: Lang, state: PortalState, s?: PortalStats) {
  const m = LANG_META[lang];
  if (state === "inactive") return `Empezar ${m.names.adjective}: ${PORTAL[lang].benefit}`;
  if (!s || (s.wordsKnown === 0 && s.due === 0)) return `Empezar con ${m.names.es}, ${PORTAL[lang].level}`;
  return `Continuar con ${m.names.es}, ${s.wordsKnown} palabras conocidas, ${s.due} repasos pendientes`;
}

function Pattern({ lang, className }: { lang: Lang; className?: string }) {
  if (lang === "ja") return <WagaraPattern className={className} opacity={0.09} variant="seigaiha" size={44} />;
  if (lang === "ko") return <Bojagi className={className} opacity={0.06} cols={5} rows={7} />;
  return <Lattice className={className} opacity={0.07} variant="ice" size={52} />;
}

function Branch({ lang, known, height }: { lang: Lang; known: number; height: number }) {
  const progress = Math.min(1, known / PORTAL[lang].target);
  if (lang === "ja") return <SakuraBranch progress={progress} height={height} className="w-full" />;
  if (lang === "ko") return <MugunghwaBranch progress={progress} height={height} className="w-full" />;
  return <PlumBranch count={known} perFlower={8} height={height} caption={false} className="w-full" />;
}

interface HeroProps {
  lang: Lang;
  state: PortalState;
  stats?: PortalStats;
  phase: DayPhase;
  open: boolean;
  index: number;
  href?: string;
  onOpenChange?: (open: boolean) => void;
  onActivate?: (e: React.MouseEvent<HTMLElement>, lang: Lang) => void;
  onHoverSound?: () => void;
  /** primera visita: la puerta no activa se pinta a todo color (invitación, sin tinta gris) */
  invite?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

/** Panel-puerta grande de la portada. */
export const LangPortalHero = forwardRef<HTMLElement, HeroProps>(function LangPortalHero(
  { lang, state, stats, phase, open, index, href, onOpenChange, onActivate, onHoverSound, invite, style, className },
  ref,
) {
  const m = LANG_META[lang];
  const p = PORTAL[lang];
  const inner = useRef<HTMLElement | null>(null);
  const setRefs = useCallback(
    (el: HTMLElement | null) => {
      inner.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );
  // parallax: variables CSS --px/--py (−1…1) sin re-renderizar React
  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !inner.current) return;
    const r = inner.current.getBoundingClientRect();
    inner.current.style.setProperty("--px", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
    inner.current.style.setProperty("--py", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
  };
  const reset = () => {
    inner.current?.style.setProperty("--px", "0");
    inner.current?.style.setProperty("--py", "0");
  };
  const fresh = !stats || (stats.wordsKnown === 0 && stats.due === 0);
  const cta = state === "inactive" ? `Empezar ${m.names.native}` : fresh ? "Empezar" : "Continuar";

  const body = (
    <>
      {/* ilustración por capas */}
      <span className="portal-art" aria-hidden="true">
        {(["far", "mid", "near"] as const).map((layer) => (
          <span key={layer} className="portal-layer" data-depth={layer}>
            <PortalArt lang={lang} phase={phase} layer={layer} className="h-full w-full" />
          </span>
        ))}
        <span className="absolute inset-0 text-ink [mask-image:linear-gradient(to_bottom,black,transparent_65%)]">
          <Pattern lang={lang} />
        </span>
      </span>
      <span className="portal-vignette" aria-hidden="true" />
      <span className="portal-frame" aria-hidden="true" />

      {/* sello del idioma y repasos pendientes */}
      <span className="absolute left-5 top-5 z-10 sm:left-6 sm:top-6" aria-hidden="true">
        <Seal text={m.emblem} size={46} stamped rotate={[-4, 3, -2][index % 3]} variant={lang === "ja" ? "round" : "square"} />
      </span>
      {state !== "inactive" && stats && stats.due > 0 ? (
        <span className="absolute right-5 top-5 z-10 rounded-[10px] border-2 border-seal bg-paper-raised/85 px-2.5 py-1 font-seal text-sm leading-none text-seal shadow-sm sm:right-6 sm:top-6" style={{ transform: "rotate(3deg)" }}>
          <span className="tabular">{stats.due}</span> <span lang={m.bcp47}>{p.due}</span>
        </span>
      ) : null}

      {/* glifo gigante */}
      <span className="portal-tilt absolute inset-x-0 top-[12%] z-[1] flex justify-center max-md:top-1/2 max-md:left-auto max-md:right-[5%] max-md:-translate-y-[42%] max-md:justify-end" aria-hidden="true">
        <span lang={m.bcp47} className="portal-glyph portal-glyph-in block select-none text-[clamp(120px,13vw,240px)] max-md:text-[clamp(96px,28vw,136px)]">
          {p.glyph}
        </span>
      </span>

      {/* placa de información */}
      <span className="portal-plate absolute inset-x-3 bottom-3 z-10 block p-4 sm:inset-x-4 sm:bottom-4 sm:p-5 max-md:right-auto max-md:max-w-[60%] max-md:p-3.5 lg:right-auto lg:w-[min(calc(100%-2rem),560px)]">
        <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span lang={m.bcp47} className={cn(m.cssClass, "zh-serif text-[clamp(26px,2.6vw,38px)] font-semibold leading-none text-ink")}>
            {m.names.native}
          </span>
          <span className="font-serif-es text-[17px] leading-none text-ink-soft">{m.names.es}</span>
        </span>
        <span className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
          <span className="rounded-[6px] border-[1.5px] border-seal px-1.5 py-0.5 font-seal text-[12px] leading-none text-seal">{p.level}</span>
          {state === "inactive" ? <span className="text-[14px]">{p.benefit}</span> : fresh ? <span className="text-[14px]">Tu primera lección te espera</span> : null}
        </span>
        <span className="portal-more mt-1">
          <span className="block">
            {state !== "inactive" && stats && !fresh ? (
              <span className="mt-3 grid grid-cols-3 gap-2 border-t border-line/80 pt-3">
                <Metric value={stats.wordsKnown} label="palabras" />
                <Metric value={stats.due} label="repasos" />
                <Metric value={stats.streak} label={stats.streak === 1 ? "día seguido" : "días seguidos"} />
              </span>
            ) : null}
            <span className="mt-3 flex items-end justify-between gap-3">
            <span className={cn("inline-flex min-h-12 items-center gap-2 whitespace-nowrap rounded-[12px] px-5 text-[15px] font-semibold shadow-sm max-md:px-4", state === "inactive" ? "border-[1.5px] border-ink/70 bg-paper-raised text-ink" : "bg-ink text-paper")}>
              {state === "inactive" ? <Plus className="size-4" aria-hidden="true" /> : null}
              {state === "inactive" ? (
                <>
                  Empezar{" "}
                  <span lang={m.bcp47} className="max-md:hidden">
                    {m.names.native}
                  </span>
                </>
              ) : (
                cta
              )}
              <ArrowRight className="size-4" aria-hidden="true" />
            </span>
            {state !== "inactive" && stats && !fresh ? (
              <span className="block w-[46%] max-w-[220px] max-md:hidden" aria-hidden="true">
                <Branch lang={lang} known={stats.wordsKnown} height={84} />
              </span>
            ) : null}
            </span>
          </span>
        </span>
      </span>
    </>
  );

  const common = {
    ref: setRefs,
    "data-skin": lang,
    "data-state": invite ? "invite" : state,
    "data-open": open ? "true" : "false",
    className: cn("portal portal-enter text-left", className),
    style: { ...style, animationDelay: `${120 + index * 80}ms` },
    onPointerMove: onMove,
    onPointerEnter: () => {
      onOpenChange?.(true);
      onHoverSound?.();
    },
    onPointerLeave: () => {
      reset();
      onOpenChange?.(false);
    },
    onFocus: () => onOpenChange?.(true),
    onBlur: () => onOpenChange?.(false),
  };

  if (href && state !== "inactive")
    return (
      <NextLink
        href={href}
        {...common}
        ref={setRefs as React.Ref<HTMLAnchorElement>}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          onActivate?.(e, lang);
        }}
      >
        {body}
      </NextLink>
    );
  return (
    <button type="button" {...common} ref={setRefs as React.Ref<HTMLButtonElement>} onClick={(e) => onActivate?.(e, lang)}>
      {body}
    </button>
  );
});

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <span className="block">
      <span className="block font-serif-es text-[22px] font-semibold leading-none text-ink tabular">{value}</span>
      <span className="mt-1 block text-[12px] leading-tight text-ink-soft">{label}</span>
    </span>
  );
}

/** Miniatura (~88 px) de la puerta: cabecera, onboarding y /me. */
export function LangPortalCompact({
  lang,
  stats,
  phase,
  state = "active",
  selected,
  current,
  className,
}: {
  lang: Lang;
  stats?: PortalStats;
  phase: DayPhase;
  state?: PortalState;
  /** seleccionado (onboarding): sello estampado */
  selected?: boolean;
  /** idioma en el que estás ahora (cabecera) */
  current?: boolean;
  className?: string;
}) {
  const m = LANG_META[lang];
  const p = PORTAL[lang];
  return (
    <span data-skin={lang} data-state={state} data-open={selected || current ? "true" : "false"} className={cn("portal relative flex h-[88px] w-full items-center gap-3 rounded-[16px] px-3 text-left", className)} style={{ boxShadow: undefined }}>
      <span className="portal-art" aria-hidden="true">
        <span className="portal-layer" data-depth="far">
          <PortalArt lang={lang} phase={phase} layer="far" className="h-full w-full" />
        </span>
        <span className="portal-layer" data-depth="mid">
          <PortalArt lang={lang} phase={phase} layer="mid" className="h-full w-full" />
        </span>
      </span>
      <span className="absolute inset-0 bg-gradient-to-r from-paper-raised/95 via-paper-raised/80 to-paper-raised/20" aria-hidden="true" />
      <span lang={m.bcp47} className="portal-glyph relative z-[1] w-12 shrink-0 text-center text-[46px]" aria-hidden="true">
        {p.glyph}
      </span>
      <span className="relative z-[1] min-w-0 flex-1">
        <span className="flex items-baseline gap-1.5">
          <span lang={m.bcp47} className={cn(m.cssClass, "zh-serif text-[19px] font-semibold leading-tight text-ink")}>
            {m.names.native}
          </span>
          <span className="text-[13px] text-ink-soft">{m.names.es}</span>
        </span>
        <span className="mt-0.5 block truncate text-[12.5px] text-ink-soft tabular">
          {state === "inactive" ? p.benefit : stats ? `${stats.wordsKnown} palabras · ${stats.due} repasos · racha ${stats.streak}` : p.level}
        </span>
      </span>
      {selected || current ? (
        <span className="relative z-[1] shrink-0" aria-hidden="true">
          <Seal text={m.emblem} size={34} stamped={selected} rotate={-5} variant={lang === "ja" ? "round" : "square"} />
        </span>
      ) : null}
    </span>
  );
}
