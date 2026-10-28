"use client";
import { useEffect, useState } from "react";
import type { MultipleChoiceExercise } from "@/lib/exercises/types";
import { useSettings } from "@/lib/settings";
import { Pinyin } from "@/components/zh/pinyin";
import { AudioButton, useSpaceToPlay } from "@/components/zh/audio-button";
import { ChineseText } from "@/components/zh/chinese-text";
import { cn } from "@/lib/utils";
import { ExerciseCard, OptionTile, Plate, Stage, optionState, type ExerciseProps } from "./exercise-view";

export function MultipleChoice({ ex, onSubmit, result }: ExerciseProps<MultipleChoiceExercise>) {
  const [chosen, setChosen] = useState<number | null>(null);
  const pinyinMode = useSettings((s) => s.settings.pinyinMode);
  const audioText = ex.display.audio;
  useSpaceToPlay(audioText, !result);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (result) return;
      const n = Number(e.key);
      if (n >= 1 && n <= ex.options.length) {
        e.preventDefault();
        setChosen(n - 1);
        onSubmit({ kind: "choice", index: n - 1 });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ex, result, onSubmit]);

  const pick = (i: number) => {
    if (result) return;
    setChosen(i);
    onSubmit({ kind: "choice", index: i });
  };

  const isZhOptions = ex.options.some((o) => o.zh);
  const showSub = (o: MultipleChoiceExercise["options"][number]) => o.sub && (result || !o.zh || ex.type === "component" || ex.type === "classifier" || ex.type === "tone-pair");

  return (
    <ExerciseCard prompt={ex.prompt}>
      {ex.display.dialogue ? (
        <Plate className="mb-5 space-y-1.5 text-left">
          {ex.display.dialogue.map((l, i) => (
            <div key={i} className="flex gap-2">
              {l.speaker ? <span className="mt-1 shrink-0 text-xs font-medium text-ink-faint">{l.speaker}:</span> : null}
              <ChineseText text={l.zh} size="md" translation={result ? l.es : undefined} as="div" />
            </div>
          ))}
        </Plate>
      ) : null}

      <Stage zh={ex.display.zh}>
        {audioText ? <AudioButton text={audioText} size="lg" variant="solid" autoPlay /> : null}
        {ex.display.zh && ex.display.pinyin && (pinyinMode === "show" || result) ? <Pinyin text={ex.display.pinyin} className="block text-xl" /> : null}
        {ex.display.es ? <p className="font-serif-es text-2xl text-ink">{ex.display.es}</p> : null}
        {ex.display.pinyin && !ex.display.zh ? <Pinyin text={ex.display.pinyin} className="text-2xl" /> : null}
      </Stage>

      <div className={cn("grid gap-2.5", isZhOptions ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2")} role="group" aria-label="Opciones">
        {ex.options.map((o, i) => (
          <div key={i} className="relative">
            <OptionTile index={i + 1} state={optionState(i, chosen, ex.answer, Boolean(result))} onClick={() => pick(i)} disabled={Boolean(result)} className={cn(o.zh && "min-h-[4.25rem]", o.zh && result && "pr-10")}>
              <span className="min-w-0 flex-1">
                {o.zh ? (
                  <span lang="zh-CN" className="zh-serif block text-[1.75rem] leading-tight sm:text-3xl">
                    {o.text}
                  </span>
                ) : o.pinyin ? (
                  <Pinyin text={o.text} className="block text-xl" />
                ) : (
                  <span className="block text-base leading-snug">{o.text}</span>
                )}
                {showSub(o) ? <span className="block truncate text-xs text-ink-faint">{o.sub}</span> : null}
              </span>
            </OptionTile>
            {o.zh && result ? <AudioButton text={o.text} size="sm" className="absolute right-2 top-1/2 -translate-y-1/2" /> : null}
          </div>
        ))}
      </div>
    </ExerciseCard>
  );
}
