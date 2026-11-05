"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "@/lib/languages/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Check, Eye, EyeOff, Play, Plus, Repeat, Volume2 } from "lucide-react";
import { db, upsertWord } from "@/lib/db";
import type { Lesson, LessonStep } from "@/lib/course/types";
import { grammarById } from "@/lib/course";
import { lessonExercises, readingQuestionsToExercises } from "@/lib/exercises/build";
import type { Exercise } from "@/lib/exercises/types";
import { useKnowledge } from "@/lib/knowledge";
import { useDictionary, lookupFirst, levelLabel } from "@/lib/dictionary/service";
import { getActivePack } from "@/lib/languages/registry";
import { useSettings } from "@/lib/settings";
import { comprehension } from "@/lib/segment";
import { getLexicon } from "@/lib/dictionary/service";
import { onWordSaved } from "@/lib/anki/hooks";
import { Button } from "@/components/ui/button";
import { Badge, Card, Spinner } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { Pinyin } from "@/components/target/reading";
import { AudioButton, playText } from "@/components/target/audio-button";
import { ChineseText, Hanzi } from "@/components/target/target-text";
import { StrokeOrder } from "@/components/target/stroke-order";
import { HanziCard } from "@/components/target/word-card";
import { ExerciseRunner, type SessionSummary } from "@/components/exercises/runner";
import { InkDivider, SealTag } from "@/components/ornament";
import { Markdown } from "./markdown";
import { GrammarView } from "./grammar-view";
import { mapNumeral as zhNumeral } from "./map-art";
import { cn, seededRandom, shuffle } from "@/lib/utils";
import { UNIT_CATEGORY } from "@/lib/hanzi/vocab-categories";
import { dialogueVoices } from "@/lib/tts/speakers";
import { targetLang } from "@/lib/languages/registry";
import { ui, listenFocus, readingName } from "@/lib/languages/ui-text";
import { Mixed } from "@/components/target/mixed";

type Step<T extends LessonStep["type"]> = Extract<LessonStep, { type: T }>;

/** Título de paso: editorial, con filete de tinta debajo. */
export function StepTitle({
  children,
  aside,
  className,
}: {
  children: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-2", className)}>
      <h2 className="font-serif-es text-ink text-xl font-semibold tracking-tight">{children}</h2>
      {aside ? <div className="flex flex-wrap items-center gap-1.5">{aside}</div> : null}
    </div>
  );
}

export function ExplainStep({ step }: { step: Step<"explain"> }) {
  return (
    <Card className="sm:p-6">
      <h2 className="font-serif-es text-ink mb-3 text-xl font-semibold tracking-tight">
        <Mixed>{step.title}</Mixed>
      </h2>
      <Markdown>{step.markdown}</Markdown>
    </Card>
  );
}

