"use client";
import { splitSyllables, toneOf, type Tone } from "@/lib/pinyin/tones";
import { useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

/** Pinyin con color por tono (sílaba a sílaba). */
export function Pinyin({ text, className, colored, as: Comp = "span" }: { text: string; className?: string; colored?: boolean; as?: "span" | "div" | "p" }) {
  const enabled = useSettings((s) => s.settings.toneColorsEnabled);
  const useColor = colored ?? enabled;
  if (!useColor) return <Comp className={cn("pinyin", className)}>{text}</Comp>;
  const parts = splitSyllables(text);
  return (
    <Comp className={cn("pinyin", className)}>
      {parts.map((p, i) =>
        p.isSyllable ? (
          <span key={i} className={`tone-${p.tone}`}>
            {p.text}
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </Comp>
  );
}

export function toneClass(pinyinOrTone: string | Tone): string {
  const t = typeof pinyinOrTone === "number" ? pinyinOrTone : toneOf(pinyinOrTone);
  return `tone-${t}`;
}

export const TONE_NAMES: Record<Tone, string> = {
  1: "1.º tono (alto y plano)",
  2: "2.º tono (ascendente)",
  3: "3.er tono (bajo / descendente-ascendente)",
  4: "4.º tono (descendente)",
  5: "tono neutro (breve y ligero)",
};

export const TONE_MARKS: Record<Tone, string> = { 1: "ˉ", 2: "ˊ", 3: "ˇ", 4: "ˋ", 5: "·" };
