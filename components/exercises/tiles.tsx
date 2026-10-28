"use client";
import { useEffect, useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, pointerWithin, useDraggable, useDroppable, useSensor, useSensors, type CollisionDetection, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BuildCharacterExercise, TilesExercise } from "@/lib/exercises/types";
import { useSettings } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Pinyin } from "@/components/zh/pinyin";
import { AudioButton, useSpaceToPlay } from "@/components/zh/audio-button";
import { ChineseText } from "@/components/zh/chinese-text";
import { StrokeOrder } from "@/components/zh/stroke-order";
import { lookupFirst } from "@/lib/dictionary/service";
import { cn, shuffle } from "@/lib/utils";
import { CheckButton, DropZone, ExerciseCard, Hint, Plate, type ExerciseProps } from "./exercise-view";

interface Tile {
  id: number;
  text: string;
}

/* ---------------------------------------------------------------------------------------------
 * 竹简 — ficha de bambú: ficha de papel alta con una veta vertical tenue. Solo transform/opacity.
 * ------------------------------------------------------------------------------------------- */
const slipBase =
  "zh-serif relative inline-flex min-h-14 select-none items-center justify-center rounded-[8px] border bg-paper-raised px-3.5 py-1.5 text-2xl leading-none text-ink shadow-[var(--shadow-paper)] touch-none transition-[border-color,background-color,box-shadow,opacity] duration-[var(--dur-ui)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60 focus-visible:ring-offset-2 focus-visible:ring-offset-paper before:pointer-events-none before:absolute before:inset-y-1.5 before:left-1.5 before:w-px before:bg-ink/10 after:pointer-events-none after:absolute after:inset-y-1.5 after:right-1.5 after:w-px after:bg-ink/10";

function Slip({ text, state, className, ...props }: React.ComponentPropsWithRef<"button"> & { text: string; state?: "idle" | "bank" | "correct" | "wrong" | "ghost" }) {
  return (
    <button type="button" lang="zh-CN" className={cn(slipBase, state === "bank" && "bg-paper-sunk/70 enabled:hover:bg-paper-raised", state === "idle" && "border-line enabled:hover:border-ink/40", state === "bank" && "border-line", state === "correct" && "border-celadon bg-celadon/14 shadow-none", state === "wrong" && "border-danger bg-danger/10 shadow-none", state === "ghost" && "opacity-0", className)} {...props}>
      {text}
    </button>
  );
}

function SortableSlip({ tile, state, onClick, disabled }: { tile: Tile; state: "idle" | "correct" | "wrong"; onClick: () => void; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `a-${tile.id}`, disabled });
  return (
    <Slip
      ref={setNodeRef}
      text={tile.text}
      state={isDragging ? "ghost" : state}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={onClick}
      disabled={disabled}
      {...attributes}
      {...listeners}
    />
  );
}

function BankSlip({ tile, onClick, disabled }: { tile: Tile; onClick: () => void; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `b-${tile.id}`, disabled });
  return (
    <Slip
      ref={setNodeRef}
      text={tile.text}
      state={isDragging ? "ghost" : "bank"}
      style={{ transform: CSS.Translate.toString(transform) }}
      onClick={onClick}
      disabled={disabled}
      className="disabled:opacity-40"
      {...attributes}
      {...listeners}
    />
  );
}

const collision: CollisionDetection = (args) => {
  const within = pointerWithin(args);
  return within.length ? within : closestCenter(args);
};

