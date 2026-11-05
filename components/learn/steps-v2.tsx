"use client";
/**
 * Pasos del temario v2 (docs/TEMARIO.md §6): objetivo, pronunciación del día, esqueleto, «Construye la frase»,
 * escuchar y hablar, y «Tus apuntes han crecido». El carácter del día lo aporta el paquete del idioma (módulo).
 */
import { useEffect, useMemo, useState } from "react";
import Link from "@/lib/languages/link";
import { Check, Eye, EyeOff, RotateCcw, Sprout, X } from "lucide-react";
import type { Lesson, LessonStep } from "@/lib/course/types";
import { checkBuild, filledSlots, joinZh, slotDef, type SlotId } from "@/lib/course/skeleton";
import { growthForLesson, unlockLabel, type LivingNote } from "@/lib/notes/living-model";
import { loadLivingNotes, saveModelSentence } from "@/lib/notes/living";
import { getActiveLang } from "@/lib/languages/registry";
import { useSettings } from "@/lib/settings";
import { playFeedback } from "@/lib/sounds";
import { cn, shuffle } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/primitives";
import { AudioButton } from "@/components/target/audio-button";
import { Reading } from "@/components/target/reading";
import { Mixed } from "@/components/target/mixed";
import { Markdown } from "./markdown";
import { SentenceSkeleton } from "./sentence-skeleton";
import { StepTitle } from "./steps";

type Step<T extends LessonStep["type"]> = Extract<LessonStep, { type: T }>;

/* ------------------------------------------------------------------ objetivo */

