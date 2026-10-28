"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Timer } from "lucide-react";
import { db } from "@/lib/db";
import { buildHsk1Exam, HSK1_STRUCTURE, type ExamSection } from "@/lib/exam/hsk1";
import type { Exercise } from "@/lib/exercises/types";
import { EXERCISE_LABELS } from "@/lib/exercises/types";
import { Button } from "@/components/ui/button";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";
import { CloudBorder, FretBorder, InkDivider, Seal } from "@/components/ornament";
import { ExerciseRunner, type RunnerResult, type SessionSummary } from "@/components/exercises/runner";
import { ChineseText } from "@/components/zh/chinese-text";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ExamResult {
  at: number;
  listening: number;
  reading: number;
  total: number;
  passed: boolean;
}

export function ExamSimulator() {
  const [sections, setSections] = useState<ExamSection[] | null>(null);
  const [sectionIdx, setSectionIdx] = useState(0);
  const [results, setResults] = useState<SessionSummary[]>([]);
  const [started, setStarted] = useState(false);
  const history = useLiveQuery(() => db.syncState.get("exam:history"), []);
  const past = ((history?.value as ExamResult[] | undefined) ?? []).slice(-5).reverse();

  const start = () => {
    setSections(buildHsk1Exam(Date.now() % 1000000));
    setSectionIdx(0);
    setResults([]);
    setStarted(true);
  };

  const current = sections?.[sectionIdx];
  const exercises = useMemo<Exercise[]>(() => current?.parts.flatMap((p) => p.exercises) ?? [], [current]);

  const onSectionFinish = async (s: SessionSummary) => {
    const all = [...results, s];
    setResults(all);
    if (sections && sectionIdx + 1 < sections.length) {
      setSectionIdx(sectionIdx + 1);
      return;
    }
    // guardar resultado
    const listening = all[0] ? all[0].correct : 0;
    const reading = all[1] ? all[1].correct : 0;
    const total = listening + reading;
    const entry: ExamResult = { at: Date.now(), listening, reading, total, passed: total >= 24 };
    const prev = ((await db.syncState.get("exam:history"))?.value as ExamResult[] | undefined) ?? [];
    await db.syncState.put({ key: "exam:history", value: [...prev, entry], updatedAt: Date.now() });
  };

  if (!started) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Link href="/practicar" className="inline-flex items-center gap-1 text-sm text-ink-faint hover:text-ink">
          <ArrowLeft className="size-4" /> Practicar
        </Link>
        <PageHeader title="Simulacro HSK 1" zh="模拟考试" subtitle="Formato del nuevo HSK 1 (HSK 3.0): 20 preguntas de comprensión auditiva (≈12 min) y 20 de lectura (20 min). Sin escritura en el nivel 1. Las partes con imágenes del examen real se adaptan a texto." />
        <Card className="relative overflow-hidden p-0 sm:p-0">
          <FretBorder className="text-ink" opacity={0.18} height={8} />
          <div className="p-4 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <ExamSectionPlate zh="听力" label="Comprensión auditiva" questions={HSK1_STRUCTURE.listening.questions} minutes={HSK1_STRUCTURE.listening.minutes} parts={HSK1_STRUCTURE.listening.parts} />
              <ExamSectionPlate zh="阅读" label="Lectura" questions={HSK1_STRUCTURE.reading.questions} minutes={HSK1_STRUCTURE.reading.minutes} parts={HSK1_STRUCTURE.reading.parts} />
            </div>
            <p className="mt-4 text-xs leading-relaxed text-ink-faint">
              Estructura según «{HSK1_STRUCTURE.source}» (vigente desde julio de 2026). Verifica siempre el formato oficial actual en chinesetest.cn. Cada pregunta se oye una vez (puedes repetir el audio como en el examen real, que lo reproduce dos veces). Sin corrección hasta el final. Aprobado orientativo: 60 %.
            </p>
            <div className="mt-5 flex justify-center">
              <Button size="xl" onClick={start}>
                <Timer /> Empezar simulacro (≈{HSK1_STRUCTURE.totalMinutes} min)
              </Button>
            </div>
          </div>
          <FretBorder className="text-ink" opacity={0.18} height={8} />
        </Card>
        {past.length ? (
          <Card>
            <h2 className="mb-2 flex items-center gap-2 font-serif-es text-lg font-semibold tracking-tight text-ink">
              <span lang="zh-CN" className="zh-serif text-base text-cinnabar" aria-hidden="true">
                史
              </span>
              Simulacros anteriores
            </h2>
            <ul className="divide-y divide-line text-sm">
              {past.map((r) => (
                <li key={r.at} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="tabular text-ink-faint">{formatDate(r.at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="tabular text-ink-soft">
                    听力 {r.listening}/20 · 阅读 {r.reading}/20
                  </span>
                  <Badge variant={r.passed ? "jade" : "lacquer"} className="tabular">
                    {r.total}/40 · {Math.round((r.total / 40) * 100)} %
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
    );
  }

  if (sections && results.length === sections.length) return <ExamReport sections={sections} results={results} onRestart={start} />;

  if (!current) return null;
  return (
    <div>
      <div className="mx-auto mb-3 flex max-w-2xl items-center justify-between text-sm">
        <span className="font-medium text-ink">
          Sección {sectionIdx + 1}/{sections!.length}: {current.title}
        </span>
        <span className="tabular text-ink-faint">{current.minutes} min</span>
      </div>
      <ExerciseRunner key={current.id} exercises={exercises} context="exam" onFinish={(s) => void onSectionFinish(s)} allowSkip={false} deferFeedback timerSeconds={current.minutes * 60} title="HSK 1" />
    </div>
  );
}

function ExamSectionPlate({ zh, label, questions, minutes, parts }: { zh: string; label: string; questions: number; minutes: number; parts: readonly string[] }) {
  return (
    <div className="card-sunk p-4">
      <p className="flex items-baseline gap-2">
        <span lang="zh-CN" className="zh-serif text-xl font-medium leading-none text-ink">
          {zh}
        </span>
        <span className="font-medium text-ink-soft">{label}</span>
      </p>
      <p className="tabular mt-1 text-xs text-ink-faint">
        {questions} preguntas · {minutes} min
      </p>
      <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-sm text-ink-soft">
        {parts.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ol>
    </div>
  );
}

function ExamReport({ sections, results, onRestart }: { sections: ExamSection[]; results: SessionSummary[]; onRestart: () => void }) {
  const total = results.reduce((a, r) => a + r.correct, 0);
  const max = sections.reduce((a, s) => a + s.parts.reduce((b, p) => b + p.exercises.length, 0), 0);
  const pct = Math.round((total / max) * 100);
  const passed = pct >= 60;
  const wrong: RunnerResult[] = results.flatMap((r) => r.results.filter((x) => !x.result.correct));
  const [showAll, setShowAll] = useState(false);
  useEffect(() => window.scrollTo({ top: 0 }), []);
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <CloudBorder className="card-paper overflow-hidden" color={passed ? "rgb(var(--gold))" : "rgb(var(--ink) / 0.35)"}>
        <div className="px-6 py-8 text-center sm:px-10">
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink-faint">Resultado del simulacro</p>
          <div className="mt-3 flex items-center justify-center gap-5">
            <p className={cn("tabular font-serif-es text-6xl font-semibold leading-none tracking-tight", passed ? "text-ink" : "text-ink-soft")}>
              {total}
              <span className="text-2xl text-ink-faint">/{max}</span>
            </p>
            {passed ? <Seal text="合格" size={64} stamped rotate={-8} title="Aprobado (orientativo)" /> : <Seal text="再来" size={64} tone="ink" rotate={6} title="Por debajo del 60 %" />}
          </div>
          <p className="tabular mt-3 text-sm text-ink-soft">
            {pct} % · {passed ? "aprobado (orientativo)" : "por debajo del 60 %: sigue practicando"}
          </p>
          <p lang="zh-CN" className="zh-kai mt-1 text-base text-ink-faint">
            {passed ? "太棒了！" : "没关系，再试一次。"}
          </p>
          <InkDivider className="my-5" />
          <div className="grid gap-3 text-left sm:grid-cols-2">
            {sections.map((s, i) => {
              const r = results[i];
              const n = s.parts.reduce((a, p) => a + p.exercises.length, 0);
              const p = Math.round((r.correct / n) * 100);
              return (
                <div key={s.id} className="card-sunk p-3">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium text-ink">{s.title}</span>
                    <span className="tabular text-ink-soft">
                      {r.correct}/{n}
                    </span>
                  </div>
                  <div className="relative mt-2 h-2 w-full overflow-hidden rounded-[3px] bg-paper-raised">
                    <div className="absolute inset-y-0 left-0 w-full rounded-r-[3px] opacity-90" style={{ background: `linear-gradient(90deg, ${p >= 60 ? "rgb(var(--celadon))" : "rgb(var(--danger))"} 0%, ${p >= 60 ? "rgb(var(--celadon))" : "rgb(var(--danger))"} 92%, transparent)`, transform: `scaleX(${p / 100})`, transformOrigin: "left" }} />
                  </div>
                  <ul className="mt-2 space-y-0.5 text-xs text-ink-faint">
                    {s.parts.map((part) => {
                      const ids = new Set(part.exercises.map((e) => e.id));
                      const ok = r.results.filter((x) => ids.has(x.exercise.id) && x.result.correct).length;
                      return (
                        <li key={part.title} className="flex justify-between border-b border-dotted border-line py-0.5">
                          <span>{part.title}</span>
                          <span className={cn("tabular", ok < part.exercises.length ? "text-danger" : "text-celadon-ink")}>
                            {ok}/{part.exercises.length}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </CloudBorder>
      {wrong.length ? (
        <Card>
          <h2 className="mb-2 font-serif-es text-lg font-semibold tracking-tight text-ink">Preguntas falladas ({wrong.length})</h2>
          <ul className="space-y-2">
            {(showAll ? wrong : wrong.slice(0, 8)).map((w, i) => (
              <li key={i} className="rounded-[8px] border border-line bg-paper-raised p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline">{EXERCISE_LABELS[w.exercise.type]}</Badge>
                  <span className="text-xs text-ink-faint">{w.exercise.prompt}</span>
                </div>
                {"display" in w.exercise && (w.exercise.display.zh || w.exercise.display.audio) ? <ChineseText text={w.exercise.display.zh ?? w.exercise.display.audio ?? ""} size="md" as="div" className="mt-1" /> : null}
                {w.exercise.type === "fill-blank" ? <ChineseText text={w.exercise.zh.replace(/＿+/, w.exercise.answer)} size="md" as="div" className="mt-1" highlight={[w.exercise.answer]} /> : null}
                <p className="mt-1 text-xs">
                  <span className="text-ink-faint">Correcto:</span>{" "}
                  <span lang="zh-CN" className="zh text-ink">
                    {w.result.expected}
                  </span>
                  {w.result.explanation && !w.result.explanation.startsWith("Has elegido") ? <span className="ml-2 text-ink-faint">{w.result.explanation}</span> : null}
                </p>
              </li>
            ))}
          </ul>
          {wrong.length > 8 ? (
            <button type="button" className="mt-2 text-sm text-indigo underline underline-offset-2" onClick={() => setShowAll((s) => !s)}>
              {showAll ? "ver menos" : `ver las ${wrong.length}`}
            </button>
          ) : null}
        </Card>
      ) : null}
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={onRestart}>Otro simulacro</Button>
        <Button variant="secondary" asChild>
          <Link href="/practicar?mode=mistakes">Practicar mis errores</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/progreso">Progreso</Link>
        </Button>
      </div>
    </div>
  );
}