export function Tiles({ ex, onSubmit, result }: ExerciseProps<TilesExercise>) {
  const [bank, setBank] = useState<Tile[]>(() => ex.tiles.map((t, i) => ({ id: i, text: t })));
  const [answer, setAnswer] = useState<Tile[]>([]);
  const [active, setActive] = useState<Tile | null>(null);
  const pinyinMode = useSettings((s) => s.settings.pinyinMode);
  useSpaceToPlay(ex.zh, Boolean(result));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates, keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] } }),
  );
  const { setNodeRef: setAnswerRef, isOver: overAnswer } = useDroppable({ id: "answer", disabled: Boolean(result) });
  const { setNodeRef: setBankRef, isOver: overBank } = useDroppable({ id: "bank", disabled: Boolean(result) });
  const answerIds = useMemo(() => answer.map((t) => `a-${t.id}`), [answer]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !result && answer.length && !(e.target as HTMLElement | null)?.closest?.("[data-tiles]")) {
        e.preventDefault();
        onSubmit({ kind: "tiles", tiles: answer.map((t) => t.text) });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answer, result, onSubmit]);

  const moveToAnswer = (t: Tile, at?: number) => {
    if (result) return;
    setBank((b) => b.filter((x) => x.id !== t.id));
    setAnswer((a) => {
      const copy = a.filter((x) => x.id !== t.id);
      copy.splice(at === undefined ? copy.length : at, 0, t);
      return copy;
    });
  };
  const moveToBank = (t: Tile) => {
    if (result) return;
    setAnswer((a) => a.filter((x) => x.id !== t.id));
    setBank((b) => [...b, t]);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActive(null);
    const { active: a, over } = e;
    if (!over || result) return;
    const [from, idStr] = String(a.id).split("-");
    const id = Number(idStr);
    const tile = (from === "b" ? bank : answer).find((t) => t.id === id);
    if (!tile) return;
    const overId = String(over.id);
    if (from === "b") {
      if (overId === "bank") return;
      const at = overId.startsWith("a-") ? answer.findIndex((t) => `a-${t.id}` === overId) : undefined;
      moveToAnswer(tile, at === -1 ? undefined : at);
    } else {
      if (overId === "bank") return moveToBank(tile);
      if (overId.startsWith("a-") && overId !== String(a.id)) {
        const oldIndex = answer.findIndex((t) => `a-${t.id}` === String(a.id));
        const newIndex = answer.findIndex((t) => `a-${t.id}` === overId);
        if (oldIndex >= 0 && newIndex >= 0) setAnswer((arr) => arrayMove(arr, oldIndex, newIndex));
      }
    }
  };

  return (
    <ExerciseCard prompt={ex.prompt}>
      <p className="mb-5 text-center font-serif-es text-2xl text-ink">{ex.es}</p>
      <DndContext
        sensors={sensors}
        collisionDetection={collision}
        onDragStart={(e) => {
          const [from, idStr] = String(e.active.id).split("-");
          setActive((from === "b" ? bank : answer).find((t) => t.id === Number(idStr)) ?? null);
        }}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActive(null)}
      >
        <div data-tiles="">
          {/* zona de respuesta */}
          <DropZone ref={setAnswerRef} state={result ? (result.correct ? "correct" : "wrong") : overAnswer ? "over" : "idle"} className="mb-4" aria-label="Tu frase, en orden">
            {answer.length === 0 ? <span className="px-1 text-sm text-ink-faint">Pulsa o arrastra las fichas aquí, en orden</span> : null}
            <SortableContext items={answerIds} strategy={rectSortingStrategy}>
              {answer.map((t, i) => (
                <SortableSlip key={t.id} tile={t} state={result ? (ex.answer[i] === t.text ? "correct" : "wrong") : "idle"} onClick={() => moveToBank(t)} disabled={Boolean(result)} />
              ))}
            </SortableContext>
          </DropZone>
          {/* banco */}
          <div ref={setBankRef} className={cn("flex flex-wrap items-center justify-center gap-2 rounded-[var(--radius-card)] p-1 transition-[background-color] duration-[var(--dur-ui)]", !result && "min-h-16", overBank && "bg-paper-sunk/60")} aria-label="Fichas disponibles">
            {bank.map((t) => (
              <BankSlip key={t.id} tile={t} onClick={() => moveToAnswer(t)} disabled={Boolean(result)} />
            ))}
          </div>
        </div>
        <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(.2,.8,.2,1)" }}>
          {active ? <Slip text={active.text} state="idle" className="scale-105 border-ink/50 shadow-[var(--shadow-float)]" /> : null}
        </DragOverlay>
      </DndContext>
      {!result ? (
        <>
          <Hint>Pulsa para colocar · arrastra para reordenar · con teclado: Espacio y flechas</Hint>
          <div className="mt-2 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setBank(shuffle(ex.tiles.map((t, i) => ({ id: i, text: t }))));
                setAnswer([]);
              }}
            >
              <RotateCcw /> Reiniciar
            </Button>
          </div>
          <CheckButton disabled={!answer.length} onClick={() => onSubmit({ kind: "tiles", tiles: answer.map((t) => t.text) })} />
        </>
      ) : (
        <Plate className="mt-5 flex items-start justify-center gap-2">
          <AudioButton text={ex.zh} className="mt-1" autoPlay />
          <ChineseText text={ex.zh} size="lg" pinyinLine={pinyinMode !== "hide" ? ex.pinyin : undefined} as="div" />
        </Plate>
      )}
    </ExerciseCard>
  );
}

