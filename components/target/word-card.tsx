"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/settings";
import { usePack } from "@/lib/languages/provider";
import { Reading } from "./reading";
import { TargetText, CharacterGlyph } from "./target-text";
import { AudioButton } from "./audio-button";
import { WritingGrid } from "@/components/ornament/writing-grid";
import { SealTag } from "@/components/ornament/seal";

export interface WordCardProps {
  hanzi: string;
  pinyin: string;
  meaning: string;
  example?: string;
  examplePinyin?: string;
  exampleTranslation?: string;
  hsk?: string; // etiqueta de nivel («HSK 1», «N5», «TOPIK 1»)
  variant?: "word" | "character" | "sentence";
  flippable?: boolean;
  flipped?: boolean;
  onFlip?: (f: boolean) => void;
  size?: "md" | "lg" | "xl";
  showPinyin?: boolean;
  className?: string;
  footer?: React.ReactNode;
  grid?: boolean;
}

/**
 * <WordCard> — tarjeta de papel elevada con filete superior, la palabra protagonista sobre la
 * cuadrícula de escritura del idioma (田字格 / 練習帳 / bloque hangul) y lectura coloreada.
 * Con `flippable`, gira en 3D al reverso (significado, ejemplo, audio).
 */
export function WordCard({ hanzi, pinyin, meaning, example, examplePinyin, exampleTranslation, hsk, variant = "word", flippable, flipped, onFlip, size = "lg", showPinyin = true, className, footer, grid = true }: WordCardProps) {
  const pack = usePack();
  const [internal, setInternal] = useState(false);
  const isFlipped = flipped ?? internal;
  const font = useSettings((s) => s.settings.langs[pack.id]?.font);
  const chars = pack.characters.charsOf(hanzi);
  // cuadrícula de escritura: en japonés solo para palabras todo en kanji (el kana se lee como palabra)
  // (en coreano, solo palabras de una sílaba: un bloque hangul se lee como palabra, no celda a celda)
  const allChars = chars.length === Array.from(hanzi).length && (pack.id !== "ja" || Array.from(hanzi).every((c) => /[一-鿿]/.test(c))) && (pack.id !== "ko" || chars.length === 1);
  const textSize = variant === "sentence" ? "xl" : size === "xl" ? "3xl" : size === "lg" ? (chars.length > 2 ? "xl" : "2xl") : "xl";
  const cell = size === "xl" ? 152 : size === "lg" ? 120 : 88;
  const displayCls = pack.theme.fontOptions.find((f) => f.id === font)?.cls === pack.theme.fontClasses.display ? pack.theme.fontClasses.display : pack.theme.fontClasses.serif;
  const toggle = () => {
    if (!flippable) return;
    const next = !isFlipped;
    setInternal(next);
    onFlip?.(next);
  };

  const front = (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-5">
      {variant === "sentence" ? (
        <TargetText text={hanzi} size="xl" className="text-center" interactive={!flippable} markUnknown={false} />
      ) : grid && allChars && chars.length <= 4 ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {chars.map((c, i) => (
            <WritingGrid key={i} faint size={cell}>
              <span lang={pack.bcp47} className={cn(pack.meta.cssClass, "font-medium leading-none", displayCls)} style={{ fontSize: Math.round(cell * 0.64) }}>
                {c}
              </span>
            </WritingGrid>
          ))}
        </div>
      ) : (
        <CharacterGlyph text={hanzi} size={textSize} className={cn("text-center", displayCls)} />
      )}
      {pinyin !== hanzi ? <Reading text={pinyin} className={cn("text-xl transition-opacity", !showPinyin && "opacity-0")} /> : null}
    </div>
  );

  const back = (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-5 text-center">
      <div className="flex items-center gap-3">
        <CharacterGlyph text={hanzi} size="xl" className={pack.theme.fontClasses.serif} />
        <AudioButton text={hanzi} />
      </div>
      <Reading text={pinyin} className="text-lg" />
      <p className="font-serif-es text-xl text-ink">{meaning}</p>
      {example ? (
        <div className="mt-1 w-full rounded-[10px] border-l-[3px] border-cinnabar/70 bg-paper-sunk/60 px-3 py-2 text-left">
          <TargetText text={example} size="md" pinyinLine={examplePinyin} translation={exampleTranslation} highlight={[hanzi]} as="div" />
        </div>
      ) : null}
    </div>
  );

  return (
    <div className={cn("group relative [perspective:1400px]", className)}>
      <div
        role={flippable ? "button" : undefined}
        tabIndex={flippable ? 0 : undefined}
        aria-pressed={flippable ? isFlipped : undefined}
        onClick={toggle}
        onKeyDown={(e) => {
          if (flippable && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            toggle();
          }
        }}
        className={cn("relative min-h-[16rem] transition-transform duration-500 ease-[var(--ease-ink)] [transform-style:preserve-3d]", flippable && "cursor-pointer", isFlipped && "[transform:rotateY(180deg)]")}
      >
        <div className="card-paper absolute inset-0 overflow-hidden [backface-visibility:hidden]">
          <span className="absolute inset-x-6 top-0 h-[2px] rounded-b bg-cinnabar/85" aria-hidden="true" />
          {hsk ? <SealTag className="absolute right-3 top-3">{hsk}</SealTag> : null}
          {front}
          {footer ? <div className="absolute inset-x-0 bottom-0 border-t border-line/70 px-4 py-2 text-xs text-ink-faint">{footer}</div> : null}
        </div>
        <div className="card-paper absolute inset-0 overflow-hidden [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <span className="absolute inset-x-6 top-0 h-[2px] rounded-b bg-celadon/85" aria-hidden="true" />
          {back}
        </div>
        <div className="invisible">{front}</div>
      </div>
    </div>
  );
}

/** @deprecated alias de transición: usa <WordCard>. */
export const HanziCard = WordCard;
export type HanziCardProps = WordCardProps;