export function ObjectiveStep({ lesson, step }: { lesson: Lesson; step: Step<"objective"> }) {
  return (
    <div>
      <StepTitle>Objetivo de hoy</StepTitle>
      <p className="font-serif-es text-ink text-lg">{lesson.goal}</p>
      <p className="text-ink-faint mt-4 mb-2 text-[11px] font-semibold tracking-[0.12em] uppercase">
        ¿Qué sabrás decir al acabar?
      </p>
      <ul className="space-y-2">
        {step.canSay.map((s, i) => (
          <li
            key={i}
            className="border-line bg-paper-raised flex items-start gap-2 rounded-[10px] border px-3 py-2"
          >
            <AudioButton text={s.zh} size="sm" />
            <span className="min-w-0">
              <span lang="zh-CN" className="zh text-ink block text-lg">
                {s.zh}
              </span>
              {s.py ? <Reading text={s.py} className="block text-xs" /> : null}
              <span className="text-ink-soft block text-sm">{s.es}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ pronunciación del día */

export function PhoneticsDrillStep({ step }: { step: Step<"phonetics-drill"> }) {
  const sounds = useSettings((s) => s.settings.sounds);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const correct = step.items.filter((it, i) => picked[i] === it.answer).length;
  return (
    <div>
      <StepTitle
        aside={
          <Badge variant="muted">
            {correct} / {step.items.length}
          </Badge>
        }
      >
        Pronunciación: <Mixed>{step.title}</Mixed>
      </StepTitle>
      <Markdown>{step.markdown}</Markdown>
      <ol className="mt-4 space-y-3">
        {step.items.map((it, i) => {
          const p = picked[i];
          const done = p !== undefined;
          return (
            <li key={i} className="border-line bg-paper-raised rounded-[10px] border p-3">
              <div className="mb-2 flex items-center gap-2">
                <AudioButton text={it.audio} size="sm" label="Escuchar" />
                <span className="text-ink-soft text-sm">
                  <Mixed>{it.prompt ?? "Escucha y elige lo que oyes"}</Mixed>
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {it.options.map((o, j) => (
                  <button
                    key={j}
                    type="button"
                    disabled={done}
                    onClick={() => {
                      setPicked((x) => ({ ...x, [i]: j }));
                      playFeedback(j === it.answer ? "ok" : "fail", sounds);
                    }}
                    className={cn(
                      "min-h-9 rounded-[8px] border px-3 text-sm",
                      !done
                        ? "border-line hover:border-ink/40"
                        : j === it.answer
                          ? "border-celadon bg-celadon/10 text-celadon-ink"
                          : j === p
                            ? "border-cinnabar bg-cinnabar/10 text-cinnabar"
                            : "border-line opacity-60",
                    )}
                  >
                    <Mixed>{o}</Mixed>
                  </button>
                ))}
              </div>
              {done && it.explain ? (
                <p className="text-ink-soft mt-2 text-xs">
                  <Mixed>{it.explain}</Mixed>
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ esqueleto */

export function SkeletonStep({ lesson, step }: { lesson: Lesson; step: Step<"skeleton"> }) {
  return (
    <div className="space-y-4">
      <StepTitle>
        <Mixed>{step.title}</Mixed>
      </StepTitle>
      {step.markdown ? <Markdown>{step.markdown}</Markdown> : null}
      <SentenceSkeleton
        sentences={step.sentences}
        focus={step.focus}
        at={lesson.id}
        compare={step.compare}
        title="Dónde va lo nuevo"
      />
      {step.negative?.length ? (
        <SentenceSkeleton
          sentences={step.negative}
          focus={step.focus}
          at={lesson.id}
          title="Negativa"
        />
      ) : null}
      {step.question?.length ? (
        <SentenceSkeleton
          sentences={step.question}
          focus={step.focus}
          at={lesson.id}
          title="Pregunta"
        />
      ) : null}
      {step.mistakes?.length ? (
        <Card className="space-y-2">
          <p className="text-ink-faint text-[11px] font-semibold tracking-[0.12em] uppercase">
            Errores típicos
          </p>
          {step.mistakes.map((m, i) => (
            <div key={i} className="text-sm">
              <p>
                <X className="text-cinnabar mr-1 inline size-3.5" />
                <span lang="zh-CN" className="zh text-cinnabar decoration-cinnabar/50 line-through">
                  {m.wrong}
                </span>
                <Check className="text-celadon-ink mr-1 ml-3 inline size-3.5" />
                <span lang="zh-CN" className="zh text-celadon-ink">
                  {m.right}
                </span>
              </p>
              <p className="text-ink-soft text-xs">
                <Mixed>{m.why}</Mixed>
              </p>
            </div>
          ))}
        </Card>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ construye la frase */

export function SentenceBuilderStep({
  lesson,
  step,
}: {
  lesson: Lesson;
  step: Step<"sentence-builder">;
}) {
  const sounds = useSettings((s) => s.settings.sounds);
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState<number[]>([]);
  const [result, setResult] = useState<{ ok: boolean; misplaced: SlotId[] } | null>(null);
  const item = step.items[idx];
  const pieces = useMemo(() => {
    const cols = filledSlots(item.sentence);
    const real = cols.map((id) => ({
      text: item.sentence.slots[id]!.zh,
      slot: id as SlotId | undefined,
    }));
    const extra = (item.distractors ?? []).map((t) => ({ text: t, slot: undefined }));
    return shuffle([...real, ...extra]);
  }, [item]);
  const check = () => {
    const r = checkBuild(
      item.sentence,
      chosen.map((i) => pieces[i].text),
    );
    setResult(r);
    if (r.ok)
      void saveModelSentence(getActiveLang(), {
        zh: joinZh(item.sentence),
        es: item.sentence.es,
        slots: filledSlots(item.sentence).length,
        lessonId: lesson.id,
      });
    playFeedback(r.ok ? "ok" : "fail", sounds);
  };
  const reset = () => {
    setChosen([]);
    setResult(null);
  };
  return (
    <div className="space-y-4">
      <StepTitle
        aside={
          <Badge variant="muted">
            {idx + 1} / {step.items.length}
          </Badge>
        }
      >
        {step.title ?? "Construye la frase"}
      </StepTitle>
      <p className="font-serif-es text-ink text-lg">«{item.sentence.es}»</p>
      <div
        className="border-line bg-paper-sunk/40 flex min-h-12 flex-wrap items-center gap-1.5 rounded-[10px] border border-dashed p-2"
        aria-label="Tu frase"
      >
        {chosen.length ? (
          chosen.map((i, k) => {
            const p = pieces[i];
            const bad = result && !result.ok && p.slot && result.misplaced.includes(p.slot);
            return (
              <button
                key={k}
                type="button"
                disabled={Boolean(result)}
                onClick={() => setChosen((c) => c.filter((_, j) => j !== k))}
                lang="zh-CN"
                className={cn(
                  "zh rounded-[8px] border px-2.5 py-1 text-lg",
                  bad ? "border-cinnabar bg-cinnabar/10" : "border-ink/30 bg-paper-raised",
                )}
              >
                {p.text}
              </button>
            );
          })
        ) : (
          <span className="text-ink-faint text-xs">Pulsa los trozos en orden…</span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {pieces.map((p, i) => (
          <button
            key={i}
            type="button"
            disabled={chosen.includes(i) || Boolean(result)}
            onClick={() => setChosen((c) => [...c, i])}
            lang="zh-CN"
            className={cn(
              "zh border-line bg-paper-raised hover:border-ink/40 rounded-[8px] border px-2.5 py-1 text-lg transition-opacity",
              chosen.includes(i) && "opacity-30",
            )}
          >
            {p.text}
          </button>
        ))}
      </div>
      {result ? (
        <div className="space-y-3">
          <p
            className={cn("text-sm font-medium", result.ok ? "text-celadon-ink" : "text-cinnabar")}
          >
            {result.ok
              ? "¡Correcto! Así queda en el esqueleto:"
              : `Revisa: ${result.misplaced.map((s) => slotDef(s).es).join(", ")}. La frase correcta es:`}
          </p>
          <SentenceSkeleton
            sentences={[item.sentence]}
            focus={result.ok ? [] : result.misplaced}
            at={lesson.id}
            compare={Boolean(item.sentence.esOrder)}
          />
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {!result ? (
          <>
            <Button onClick={check} disabled={!chosen.length}>
              Comprobar
            </Button>
            <Button variant="ghost" onClick={reset} disabled={!chosen.length}>
              <RotateCcw /> Borrar
            </Button>
          </>
        ) : idx < step.items.length - 1 ? (
          <Button
            onClick={() => {
              setIdx((i) => i + 1);
              reset();
            }}
          >
            Siguiente frase
          </Button>
        ) : (
          <Button variant="ghost" onClick={reset}>
            <RotateCcw /> Repetir
          </Button>
        )}
        <AudioButton text={joinZh(item.sentence)} size="sm" label="Escuchar la frase" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ escuchar y hablar */

export function ListenSpeakStep({ step }: { step: Step<"listen-speak"> }) {
  const [showText, setShowText] = useState(false);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  return (
    <div className="space-y-4">
      <StepTitle
        aside={
          <Button size="sm" variant="ghost" onClick={() => setShowText((v) => !v)}>
            {showText ? <EyeOff /> : <Eye />} {showText ? "Ocultar texto" : "Ver texto"}
          </Button>
        }
      >
        Escuchar y hablar
      </StepTitle>
      <p className="text-ink-soft text-sm">
        Shadowing: escucha cada frase y repítela a la vez, imitando la melodía. Primero a velocidad
        lenta, después normal.
      </p>
      <ol className="space-y-2">
        {step.shadowing.map((s, i) => (
          <li
            key={i}
            className="border-line bg-paper-raised flex items-start gap-2 rounded-[10px] border px-3 py-2"
          >
            <AudioButton text={s.zh} size="sm" rate={0.7} label="Lento" />
            <AudioButton text={s.zh} size="sm" label="Normal" />
            <span className="min-w-0">
              {showText ? (
                <>
                  <span lang="zh-CN" className="zh text-ink block text-lg">
                    {s.zh}
                  </span>
                  {s.py ? <Reading text={s.py} className="block text-xs" /> : null}
                </>
              ) : (
                <span className="text-ink-faint block text-sm">Frase {i + 1}</span>
              )}
              <span className="text-ink-soft block text-xs">{s.es}</span>
            </span>
          </li>
        ))}
      </ol>
      {step.respond?.length ? (
        <div>
          <p className="text-ink-faint mb-2 text-[11px] font-semibold tracking-[0.12em] uppercase">
            Responde en voz alta
          </p>
          <ol className="space-y-2">
            {step.respond.map((r, i) => (
              <li key={i} className="border-line bg-paper-raised rounded-[10px] border px-3 py-2">
                <div className="flex items-center gap-2">
                  <AudioButton text={r.q.zh} size="sm" />
                  <span lang="zh-CN" className="zh text-ink text-lg">
                    {r.q.zh}
                  </span>
                  <span className="text-ink-soft text-xs">{r.q.es}</span>
                </div>
                {revealed[i] ? (
                  <p className="mt-1 text-sm">
                    <span className="text-ink-faint">Modelo: </span>
                    <span lang="zh-CN" className="zh text-celadon-ink">
                      {r.model.zh}
                    </span>{" "}
                    <span className="text-ink-soft text-xs">({r.model.es})</span>
                  </p>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-1"
                    onClick={() => setRevealed((x) => ({ ...x, [i]: true }))}
                  >
                    Ver respuesta modelo
                  </Button>
                )}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ tus apuntes han crecido */

export function NotesGrowthStep({ lesson }: { lesson: Lesson }) {
  const [notes, setNotes] = useState<LivingNote[] | null>(null);
  useEffect(() => {
    void loadLivingNotes(getActiveLang()).then(setNotes);
  }, []);
  const growth = notes ? growthForLesson(notes, lesson.id) : [];
  return (
    <div>
      <StepTitle>Tus apuntes han crecido</StepTitle>
      {!notes ? <p className="text-ink-faint text-sm">Cargando…</p> : null}
      {notes && !growth.length ? (
        <p className="text-ink-soft text-sm">
          Esta lección no añade secciones nuevas a tus apuntes vivos: repasa lo que ya tienes.
        </p>
      ) : null}
      <ul className="space-y-2">
        {growth.map(({ note, sections }) => (
          <li key={note.id}>
            <Link
              href={`/apuntes/vivos?n=${note.id}#${sections[0].id}`}
              className="border-celadon/50 bg-celadon/8 hover:border-celadon flex items-start gap-3 rounded-[10px] border px-3 py-2"
            >
              <Sprout className="text-celadon-ink mt-0.5 size-4 shrink-0" />
              <span className="min-w-0">
                <span className="text-ink block text-sm font-medium">
                  <Mixed>{note.title}</Mixed>{" "}
                  <span className="text-ink-faint text-xs font-normal">
                    · {unlockLabel(lesson.id)}
                  </span>
                </span>
                {sections.map((s) => (
                  <span key={s.id} className="text-ink-soft block text-xs">
                    + <Mixed>{s.title}</Mixed>
                  </span>
                ))}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-ink-faint mt-3 text-xs">
        Las secciones se suman a tu apunte de cada tema; lo que hayas escrito tú en ellos («mías»)
        no cambia.
      </p>
    </div>
  );
}

/** Aviso compacto para la pantalla de fin de lección: qué apuntes vivos han crecido (nada si ninguno). */
export function GrowthNotice({ lessonId, className }: { lessonId: string; className?: string }) {
  const [notes, setNotes] = useState<LivingNote[]>([]);
  useEffect(() => {
    void loadLivingNotes(getActiveLang()).then(setNotes);
  }, []);
  const growth = growthForLesson(notes, lessonId);
  if (!growth.length) return null;
  return (
    <div
      className={cn("border-celadon/50 bg-celadon/8 rounded-[10px] border px-3 py-2", className)}
      role="status"
    >
      <p className="text-celadon-ink flex items-center gap-1.5 text-sm font-medium">
        <Sprout className="size-4" /> Tus apuntes han crecido
      </p>
      <ul className="mt-1 space-y-0.5">
        {growth.map(({ note, sections }) => (
          <li key={note.id} className="text-ink-soft text-xs">
            <Link
              href={`/apuntes/vivos?n=${note.id}#${sections[0].id}`}
              className="underline-offset-2 hover:underline"
            >
              <Mixed>{note.title}</Mixed>
            </Link>
            : {sections.map((s) => s.title).join(" · ")}
          </li>
        ))}
      </ul>
    </div>
  );
}
