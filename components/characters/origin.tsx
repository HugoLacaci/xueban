"use client";
/**
 * Origen y evolución de un carácter.
 *  - <OriginViewer>: visor estable de tamaño fijo. Nada cambia solo: el botón «Ver evolución» recorre las etapas una
 *    vez (0,8 s por etapa) y se detiene en el carácter actual; la tira inferior (6 casillas iguales, siempre las
 *    mismas) es también el selector de etapas. Las formas reales (Wikimedia Commons, normalizadas por
 *    `npm run glyphs:normalize`) se distinguen siempre de los dibujos ilustrativos propios.
 *  - <OriginThumb>: miniatura estática para cuadrículas; solo se anima mientras está activa (hover/foco).
 *  - <FormationDiagram>: «cómo se formó» (女 + 子 = 好) en casillas de tamaño fijo; se reproduce una vez al entrar
 *    en pantalla y se puede repetir.
 *  - <CharacterFamilies>: red de caracteres por radical y componente fonético.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, History, Play, RotateCcw, Square } from "lucide-react";
import { getCharInfo, lookupFirst, radicalInfo } from "@/lib/languages/zh/dictionary";
import { wordPinyin } from "@/lib/languages/zh/pinyin/convert";
import {
  familyOf,
  glyphUrl,
  loadGlyphIndex,
  loadPictograms,
  type GlyphIndex,
  type Pictogram,
} from "@/lib/hanzi/origin";
import {
  buildStages,
  formationType,
  playableIndices,
  VIEW_STAGES,
  type StageView,
} from "@/lib/hanzi/origin-stages";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { Hanzi } from "@/components/target/target-text";
import { Reading } from "@/components/target/reading";
import { cn } from "@/lib/utils";
import { Mixed } from "@/components/target/mixed";

export const STEP_MS = 800;
const REGULAR = VIEW_STAGES.length - 1;

/* ------------------------------------------------------------------ datos */

function useOriginData(ch: string): {
  stages: StageView[];
  pict: Pictogram | null;
  loaded: boolean;
} {
  const [index, setIndex] = useState<GlyphIndex | null | undefined>(undefined);
  const [pics, setPics] = useState<Pictogram[] | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    void loadGlyphIndex().then((x) => alive && setIndex(x));
    void loadPictograms().then((x) => alive && setPics(x));
    return () => {
      alive = false;
    };
  }, []);
  const pict = useMemo(() => pics?.find((p) => p.c === ch) ?? null, [pics, ch]);
  const stages = useMemo(() => buildStages(index?.chars[ch], pict), [index, pict, ch]);
  return { stages, pict, loaded: index !== undefined && pics !== undefined };
}

/** Reproducción controlada: una sola pasada, temporizadores rastreados y limpiados (data-timers en el visor). */
function usePlayback(stages: StageView[]) {
  const [sel, setSel] = useState(REGULAR);
  const [playing, setPlaying] = useState(false);
  const timers = useRef<number[]>([]);
  const [pending, setPending] = useState(0);
  const clear = useCallback(() => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
    setPending(0);
  }, []);
  useEffect(() => clear, [clear]);
  const stop = useCallback(
    (to?: number) => {
      clear();
      setPlaying(false);
      if (to !== undefined) setSel(to);
    },
    [clear],
  );
  const play = useCallback(() => {
    clear();
    const seq = playableIndices(stages);
    if (!seq.length) return;
    setPlaying(true);
    setSel(seq[0]);
    seq.slice(1).forEach((idx, i) => {
      const id = window.setTimeout(
        () => {
          timers.current = timers.current.filter((x) => x !== id);
          setPending(timers.current.length);
          setSel(idx);
          if (i === seq.length - 2) setPlaying(false);
        },
        STEP_MS * (i + 1),
      );
      timers.current.push(id);
    });
    setPending(timers.current.length);
    if (seq.length === 1) setPlaying(false);
  }, [stages, clear]);
  return { sel, playing, play, stop, select: (i: number) => stop(i), activeTimers: pending };
}

/* ------------------------------------------------------------------ piezas de dibujo */

