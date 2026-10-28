"use client";
import { useEffect, useState } from "react";
import type { ToneChoiceExercise } from "@/lib/exercises/types";
import type { Tone } from "@/lib/pinyin/tones";
import { addToneMark } from "@/lib/pinyin/tones";
import { TONE_MARKS, TONE_NAMES } from "@/components/zh/pinyin";
import { AudioButton, playText, useSpaceToPlay } from "@/components/zh/audio-button";
import { Hanzi } from "@/components/zh/chinese-text";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { ExerciseCard, Hint, type ExerciseProps } from "./exercise-view";

const TONES: Tone[] = [1, 2, 3, 4, 5];

/** Contorno del tono (˥ ˧˥ ˨˩˦ ˥˩ ·) trazado a pincel en el color del tono. */
export function ToneGlyph({ tone, className, size = 36 }: { tone: Tone; className?: string; size?: number }) {
  const d = { 1: "M4 6 L32 6", 2: "M5 20 L31 5", 3: "M4 10 L14 22 L32 5", 4: "M5 5 L31 21", 5: "" }[tone];
  return (
    <svg viewBox="0 0 36 26" width={size} height={(size * 26) / 36} className={className} aria-hidden="true" style={{ color: `rgb(var(--tone-${tone}))` }}>
      {tone === 5 ? <circle cx="18" cy="14" r="3.2" fill="currentColor" /> : <path d={d} fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

export function ToneChoice({ ex, onSubmit, result }: ExerciseProps<ToneChoiceExercise>) {
  const [tones, setTones] = useState<(Tone | null)[]>(ex.syllables.map(() => null));
  const [cursor, setCursor] = useState(0);
  useSpaceToPlay(ex.audio, !result);

  const choose = (t: Tone) => {
    if (result) return;
    const next = tones.slice();
    next[cursor] = t;
    setTones(next);
    if (cursor + 1 < ex.syllables.length) setCursor(cursor + 1);
    else if (next.every((x) => x !== null)) onSubmit({ kind: "tones", tones: next as Tone[] });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (result) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 5) {
        e.preventDefault();
        choose(n as Tone);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, tones, result]);

  return (
    <ExerciseCard prompt={ex.prompt}>
      <div className="mb-6 flex flex-col items-center gap-3">
        <AudioButton text={ex.audio} size="lg" variant="solid" autoPlay />
        <Button size="sm" variant="ghost" onClick={() => void playText(ex.audio, 0.6)}>
          muy despacio
        </Button>
        <span style={{ fontSize: "clamp(40px, 10vw, 56px)" }}>
          <Hanzi text={ex.zh} font="serif" className={cn(!result && "opacity-80")} />
        </span>
        {/* sílabas: chips de papel; la activa lleva borde de tinta */}
        <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Sílabas">
          {ex.syllables.map((s, i) => {
            const t = tones[i];
            const want = ex.answer[i];
            const ok = result && t === want;
            const bad = result && t !== want;
            return (
              <button
                key={i}
                type="button"
                onClick={() => !result && setCursor(i)}
                aria-pressed={cursor === i && !result}
                aria-label={`sílaba ${i + 1}: ${s}`}
                className={cn(
                  "min-w-[4.5rem] rounded-[10px] border bg-paper-raised px-3 py-2 text-center text-2xl shadow-[var(--shadow-paper)] transition-[border-color,background-color] duration-[var(--dur-ui)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
                  cursor === i && !result ? "border-ink bg-paper-sunk" : "border-line",
                  ok && "border-celadon bg-celadon/14",
                  bad && "border-danger bg-danger/10 motion-safe:animate-shake",
                )}
              >
                <span className={cn("font-medium", t ? `tone-${t}` : "text-ink-soft")}>{t ? addToneMark(s, t) : s}</span>
                <span className="block text-[10px] tabular text-ink-faint">{result ? `${t ? TONE_MARKS[t] : "?"} → ${TONE_MARKS[want]}` : t ? TONE_MARKS[t] : `sílaba ${i + 1}`}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2" role="group" aria-label="Tonos">
        {TONES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => choose(t)}
            disabled={Boolean(result)}
            className={cn(
              "flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-[var(--radius-card)] border border-line bg-paper-raised py-2.5 shadow-[var(--shadow-paper)] transition-[transform,border-color,background-color] duration-[var(--dur-ui)] ease-[var(--ease-ink)]",
              "enabled:hover:-translate-y-px enabled:hover:border-ink/40 enabled:active:translate-y-0 disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
            )}
            title={TONE_NAMES[t]}
            aria-label={`Tono ${t === 5 ? "neutro" : t}: ${TONE_NAMES[t]}`}
          >
            <ToneGlyph tone={t} />
            <span className="text-[11px] text-ink-faint">{t === 5 ? "neutro" : `${t}.º`}</span>
            <Kbd>{t}</Kbd>
          </button>
        ))}
      </div>
      <Hint>1 alto · 2 sube · 3 baja y sube · 4 cae · 5 neutro</Hint>
    </ExerciseCard>
  );
}
