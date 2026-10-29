"use client";
/** Piezas comunes de la UI japonesa: entrada de kana (wanakana), diagrama de acento tonal y vista de pronunciación. */
import { useEffect, useMemo, useRef, useState } from "react";
import * as wanakana from "wanakana";
import type { ReadingInputProps } from "@/lib/languages/types";
import { Input } from "@/components/ui/primitives";
import { PitchGraph } from "@/components/target/pitch-graph";
import { cn } from "@/lib/utils";
import { idealPitchCurve, patternOf, pitchLevels, PATTERN_INFO } from "../pitch";
import { lookupFirstJa } from "../dictionary";
import { toHiragana } from "../kana";

const bigInput = "h-14 rounded-[12px] text-center text-2xl placeholder:text-base placeholder:text-ink-faint/80";

/**
 * Entrada en kana: lo que se teclea en rōmaji se convierte en hiragana en vivo (wanakana, modo IME);
 * en mayúsculas → katakana. También acepta el IME japonés del sistema (kanji).
 */
export function KanaInput({ value, onChange, onSubmit, placeholder, autoFocus, disabled, id, className, mode = "reading", ...rest }: ReadingInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [composing, setComposing] = useState(false);
  return (
    <div className={className}>
      <Input
        ref={ref}
        id={id}
        lang="ja-JP"
        value={value}
        onCompositionStart={() => setComposing(true)}
        onCompositionEnd={(e) => {
          setComposing(false);
          onChange((e.target as HTMLInputElement).value);
        }}
        onChange={(e) => {
          const v = e.target.value;
          onChange(composing ? v : wanakana.toKana(v, { IMEMode: true }));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onSubmit && !composing) {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder={placeholder ?? (mode === "reading" ? "taberu → たべる" : "Escribe en japonés (rōmaji → kana, o tu IME)")}
        className={cn(bigInput, "ja")}
        autoFocus={autoFocus}
        disabled={disabled}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label={rest["aria-label"] ?? "Escribe en kana"}
      />
      <div className="mt-1.5 h-6 text-center text-xs text-ink-faint" aria-live="polite">
        {value && /[a-z]/i.test(value) ? "Sigue tecleando: la n final se escribe nn" : ""}
      </div>
    </div>
  );
}

/** Diagrama de acento tonal: moras con línea alta/baja (estilo NHK/OJAD). */
export function PitchDiagram({ kana, accent, className, showName = true }: { kana: string; accent: number | null | undefined; className?: string; showName?: boolean }) {
  if (accent === null || accent === undefined) return null;
  const hira = toHiragana(kana);
  const { moras, levels, particle } = pitchLevels(hira, accent);
  const pattern = patternOf(accent, moras.length);
  return (
    <span className={cn("inline-flex flex-col items-center", className)} title={`${PATTERN_INFO[pattern].native} ${PATTERN_INFO[pattern].name}: ${PATTERN_INFO[pattern].description}`}>
      <svg viewBox={`0 0 ${(moras.length + 1) * 24} 30`} width={(moras.length + 1) * 24} height={30} aria-hidden="true">
        {[...levels, particle].map((l, i, arr) => {
          const y = l === "H" ? 6 : 22;
          const next = arr[i + 1];
          return (
            <g key={i}>
              {next ? <line x1={i * 24 + 12} y1={y} x2={(i + 1) * 24 + 12} y2={next === "H" ? 6 : 22} stroke={`rgb(var(--tone-${l === "H" && next === "L" ? 2 : 1}))`} strokeWidth="2" /> : null}
              <circle cx={i * 24 + 12} cy={y} r={i === arr.length - 1 ? 3.5 : 4.5} fill={i === arr.length - 1 ? "transparent" : `rgb(var(--tone-${l === "H" ? 2 : 1}))`} stroke={`rgb(var(--tone-${l === "H" ? 2 : 1}))`} strokeWidth="1.5" />
            </g>
          );
        })}
      </svg>
      <span lang="ja-JP" className="ja flex gap-[2px] text-sm leading-none">
        {moras.map((m, i) => (
          <span key={i} className="w-[22px] text-center">
            {m}
          </span>
        ))}
        <span className="w-[22px] text-center text-ink-faint">が</span>
      </span>
      {showName ? (
        <span className="mt-0.5 text-[11px] text-ink-faint">
          <span lang="ja-JP">{PATTERN_INFO[pattern].native}</span> · {PATTERN_INFO[pattern].name.split(" (")[0]} [{accent}]
        </span>
      ) : null}
    </span>
  );
}

/** Vista de pronunciación: acento tonal del modelo (Kanjium) frente a la curva grabada. */
export function JaPronunciationView({ text, reading, samples, className }: { text: string; reading: string; samples?: Float32Array; sampleRate?: number; className?: string }) {
  const { model, acc } = useMemo(() => {
    const e = lookupFirstJa(text);
    const a = (e?.extra?.pitch as number[] | undefined)?.[0];
    const kana = toHiragana(e?.p ?? reading ?? text);
    return a !== undefined && kana ? { acc: a, model: idealPitchCurve(kana, a) } : { acc: null, model: [] as number[] };
  }, [text, reading]);
  return (
    <div className={cn("space-y-2", className)}>
      {acc !== null ? (
        <div className="flex justify-center">
          <PitchDiagram kana={lookupFirstJa(text)?.p ?? reading} accent={acc} />
        </div>
      ) : null}
      <PitchGraph model={model} user={samples ? Array.from(samples) : []} label="╌╌ acento del modelo · ── tu voz" />
      {acc === null ? <p className="text-center text-xs text-ink-faint">Sin datos de acento para esta frase: compara la melodía con el audio.</p> : null}
    </div>
  );
}
