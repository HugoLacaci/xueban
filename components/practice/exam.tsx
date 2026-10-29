"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "@/lib/languages/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Timer } from "lucide-react";
import { db } from "@/lib/db";
import type { ExamSection } from "@/lib/languages/types";
import { usePack } from "@/lib/languages/provider";
import type { Exercise } from "@/lib/exercises/types";
import { EXERCISE_LABELS } from "@/lib/exercises/types";
import { Button } from "@/components/ui/button";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";
import { CloudBorder, FretBorder, InkDivider, Seal } from "@/components/ornament";
import { ExerciseRunner, type RunnerResult, type SessionSummary } from "@/components/exercises/runner";
import { TargetText } from "@/components/target/target-text";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Mixed } from "@/components/target/mixed";

interface ExamResult {
  at: number;
  sections: number[];
  total: number;
  max: number;
  passed: boolean;
}

const TITLE_NATIVE: Record<string, string> = { zh: "模拟考试", ja: "模擬試験", ko: "모의고사" };
const PASS_STAMP: Record<string, [string, string]> = { zh: ["合格", "再来"], ja: ["合格", "再挑戦"], ko: ["합격", "다시"] };
const CHEER: Record<string, [string, string]> = { zh: ["太棒了！", "没关系，再试一次。"], ja: ["すごい！", "大丈夫、もう一度。"], ko: ["대단해요!", "괜찮아요, 다시 한번."] };

