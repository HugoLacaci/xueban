"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { unitById } from "@/lib/course";
import { checkpointExercises } from "@/lib/exercises/build";
import type { Exercise } from "@/lib/exercises/types";
import { loadCharInfo, useDictionary } from "@/lib/dictionary/service";
import { db } from "@/lib/db";
import { nowMs } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageHeader, Spinner } from "@/components/ui/primitives";
import { CloudBorder, Seal } from "@/components/ornament";
import { ExerciseRunner, type SessionSummary } from "@/components/exercises/runner";
import { SummaryCard } from "./steps";
import { Paifang } from "./map-art";

export function Checkpoint({ unitId }: { unitId: string }) {
  const router = useRouter();
  const unit = unitById(unitId);
  const dictStatus = useDictionary((s) => s.status);
  const load = useDictionary((s) => s.load);
  const [exercises, setExercises] = useState<Exercise[] | null>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (dictStatus === "idle") void load();
    void loadCharInfo().catch(() => undefined);
  }, [dictStatus, load]);

  useEffect(() => {
    if (!started || !unit || dictStatus === "loading" || dictStatus === "idle") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExercises(checkpointExercises(unit, unit.checkpoint?.exercises ?? 15, nowMs() % 100000));
  }, [started, unit, dictStatus]);

  if (!unit) {
    return (
      <div>
        <PageHeader title="Unidad no encontrada" />
        <Button asChild variant="secondary">
          <Link href="/aprender">
            <ArrowLeft /> Volver
          </Link>
        </Button>
      </div>
    );
  }

  if (summary) {
    const pct = summary.total ? summary.correct / summary.total : 1;
    return (
      <div className="mx-auto max-w-2xl">
        <CloudBorder className="card-paper p-2">
          <div className="flex flex-col items-center pt-6">
            <Seal text={pct >= 0.8 ? "通过" : "再试"} size={76} tone={pct >= 0.8 ? "cinnabar" : "ink"} stamped rotate={-5} title={pct >= 0.8 ? "Checkpoint superado" : "Vuelve a intentarlo"} />
          </div>
          <SummaryCard
            summary={summary}
            title={`Checkpoint · ${unit.title}`}
            onContinue={async () => {
              await db.syncState.put({ key: `checkpoint:${unit.id}`, value: { score: pct, at: Date.now() }, updatedAt: Date.now() });
              router.push("/aprender");
            }}
          />
        </CloudBorder>
      </div>
    );
  }

  if (!started) {
    const words = unit.lessons.reduce((a, l) => a + l.vocab.length, 0);
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader title={`Checkpoint · ${unit.title}`} zh="检查点" subtitle="Ejercicios mezclados con todo el vocabulario y las frases de la unidad. Sin saltar. Te dirá qué repasar." />
        <CloudBorder className="card-paper">
          <div className="flex flex-col items-center px-6 py-8 text-center">
            <Paifang size={84} tone="gold" />
            <p className="font-serif-es mt-3 text-xl font-semibold text-ink">
              Cruza el 牌坊 de la unidad
              <span lang="zh-CN" className="zh-kai ml-2 text-lg font-normal text-cinnabar">
                {unit.zh}
              </span>
            </p>
            <p className="mt-2 text-sm text-ink-faint">
              <span className="tabular">{unit.checkpoint?.exercises ?? 15}</span> ejercicios · <span className="tabular">{words}</span> palabras de la unidad
            </p>
            <Button className="mt-5" size="lg" onClick={() => setStarted(true)}>
              Empezar
            </Button>
          </div>
        </CloudBorder>
      </div>
    );
  }

  if (!exercises) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }
  return <ExerciseRunner exercises={exercises} context={`checkpoint:${unit.id}`} onFinish={setSummary} allowSkip={false} title={unit.title} />;
}