export function VocabStep({ lesson, step }: { lesson: Lesson; step: Step<"vocab"> }) {
  const deck = useKnowledge((s) => s.deck);
  const [flipped, setFlipped] = useState<Set<string>>(() => new Set());
  const [adding, setAdding] = useState(false);
  const words = step.words?.length
    ? lesson.vocab.filter((v) => step.words!.includes(v.hanzi))
    : lesson.vocab;
  const missing = words.filter((v) => !deck.has(v.hanzi));
  const allFlipped = words.length > 0 && words.every((w) => flipped.has(w.hanzi));

  const addAll = async () => {
    setAdding(true);
    let n = 0;
    // temario v2: la palabra conserva el id (WebID de Anki) y la categoría de la semilla, o toma la de su unidad;
    // lleva su nivel (o «Extra») y un ejemplo de la propia lección → va a su submazo de Anki
    const v2 = /^(e0|a1|a2|b1)-/.test(lesson.id);
    const unit = lesson.id.startsWith("e0-") ? "e0" : lesson.id.replace(/-l\d+$/, "");
    const seedBy = v2 ? new Map(getActivePack().seed.words.map((s) => [s.hanzi, s])) : null;
    const pool = v2 ? getActivePack().curriculum.sentencesOf(lesson) : [];
    for (const v of missing) {
      const e = lookupFirst(v.hanzi);
      const sw = seedBy?.get(v.hanzi);
      const extra = (lesson.extraVocab ?? []).includes(v.hanzi);
      const ex = pool
        .filter((s) => s.zh.includes(v.hanzi) && s.zh !== v.hanzi && s.py)
        .sort((a, b) => a.zh.length - b.zh.length)[0];
      const w = await upsertWord({
        id: sw?.id ?? (v2 ? `hsk-${v.hanzi}` : undefined),
        hanzi: v.hanzi,
        pinyin: v.pinyin,
        meaning: v.es,
        category: v2 ? (sw?.category ?? UNIT_CATEGORY[unit] ?? "Clase") : "Clase",
        source: "manual",
        tags: v2 ? ["curso", lesson.id, unit] : ["curso", lesson.id],
        hsk: extra ? ["Extra"] : e?.hsk ? ["HSK3.0"] : e?.lv ? [e.lv] : [],
        level: extra ? undefined : e?.hsk,
        meaningEn: e?.en?.join("; "),
        traditional: e?.t,
        ...(ex ? { example: ex.zh, examplePinyin: ex.py, exampleTranslation: ex.es } : {}),
      });
      void onWordSaved(w);
      n++;
    }
    setAdding(false);
    toast.success(`${n} palabras añadidas a tus tarjetas`);
  };

  return (
    <div className="space-y-3">
      <StepTitle
        aside={
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setFlipped(allFlipped ? new Set() : new Set(words.map((w) => w.hanzi)))
              }
            >
              {allFlipped ? <EyeOff /> : <Eye />}{" "}
              {allFlipped ? "ocultar significados" : "mostrar significados"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                words.forEach((w, i) => setTimeout(() => void playText(w.hanzi), i * 1400))
              }
            >
              <Play /> Reproducir todo
            </Button>
            {missing.length ? (
              <Button size="sm" variant="jade" onClick={() => void addAll()} disabled={adding}>
                <Plus /> Añadir {missing.length} a tarjetas
              </Button>
            ) : (
              <Badge variant="jade">
                <Check className="size-3" /> todo en tu mazo
              </Badge>
            )}
          </>
        }
      >
        {step.title ?? "Vocabulario"}
      </StepTitle>
      <p className="text-ink-faint text-sm">
        {`Escucha cada palabra, repítela en voz alta y ${listenFocus()}.`} Gira la tarjeta para ver
        el significado y un ejemplo.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {words.map((v) => {
          const e = lookupFirst(v.hanzi);
          const inDeck = deck.has(v.hanzi);
          return (
            <li key={v.hanzi}>
              <HanziCard
                hanzi={v.hanzi}
                pinyin={v.pinyin}
                meaning={v.es}
                hsk={e ? levelLabel(e) : undefined}
                variant="word"
                size="md"
                grid={Array.from(v.hanzi).length <= 3}
                flippable
                flipped={flipped.has(v.hanzi)}
                onFlip={(f) =>
                  setFlipped((s) => {
                    const n = new Set(s);
                    if (f) n.add(v.hanzi);
                    else n.delete(v.hanzi);
                    return n;
                  })
                }
                footer={
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate">{v.note ?? "pulsa para girar"}</span>
                    {inDeck ? (
                      <span className="text-celadon-ink inline-flex shrink-0 items-center gap-1">
                        <Check className="size-3" /> en tu mazo
                      </span>
                    ) : null}
                  </span>
                }
              />
              <div className="mt-1 flex items-center justify-center">
                <AudioButton text={v.hanzi} size="sm" />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function DialogueStep({ step }: { step: Step<"dialogue"> }) {
  const showTranslation = useSettings((s) => s.settings.showTranslation);
  const [hideEs, setHideEs] = useState(!showTranslation);
  const [playing, setPlaying] = useState(false);
  const [shadow, setShadow] = useState(false);
  const [current, setCurrent] = useState<number | null>(null);

  const voices = useMemo(() => dialogueVoices(step.lines), [step.lines]);
  const playAll = async () => {
    setPlaying(true);
    for (let i = 0; i < step.lines.length; i++) {
      setCurrent(i);
      await playText(step.lines[i].zh, undefined, voices[i]);
      if (shadow) await new Promise((r) => setTimeout(r, 1800 + step.lines[i].zh.length * 120));
    }
    setCurrent(null);
    setPlaying(false);
  };

  return (
    <div className="space-y-3">
      <StepTitle
        aside={
          <>
            <Button size="sm" variant="ghost" onClick={() => setHideEs((h) => !h)}>
              {hideEs ? <Eye /> : <EyeOff />} traducción
            </Button>
            <Button
              size="sm"
              variant={shadow ? "soft" : "ghost"}
              onClick={() => setShadow((s) => !s)}
              title="Deja una pausa tras cada frase para que la repitas"
              aria-pressed={shadow}
            >
              <Repeat /> shadowing
            </Button>
            <Button size="sm" variant="secondary" onClick={() => void playAll()} disabled={playing}>
              <Volume2 /> Escuchar todo
            </Button>
          </>
        }
      >
        <Mixed>{step.title}</Mixed>
      </StepTitle>
      <ol className="space-y-2">
        {step.lines.map((l, i) => {
          const active = current === i;
          const right = i % 2 === 1;
          return (
            <li key={i} className={cn("flex", right ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "card-paper relative flex w-full max-w-[92%] items-start gap-3 p-3 transition-[box-shadow,border-color] duration-[var(--dur-ui)] sm:max-w-[85%]",
                  active && "border-cinnabar/50 shadow-[var(--shadow-float)]",
                )}
              >
                {active ? (
                  <span
                    className="bg-cinnabar absolute inset-y-3 left-0 w-[3px] rounded-r"
                    aria-hidden="true"
                  />
                ) : null}
                <AudioButton text={l.zh} size="sm" className="mt-0.5" voice={voices[i]} />
                <div className="min-w-0 flex-1">
                  {l.speaker ? (
                    <SealTag tone={right ? "celadon" : "ink"} className="mb-1">
                      <span lang={targetLang()}>{l.speaker}</span>
                    </SealTag>
                  ) : null}
                  <ChineseText
                    text={l.zh}
                    size="lg"
                    pinyinLine={l.py}
                    translation={hideEs ? undefined : l.es}
                    as="div"
                  />
                  {l.note ? (
                    <p className="text-ink-faint mt-1 text-xs">
                      <Mixed>{l.note}</Mixed>
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {step.notes ? (
        <p className="border-gold/70 bg-gold/10 text-ink-soft rounded-[10px] border-l-[3px] px-3 py-2 text-sm">
          <span className="text-gold-ink font-medium">Nota · </span>
          {step.notes}
        </p>
      ) : null}
      <p className="text-ink-faint text-xs">
        Primero escucha sin leer; luego lee con {readingName()}; por último, repite cada frase
        (shadowing) hasta que te salga fluida.
      </p>
    </div>
  );
}

export function GrammarStep({ id }: { id: string }) {
  const g = grammarById(id);
  if (!g) return <p className="text-danger text-sm">Punto de gramática no encontrado: {id}</p>;
  return (
    <Card className="sm:p-6">
      <GrammarView g={g} compact />
    </Card>
  );
}

export function ExercisesStep({
  lesson,
  step,
  seed,
  onFinish,
}: {
  lesson: Lesson;
  step: Step<"exercises">;
  seed: number;
  onFinish: (score: number) => void;
}) {
  const dictStatus = useDictionary((s) => s.status);
  const load = useDictionary((s) => s.load);
  const deck = useKnowledge((s) => s.deck);
  const [exercises, setExercises] = useState<Exercise[] | null>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);

  useEffect(() => {
    if (dictStatus === "idle") void load();
    void getActivePack()
      .characters.load()
      .catch(() => undefined);
  }, [dictStatus, load]);

  useEffect(() => {
    if (dictStatus === "loading" || dictStatus === "idle") return;
    const deckWords = Array.from(deck.values()).map((w) => ({
      id: w.id,
      hanzi: w.hanzi,
      pinyin: w.pinyin,
      meaning: w.meaning,
      category: w.category,
      example: w.example,
      examplePinyin: w.examplePinyin,
      exampleTranslation: w.exampleTranslation,
      radical: w.radical,
    }));
    const total = step.count ?? 10;
    if (!step.bank?.length) {
      const ex = lessonExercises(lesson, total, step.types, seed + lesson.id.length, deckWords);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExercises(ex);
      return;
    }
    // temario v2: la mitad sale de los bancos (solo ítems con caracteres ya vistos), el resto se genera
    let alive = true;
    const known = new Set<string>();
    for (const w of getActivePack().curriculum.vocabUpTo(lesson.id).values())
      for (const c of w.hanzi) known.add(c);
    for (const c of "，。？！、：“”") known.add(c);
    const rng = seededRandom(seed + lesson.id.length * 7);
    void import("@/lib/exercises/bank").then(async ({ bankExercisesFor }) => {
      const { UNIT_MAP } = await import("@/lib/course/migration");
      const legacy = Object.fromEntries(Object.entries(UNIT_MAP).map(([o, n]) => [n, o]));
      const fromBank = await bankExercisesFor(
        step.bank!,
        known,
        Math.floor(total / 2),
        rng,
        legacy,
      );
      const generated = lessonExercises(
        lesson,
        total - fromBank.length,
        step.types,
        seed + lesson.id.length,
        deckWords,
      );
      if (alive) setExercises(shuffle([...fromBank, ...generated], rng));
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dictStatus, lesson.id, step.count, seed]);

  if (!exercises) {
    return (
      <div className="text-ink-faint flex items-center justify-center gap-2 py-10">
        <Spinner /> Preparando ejercicios…
      </div>
    );
  }
  if (!exercises.length) {
    return (
      <Card>
        <p className="text-ink-faint text-sm">
          No hay suficiente material para generar ejercicios en este paso.
        </p>
        <Button className="mt-3" onClick={() => onFinish(1)}>
          Continuar
        </Button>
      </Card>
    );
  }
  if (summary) {
    return (
      <SummaryCard
        summary={summary}
        onContinue={() => onFinish(summary.total ? summary.correct / summary.total : 1)}
      />
    );
  }
  return <ExerciseRunner exercises={exercises} context={lesson.id} onFinish={setSummary} />;
}

export function SummaryCard({
  summary,
  onContinue,
  title = "Ejercicios terminados",
}: {
  summary: SessionSummary;
  onContinue: () => void;
  title?: string;
}) {
  const pct = summary.total ? Math.round((summary.correct / summary.total) * 100) : 100;
  const wrong = summary.results.filter((r) => !r.result.correct && !r.result.skip);
  const tone = pct >= 80 ? "text-celadon-ink" : pct >= 50 ? "text-gold-ink" : "text-danger";
  return (
    <Card className="mx-auto max-w-lg text-center sm:p-6">
      <h2 className="font-serif-es text-ink text-xl font-semibold">{title}</h2>
      <p className={cn("font-serif-es tabular mt-2 text-6xl leading-none font-semibold", tone)}>
        {pct}
        <span className="text-2xl"> %</span>
      </p>
      <p className="text-ink-faint mt-2 text-sm">
        {summary.correct} correctas · {summary.partial} casi · {summary.wrong} incorrectas
        {summary.skipped ? ` · ${summary.skipped} saltadas` : ""}
      </p>
      {wrong.length ? (
        <div className="mx-auto mt-4 max-w-md text-left">
          <InkDivider label={ui().review} className="my-3" />
          <p className="text-ink-faint mb-1 text-xs font-medium tracking-wide uppercase">
            Para repasar
          </p>
          <ul className="space-y-1 text-sm">
            {wrong.slice(0, 6).map((r, i) => (
              <li key={i} className="card-sunk flex items-center gap-2 px-2.5 py-1.5">
                <span lang={targetLang()} className="zh-serif text-ink text-lg">
                  {r.result.expected}
                </span>
                <span className="text-ink-faint truncate text-xs">{r.exercise.prompt}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <Button className="mt-5" size="lg" onClick={onContinue} variant="jade">
        Continuar
      </Button>
    </Card>
  );
}

export function ReadingStep({
  lesson,
  step,
  onFinish,
}: {
  lesson: Lesson;
  step: Step<"reading">;
  onFinish: (score: number) => void;
}) {
  const known = useKnowledge((s) => s.known);
  const deck = useKnowledge((s) => s.deck);
  const [phase, setPhase] = useState<"read" | "questions">("read");
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const showTranslation = useSettings((s) => s.settings.showTranslation);
  const [showEs, setShowEs] = useState(false);
  const comp = useMemo(() => {
    const k = new Set([...known, ...lesson.vocab.map((v) => v.hanzi), ...Array.from(deck.keys())]);
    return comprehension(step.text, k, getLexicon());
  }, [step.text, known, deck, lesson.vocab]);
  const exercises = useMemo(
    () => readingQuestionsToExercises(step.text, step.es, step.questions, lesson.id),
    [step, lesson.id],
  );
  const paragraphs = useMemo(
    () =>
      step.text
        .split(/\n+/)
        .map((p) => p.trim())
        .filter(Boolean),
    [step.text],
  );

  if (summary)
    return (
      <SummaryCard
        summary={summary}
        title="Comprensión lectora"
        onContinue={() => onFinish(summary.total ? summary.correct / summary.total : 1)}
      />
    );
  if (phase === "questions")
    return (
      <ExerciseRunner
        exercises={exercises}
        context={lesson.id}
        onFinish={setSummary}
        allowSkip={false}
      />
    );
  return (
    <div className="space-y-3">
      <StepTitle
        aside={
          <Badge variant={comp.ratio >= 0.95 ? "jade" : comp.ratio >= 0.85 ? "gold" : "lacquer"}>
            Conoces el {Math.round(comp.ratio * 100)} % de este texto
          </Badge>
        }
      >
        <Mixed>{step.title}</Mixed>
      </StepTitle>
      {/* modo libro: columna de lectura */}
      <article className="card-paper mx-auto max-w-[38rem] px-5 py-6 sm:px-8 sm:py-8">
        <div className="mb-3 flex items-center justify-between">
          <AudioButton text={step.text} />
          <span className="text-ink-faint text-[11px] tracking-wider uppercase">
            {paragraphs.length > 1 ? `${paragraphs.length} párrafos` : "lectura"}
          </span>
        </div>
        <div className="space-y-4">
          {paragraphs.map((p, i) => (
            <div key={i} className="flex items-start gap-3">
              {paragraphs.length > 1 ? (
                <SealTag tone="cinnabar" className="mt-2 shrink-0">
                  <span lang={targetLang()}>{zhNumeral(i + 1)}</span>
                </SealTag>
              ) : null}
              <ChineseText text={p} size="xl" as="div" className="min-w-0 flex-1 leading-[2]" />
            </div>
          ))}
        </div>
        {showEs || showTranslation ? (
          <p className="border-line font-serif-es text-ink-soft mt-5 border-t pt-4 text-base leading-relaxed">
            <Mixed>{step.es}</Mixed>
          </p>
        ) : null}
      </article>
      <div className="mx-auto flex max-w-[38rem] flex-wrap items-center justify-between gap-2">
        <Button size="sm" variant="ghost" onClick={() => setShowEs((s) => !s)}>
          {showEs || showTranslation ? <EyeOff /> : <Eye />} traducción
        </Button>
        <Button size="lg" onClick={() => setPhase("questions")}>
          Responder a las preguntas ({step.questions.length})
        </Button>
      </div>
      <p className="text-ink-faint mx-auto max-w-[38rem] text-xs">
        Lee primero sin {readingName()} (tecla P) e intenta entender el sentido general. Las
        palabras subrayadas no están en tu mazo: púlsalas para añadirlas.
      </p>
    </div>
  );
}

export function ReviewStep({ lesson, scores }: { lesson: Lesson; scores: Record<number, number> }) {
  const deck = useKnowledge((s) => s.deck);
  const vals = Object.values(scores);
  const avg = vals.length
    ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100)
    : null;
  const inDeck = lesson.vocab.filter((v) => deck.has(v.hanzi)).length;
  const grammar = lesson.steps
    .filter((s) => s.type === "grammar")
    .map((s) => grammarById((s as { id: string }).id))
    .filter(Boolean);
  const chars = Array.from(new Set(lesson.vocab.flatMap((v) => Array.from(v.hanzi)))).slice(0, 8);
  const stats =
    useLiveQuery(
      () => db.exerciseAttempts.where("context").equals(lesson.id).toArray(),
      [lesson.id],
    ) ?? [];
  const acc = stats.length
    ? Math.round((stats.filter((a) => a.correct).length / stats.length) * 100)
    : null;
  return (
    <div className="space-y-4">
      <Card className="sm:p-6">
        <h2 className="font-serif-es text-ink text-xl font-semibold">Repaso de la lección</h2>
        <p className="text-ink-faint mt-1 text-sm">
          <Mixed>{lesson.goal}</Mixed>
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="card-sunk p-3">
            <p className="font-serif-es text-ink tabular text-2xl font-semibold">
              {lesson.vocab.length}
            </p>
            <p className="text-ink-faint text-xs">palabras</p>
          </div>
          <div className="card-sunk p-3">
            <p className="font-serif-es text-ink tabular text-2xl font-semibold">
              {avg ?? acc ?? "—"}
              {avg !== null || acc !== null ? " %" : ""}
            </p>
            <p className="text-ink-faint text-xs">acierto</p>
          </div>
          <div className="card-sunk p-3">
            <p className="font-serif-es text-celadon-ink tabular text-2xl font-semibold">
              {inDeck}/{lesson.vocab.length}
            </p>
            <p className="text-ink-faint text-xs">en tu mazo</p>
          </div>
        </div>

        <InkDivider label={ui().vocab} />
        <div className="flex flex-wrap gap-2">
          {lesson.vocab.map((v) => (
            <span
              key={v.hanzi}
              className="border-line bg-paper inline-flex items-center gap-2 rounded-[8px] border px-2 py-1"
            >
              <Hanzi text={v.hanzi} size="md" font="serif" />
              <Pinyin text={v.pinyin} className="text-xs" />
              <span className="text-ink-faint text-xs">
                <Mixed>{v.es}</Mixed>
              </span>
            </span>
          ))}
        </div>
        {grammar.length ? (
          <>
            <InkDivider label={ui().grammar} />
            <ul className="space-y-1.5 text-sm">
              {grammar.map((g) => (
                <li key={g!.id} className="flex flex-wrap items-baseline gap-x-2">
                  <Link
                    href={`/aprender/gramatica/${g!.id}`}
                    className="text-indigo font-medium underline-offset-4 hover:underline"
                  >
                    {g!.title}
                  </Link>
                  <span className="text-ink-faint font-mono text-xs">{g!.pattern}</span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </Card>
      {chars.length ? (
        <Card className="sm:p-6">
          <h3 className="text-ink-faint mb-3 text-xs font-medium tracking-wide uppercase">
            Caracteres de la lección · pulsa ▶ para ver el orden de trazos
          </h3>
          <div className="flex flex-wrap gap-3">
            {chars.map((c) => (
              <StrokeOrder key={c} char={c} size={90} autoplay={false} controls={false} />
            ))}
          </div>
        </Card>
      ) : null}
      <p className="text-ink-faint text-sm">
        Al terminar, la lección queda marcada como completada. Las palabras nuevas aparecen en tus
        repasos (FSRS) y en Anki si está conectado.
      </p>
    </div>
  );
}