export function BuildCharacter({ ex, onSubmit, result }: ExerciseProps<BuildCharacterExercise>) {
  const [picked, setPicked] = useState<string[]>([]);
  const [options] = useState(() => shuffle([...ex.components, ...ex.distractors]));
  const toggle = (c: string) => {
    if (result) return;
    setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  };
  return (
    <ExerciseCard prompt={ex.prompt}>
      <div className="mb-5 flex flex-col items-center gap-2">
        {result ? (
          <StrokeOrder char={ex.hanzi} size={128} controls={false} />
        ) : (
          <span lang="zh-CN" className="zh-serif flex size-32 items-center justify-center rounded-lg text-7xl text-ink/20" aria-hidden="true">
            ？
          </span>
        )}
        <Pinyin text={ex.pinyin} className="text-xl" />
        <p className="font-serif-es text-lg text-ink-soft">{ex.meaning}</p>
      </div>
      <DropZone state={result ? (result.correct ? "correct" : "wrong") : "idle"} className="mb-4 justify-center" aria-label="Componentes elegidos">
        {picked.length ? (
          picked.map((c) => (
            <span key={c} lang="zh-CN" className={cn(slipBase, "text-3xl", result ? (ex.components.includes(c) ? "border-celadon bg-celadon/14" : "border-danger bg-danger/10") : "border-line")}>
              {c}
            </span>
          ))
        ) : (
          <span className="text-sm text-ink-faint">Selecciona los componentes</span>
        )}
      </DropZone>
      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Componentes">
        {options.map((c) => {
          const info = lookupFirst(c);
          const on = picked.includes(c);
          return (
            <button
              key={c}
              type="button"
              onClick={() => toggle(c)}
              disabled={Boolean(result)}
              aria-pressed={on}
              className={cn(
                "flex min-w-[4.5rem] flex-col items-center rounded-[var(--radius-card)] border bg-paper-raised px-3 py-2 shadow-[var(--shadow-paper)] transition-[border-color,background-color,transform] duration-[var(--dur-ui)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60 focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:opacity-55",
                on ? "border-ink bg-paper-sunk" : "border-line enabled:hover:-translate-y-px enabled:hover:border-ink/40",
              )}
            >
              <span lang="zh-CN" className="zh-serif text-3xl">
                {c}
              </span>
              <span className="max-w-24 truncate text-[11px] text-ink-faint">{info?.es ?? info?.en?.[0] ?? ""}</span>
            </button>
          );
        })}
      </div>
      {!result ? <CheckButton disabled={!picked.length} onClick={() => onSubmit({ kind: "tiles", tiles: picked })} /> : null}
    </ExerciseCard>
  );
}
