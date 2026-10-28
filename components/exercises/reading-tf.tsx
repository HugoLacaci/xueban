"use client";
import { useState } from "react";
import type { ReadingTFExercise } from "@/lib/exercises/types";
import { AudioButton } from "@/components/zh/audio-button";
import { ChineseText } from "@/components/zh/chinese-text";
import { cn } from "@/lib/utils";
import { CheckButton, ExerciseCard, Plate, type ExerciseProps } from "./exercise-view";

const tfBtn = "inline-flex h-11 min-w-11 items-center justify-center rounded-[8px] border px-3 text-sm font-semibold transition-[background-color,border-color,color] duration-[var(--dur-ui)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60 focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:opacity-70";

export function ReadingTF({ ex, onSubmit, result }: ExerciseProps<ReadingTFExercise>) {
  const [values, setValues] = useState<(boolean | null)[]>(ex.statements.map(() => null));
  const complete = values.every((v) => v !== null);
  const set = (i: number, v: boolean) => !result && setValues((vs) => vs.map((x, j) => (j === i ? v : x)));
  return (
    <ExerciseCard prompt={ex.prompt}>
      <Plate className="mb-5 p-4">
        <div className="flex items-start gap-2">
          <AudioButton text={ex.text} className="mt-1" />
          <ChineseText text={ex.text} size="lg" as="div" translation={result ? ex.es : undefined} />
        </div>
      </Plate>
      <ul className="space-y-2.5">
        {ex.statements.map((s, i) => {
          const v = values[i];
          const ok = result && v === s.truth;
          return (
            <li key={i} className={cn("flex items-center justify-between gap-3 rounded-[var(--radius-card)] border bg-paper-raised p-3 shadow-[var(--shadow-paper)]", result ? (ok ? "border-celadon/60 bg-celadon/14 shadow-none" : "border-danger/50 bg-danger/10 shadow-none") : "border-line")}>
              <span className="text-sm leading-snug">
                {s.s}
                {result && s.why ? <span className="mt-0.5 block text-xs text-ink-faint">{s.why}</span> : null}
              </span>
              <span className="flex shrink-0 gap-1.5" role="group" aria-label={`Afirmación ${i + 1}`}>
                <button type="button" onClick={() => set(i, true)} disabled={Boolean(result)} aria-pressed={v === true} className={cn(tfBtn, v === true ? "border-celadon bg-celadon text-paper-raised" : "border-line bg-paper-raised text-ink-soft enabled:hover:border-ink/40")}>
                  V
                </button>
                <button type="button" onClick={() => set(i, false)} disabled={Boolean(result)} aria-pressed={v === false} className={cn(tfBtn, v === false ? "border-ink bg-ink text-paper" : "border-line bg-paper-raised text-ink-soft enabled:hover:border-ink/40")}>
                  F
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      {!result ? <CheckButton disabled={!complete} onClick={() => onSubmit({ kind: "tf", values: values as boolean[] })} /> : null}
    </ExerciseCard>
  );
}
