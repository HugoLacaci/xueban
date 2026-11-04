"use client";
/**
 * Componentes de los tipos de ejercicio de los bancos: dictado en pinyin, transformar / construir la pregunta,
 * encuentra el error, texto con huecos, traducción libre (motor de corrección) y velocidad contrarreloj.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Timer } from "lucide-react";
import type { ClozeExercise, DictationExercise, FindErrorExercise, FreeTranslateExercise, SpeedExercise } from "@/lib/exercises/types";
import { usePack } from "@/lib/languages/provider";
import { useSettings } from "@/lib/settings";
import { getLexicon } from "@/lib/dictionary/service";
import type { CorrectionReport } from "@/lib/correction/types";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/primitives";
import { AudioButton, playText, useSpaceToPlay } from "@/components/target/audio-button";
import { ChineseText } from "@/components/target/target-text";
import { Reading } from "@/components/target/reading";
import { AnswerInput } from "@/components/correction/answer-input";
import { CorrectionPanel } from "@/components/correction/correction-panel";
import { cn, shuffle } from "@/lib/utils";
import { CheckButton, ExerciseCard, Hint, OptionTile, Plate, Stage, type ExerciseProps } from "./exercise-view";
import { Mixed } from "@/components/target/mixed";

/* ------------------------------------------------------------------ dictado en pinyin */

export function DictationPinyin({ ex, onSubmit, result }: ExerciseProps<DictationExercise>) {
  const pack = usePack();
  const ReadingInput = pack.ui.ReadingInput;
  const [text, setText] = useState("");
  useSpaceToPlay(ex.zh, !result);
  return (
    <ExerciseCard prompt={ex.prompt}>
      <div className="mb-6 flex flex-col items-center gap-3">
        <AudioButton text={ex.zh} size="lg" variant="solid" autoPlay voice={ex.voice} />
        <div className="flex gap-1">
          {[0.75, 1, 1.25].map((r) => (
            <Button key={r} size="sm" variant="ghost" onClick={() => void playText(ex.zh, r * 0.9)}>
              {r}×
            </Button>
          ))}
        </div>
        {result ? <ChineseText text={ex.zh} size="lg" pinyinLine={ex.pinyin} translation={ex.es} as="div" className="text-center" /> : null}
      </div>
      <form
        className="mx-auto w-full max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          if (!result && text.trim()) onSubmit({ kind: "text", text });
        }}
      >
        <ReadingInput value={text} onChange={setText} autoFocus disabled={Boolean(result)} mode="reading" aria-label="Pinyin" />
        {!result ? <CheckButton type="submit" disabled={!text.trim()} /> : null}
      </form>
      <Hint>Escribe el pinyin con tonos: números (wo3 zai4 jia1) o tildes. Se corrige la sílaba y el tono por separado.</Hint>
    </ExerciseCard>
  );
}

/* ------------------------------------------------------------------ transformar / construir la pregunta */

export function TransformInput({ ex, onSubmit, result }: ExerciseProps<DictationExercise>) {
  const [text, setText] = useState("");
  const pinyinMode = useSettings((s) => s.settings.pinyinMode);
  const src = ex.source;
  return (
    <ExerciseCard prompt={ex.prompt}>
      {src ? (
        <Plate className="mb-5 p-4 text-center">
          <p className="mb-1 text-[11px] uppercase tracking-wide text-ink-faint">{ex.type === "build-question" ? "Respuesta dada" : "Frase de partida"}</p>
          <div className="flex items-start justify-center gap-2">
            <AudioButton text={src.zh} size="sm" className="mt-1" />
            <ChineseText text={src.zh} size="lg" pinyinLine={pinyinMode !== "hide" ? src.py : undefined} translation={src.es} as="div" />
          </div>
        </Plate>
      ) : null}
      {result ? (
        <Plate className="mb-4 p-3 text-center">
          <ChineseText text={ex.zh} size="lg" pinyinLine={ex.pinyin} as="div" />
        </Plate>
      ) : null}
      <div className="mx-auto w-full max-w-lg">
        <AnswerInput mode="hanzi" value={text} onChange={setText} onSubmit={() => !result && text.trim() && onSubmit({ kind: "text", text })} disabled={Boolean(result)} autoFocus />
      </div>
    </ExerciseCard>
  );
}

