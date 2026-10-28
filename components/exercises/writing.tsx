"use client";
import { useRef, useState } from "react";
import type { WritingExercise } from "@/lib/exercises/types";
import { Pinyin } from "@/components/zh/pinyin";
import { AudioButton } from "@/components/zh/audio-button";
import { StrokeOrder } from "@/components/zh/stroke-order";
import { cn } from "@/lib/utils";
import { ExerciseCard, Hint, type ExerciseProps } from "./exercise-view";

export function Writing({ ex, onSubmit, result }: ExerciseProps<WritingExercise>) {
  const chars = Array.from(ex.hanzi);
  const mistakes = useRef(0);
  const [doneCount, setDoneCount] = useState(0);
  const size = chars.length > 2 ? 132 : chars.length > 1 ? 160 : 232;
  return (
    <ExerciseCard prompt={ex.prompt}>
      <div className="mb-5 flex flex-col items-center gap-1 text-center">
        <div className="flex items-center gap-2">
          <Pinyin text={ex.pinyin} className="text-3xl" />
          <AudioButton text={ex.hanzi} size="sm" />
        </div>
        <p className="font-serif-es text-lg text-ink-soft">{ex.meaning}</p>
        {chars.length > 1 ? <p className="text-xs text-ink-faint">{chars.length} caracteres · escribe cada uno en su cuadrícula</p> : null}
      </div>
      {/* 田字格 grande; el carácter ya escrito queda marcado con un punto de tinta */}
      <div className="flex flex-wrap justify-center gap-4" role="group" aria-label="Cuadrículas de escritura">
        {chars.map((c, i) => (
          <div key={c + i} className="relative">
            <StrokeOrder
              char={c}
              mode={result ? "animate" : "quiz"}
              size={size}
              controls={Boolean(result)}
              autoplay={Boolean(result)}
              onMistake={() => mistakes.current++}
              onQuizComplete={() => {
                const n = doneCount + 1;
                setDoneCount(n);
                if (n >= chars.length) onSubmit({ kind: "writing", mistakes: mistakes.current });
              }}
            />
            {chars.length > 1 ? (
              <span className={cn("absolute -top-2 left-1/2 -translate-x-1/2 rounded-full border px-1.5 text-[10px] tabular", i < doneCount || result ? "border-celadon/60 bg-celadon/14 text-celadon-ink" : "border-line bg-paper-raised text-ink-faint")} aria-hidden="true">
                {i + 1}
              </span>
            ) : null}
          </div>
        ))}
      </div>
      {!result ? <Hint>Tras 2 fallos en un trazo aparece la pista. Se valora por el total de fallos.</Hint> : null}
    </ExerciseCard>
  );
}
