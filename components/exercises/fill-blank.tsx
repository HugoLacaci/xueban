"use client";
import { useEffect, useState } from "react";
import type { FillBlankExercise } from "@/lib/exercises/types";
import { useSettings } from "@/lib/settings";
import { Input } from "@/components/ui/primitives";
import { AudioButton } from "@/components/target/audio-button";
import { ChineseText } from "@/components/target/target-text";
import { CheckButton, ExerciseCard, OptionTile, type ExerciseProps } from "./exercise-view";
import { targetLang } from "@/lib/languages/registry";
import { Mixed } from "@/components/target/mixed";

export function FillBlank({ ex, onSubmit, result }: ExerciseProps<FillBlankExercise>) {
  const [chosen, setChosen] = useState<number | null>(null);
  const [text, setText] = useState("");
  const pinyinMode = useSettings((s) => s.settings.pinyinMode);
  const filled = result ? ex.zh.replace(/＿+/, ex.answer) : chosen !== null && ex.options ? ex.zh.replace(/＿+/, ex.options[chosen]) : ex.zh;

  useEffect(() => {
    if (!ex.options) return;
    const onKey = (e: KeyboardEvent) => {
      if (result) return;
      const n = Number(e.key);
      if (n >= 1 && n <= ex.options!.length) {
        e.preventDefault();
        setChosen(n - 1);
        onSubmit({ kind: "choice", index: n - 1 });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ex, result, onSubmit]);

  return (
    <ExerciseCard prompt={ex.prompt}>
      <div className="mb-6 text-center">
        <div className="flex items-start justify-center gap-2">
          {result ? <AudioButton text={ex.zh.replace(/＿+/, ex.answer)} className="mt-1" /> : null}
          <ChineseText text={filled} size="xl" highlight={result ? [ex.answer] : undefined} pinyinLine={result && pinyinMode !== "hide" ? ex.pinyin : undefined} as="div" interactive={Boolean(result)} />
        </div>
        <p className="mt-2 font-serif-es text-lg text-ink-soft"><Mixed>{ex.es}</Mixed></p>
      </div>
      {ex.options ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4" role="group" aria-label="Opciones">
          {ex.options.map((o, i) => {
            const state = !result ? (chosen === i ? "selected" : "idle") : o === ex.answer ? "correct" : chosen === i ? "wrong" : "muted";
            return (
              <OptionTile
                key={i}
                index={i + 1}
                state={state}
                className="justify-center"
                onClick={() => {
                  if (result) return;
                  setChosen(i);
                  onSubmit({ kind: "choice", index: i });
                }}
                disabled={Boolean(result)}
              >
                <span lang={targetLang()} className="zh-serif text-3xl leading-none">
                  {o}
                </span>
              </OptionTile>
            );
          })}
        </div>
      ) : (
        <form
          className="mx-auto w-full max-w-xs"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim() && !result) onSubmit({ kind: "text", text });
          }}
        >
          <Input lang={targetLang()} value={text} onChange={(e) => setText(e.target.value)} className="zh-serif h-14 text-center text-2xl" autoFocus disabled={Boolean(result)} aria-label="Carácter que falta" />
          {!result ? <CheckButton type="submit" disabled={!text.trim()} /> : null}
        </form>
      )}
    </ExerciseCard>
  );
}