export function ExamSimulator() {
  const pack = usePack();
  const exam = pack.exam;
  const historyKey = pack.id === "zh" ? "exam:history" : `exam:history:${pack.id}`;
  const [sections, setSections] = useState<ExamSection[] | null>(null);
  const [sectionIdx, setSectionIdx] = useState(0);
  const [results, setResults] = useState<SessionSummary[]>([]);
  const [started, setStarted] = useState(false);
  const history = useLiveQuery(() => db.syncState.get(historyKey), [historyKey]);
  const past = ((history?.value as (ExamResult & { listening?: number; reading?: number })[] | undefined) ?? []).slice(-5).reverse();
  const level = exam.levels.find((l) => l.id === exam.firstLevel)?.label ?? exam.name;

  const start = () => {
    setSections(exam.buildMock(Date.now() % 1000000));
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
    const correct = all.map((r) => r.correct);
    const rule = exam.passRule(correct);
    const entry: ExamResult = { at: Date.now(), sections: correct, total: rule.score, max: rule.max, passed: rule.passed };
    const prev = ((await db.syncState.get(historyKey))?.value as ExamResult[] | undefined) ?? [];
    await db.syncState.put({ key: historyKey, value: [...prev, entry], updatedAt: Date.now() });
  };

  if (!started) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Link href="/practicar" className="inline-flex items-center gap-1 text-sm text-ink-faint hover:text-ink">
          <ArrowLeft className="size-4" /> Practicar
        </Link>
        <PageHeader title={`Simulacro ${level}`} zh={TITLE_NATIVE[pack.id]} subtitle={`${exam.sections.map((s) => `${s.name} (${s.questions} preguntas, ${s.minutes} min)`).join(" · ")}. ${exam.scoring}`} />
        <Card className="relative overflow-hidden p-0 sm:p-0">
          <FretBorder className="text-ink" opacity={0.18} height={8} />
          <div className="p-4 sm:p-6">
            <div className={cn("grid gap-3", exam.sections.length > 2 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
              {exam.sections.map((s) => (
                <ExamSectionPlate key={s.id} zh={s.native} label={s.name} questions={s.questions} minutes={s.minutes} parts={s.parts} />
              ))}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-ink-faint">
              Estructura según «<Mixed>{exam.source}</Mixed>». Verifica siempre el formato oficial actual en {exam.officialUrl.replace(/^https?:\/\//, "")}. {exam.notes ? <Mixed>{`${exam.notes} `}</Mixed> : null}Sin corrección hasta el final.
            </p>
            <div className="mt-5 flex justify-center">
              <Button size="xl" onClick={start}>
                <Timer /> Empezar simulacro (≈{exam.totalMinutes} min)
              </Button>
            </div>
          </div>
          <FretBorder className="text-ink" opacity={0.18} height={8} />
        </Card>
        {past.length ? (
          <Card>
            <h2 className="mb-2 flex items-center gap-2 font-serif-es text-lg font-semibold tracking-tight text-ink">Simulacros anteriores</h2>
            <ul className="divide-y divide-line text-sm">
              {past.map((r) => {
                const secs = r.sections ?? [r.listening ?? 0, r.reading ?? 0];
                const max = r.max ?? 40;
                return (
                  <li key={r.at} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="tabular text-ink-faint">{formatDate(r.at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    <span className="tabular text-ink-soft">{exam.sections.map((s, i) => `${s.native} ${secs[i] ?? 0}/${s.questions}`).join(" · ")}</span>
                    <Badge variant={r.passed ? "jade" : "lacquer"} className="tabular">
                      {r.total}/{max} · {Math.round((r.total / max) * 100)} %
                    </Badge>
                  </li>
                );
              })}
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
          Sección {sectionIdx + 1}/{sections!.length}: <Mixed>{current.name}</Mixed>
        </span>
        <span className="tabular text-ink-faint">{current.minutes} min</span>
      </div>
      <ExerciseRunner key={current.id} exercises={exercises} context="exam" onFinish={(s) => void onSectionFinish(s)} allowSkip={false} deferFeedback timerSeconds={current.minutes * 60} title={level} />
    </div>
  );
}

function ExamSectionPlate({ zh, label, questions, minutes, parts }: { zh: string; label: string; questions: number; minutes: number; parts: readonly string[] }) {
  const pack = usePack();
  return (
    <div className="card-sunk p-4">
      <p className="flex items-baseline gap-2">
        <span lang={pack.bcp47} className={cn(pack.theme.fontClasses.serif, pack.meta.cssClass, "text-xl font-medium leading-none text-ink")}>
          <Mixed>{zh}</Mixed>
        </span>
        <span className="font-medium text-ink-soft">{label}</span>
      </p>
      <p className="tabular mt-1 text-xs text-ink-faint">
        {questions} preguntas · {minutes} min
      </p>
      <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-sm text-ink-soft">
        {parts.map((p) => (
          <li key={p}>
            <Mixed>{p}</Mixed>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ExamReport({ sections, results, onRestart }: { sections: ExamSection[]; results: SessionSummary[]; onRestart: () => void }) {
  const pack = usePack();
  const rule = pack.exam.passRule(results.map((r) => r.correct));
  const total = rule.score;
  const max = rule.max || sections.reduce((a, s) => a + s.parts.reduce((b, p) => b + p.exercises.length, 0), 0);
  const pct = Math.round((total / Math.max(1, max)) * 100);
  const passed = rule.passed;
  const wrong: RunnerResult[] = results.flatMap((r) => r.results.filter((x) => !x.result.correct));
  const [showAll, setShowAll] = useState(false);
  useEffect(() => window.scrollTo({ top: 0 }), []);
  const [okStamp, koStamp] = PASS_STAMP[pack.id] ?? PASS_STAMP.zh;
  const [okCheer, koCheer] = CHEER[pack.id] ?? CHEER.zh;
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
            {passed ? <Seal text={okStamp} size={64} stamped rotate={-8} title="Aprobado (orientativo)" variant={pack.theme.seal.shape} /> : <Seal text={koStamp} size={64} tone="ink" rotate={6} title="No aprobado" variant={pack.theme.seal.shape} />}
          </div>
          <p className="tabular mt-3 text-sm text-ink-soft">
            {pct} % · {passed ? "aprobado (orientativo)" : "no aprobado: sigue practicando"} · <Mixed>{rule.detail}</Mixed>
          </p>
          <p lang={pack.bcp47} className={cn(pack.theme.fontClasses.display, pack.meta.cssClass, "mt-1 text-base text-ink-faint")}>
            {passed ? okCheer : koCheer}
          </p>
          <InkDivider className="my-5" />
          <div className={cn("grid gap-3 text-left", sections.length > 2 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
            {sections.map((s, i) => {
              const r = results[i];
              const n = s.parts.reduce((a, p) => a + p.exercises.length, 0);
              const p = Math.round((r.correct / Math.max(1, n)) * 100);
              return (
                <div key={s.id} className="card-sunk p-3">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium text-ink"><Mixed>{s.name}</Mixed></span>
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
                        <li key={part.name} className="flex justify-between border-b border-dotted border-line py-0.5">
                          <span><Mixed>{part.name}</Mixed></span>
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
                  <Badge variant="outline">{pack.exerciseAdapters.labels[w.exercise.type] ?? EXERCISE_LABELS[w.exercise.type]}</Badge>
                  <span className="text-xs text-ink-faint"><Mixed>{w.exercise.prompt}</Mixed></span>
                </div>
                {"display" in w.exercise && (w.exercise.display.zh || w.exercise.display.audio) ? <TargetText text={w.exercise.display.zh ?? w.exercise.display.audio ?? ""} size="md" as="div" className="mt-1" /> : null}
                {w.exercise.type === "fill-blank" || w.exercise.type === "particle" ? <TargetText text={w.exercise.zh.replace(/＿+/, w.exercise.answer)} size="md" as="div" className="mt-1" highlight={[w.exercise.answer]} /> : null}
                <p className="mt-1 text-xs">
                  <span className="text-ink-faint">Correcto:</span>{" "}
                  <span lang={pack.bcp47} className={cn(pack.meta.cssClass, "text-ink")}>
                    <Mixed>{w.result.expected}</Mixed>
                  </span>
                  {w.result.explanation && !w.result.explanation.startsWith("Has elegido") ? <span className="ml-2 text-ink-faint"><Mixed>{w.result.explanation}</Mixed></span> : null}
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
