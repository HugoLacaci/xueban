"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/settings";
import { Pinyin } from "./pinyin";
import { ChineseText, Hanzi } from "./chinese-text";
import { AudioButton } from "./audio-button";
import { TianZiGe } from "@/components/ornament/tianzige";
import { SealTag } from "@/components/ornament/seal";

export interface HanziCardProps {
  hanzi: string;
  pinyin: string;
  meaning: string;
  example?: string;
  examplePinyin?: string;
  exampleTranslation?: string;
  hsk?: string; // "HSK 1"
  variant?: "word" | "character" | "sentence";
  flippable?: boolean; // gira en 3D al pulsar
  flipped?: boolean;
  onFlip?: (f: boolean) => void;
  size?: "md" | "lg" | "xl";
  showPinyin?: boolean; // front
  className?: string;
  footer?: React.ReactNode;
  grid?: boolean; // 田字格 tenue bajo el carácter
}

/**
 * <HanziCard> — tarjeta de papel elevada con filete bermellón superior, el carácter protagonista
 * en 宋体 sobre 田字格 tenue y pinyin coloreado. Variantes palabra / carácter / frase.
 * Con `flippable`, gira en 3D al reverso (significado, ejemplo, audio).
 */
export function HanziCard({ hanzi, pinyin, meaning, example, examplePinyin, exampleTranslation, hsk, variant = "word", flippable, flipped, onFlip, size = "lg", showPinyin = true, className, footer, grid = true }: HanziCardProps) {
  const [internal, setInternal] = useState(false);
  const isFlipped = flipped ?? internal;
  const zhFont = useSettings((s) => s.settings.zhFont);
  const chars = Array.from(hanzi);
  const textSize = variant === "sentence" ? "xl" : size === "xl" ? "3xl" : size === "lg" ? (chars.length > 2 ? "xl" : "2xl") : "xl";
  const cell = size === "xl" ? 152 : size === "lg" ? 120 : 88;
  const toggle = () => {
    if (!flippable) return;
    const next = !isFlipped;
    setInternal(next);
    onFlip?.(next);
  };

  const front = (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-5">
      {variant === "sentence" ? (
        <ChineseText text={hanzi} size="xl" className="text-center" interactive={!flippable} markUnknown={false} />
      ) : grid && chars.length <= 4 ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {chars.map((c, i) => (
            <TianZiGe key={i} faint size={cell}>
              <span lang="zh-CN" className={cn("zh font-medium leading-none", zhFont === "kai" ? "zh-kai" : "zh-serif")} style={{ fontSize: Math.round(cell * 0.64) }}>
                {c}
              </span>
            </TianZiGe>
          ))}
        </div>
      ) : (
        <Hanzi text={hanzi} size={textSize} font={zhFont === "kai" ? "kai" : "serif"} className="text-center" />
      )}
      <Pinyin text={pinyin} className={cn("text-xl transition-opacity", !showPinyin && "opacity-0")} />
    </div>
  );

  const back = (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-5 text-center">
      <div className="flex items-center gap-3">
        <Hanzi text={hanzi} size="xl" font="serif" />
        <AudioButton text={hanzi} />
      </div>
      <Pinyin text={pinyin} className="text-lg" />
      <p className="font-serif-es text-xl text-ink">{meaning}</p>
      {example ? (
        <div className="mt-1 w-full rounded-[10px] border-l-[3px] border-cinnabar/70 bg-paper-sunk/60 px-3 py-2 text-left">
          <ChineseText text={example} size="md" pinyinLine={examplePinyin} translation={exampleTranslation} highlight={[hanzi]} as="div" />
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
        {/* ocupa altura */}
        <div className="invisible">{front}</div>
      </div>
    </div>
  );
}
