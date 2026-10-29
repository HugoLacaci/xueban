"use client";
/** Lectura (pinyin / kana / romanización) con color de prosodia según el paquete activo. */
import { usePackOptional } from "@/lib/languages/provider";
import { hasTargetScript, langOfRun } from "./mixed";
import { useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

export function Reading({ text, className, colored, as: Comp = "span", lang }: { text: string; className?: string; colored?: boolean; as?: "span" | "div" | "p"; lang?: string }) {
  const enabled = useSettings((s) => s.settings.toneColorsEnabled);
  const pack = usePackOptional();
  const useColor = colored ?? enabled;
  const parts = useColor && pack ? pack.colorizeReading(text) : null;
  // la lectura en kana/hangul es texto meta: lleva lang (el pinyin y la romanización son latinos)
  lang = lang ?? (hasTargetScript(text) ? langOfRun(text) : undefined);
  if (!parts) return (
    <Comp className={cn("pinyin", className)} lang={lang}>
      {text}
    </Comp>
  );
  return (
    <Comp className={cn("pinyin", className)} lang={lang}>
      {parts.map((p, i) =>
        p.cls ? (
          <span key={i} className={p.cls}>
            {p.text}
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </Comp>
  );
}

/** @deprecated alias de transición: usa <Reading>. */
export const Pinyin = Reading;

export type Tone = 1 | 2 | 3 | 4 | 5;

export function toneClass(tone: Tone): string {
  return `tone-${tone}`;
}

export const TONE_NAMES: Record<Tone, string> = {
  1: "1.º tono (alto y plano)",
  2: "2.º tono (ascendente)",
  3: "3.er tono (bajo / descendente-ascendente)",
  4: "4.º tono (descendente)",
  5: "tono neutro (breve y ligero)",
};

export const TONE_MARKS: Record<Tone, string> = { 1: "ˉ", 2: "ˊ", 3: "ˇ", 4: "ˋ", 5: "·" };
