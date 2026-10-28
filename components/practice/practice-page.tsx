"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertTriangle, BookOpen, Dumbbell, Hand, Shuffle, Timer } from "lucide-react";
import { db } from "@/lib/db";
import { GRAMMAR, grammarById } from "@/lib/course";
import { practiceExercises, SKILL_TYPES, type PracticeOptions } from "@/lib/exercises/build";
import { EXERCISE_LABELS, EXERCISE_TYPES, type Exercise, type ExerciseType } from "@/lib/exercises/types";
import { loadCharInfo, useDictionary } from "@/lib/dictionary/service";
import { Button } from "@/components/ui/button";
import { Badge, Card, PageHeader, Select, Spinner } from "@/components/ui/primitives";
import { ExerciseRunner, type SessionSummary } from "@/components/exercises/runner";
import { SummaryCard } from "@/components/learn/steps";
import { cn } from "@/lib/utils";

type Mode = PracticeOptions["mode"];

const SKILLS: { id: string; label: string; zh: string; desc: string }[] = [
  { id: "listening", label: "Escuchar", zh: "听", desc: "dictado, escucha y elige, tonos" },
  { id: "reading", label: "Leer", zh: "读", desc: "significados, traducción, huecos" },
  { id: "writing", label: "Escribir", zh: "写", desc: "trazos, dictado, componentes" },
  { id: "speaking", label: "Hablar", zh: "说", desc: "shadowing y reconocimiento de voz" },
  { id: "tones", label: "Tonos", zh: "调", desc: "pares de tonos, pinyin" },
  { id: "characters", label: "Caracteres", zh: "字", desc: "parecidos, radicales, construir" },
  { id: "grammar", label: "Gramática", zh: "法", desc: "ordenar, huecos, clasificadores" },
];

