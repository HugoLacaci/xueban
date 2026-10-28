"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Timer, Volume2 } from "lucide-react";
import type { MatchingExercise, Option } from "@/lib/exercises/types";
import { playText } from "@/components/zh/audio-button";
import { Pinyin } from "@/components/zh/pinyin";
import { playFeedback } from "@/lib/sounds";
import { useSettings } from "@/lib/settings";
import { cn, shuffle } from "@/lib/utils";
import { ExerciseCard, type ExerciseProps } from "./exercise-view";

interface Cell {
  id: number;
  side: "L" | "R";
  opt: Option;
  kind: string;
}

export function Matching({ ex, onSubmit, result }: ExerciseProps<MatchingExercise>) {
  const sounds = useSettings((s) => s.settings.sounds);
  const left = useMemo(() => shuffle(ex.pairs.map((p, i) => ({ id: i, side: "L" as const, opt: p.left, kind: ex.leftKind }))), [ex]);
  const right = useMemo(() => shuffle(ex.pairs.map((p, i) => ({ id: i, side: "R" as const, opt: p.right, kind: ex.rightKind }))), [ex]);
  const [selected, setSelected] = useState<Cell | null>(null);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [wrongFlash, setWrongFlash] = useState<string | null>(null);
  const [justDone, setJustDone] = useState<number | null>(null);
  const mistakes = useRef(0);
  const [mistakeCount, setMistakeCount] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (result) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [result]);

  const click = (c: Cell) => {
    if (result || done.has(c.id)) return;
    if (c.kind === "audio") void playText(c.opt.text);
    if (!selected) return setSelected(c);
    if (selected.side === c.side) return setSelected(c);
    if (selected.id === c.id) {
      const next = new Set(done);
      next.add(c.id);
      setDone(next);
      setSelected(null);
      setJustDone(c.id);
      setTimeout(() => setJustDone(null), 500);
      playFeedback("tick", sounds);
      if (next.size === ex.pairs.length) onSubmit({ kind: "matching", mistakes: mistakes.current, completed: true });
    } else {
      mistakes.current++;
      setMistakeCount(mistakes.current);
      playFeedback("fail", sounds);
      setWrongFlash(`${selected.side}${selected.id}-${c.side}${c.id}`);
      setTimeout(() => setWrongFlash(null), 350);
      setSelected(null);
    }
  };

  /* Tira de papel (竹简 horizontal): seleccionada = borde de tinta; emparejada = lavado celadón; fallo = sacudida 绛. */
  const render = (c: Cell) => {
    const isSel = selected?.side === c.side && selected.id === c.id;
    const isDone = done.has(c.id);
    const flash = wrongFlash?.includes(`${c.side}${c.id}`);
    return (
      <button
        key={`${c.side}${c.id}`}
        type="button"
        onClick={() => click(c)}
        disabled={isDone || Boolean(result)}
        aria-pressed={isSel}
        aria-label={c.kind === "audio" ? "Escuchar" : undefined}
        className={cn(
          "flex min-h-14 w-full items-center justify-center rounded-[10px] border px-2 py-2 text-center shadow-[var(--shadow-paper)] transition-[transform,border-color,background-color,opacity] duration-[var(--dur-ui)] ease-[var(--ease-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
          isDone ? cn("border-celadon/50 bg-celadon/14 opacity-60 shadow-none", justDone === c.id && "motion-safe:animate-pop") : isSel ? "border-ink bg-paper-sunk" : "border-line bg-paper-raised enabled:hover:-translate-y-px enabled:hover:border-ink/40",
          flash && "border-danger bg-danger/10 motion-safe:animate-shake",
        )}
      >
        {c.kind === "audio" ? (
          <Volume2 className="size-5 text-ink-soft" aria-hidden="true" />
        ) : c.kind === "hanzi" ? (
          <span lang="zh-CN" className="zh-serif text-[1.75rem] leading-tight">
            {c.opt.text}
          </span>
        ) : c.kind === "pinyin" ? (
          <Pinyin text={c.opt.text} className="text-lg" />
        ) : (
          <span className="text-sm leading-snug">{c.opt.text}</span>
        )}
      </button>
    );
  };

  return (
    <ExerciseCard prompt={`${ex.prompt}: ${kindLabel(ex.leftKind)} ↔ ${kindLabel(ex.rightKind)}`}>
      <div className="mb-4 flex items-center justify-center gap-1.5 text-xs tabular text-ink-faint" aria-live="off">
        <Timer className="size-3.5" aria-hidden="true" /> {seconds}s · fallos: {mistakeCount}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-6" role="group" aria-label="Parejas">
        <div className="space-y-2.5">{left.map(render)}</div>
        <div className="space-y-2.5">{right.map(render)}</div>
      </div>
    </ExerciseCard>
  );
}

function kindLabel(k: string) {
  return { hanzi: "汉字", pinyin: "pinyin", meaning: "significado", audio: "audio" }[k] ?? k;
}
