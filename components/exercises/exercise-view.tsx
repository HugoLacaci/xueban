"use client";
import type { CheckResult, Exercise, Response } from "@/lib/exercises/types";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Kbd } from "@/components/ui/primitives";
import { Hanzi } from "@/components/target/target-text";
import { TianZiGe } from "@/components/ornament/tianzige";
import { cn } from "@/lib/utils";
import { MultipleChoice } from "./multiple-choice";
import { PinyinInput, Dictation, FreeText } from "./text-inputs";
import { ToneChoice } from "./tone-choice";
import { Tiles, BuildCharacter } from "./tiles";
import { FillBlank } from "./fill-blank";
import { ReadingTF } from "./reading-tf";
import { Matching } from "./matching";
import { Writing } from "./writing";
import { Speaking } from "./speaking";
import { targetLang } from "@/lib/languages/registry";

export interface ExerciseProps<E extends Exercise = Exercise> {
  ex: E;
  onSubmit: (r: Response) => void;
  result: CheckResult | null;
}

export function ExerciseView({ ex, onSubmit, result }: ExerciseProps) {
  switch (ex.type) {
    case "choose-meaning":
    case "choose-character":
    case "similar-characters":
    case "listen-choose":
    case "component":
    case "classifier":
    case "tone-pair":
    case "comprehension":
      return <MultipleChoice ex={ex} onSubmit={onSubmit} result={result} />;
    case "pinyin-input":
      return <PinyinInput ex={ex} onSubmit={onSubmit} result={result} />;
    case "dictation":
      return <Dictation ex={ex} onSubmit={onSubmit} result={result} />;
    case "translate-to-es":
      return <FreeText ex={ex} onSubmit={onSubmit} result={result} />;
    case "tone-choice":
      return <ToneChoice ex={ex} onSubmit={onSubmit} result={result} />;
    case "order-words":
    case "build-sentence":
      return <Tiles ex={ex} onSubmit={onSubmit} result={result} />;
    case "build-character":
      return <BuildCharacter ex={ex} onSubmit={onSubmit} result={result} />;
    case "fill-blank":
      return <FillBlank ex={ex} onSubmit={onSubmit} result={result} />;
    case "reading-tf":
      return <ReadingTF ex={ex} onSubmit={onSubmit} result={result} />;
    case "matching":
      return <Matching ex={ex} onSubmit={onSubmit} result={result} />;
    case "writing":
      return <Writing ex={ex} onSubmit={onSubmit} result={result} />;
    case "speaking":
      return <Speaking ex={ex} onSubmit={onSubmit} result={result} />;
  }
}

/* ------------------------------------------------------------------------------------------------
 * Piezas compartidas de la pantalla de ejercicio: papel liso, sin ornamento dentro de la zona de
 * respuesta. Solo transform/opacity en animaciones.
 * ---------------------------------------------------------------------------------------------- */

/** Contenedor común: consigna pequeña en versalitas y el contenido sobre el papel, sin caja. */
export function ExerciseCard({ prompt, children, className }: { prompt: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col", className)} aria-label={prompt}>
      <p className="mb-5 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">{prompt}</p>
      {children}
    </section>
  );
}

/** Zona central: el carácter protagonista grande en 宋体 sobre 田字格 tenue (≤ 4 caracteres). */
export function Stage({ zh, className, children }: { zh?: string; className?: string; children?: React.ReactNode }) {
  const chars = zh ? Array.from(zh) : [];
  const grid = chars.length > 0 && chars.length <= 4;
  // celda 92–148 px (escritorio) / ~94 px (móvil); el carácter ocupa ~62 % de la celda (.zh usa 1em × escala)
  const cell = chars.length <= 2 ? "clamp(92px, 24vw, 148px)" : "clamp(68px, 19vw, 108px)";
  return (
    <div className={cn("mb-6 flex flex-col items-center gap-3 text-center", className)}>
      {zh ? (
        grid ? (
          <div className="flex flex-wrap items-center justify-center gap-1.5" lang={targetLang()} style={{ "--cell": cell, fontSize: "calc(var(--cell) * 0.62)" } as React.CSSProperties}>
            {chars.map((c, i) => (
              <TianZiGe key={i} faint size="var(--cell)">
                <Hanzi text={c} font="serif" />
              </TianZiGe>
            ))}
          </div>
        ) : (
          <span style={{ fontSize: zh.length > 8 ? "clamp(24px, 6vw, 32px)" : "clamp(28px, 7vw, 40px)" }}>
            <Hanzi text={zh} font="serif" className="max-w-prose leading-[1.5]" />
          </span>
        )
      ) : null}
      {children}
    </div>
  );
}