/* ------------------------------------------------------------------ encuentra el error */

export function FindError({ ex, onSubmit, result }: ExerciseProps<FindErrorExercise>) {
  const pack = usePack();
  const [picked, setPicked] = useState<number | null>(null);
  const [correction, setCorrection] = useState("");
  const detail = result?.detail as { found: boolean; fixed: boolean } | undefined;
  return (
    <ExerciseCard prompt={ex.prompt}>
      <p className="mb-3 text-center text-sm text-ink-faint">1. Pulsa la palabra incorrecta · 2. Escribe la frase corregida</p>
      <div className="mb-5 flex flex-wrap justify-center gap-1.5" role="radiogroup" aria-label="Palabras de la frase" lang={pack.bcp47}>
        {ex.tokens.map((t, i) => {
          const state = result ? (i === ex.wrongIndex ? "correct" : picked === i ? "wrong" : "idle") : picked === i ? "selected" : "idle";
          return (
            <button key={i} type="button" role="radio" aria-checked={picked === i} disabled={Boolean(result)} onClick={() => setPicked(i)} className={cn("rounded-[8px] border px-3 py-2 text-2xl transition-colors", pack.meta.cssClass, pack.theme.fontClasses.serif, state === "selected" && "border-ink bg-paper-sunk", state === "correct" && "border-celadon bg-celadon/14", state === "wrong" && "border-danger bg-danger/10 line-through", state === "idle" && "border-line bg-paper-raised hover:border-ink/40")}>
              {t}
            </button>
          );
        })}
      </div>
      {ex.es ? <p className="mb-3 text-center text-sm text-ink-soft"><Mixed>{ex.es}</Mixed></p> : null}
      {picked !== null && !result ? (
        <div className="mx-auto w-full max-w-lg">
          <AnswerInput mode="hanzi" value={correction} onChange={setCorrection} onSubmit={() => correction.trim() && onSubmit({ kind: "findError", index: picked, correction })} autoFocus />
        </div>
      ) : null}
      {result ? (
        <Plate className="mt-3 p-3 text-center">
          <ChineseText text={ex.correct} size="lg" as="div" />
          {detail ? <p className="mt-1 text-xs text-ink-faint">{detail.found ? "✓ error localizado" : "✗ error no localizado"} · {detail.fixed ? "✓ corrección exacta" : "✗ corrección distinta"}</p> : null}
        </Plate>
      ) : null}
    </ExerciseCard>
  );
}

/* ------------------------------------------------------------------ texto con huecos */