export function PracticePage() {
  const params = useSearchParams();
  const dictStatus = useDictionary((s) => s.status);
  const load = useDictionary((s) => s.load);
  const categories = useLiveQuery(() => db.categories.orderBy("order").toArray(), []) ?? [];
  const wordCount = useLiveQuery(() => db.words.count(), []) ?? 0;
  const mistakes = useLiveQuery(() => db.exerciseAttempts.filter((a) => !a.correct).count(), []) ?? 0;
  const [mode, setMode] = useState<Mode>((params.get("grammar") ? "grammar" : (params.get("mode") as Mode)) || "random");
  const [category, setCategory] = useState(params.get("cat") ?? "");
  const [grammarId, setGrammarId] = useState(params.get("grammar") ?? GRAMMAR[0]?.id ?? "");
  const [skill, setSkill] = useState(params.get("skill") ?? "listening");
  const [count, setCount] = useState(Number(params.get("n") ?? 12));
  const [types, setTypes] = useState<ExerciseType[]>([]);
  const [exercises, setExercises] = useState<Exercise[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const autoStart = useRef(Boolean(params.get("grammar") || params.get("mode")));

  useEffect(() => {
    if (dictStatus === "idle") void load();
    void loadCharInfo().catch(() => undefined);
  }, [dictStatus, load]);

  const start = async () => {
    setLoading(true);
    const ex = await practiceExercises({ mode, category, grammarId, skill, count, types: types.length ? types : undefined });
    setExercises(ex);
    setLoading(false);
  };

  useEffect(() => {
    if (autoStart.current && dictStatus === "ready") {
      autoStart.current = false;
      void start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dictStatus]);

  const typeOptions = useMemo(() => EXERCISE_TYPES.filter((t) => t !== "comprehension" && t !== "reading-tf"), []);

  if (summary) {
    return (
      <div className="mx-auto max-w-2xl">
        <SummaryCard
          summary={summary}
          title="Práctica terminada"
          onContinue={() => {
            setSummary(null);
            setExercises(null);
          }}
        />
        <div className="mt-3 flex justify-center gap-2">
          <Button variant="secondary" onClick={() => { setSummary(null); void start(); }}>
            <Shuffle /> Otra ronda igual
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/">Hoy</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (exercises) {
    if (!exercises.length) {
      return (
        <div className="mx-auto max-w-lg">
          <Card className="text-center">
            <p lang="zh-CN" className="zh-kai text-lg text-ink">
              千里之行，始于足下。
            </p>
            <p className="mt-1 text-sm text-ink-faint">No hay material suficiente para este modo todavía (añade palabras al mazo o completa alguna lección).</p>
            <Button className="mt-3" variant="secondary" onClick={() => setExercises(null)}>
              Volver
            </Button>
          </Card>
        </div>
      );
    }
    return <ExerciseRunner exercises={exercises} context="practice" onFinish={setSummary} title={modeLabel(mode, { category, grammarId, skill })} />;
  }

  const canStart = !(loading || dictStatus === "loading" || (mode === "topic" && !category));

  return (
    <div className="pb-24 sm:pb-0">
      <PageHeader
        title="Practicar"
        zh="练习"
        subtitle="Ejercicios intercalados con corrección explicada. Todo fallo entra en «Mis puntos débiles» y en el repaso."
        action={
          <Button variant="outline" asChild>
            <Link href="/practicar/simulacro">
              <Timer /> Simulacro HSK 1
            </Link>
          </Button>
        }
      />
      <div role="radiogroup" aria-label="Modo de práctica" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ModeCard active={mode === "random"} onClick={() => setMode("random")} zh="混" icon={<Shuffle />} title="Aleatorio intercalado" desc="Mezcla de todo lo que estás estudiando. Recomendado a diario." />
        <ModeCard active={mode === "mistakes"} onClick={() => setMode("mistakes")} zh="错" icon={<AlertTriangle />} title="Mis errores" desc={`Repite lo que has fallado (${mistakes} fallos registrados).`} disabled={!mistakes} />
        <ModeCard active={mode === "topic"} onClick={() => setMode("topic")} zh="题" icon={<Hand />} title="Por tema" desc="Una categoría de tu mazo.">
          {mode === "topic" ? (
            <Select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-3 w-full" onClick={(e) => e.stopPropagation()} aria-label="Categoría">
              <option value="">Elige categoría…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </Select>
          ) : null}
        </ModeCard>
        <ModeCard active={mode === "grammar"} onClick={() => setMode("grammar")} zh="法" icon={<BookOpen />} title="Por punto gramatical" desc="Ordenar frases, huecos y traducción de un punto.">
          {mode === "grammar" ? (
            <Select value={grammarId} onChange={(e) => setGrammarId(e.target.value)} className="mt-3 w-full" onClick={(e) => e.stopPropagation()} aria-label="Punto gramatical">
              {GRAMMAR.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.zh} · {g.title}
                </option>
              ))}
            </Select>
          ) : null}
        </ModeCard>
        <ModeCard active={mode === "skill"} onClick={() => setMode("skill")} zh="能" icon={<Dumbbell />} title="Por destreza" desc="Escuchar, leer, escribir, hablar, tonos, caracteres." className="sm:col-span-2 lg:col-span-2">
          {mode === "skill" ? (
            <div className="mt-3 flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()} role="radiogroup" aria-label="Destreza">
              {SKILLS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={skill === s.id}
                  onClick={() => setSkill(s.id)}
                  title={s.desc}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border py-1 pl-1.5 pr-3 text-xs font-medium transition-colors duration-[var(--dur-ui)]",
                    skill === s.id ? "border-ink bg-ink text-paper" : "border-line bg-paper-raised text-ink-soft hover:border-ink/40 hover:text-ink",
                  )}
                >
                  <span lang="zh-CN" className={cn("zh-serif flex size-5 items-center justify-center rounded-full text-[13px] leading-none", skill === s.id ? "bg-paper/15" : "bg-paper-sunk text-cinnabar")} aria-hidden="true">
                    {s.zh}
                  </span>
                  {s.label}
                </button>
              ))}
            </div>
          ) : null}
        </ModeCard>
      </div>

      <Card className="mt-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="flex items-center gap-1.5 text-sm" role="radiogroup" aria-label="Número de ejercicios">
            <span className="mr-1 text-ink-faint">Ejercicios</span>
            {[8, 12, 20, 30].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={count === n}
                onClick={() => setCount(n)}
                className={cn("tabular min-w-10 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors duration-[var(--dur-ui)]", count === n ? "border-ink bg-ink text-paper" : "border-line bg-paper-raised text-ink-soft hover:border-ink/40 hover:text-ink")}
              >
                {n}
              </button>
            ))}
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer text-ink-faint hover:text-ink">Tipos de ejercicio (opcional)</summary>
            <div className="mt-2 flex flex-wrap gap-1">
              {typeOptions.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={types.includes(t)}
                  onClick={() => setTypes((ts) => (ts.includes(t) ? ts.filter((x) => x !== t) : [...ts, t]))}
                  className={cn("rounded-full border px-2.5 py-0.5 text-xs transition-colors", types.includes(t) ? "border-celadon bg-celadon/12 text-celadon-ink" : "border-line text-ink-faint hover:text-ink")}
                >
                  {EXERCISE_LABELS[t]}
                </button>
              ))}
              {types.length ? (
                <button type="button" onClick={() => setTypes([])} className="text-xs text-indigo underline underline-offset-2">
                  todos
                </button>
              ) : null}
            </div>
          </details>
          <div className="ml-auto hidden items-center gap-2 sm:flex">
            <Badge variant="outline" className="tabular">
              {wordCount} palabras en el mazo
            </Badge>
            <Button size="lg" onClick={() => void start()} disabled={!canStart}>
              {loading || dictStatus === "loading" ? <Spinner className="size-4 border-paper/50 border-t-paper" /> : <Dumbbell />} Empezar
            </Button>
          </div>
        </div>
        {mode === "skill" ? <p className="mt-2 text-xs text-ink-faint">Tipos de esta destreza: {SKILL_TYPES[skill]?.map((t) => EXERCISE_LABELS[t]).join(", ")}</p> : null}
      </Card>

      {/* Zona de pulgar en móvil */}
      <div className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-20 border-t border-line bg-paper/90 px-4 py-2.5 backdrop-blur sm:hidden">
        <Button size="lg" className="w-full" onClick={() => void start()} disabled={!canStart}>
          {loading || dictStatus === "loading" ? <Spinner className="size-4 border-paper/50 border-t-paper" /> : <Dumbbell />} Empezar · {count} ejercicios
        </Button>
      </div>
    </div>
  );
}

