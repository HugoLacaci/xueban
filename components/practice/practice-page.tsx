"use client";
/**
 * Practicar 练: todos los ejercicios en un sitio. Modos: lección adaptativa (tipo Duolingo), por unidad, por tipo,
 * por punto gramatical, mis errores, listening, speaking, por destreza, por tema del mazo, cuaderno de ejercicios y
 * simulacro. Con bancos (chino) se usan sesiones adaptativas; sin bancos (ja/ko) los generadores del motor.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "@/lib/languages/link";
import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertTriangle, BookOpen, Dumbbell, Hand, Headphones, Layers, Mic, NotebookPen, Shuffle, Sparkles, Timer, Zap } from "lucide-react";
import { db } from "@/lib/db";
import { grammarById } from "@/lib/course";
import { usePack } from "@/lib/languages/provider";
import { practiceExercises, SKILL_TYPES, type PracticeOptions } from "@/lib/exercises/build";
import { bankSession, BANK_TYPE_GROUPS, currentLevel, UNIT_BANKS } from "@/lib/exercises/session";
import { loadUnitBank } from "@/lib/exercises/bank";
import { EXERCISE_LABELS, EXERCISE_TYPES, BANK_EXERCISE_TYPES, type Exercise, type ExerciseType } from "@/lib/exercises/types";
import { useDictionary } from "@/lib/dictionary/service";
import { speechRecognitionAvailable } from "@/lib/tts";
import { Button } from "@/components/ui/button";
import { Badge, Card, PageHeader, Select, Spinner, Option } from "@/components/ui/primitives";
import { ExerciseRunner, type SessionSummary } from "@/components/exercises/runner";
import { SummaryCard } from "@/components/learn/steps";
import { cn, shuffle } from "@/lib/utils";
import { getActiveLang } from "@/lib/languages/registry";
import { targetLang } from "@/lib/languages/registry";
import { ui, pageNative, culture } from "@/lib/languages/ui-text";
import { Mixed } from "@/components/target/mixed";

type Mode = PracticeOptions["mode"] | "lesson" | "unit" | "type" | "listening" | "speaking" | "note";

const SKILL_TEXT: Record<string, Record<string, { label: string; desc: string }>> = {
  zh: {
    listening: { label: "Escuchar", desc: "dictado, escucha y elige, tonos" },
    reading: { label: "Leer", desc: "significados, traducción, huecos" },
    writing: { label: "Escribir", desc: "trazos, dictado, componentes" },
    speaking: { label: "Hablar", desc: "shadowing y reconocimiento de voz" },
    tones: { label: "Tonos", desc: "pares de tonos, pinyin" },
    characters: { label: "Caracteres", desc: "parecidos, radicales, construir" },
    grammar: { label: "Gramática", desc: "ordenar, huecos, clasificadores" },
  },
  ja: {
    listening: { label: "Escuchar", desc: "dictado, escucha y elige, acento" },
    reading: { label: "Leer", desc: "significados, lecturas, huecos" },
    writing: { label: "Escribir", desc: "kana y kanji, dictado, radicales" },
    speaking: { label: "Hablar", desc: "shadowing y reconocimiento de voz" },
    tones: { label: "Acento y sonidos", desc: "acento tonal, vocales largas, っ" },
    characters: { label: "Kana y kanji", desc: "parecidos, componentes, contadores" },
    grammar: { label: "Gramática", desc: "partículas, conjugación, ordenar" },
  },
  ko: {
    listening: { label: "Escuchar", desc: "dictado, escucha y elige, consonantes" },
    reading: { label: "Leer", desc: "significados, traducción, huecos" },
    writing: { label: "Escribir", desc: "jamo y bloques, dictado" },
    speaking: { label: "Hablar", desc: "shadowing y reconocimiento de voz" },
    tones: { label: "Pronunciación", desc: "lisas/aspiradas/tensas, reglas de enlace" },
    characters: { label: "Hangul", desc: "jamo parecidos, componer bloques" },
    grammar: { label: "Gramática", desc: "partículas, conjugación, ordenar" },
  },
};
const SKILL_IDS = ["listening", "reading", "writing", "speaking", "tones", "characters", "grammar"] as const;
const skillsFor = () => {
  const lang = getActiveLang();
  const g = ui().skills;
  return SKILL_IDS.map((id) => ({ id, zh: g[id], ...SKILL_TEXT[lang][id] }));
};

export function PracticePage() {
  const pack = usePack();
  const params = useSearchParams();
  const hasBanks = pack.id === "zh";
  const dictStatus = useDictionary((s) => s.status);
  const load = useDictionary((s) => s.load);
  const categories = useLiveQuery(() => db.categories.where("lang").equals(getActiveLang()).sortBy("order"), []) ?? [];
  const wordCount = useLiveQuery(() => db.words.where("lang").equals(getActiveLang()).count(), []) ?? 0;
  const mistakes = useLiveQuery(() => db.exerciseAttempts.where("lang").equals(getActiveLang()).filter((a) => !a.correct).count(), []) ?? 0;
  const workbook = useLiveQuery(() => db.exerciseItems.where("lang").equals(getActiveLang()).count(), []) ?? 0;
  const initialMode = (params.get("grammar") ? "grammar" : params.get("unit") ? "unit" : (params.get("mode") as Mode)) || (hasBanks ? "lesson" : "random");
  const [mode, setMode] = useState<Mode>(initialMode);
  const [category, setCategory] = useState(params.get("cat") ?? "");
  const [grammarId, setGrammarId] = useState(params.get("grammar") ?? pack.grammar.points[0]?.id ?? "");
  const [unitId, setUnitId] = useState(params.get("unit") ?? pack.curriculum.units.find((u) => u.level !== 0)?.id ?? "");
  const [group, setGroup] = useState(BANK_TYPE_GROUPS[0].id);
  const [skill, setSkill] = useState(params.get("skill") ?? "listening");
  const [count, setCount] = useState(Number(params.get("n") ?? (hasBanks ? 15 : 12)));
  const [types, setTypes] = useState<ExerciseType[]>([]);
  const [exercises, setExercises] = useState<Exercise[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [level, setLevel] = useState(1);
  const [bankInfo, setBankInfo] = useState<{ unit: string; items: number } | null>(null);
  const [reviewRound, setReviewRound] = useState(false);
  const autoStart = useRef(Boolean(params.get("grammar") || params.get("mode") || params.get("unit")));
  const noteId = params.get("note");

  useEffect(() => {
    if (dictStatus === "idle") void load();
    void pack.characters.load().catch(() => undefined);
    if (hasBanks) void currentLevel().then(setLevel);
  }, [dictStatus, load, hasBanks, pack]);

  useEffect(() => {
    if (!hasBanks || !unitId) return;
    void loadUnitBank(unitId).then((b) => setBankInfo(b ? { unit: unitId, items: b.items.length } : null));
  }, [unitId, hasBanks]);

  const start = async () => {
    setLoading(true);
    setReviewRound(false);
    try {
      let ex: Exercise[] = [];
      const speech = speechRecognitionAvailable();
      if (mode === "note" && noteId) {
        const note = await db.notes.get(noteId);
        if (note) {
          const { noteExercises } = await import("@/lib/notes/exercises");
          ex = noteExercises(note, { max: count, seed: Date.now() % 1000, tiles: (s) => pack.exerciseAdapters.tiles(s) });
        }
      } else if (hasBanks && mode === "lesson") {
        ex = await bankSession({ count, speechAvailable: speech });
      } else if (hasBanks && mode === "unit") {
        ex = await bankSession({ units: [unitId], count, speechAvailable: speech });
      } else if (hasBanks && mode === "type") {
        const g = BANK_TYPE_GROUPS.find((x) => x.id === group);
        ex = await bankSession({ bankTypes: g?.types, count, speechAvailable: speech, maxLevel: 3 });
      } else if (hasBanks && mode === "listening") {
        ex = await bankSession({ bankTypes: BANK_TYPE_GROUPS.find((x) => x.id === "listening")!.types, count, maxLevel: 3 });
      } else if (hasBanks && mode === "speaking") {
        ex = await bankSession({ bankTypes: BANK_TYPE_GROUPS.find((x) => x.id === "speaking")!.types, count, maxLevel: 3, speechAvailable: true });
      } else if (hasBanks && mode === "grammar") {
        ex = await bankSession({ grammarIds: [grammarId], count, maxLevel: 3, speechAvailable: speech });
        if (!ex.length) ex = await practiceExercises({ mode: "grammar", grammarId, count });
      } else if (hasBanks && mode === "mistakes") {
        ex = await bankSession({ count, mistakesOnly: true, maxLevel: 3, speechAvailable: speech });
        if (!ex.length) ex = await practiceExercises({ mode: "mistakes", count });
      } else {
        const m = (["random", "mistakes", "topic", "grammar", "skill", "words"].includes(mode) ? mode : "random") as PracticeOptions["mode"];
        ex = await practiceExercises({ mode: m, category, grammarId, skill, count, types: types.length ? types : undefined });
      }
      setExercises(ex);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoStart.current && dictStatus === "ready") {
      autoStart.current = false;
      void start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dictStatus]);

  const typeOptions = useMemo(() => EXERCISE_TYPES.filter((t) => t !== "comprehension" && t !== "reading-tf" && !BANK_EXERCISE_TYPES.includes(t)), []);
  const units = pack.curriculum.units;

  if (summary) {
    const failed = summary.results.filter((r) => !r.result.correct && !r.result.skip).map((r) => r.exercise);
    return (
      <div className="mx-auto max-w-2xl">
        <SummaryCard
          summary={summary}
          title={reviewRound ? "Repaso de fallos terminado" : "Práctica terminada"}
          onContinue={() => {
            setSummary(null);
            setExercises(null);
          }}
        />
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {failed.length && !reviewRound ? (
            <Button variant="default" onClick={() => { setSummary(null); setReviewRound(true); setExercises(shuffle(failed).map((e) => ({ ...e, id: `${e.id}-r` }))); }}>
              <Sparkles /> Repasar los {failed.length} fallos
            </Button>
          ) : null}
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
            <p lang={targetLang()} className="zh-kai text-lg text-ink">
              <Mixed>{culture().onboarding.proverbs[0]}</Mixed>
            </p>
            <p className="mt-1 text-sm text-ink-faint">No hay material suficiente para este modo todavía (añade palabras al mazo, completa alguna lección o haz una ronda para registrar errores).</p>
            <Button className="mt-3" variant="secondary" onClick={() => setExercises(null)}>
              Volver
            </Button>
          </Card>
        </div>
      );
    }
    return <ExerciseRunner exercises={exercises} context={mode === "note" ? `note:${noteId}` : "practice"} onFinish={setSummary} title={reviewRound ? "Repaso de fallos" : modeLabel(mode, { category, grammarId, skill, unitId, group, units: units.map((u) => [u.id, u.title] as [string, string]) })} />;
  }

  const canStart = !(loading || dictStatus === "loading" || (mode === "topic" && !category));

  return (
    <div className="pb-24 sm:pb-0">
      <PageHeader
        title="Practicar"
        zh={pageNative("practice")}
        subtitle={hasBanks ? "Sesiones de 12–20 ejercicios mezclados con dificultad adaptativa: lo que fallas vuelve más, y al final repasas los fallos. Sin vidas que castiguen." : "Ejercicios intercalados con corrección explicada. Todo fallo entra en «Mis puntos débiles» y en el repaso."}
        action={
          <>
            {hasBanks ? (
              <Button variant="outline" asChild>
                <Link href="/apuntes/cuaderno">
                  <NotebookPen /> Cuaderno{workbook ? ` (${workbook})` : ""}
                </Link>
              </Button>
            ) : null}
            <Button variant="outline" asChild>
              <Link href="/practicar/simulacro">
                <Timer /> Simulacro <Mixed>{pack.exam.levels.find((l) => l.id === pack.exam.firstLevel)?.label ?? pack.exam.name}</Mixed>
              </Link>
            </Button>
          </>
        }
      />
      {hasBanks ? (
        <p className="mb-3 text-xs text-ink-faint">
          Nivel adaptativo actual: <Badge variant="jade">nivel {level}</Badge> {level < 3 ? "— una racha de 10 aciertos sube de nivel." : "— máximo."}
        </p>
      ) : null}
      <div role="radiogroup" aria-label="Modo de práctica" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {hasBanks ? (
          <ModeCard active={mode === "lesson"} onClick={() => setMode("lesson")} zh="课" icon={<Zap />} title="Lección adaptativa" desc="15 ejercicios de todos los tipos, de tus unidades, con lo que más fallas." />
        ) : null}
        <ModeCard active={mode === "random"} onClick={() => setMode("random")} zh={ui().modes.random} icon={<Shuffle />} title="Aleatorio del mazo" desc="Mezcla de lo que estás estudiando en flashcards." />
        <ModeCard active={mode === "mistakes"} onClick={() => setMode("mistakes")} zh={ui().modes.mistakes} icon={<AlertTriangle />} title="Mis errores" desc={`Repite lo que has fallado (${mistakes} fallos registrados).`} disabled={!mistakes} />
        {hasBanks ? (
          <ModeCard active={mode === "unit"} onClick={() => setMode("unit")} zh="单" icon={<BookOpen />} title="Por unidad" desc="Los ejercicios de una unidad del curso.">
            {mode === "unit" ? (
              <>
                <Select value={unitId} onChange={(e) => setUnitId(e.target.value)} className="mt-3 w-full" onClick={(e) => e.stopPropagation()} aria-label="Unidad">
                  {units.map((u) => (
                    <Option key={u.id} value={u.id}>
                      {u.title}
                    </Option>
                  ))}
                </Select>
                {bankInfo?.unit === unitId ? <p className="mt-1 text-xs opacity-75">{bankInfo.items} ejercicios en el banco</p> : <p className="mt-1 text-xs opacity-75">sin banco todavía: se usan los generadores</p>}
              </>
            ) : null}
          </ModeCard>
        ) : null}
        {hasBanks ? (
          <ModeCard active={mode === "type"} onClick={() => setMode("type")} zh="型" icon={<Layers />} title="Por tipo" desc="Diálogos, encuentra el error, transformar, traducir, velocidad…">
            {mode === "type" ? (
              <Select value={group} onChange={(e) => setGroup(e.target.value)} className="mt-3 w-full" onClick={(e) => e.stopPropagation()} aria-label="Tipo">
                {BANK_TYPE_GROUPS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}: {g.types.map((t) => EXERCISE_LABELS[t as ExerciseType] ?? t).slice(0, 3).join(", ")}…
                  </option>
                ))}
              </Select>
            ) : null}
          </ModeCard>
        ) : null}
        <ModeCard active={mode === "grammar"} onClick={() => setMode("grammar")} zh={ui().modes.grammar} icon={<BookOpen />} title="Por punto gramatical" desc={hasBanks ? "≥ 25 ejercicios por estructura: huecos, errores, transformar, traducir…" : "Ordenar frases, huecos y traducción de un punto."}>
          {mode === "grammar" ? (
            <Select value={grammarId} onChange={(e) => setGrammarId(e.target.value)} className="mt-3 w-full" onClick={(e) => e.stopPropagation()} aria-label="Punto gramatical">
              {pack.grammar.points.map((g) => (
                <Option key={g.id} value={g.id}>
                  {`${g.zh} · ${g.title}`}
                </Option>
              ))}
            </Select>
          ) : null}
        </ModeCard>
        {hasBanks ? <ModeCard active={mode === "listening"} onClick={() => setMode("listening")} zh="听" icon={<Headphones />} title="Listening" desc="Escucha y elige, escucha y responde, dictados, verdadero/falso, tonos. Voces y velocidades distintas." /> : null}
        {hasBanks ? <ModeCard active={mode === "speaking"} onClick={() => setMode("speaking")} zh="说" icon={<Mic />} title="Speaking" desc="Repite conmigo, lee en voz alta, responde oralmente." /> : null}
        <ModeCard active={mode === "topic"} onClick={() => setMode("topic")} zh={ui().modes.topic} icon={<Hand />} title="Por tema del mazo" desc="Una categoría de tus flashcards.">
          {mode === "topic" ? (
            <Select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-3 w-full" onClick={(e) => e.stopPropagation()} aria-label="Categoría">
              <option value="">Elige categoría…</option>
              {categories.map((c) => (
                <Option key={c.id} value={c.name}>
                  {c.name}
                </Option>
              ))}
            </Select>
          ) : null}
        </ModeCard>
        <ModeCard active={mode === "skill"} onClick={() => setMode("skill")} zh={ui().modes.skill} icon={<Dumbbell />} title="Por destreza" desc="Escuchar, leer, escribir, hablar, tonos, caracteres." className="sm:col-span-2 lg:col-span-2">
          {mode === "skill" ? (
            <div className="mt-3 flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()} role="radiogroup" aria-label="Destreza">
              {skillsFor().map((s) => (
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
                  <span lang={targetLang()} className={cn("zh-serif flex size-5 items-center justify-center rounded-full text-[13px] leading-none", skill === s.id ? "bg-paper/15" : "bg-paper-sunk text-cinnabar")} aria-hidden="true">
                    <Mixed>{s.zh}</Mixed>
                  </span>
                  <Mixed>{s.label}</Mixed>
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
            {[8, 12, 15, 20, 30].map((n) => (
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
          {!hasBanks || ["random", "topic", "skill"].includes(mode) ? (
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
                    <Mixed>{EXERCISE_LABELS[t]}</Mixed>
                  </button>
                ))}
                {types.length ? (
                  <button type="button" onClick={() => setTypes([])} className="text-xs text-indigo underline underline-offset-2">
                    todos
                  </button>
                ) : null}
              </div>
            </details>
          ) : null}
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
        <span lang={targetLang()} className={cn("zh-serif flex size-8 shrink-0 items-center justify-center rounded-[6px] text-lg leading-none", active ? "bg-paper/12 text-paper" : "bg-paper-sunk text-cinnabar")} aria-hidden="true">
          <Mixed>{zh}</Mixed>
        </span>
        <span className="font-serif-es text-base font-semibold tracking-tight">{title}</span>
        <span className={cn("ml-auto [&_svg]:size-4", active ? "text-paper/60" : "text-ink-faint")}>{icon}</span>
      </div>
      <p className={cn("mt-1.5 text-sm", active ? "text-paper/75" : "text-ink-faint")}><Mixed>{desc}</Mixed></p>
      {children}
    </div>
  );
}

function modeLabel(mode: Mode, o: { category: string; grammarId: string; skill: string; unitId: string; group: string; units: [string, string][] }): string {
  switch (mode) {
    case "lesson":
      return "Lección adaptativa";
    case "random":
      return "Práctica intercalada";
    case "mistakes":
      return "Mis errores";
    case "topic":
      return o.category;
    case "unit":
      return o.units.find(([id]) => id === o.unitId)?.[1] ?? "Unidad";
    case "type":
      return BANK_TYPE_GROUPS.find((g) => g.id === o.group)?.label ?? "Tipo";
    case "listening":
      return "Listening";
    case "speaking":
      return "Speaking";
    case "grammar":
      return grammarById(o.grammarId)?.title ?? "Gramática";
    case "skill":
      return skillsFor().find((s) => s.id === o.skill)?.label ?? "Destreza";
    case "note":
      return "Práctica del apunte";
    default:
      return "Práctica";
  }
}

export { UNIT_BANKS };