export function Cloze({ ex, onSubmit, result }: ExerciseProps<ClozeExercise>) {
  const pack = usePack();
  const [answers, setAnswers] = useState<string[]>(ex.blanks.map(() => ""));
  const [active, setActive] = useState(0);
  const parts = useMemo(() => ex.text.split(/＿+/), [ex.text]);
  const options = useMemo(() => ex.blanks.map((b) => shuffle(b.options.includes(b.answer) ? b.options : [b.answer, ...b.options])), [ex.blanks]);
  const detail = result?.detail as boolean[] | undefined;
  const complete = answers.every(Boolean);
  return (
    <ExerciseCard prompt={ex.prompt}>
      <Plate className="mb-4 p-4">
        <p className={cn("text-2xl leading-[2]", pack.meta.cssClass)} lang={pack.bcp47}>
          {parts.map((p, i) => (
            <span key={i}>
              {p}
              {i < ex.blanks.length ? (
                <button type="button" onClick={() => !result && setActive(i)} className={cn("mx-0.5 inline-flex min-w-12 items-center justify-center rounded-[6px] border-b-2 px-1.5 align-baseline", result ? (detail?.[i] ? "border-celadon bg-celadon/14" : "border-danger bg-danger/10") : active === i ? "border-ink bg-paper-sunk" : "border-line", !answers[i] && "text-ink-faint")} aria-label={`Hueco ${i + 1}`}>
                  {answers[i] || (result ? ex.blanks[i].answer : "＿")}
                </button>
              ) : null}
            </span>
          ))}
        </p>
        {ex.es && result ? <p className="mt-2 text-sm text-ink-soft"><Mixed>{ex.es}</Mixed></p> : null}
      </Plate>
      {!result ? (
        <div className="space-y-2">
          <p className="text-center text-xs text-ink-faint">Hueco {active + 1} de {ex.blanks.length}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {options[active].map((o, i) => (
              <OptionTile key={o} index={i + 1} state={answers[active] === o ? "selected" : "idle"} onClick={() => { setAnswers((a) => a.map((x, k) => (k === active ? o : x))); if (active < ex.blanks.length - 1) setActive(active + 1); }} className="justify-center">
                <span lang={pack.bcp47} className={cn(pack.meta.cssClass, "text-xl")}>
                  {o}
                </span>
              </OptionTile>
            ))}
          </div>
          <CheckButton disabled={!complete} onClick={() => onSubmit({ kind: "cloze", answers })} />
        </div>
      ) : null}
    </ExerciseCard>
  );
}

/* ------------------------------------------------------------------ traducción libre (motor de corrección) */

export function FreeTranslate({ ex, onSubmit, result }: ExerciseProps<FreeTranslateExercise>) {
  const [text, setText] = useState("");
  const [report, setReport] = useState<CorrectionReport | null>(null);
  const [busy, setBusy] = useState(false);
  const tutorOn = useSettings((s) => s.settings.tutor?.provider && s.settings.tutor.provider !== "none" && s.settings.tutor.correct);
  const run = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const { correct } = await import("@/lib/correction");
      const tutor = tutorOn ? (await import("@/lib/tutor/corrector")).tutorCorrector : undefined;
      const r = await correct({ es: ex.es, answer: text, references: ex.answers, hint: ex.hint, grammarIds: ex.grammarIds, useTutor: Boolean(tutorOn) }, { lexicon: getLexicon(), tutor });
      setReport(r);
      if ((r.verdict === "wrong" || r.verdict === "improvable") && r.corrected) {
        const main = r.errors.find((e) => e.severity === "error") ?? r.errors[0];
        if (main) {
          const { recordError } = await import("@/lib/notes/error-book");
          void recordError({ mine: r.answer || text, correct: r.corrected, es: ex.es, explanation: main.explanation, errorType: main.type, ruleId: main.ruleId, noteId: main.noteId, tip: r.tip, origin: "ejercicio: traducir libre", source: { kind: "exercise", ref: ex.id, context: ex.es } });
        }
      }
      onSubmit({ kind: "self", correct: r.verdict === "correct", text: r.answer || text });
    } finally {
      setBusy(false);
    }
  };
  return (
    <ExerciseCard prompt={ex.prompt}>
      <Stage>
        <p className="font-serif-es text-2xl leading-snug text-ink"><Mixed>{ex.es}</Mixed></p>
        {ex.hint && !result ? (
          <details className="text-xs text-ink-faint">
            <summary className="cursor-pointer">pista</summary>
            <Mixed>{ex.hint}</Mixed>
          </details>
        ) : null}
      </Stage>
      {!report ? (
        <div className="mx-auto w-full max-w-lg">
          <AnswerInput mode="hanzi" value={text} onChange={setText} onSubmit={() => void run()} disabled={busy || Boolean(result)} autoFocus />
          {!ex.answers.length ? <Hint>Sin solución de referencia: se corrige con las reglas de gramática{tutorOn ? " y el tutor" : ""}.</Hint> : null}
        </div>
      ) : (
        <CorrectionPanel report={report} es={ex.es} className="mx-auto max-w-2xl text-left" />
      )}
    </ExerciseCard>
  );
}