/** Placa de papel: activa con esquinas recortadas (jade) y filete bermellón; carácter de la modalidad como marca. */
function ModeCard({ active, onClick, icon, zh, title, desc, disabled, children, className }: { active: boolean; onClick: () => void; icon: React.ReactNode; zh: string; title: string; desc: string; disabled?: boolean; children?: React.ReactNode; className?: string }) {
  return (
    <div
      role="radio"
      aria-checked={active}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && onClick()}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !disabled) {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "relative cursor-pointer p-4 transition-[transform,box-shadow,background-color] duration-[var(--dur-ui)] ease-[var(--ease-ink)]",
        active ? "card-plate bg-ink text-paper shadow-[var(--shadow-float)]" : "card-paper hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)]",
        disabled && "cursor-not-allowed opacity-50 hover:translate-y-0",
        className,
      )}
    >
      {active ? <span className="absolute inset-x-5 top-0 h-[2px] bg-cinnabar" aria-hidden="true" /> : null}
      <div className="flex items-center gap-2.5">
        <span lang="zh-CN" className={cn("zh-serif flex size-8 shrink-0 items-center justify-center rounded-[6px] text-lg leading-none", active ? "bg-paper/12 text-paper" : "bg-paper-sunk text-cinnabar")} aria-hidden="true">
          {zh}
        </span>
        <span className="font-serif-es text-base font-semibold tracking-tight">{title}</span>
        <span className={cn("ml-auto [&_svg]:size-4", active ? "text-paper/60" : "text-ink-faint")}>{icon}</span>
      </div>
      <p className={cn("mt-1.5 text-sm", active ? "text-paper/75" : "text-ink-faint")}>{desc}</p>
      {children}
    </div>
  );
}

function modeLabel(mode: Mode, o: { category: string; grammarId: string; skill: string }): string {
  switch (mode) {
    case "random":
      return "Práctica intercalada";
    case "mistakes":
      return "Mis errores";
    case "topic":
      return o.category;
    case "grammar":
      return grammarById(o.grammarId)?.title ?? "Gramática";
    case "skill":
      return SKILLS.find((s) => s.id === o.skill)?.label ?? "Destreza";
    default:
      return "Práctica";
  }
}