/** Una capa del visor (todas se apilan; solo cambia la opacidad, nunca el tamaño). */
function StageLayer({
  ch,
  stage,
  visible,
  pad,
}: {
  ch: string;
  stage: StageView;
  visible: boolean;
  pad: string;
}) {
  const base = cn(
    "absolute inset-0 motion-safe:transition-opacity motion-safe:duration-300",
    visible ? "opacity-100" : "opacity-0",
  );
  if (stage.kind === "real" && stage.file) {
    const url = glyphUrl(ch, stage.file.stage, stage.file.normalized);
    return (
      <span className={cn(base, pad)} aria-hidden={!visible}>
        <span
          role="img"
          aria-label={`${ch} en ${stage.meta.zh} (${stage.meta.es})`}
          className="text-ink block size-full bg-current"
          style={{
            maskImage: `url("${url}")`,
            WebkitMaskImage: `url("${url}")`,
            maskSize: "contain",
            WebkitMaskSize: "contain",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            maskPosition: "center",
            WebkitMaskPosition: "center",
          }}
        />
      </span>
    );
  }
  if (stage.kind === "illustrative" && stage.path) {
    return (
      <svg
        viewBox="0 0 100 100"
        className={cn(
          base,
          pad,
          "size-full",
          stage.key === "drawing" ? "text-ink" : "text-ink-soft",
        )}
        aria-hidden={!visible}
        role="img"
        aria-label={`${ch}: ${stage.source}`}
      >
        <path
          d={stage.path}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (stage.kind === "font") {
    return (
      <span className={cn(base, "flex items-center justify-center")} aria-hidden={!visible}>
        <span lang="zh-CN" className="zh-serif text-ink leading-none" style={{ fontSize: "72cqw" }}>
          {ch}
        </span>
      </span>
    );
  }
  return (
    <span
      className={cn(base, "text-ink-faint flex flex-col items-center justify-center")}
      aria-hidden={!visible}
    >
      <span className="leading-none" style={{ fontSize: "30cqw" }}>
        —
      </span>
    </span>
  );
}

/** Casilla de la tira (todas del mismo tamaño; las etapas sin datos muestran «—»). */
function StripCell({
  ch,
  stage,
  selected,
  onClick,
  size,
}: {
  ch: string;
  stage: StageView;
  selected: boolean;
  onClick: () => void;
  size: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      title={`${stage.meta.zh} ${stage.meta.es} · ${stage.meta.when} · ${stage.source}`}
      className={cn(
        "group flex w-full flex-col items-center rounded-[8px] px-0.5 pt-1 pb-1 transition-colors",
        selected ? "bg-cinnabar/10" : "hover:bg-paper-sunk",
      )}
    >
      <span
        className={cn(
          "bg-paper-raised [container-type:inline-size] relative block overflow-hidden rounded-[6px] border",
          selected
            ? "border-cinnabar"
            : stage.kind === "missing"
              ? "border-line border-dashed"
              : "border-line",
        )}
        style={{ width: size, height: size }}
      >
        <StageLayer ch={ch} stage={stage} visible pad="p-[8%]" />
        {stage.kind === "illustrative" ? (
          <span
            className="text-gold absolute top-0 right-0.5 text-[8px] leading-tight"
            aria-hidden="true"
          >
            ✎
          </span>
        ) : null}
      </span>
      <span
        lang="zh-CN"
        className={cn(
          "zh-kai mt-0.5 block h-4 text-[11px] leading-4",
          selected ? "text-cinnabar" : "text-ink-soft",
        )}
      >
        {stage.meta.zh}
      </span>
      <span className="text-ink-faint block h-3.5 w-full truncate text-center text-[9.5px] leading-[14px]">
        {stage.kind === "missing" ? "—" : stage.meta.short}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ visor */

export type OriginViewerVariant = "card" | "article";
const VIEWER_SIZE: Record<OriginViewerVariant, { box: number; cell: number }> = {
  card: { box: 240, cell: 40 },
  article: { box: 160, cell: 36 },
};

export function OriginViewer({
  ch,
  variant = "card",
  className,
}: {
  ch: string;
  variant?: OriginViewerVariant;
  className?: string;
}) {
  const { stages, pict, loaded } = useOriginData(ch);
  const { sel, playing, play, stop, select, activeTimers } = usePlayback(stages);
  const { box, cell } = VIEWER_SIZE[variant];
  const cur = stages[sel];
  const info = getCharInfo(ch);
  const ftype = formationType(pict?.type, info?.etymology?.type);
  const meaning = pict?.es ?? lookupFirst(ch)?.es?.split(/[;,(]/)[0].trim() ?? "";
  const credits = stages.filter((s) => s.kind === "real" && s.credit);
  const stripWidth = VIEW_STAGES.length * (cell + 12);
  const line1 = `${cur.meta.zh} ${cur.meta.es}${cur.variant ? ` (${cur.variant})` : ""} · ${cur.meta.when}`;
  return (
    <div
      className={cn("flex flex-col items-center", className)}
      data-origin-viewer={ch}
      data-playing={playing ? "true" : "false"}
      data-timers={activeTimers}
      data-stage={cur.key}
    >
      {/* visor de tamaño fijo con 田字格 tenue */}
      <div
        data-part="viewer"
        className="tianzige-faint border-line bg-paper-raised [container-type:inline-size] relative shrink-0 overflow-hidden rounded-[12px] border"
        style={{ width: box, height: box }}
      >
        {stages.map((s, i) => (
          <StageLayer key={s.key} ch={ch} stage={s} visible={i === sel} pad="p-[10%]" />
        ))}
        {!loaded ? (
          <span className="bg-paper-sunk/50 absolute inset-0 animate-pulse" aria-hidden="true" />
        ) : null}
      </div>
      {/* pie de altura fija: dos líneas que nunca cambian de alto */}
      <div
        data-part="caption"
        className="mt-2 h-[42px] text-center"
        style={{ width: stripWidth, maxWidth: "100%" }}
        aria-live="polite"
      >
        <p
          className="flex h-5 items-center justify-center gap-1.5 text-xs leading-5"
          title={`${line1} · ${cur.source}`}
        >
          <span className="text-ink min-w-0 truncate">{line1}</span>
          <span
            className={cn(
              "shrink-0 rounded-full border px-1.5 text-[10px] leading-4",
              cur.kind === "real"
                ? "border-celadon/60 text-celadon-ink"
                : cur.kind === "illustrative"
                  ? "border-gold/60 text-gold"
                  : "border-line text-ink-faint",
            )}
          >
            {cur.kind === "real"
              ? "forma real"
              : cur.kind === "illustrative"
                ? "ilustrativo"
                : cur.kind === "font"
                  ? "actual"
                  : "sin datos"}
          </span>
        </p>
        <p
          className="text-ink-faint h-[22px] truncate text-[11px] leading-[22px]"
          title={`${wordPinyin(ch)} · ${meaning} · ${cur.source}`}
        >
          <Reading text={wordPinyin(ch)} className="text-xs" /> · <Mixed>{meaning}</Mixed> ·{" "}
          {cur.source}
        </p>
      </div>
      {/* tira de evolución = selector de etapas */}
      <div
        data-part="strip"
        role="group"
        aria-label="Etapas de la escritura"
        className="grid shrink-0 grid-cols-6"
        style={{ width: stripWidth, maxWidth: "100%" }}
      >
        {stages.map((s, i) => (
          <StripCell
            key={s.key}
            ch={ch}
            stage={s}
            size={cell}
            selected={i === sel}
            onClick={() => select(i)}
          />
        ))}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <Button
          size="sm"
          variant={playing ? "outline" : "default"}
          onClick={() => (playing ? stop(REGULAR) : play())}
          aria-label={playing ? "Detener" : "Ver evolución"}
        >
          {playing ? <Square /> : <Play />} {playing ? "Detener" : "Ver evolución"}
        </Button>
      </div>
      {variant === "card" ? (
        <div className="text-ink-soft mt-2 w-full max-w-[420px] space-y-1 text-[11px] leading-snug">
          <p className="h-[30px] overflow-hidden" title={cur.meta.change}>
            <span className="text-ink-faint font-semibold">Qué cambió: </span>
            <Mixed>{cur.meta.change}</Mixed>
          </p>
          {ftype ? (
            <p>
              <span className="text-ink-faint font-semibold">六书: </span>
              <span lang="zh-CN" className="zh-kai text-cinnabar">
                {ftype.zh}
              </span>{" "}
              · {ftype.es}
            </p>
          ) : null}
          {credits.length ? (
            <p className="text-ink-faint text-[10px]">
              Formas reales: Wikimedia Commons ·{" "}
              {credits.map((s, i) => (
                <span key={s.key}>
                  <a
                    href={s.credit!.url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline-offset-2 hover:underline"
                  >
                    {s.meta.zh}
                  </a>{" "}
                  ({s.credit!.license}){i < credits.length - 1 ? " · " : ""}
                </span>
              ))}
              <ExternalLink className="ml-1 inline size-2.5" />. Dibujos y aproximaciones marcados
              con ✎: ilustración propia.
            </p>
          ) : (
            <p className="text-ink-faint text-[10px]">
              No hay formas antiguas con licencia libre descargadas para{" "}
              <span lang="zh-CN">{ch}</span>; las casillas «—» indican que no se muestra ninguna
              forma conservada.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Compatibilidad: la antigua «tira de evolución» es ahora el visor en tamaño de artículo. */
export function EvolutionStrip({
  ch,
  compact,
}: {
  ch: string;
  compact?: boolean;
  onNavigate?: (c: string) => void;
}) {
  return <OriginViewer ch={ch} variant={compact ? "article" : "card"} />;
}

/* ------------------------------------------------------------------ miniatura para cuadrículas */

/** Miniatura estática (carácter actual + indicador). Mientras `active` (hover/foco del contenedor) recorre las etapas una vez. */
export function OriginThumb({
  ch,
  size = 96,
  active = false,
}: {
  ch: string;
  size?: number;
  active?: boolean;
}) {
  const { stages } = useOriginData(ch);
  const { sel, play, stop, activeTimers } = usePlayback(stages);
  const hasHistory = stages.some((s) => s.kind === "real" || s.kind === "illustrative");
  useEffect(() => {
    if (active) play();
    else stop(REGULAR);
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <span
      className="tianzige-faint border-line bg-paper-raised [container-type:inline-size] relative block shrink-0 overflow-hidden rounded-[10px] border"
      style={{ width: size, height: size }}
      data-origin-thumb={ch}
      data-timers={activeTimers}
    >
      {stages.map((s, i) => (
        <StageLayer key={s.key} ch={ch} stage={s} visible={i === sel} pad="p-[12%]" />
      ))}
      {hasHistory ? (
        <span
          className="bg-paper/90 text-ink-faint absolute right-1 bottom-1 flex items-center gap-0.5 rounded-full px-1 text-[9px] leading-4"
          title="Tiene evolución: pasa el ratón o enfoca para verla"
        >
          <History className="size-2.5" aria-hidden="true" />
          <span className="sr-only">tiene evolución</span>
        </span>
      ) : null}
    </span>
  );
}

/* ------------------------------------------------------------------ cómo se formó */

export function FormationDiagram({
  ch,
  onNavigate,
}: {
  ch: string;
  onNavigate?: (c: string) => void;
}) {
  const info = getCharInfo(ch);
  const ref = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState(0); // 0 = aún no visto
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setRun(1);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setRun((r) => (r === 0 ? 1 : r));
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ch]);
  if (!info) return null;
  const ety = info.etymology;
  const comps = info.decomposition
    ? Array.from(info.decomposition)
        .filter((c) => /[㐀-鿿]/.test(c) && c !== ch)
        .slice(0, 3)
    : [];
  if (!comps.length)
    return (
      <p className="text-ink-soft text-sm">
        {ch} no se descompone: es un{" "}
        {ety?.type === "pictographic"
          ? "pictograma (dibuja el objeto)"
          : ety?.type === "ideographic"
            ? "indicativo (señala una idea)"
            : "carácter de una pieza"}
        .
      </p>
    );
  const role = (c: string) =>
    ety?.type === "pictophonetic"
      ? c === ety.semantic
        ? "significado"
        : c === ety.phonetic
          ? "sonido"
          : ""
      : "";
  const anim = () =>
    run === 0 ? "motion-safe:opacity-0" : "motion-safe:animate-[pop_.5s_var(--ease-ink)_both]";
  return (
    <div ref={ref}>
      <div
        key={run}
        className="flex min-h-[132px] flex-wrap items-center justify-center gap-2 py-2"
      >
        {comps.map((c, i) => {
          const r = role(c);
          const meaning = radicalInfo(c)?.meaning ?? lookupFirst(c)?.es?.split(/[;,(]/)[0].trim();
          return (
            <span key={c} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate?.(c)}
                title={meaning ?? ""}
                className={cn(
                  "flex h-[112px] w-[84px] flex-col items-center justify-center gap-0.5 overflow-hidden rounded-[10px] border px-1",
                  anim(),
                  r === "sonido"
                    ? "border-gold bg-gold/10"
                    : r === "significado"
                      ? "border-celadon bg-celadon/10"
                      : "border-line bg-paper-raised",
                )}
                style={{ animationDelay: `${i * 250}ms` }}
              >
                <Hanzi text={c} size="xl" font="serif" />
                <span className="text-ink-faint block h-4 w-full truncate text-center text-[11px]">
                  {r === "sonido" ? (
                    <Reading text={wordPinyin(c)} className="text-xs" />
                  ) : meaning ? (
                    <Mixed>{meaning}</Mixed>
                  ) : (
                    ""
                  )}
                </span>
                <span className="block h-5">
                  {r ? <Badge variant={r === "sonido" ? "gold" : "jade"}>{r}</Badge> : null}
                </span>
              </button>
              <span className="text-ink-faint w-3 text-center text-xl">
                {i < comps.length - 1 ? "+" : "="}
              </span>
            </span>
          );
        })}
        <span
          className={cn(
            "border-cinnabar/50 bg-paper-raised flex h-[112px] w-[96px] flex-col items-center justify-center overflow-hidden rounded-[10px] border px-1",
            anim(),
          )}
          style={{ animationDelay: `${comps.length * 250}ms` }}
        >
          <Hanzi text={ch} size="2xl" font="serif" />
          <Reading text={wordPinyin(ch)} className="text-sm" />
          <span className="text-ink-faint block h-4 w-full truncate text-center text-[11px]">
            <Mixed>{lookupFirst(ch)?.es?.split(/[;,(]/)[0].trim() ?? ""}</Mixed>
          </span>
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-ink-soft text-xs">
          <Mixed>
            {ety?.type === "pictophonetic"
              ? `Compuesto fono-semántico (形声): ${ety.semantic ?? "?"} aporta el campo de significado y ${ety.phonetic ?? "?"} la pronunciación.`
              : ety?.type === "ideographic"
                ? "Compuesto de significado (会意): la suma de las partes sugiere la idea."
                : "Descomposición según Make Me a Hanzi."}
          </Mixed>
          {ety?.hint ? (
            <span className="text-ink-faint block">
              Pista (en inglés, Make Me a Hanzi): <Mixed>{ety.hint}</Mixed>
            </span>
          ) : null}
        </p>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setRun((p) => p + 1)}
          aria-label="Repetir animación"
        >
          <RotateCcw />
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ familias */

export function CharacterFamilies({
  ch,
  pool,
  onNavigate,
}: {
  ch: string;
  pool?: Set<string>;
  onNavigate?: (c: string) => void;
}) {
  const fam = useMemo(() => familyOf(ch, pool), [ch, pool]);
  if (!fam.byRadical.chars.length && !fam.byPhonetic?.chars.length && !fam.components.length)
    return null;
  return (
    <div className="space-y-3">
      <FamilyGroup
        title="Mismo radical"
        label={fam.byRadical.key}
        chars={fam.byRadical.chars}
        tone="jade"
        onNavigate={onNavigate}
      />
      {fam.byPhonetic ? (
        <FamilyGroup
          title="Mismo componente fonético"
          label={fam.byPhonetic.key}
          chars={fam.byPhonetic.chars}
          tone="gold"
          onNavigate={onNavigate}
        />
      ) : null}
      {fam.components.slice(0, 2).map((c) => (
        <FamilyGroup
          key={c.c}
          title="Comparten"
          label={c.c}
          chars={c.chars}
          tone="outline"
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

function FamilyGroup({
  title,
  label,
  chars,
  tone,
  onNavigate,
}: {
  title: string;
  label: string;
  chars: string[];
  tone: "jade" | "gold" | "outline";
  onNavigate?: (c: string) => void;
}) {
  if (!chars.length) return null;
  return (
    <div>
      <p className="text-ink-faint mb-1 text-[11px] font-semibold tracking-wide uppercase">
        {title}{" "}
        <Badge variant={tone}>
          <span lang="zh-CN">{label}</span>
        </Badge>
      </p>
      <div className="flex flex-wrap gap-1">
        {chars.slice(0, 24).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onNavigate?.(c)}
            className="border-line bg-paper-raised hover:border-ink/40 flex flex-col items-center rounded-[6px] border px-1.5 py-0.5"
            title={lookupFirst(c)?.es ?? ""}
          >
            <Hanzi text={c} size="md" font="serif" />
            <Reading text={wordPinyin(c)} className="text-[10px]" />
          </button>
        ))}
      </div>
    </div>
  );
}