export type OptionState = "idle" | "selected" | "correct" | "wrong" | "muted";

/**
 * Ficha de papel de respuesta (≥ 56 px). Número de atajo visible. Estados inconfundibles:
 * seleccionada (tinta), correcta (celadón), incorrecta (绛 + sacudida de 3 px).
 */
export function OptionTile({ state = "idle", index, children, className, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { state?: OptionState; index?: number }) {
  return (
    <button
      type="button"
      disabled={disabled}
      data-state={state}
      className={cn(
        "group relative flex min-h-14 w-full items-center gap-3 rounded-[var(--radius-card)] border bg-paper-raised px-3 py-2.5 text-left text-ink shadow-[var(--shadow-paper)] transition-[transform,border-color,background-color,box-shadow] duration-[var(--dur-ui)] ease-[var(--ease-ink)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
        state === "idle" && "border-line enabled:hover:border-ink/40 enabled:hover:-translate-y-px enabled:active:translate-y-0",
        state === "selected" && "border-ink bg-paper-sunk",
        state === "correct" && "border-celadon bg-celadon/14 shadow-none",
        state === "wrong" && "border-danger bg-danger/10 shadow-none motion-safe:animate-shake",
        state === "muted" && "border-line opacity-55 shadow-none",
        className,
      )}
      {...props}
    >
      {index !== undefined ? <Kbd className={cn("shrink-0", state === "correct" && "border-celadon/50 text-celadon-ink", state === "wrong" && "border-danger/50 text-danger")}>{index}</Kbd> : null}
      {children}
    </button>
  );
}

/** Estado de una opción a partir de la elección y el resultado. */
export function optionState(i: number, chosen: number | null, answerIndex: number, hasResult: boolean): OptionState {
  if (!hasResult) return chosen === i ? "selected" : "idle";
  if (i === answerIndex) return "correct";
  if (chosen === i) return "wrong";
  return "muted";
}

/** Botón «Comprobar» fijo en la zona del pulgar en móvil (sobre la barra inferior), estático en escritorio. */
export function CheckButton({ className, children, ...props }: ButtonProps) {
  return (
    <div className="sticky bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-20 mt-5 bg-paper/80 py-2 backdrop-blur-[2px] md:static md:bg-transparent md:py-0 md:backdrop-blur-none">
      <Button size="xl" variant="ink" className={cn("w-full", className)} {...props}>
        {children ?? "Comprobar"} <Kbd className="ml-1 border-paper/30 bg-paper/15 text-paper">Enter</Kbd>
      </Button>
    </div>
  );
}

/** Zona de depósito (fichas, componentes): borde de trazo discontinuo sobre papel hundido. */
export function DropZone({ className, state, children, ...props }: React.ComponentPropsWithRef<"div"> & { state?: "idle" | "over" | "correct" | "wrong" }) {
  return (
    <div
      className={cn(
        "flex min-h-[4.5rem] flex-wrap items-center gap-2 rounded-[var(--radius-card)] border-2 border-dashed bg-paper-sunk/60 p-3 transition-[border-color,background-color] duration-[var(--dur-ui)]",
        state === "over" ? "border-ink/60 bg-paper-sunk" : state === "correct" ? "border-celadon/70" : state === "wrong" ? "border-danger/60" : "border-line",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** Nota de ayuda bajo la zona de respuesta. */
export function Hint({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("mt-3 text-center text-xs leading-relaxed text-ink-faint", className)}>{children}</p>;
}

/** Placa de papel para texto/diálogo/solución (fuera de la zona de respuesta). */
export function Plate({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-[var(--radius-card)] border border-line bg-paper-raised/80 p-3 shadow-[var(--shadow-paper)]", className)}>{children}</div>;
}