/* ------------------------------------------------------------------ velocidad contrarreloj */

export function Speed({ ex, onSubmit, result }: ExerciseProps<SpeedExercise>) {
  const pack = usePack();
  const [left, setLeft] = useState(ex.seconds);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [sel, setSel] = useState<number | null>(null);
  const [wrong, setWrong] = useState(0);
  const [flash, setFlash] = useState<number | null>(null);
  const rights = useMemo(() => shuffle(ex.pairs.map((_, i) => i)), [ex.pairs]);
  const submitted = useRef(false);
  const finish = (finished: boolean, secs: number) => {
    if (submitted.current) return;
    submitted.current = true;
    onSubmit({ kind: "speed", correct: done.size, total: ex.pairs.length, seconds: ex.seconds - secs, finished });
  };
  useEffect(() => {
    if (!started || result) return;
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [started, result]);
  useEffect(() => {
    if (started && left <= 0 && !result) finish(false, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, started]);
  useEffect(() => {
    if (started && done.size === ex.pairs.length && !result) finish(true, left);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);
  const pickRight = (i: number) => {
    if (sel === null || result) return;
    if (i === sel) {
      setDone((d) => new Set(d).add(i));
      setSel(null);
    } else {
      setWrong((w) => w + 1);
      setFlash(i);
      setTimeout(() => setFlash(null), 300);
    }
  };
  const isPinyin = ex.type === "speed-pinyin-hanzi";
  return (
    <ExerciseCard prompt={ex.prompt}>
      {!started ? (
        <div className="flex flex-col items-center gap-3 py-6">
          <Timer className="size-8 text-ink-faint" />
          <p className="text-sm text-ink-soft">{ex.pairs.length} parejas en {ex.seconds} segundos. Pulsa la de la izquierda y luego su pareja.</p>
          <Button variant="ink" size="lg" onClick={() => setStarted(true)}>
            ¡Empezar!
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className={cn("tabular font-medium", left <= 5 && "text-danger")}>⏱ {Math.max(0, left)} s</span>
            <span className="text-ink-faint">
              {done.size}/{ex.pairs.length} · {wrong} fallos
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              {ex.pairs.map((p, i) => (
                <button key={i} type="button" disabled={done.has(i) || Boolean(result)} onClick={() => setSel(i)} className={cn("w-full rounded-[8px] border px-3 py-2 text-left", done.has(i) ? "border-celadon/40 bg-celadon/10 text-ink-faint" : sel === i ? "border-ink bg-paper-sunk" : "border-line bg-paper-raised hover:border-ink/40", isPinyin && "text-lg", !isPinyin && cn(pack.meta.cssClass, "text-xl"))} lang={isPinyin ? undefined : pack.bcp47}>
                  {isPinyin ? <Reading text={p.left} /> : p.left}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              {rights.map((i) => (
                <button key={i} type="button" disabled={done.has(i) || Boolean(result)} onClick={() => pickRight(i)} className={cn("w-full rounded-[8px] border px-3 py-2 text-left", done.has(i) ? "border-celadon/40 bg-celadon/10 text-ink-faint" : flash === i ? "border-danger bg-danger/10 motion-safe:animate-shake" : "border-line bg-paper-raised hover:border-ink/40", isPinyin ? cn(pack.meta.cssClass, "text-xl") : "text-base")} lang={isPinyin ? pack.bcp47 : undefined}>
                  {ex.pairs[i].right}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      <Hint>
        <Kbd>1–9</Kbd> no aplica aquí: usa el ratón o el dedo, ¡rápido!
      </Hint>
    </ExerciseCard>
  );
}
