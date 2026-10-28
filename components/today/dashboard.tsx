"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { BookOpen, ChevronRight, GraduationCap, Layers, NotebookPen, Plus, Search, Video } from "lucide-react";
import { db } from "@/lib/db";
import { useSettings } from "@/lib/settings";
import { todaySummary, type TodaySummary } from "@/lib/stats";
import { daysBetween, formatMinutes } from "@/lib/utils";
import { useNow } from "@/hooks/use-now";
import { Button } from "@/components/ui/button";
import { Card, Progress } from "@/components/ui/primitives";
import { Hanzi } from "@/components/zh/chinese-text";
import { QuickAddDialog } from "@/components/flashcards/quick-add";
import { ActivityHeatmap } from "@/components/today/heatmap";
import { CharOfDay } from "@/components/today/char-of-day";
import { todayPlan, type PlanStep } from "@/lib/plan";
import { ShanShui, dayPhase, Enso, Seal, PlumBranch, Lantern, quoteOfDay } from "@/components/ornament";
import { cn } from "@/lib/utils";

const GREETINGS: { zh: string; es: string; from: number }[] = [
  { zh: "早上好", es: "Buenos días", from: 5 },
  { zh: "下午好", es: "Buenas tardes", from: 13 },
  { zh: "晚上好", es: "Buenas noches", from: 19 },
];
const WEEKDAYS_ZH = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
const ZH_NUM = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
function zhNumber(n: number): string {
  if (n <= 10) return ZH_NUM[n];
  if (n < 20) return `十${ZH_NUM[n - 10]}`;
  const tens = Math.floor(n / 10);
  const rest = n % 10;
  return `${ZH_NUM[tens]}十${rest ? ZH_NUM[rest] : ""}`;
}

export function TodayDashboard() {
  const settings = useSettings((s) => s.settings);
  const [sum, setSum] = useState<TodaySummary | null>(null);
  const [adding, setAdding] = useState(false);
  const tick = useLiveQuery(() => Promise.all([db.cards.count(), db.dailyStats.count(), db.words.count(), db.reviewLogs.count()]), []);
  useEffect(() => {
    void todaySummary().then(setSum);
  }, [tick]);

  const now = useNow();
  const date = new Date(now);
  const h = date.getHours();
  const greet = GREETINGS.filter((g) => h >= g.from).pop() ?? GREETINGS[2];
  const phase = dayPhase(date);
  const dayIndex = Math.floor(now / 86400000);
  const goal = settings.dailyGoalMinutes;
  const minutes = sum?.minutesToday ?? 0;
  const pct = goal ? Math.min(1, minutes / goal) : 0;
  const examDays = settings.examDate ? daysBetween(date, new Date(settings.examDate + "T00:00:00")) : null;
  const plan = sum ? todayPlan(sum, settings) : [];
  const quote = quoteOfDay(date);
  const name = settings.name || "Hugo";
  const zhName = /^\s*hugo\s*$/i.test(name) || !settings.name ? "雨果" : name;
  const dateEs = date.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Cabecera 山水 */}
      <section className="relative -mx-4 -mt-5 overflow-hidden sm:-mx-6 sm:rounded-b-[var(--radius-card)]" aria-label="Saludo">
        <div className="absolute inset-0" aria-hidden="true">
          <ShanShui phase={phase} seed={11 + (dayIndex % 7)} height={320} layers={4} />
          <div className="absolute inset-x-0 bottom-0 top-[8%] bg-gradient-to-b from-transparent via-paper/85 to-paper" />
        </div>
        <div className="relative flex flex-col gap-5 px-4 pb-4 pt-24 sm:flex-row sm:items-end sm:justify-between sm:px-8 sm:pb-5 sm:pt-28">
          <div className="min-w-0">
            <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-ink-soft">
              <span lang="zh-CN" className="zh normal-case tracking-normal">
                {zhNumber(date.getMonth() + 1)}月{zhNumber(date.getDate())}日 · {WEEKDAYS_ZH[date.getDay()]}
              </span>
              <span className="mx-2 hidden opacity-50 sm:inline">·</span>
              <span className="hidden sm:inline">{dateEs}</span>
            </p>
            <h1 className="text-4xl leading-none sm:text-5xl">
              <Hanzi text={`${greet.zh}，${zhName}`} size="2xl" font="serif" className="font-normal tracking-normal" />
            </h1>
            <p className="mt-3 max-w-md text-sm text-ink-soft">
              {greet.es}. {sum ? (sum.dueCards ? `Tienes ${sum.dueCards} repasos pendientes.` : "No hay repasos pendientes ahora mismo.") : "Preparando tu día…"}
            </p>
          </div>
          <div className="flex items-center gap-4 sm:gap-5">
            <Enso size={108} progress={pct} label={`Objetivo diario: ${formatMinutes(minutes)} de ${formatMinutes(goal)}`} stroke={pct >= 1 ? "rgb(var(--celadon-ink))" : "rgb(var(--ink))"}>
              <span className="block font-serif-es text-3xl leading-none text-ink tabular">{Math.round(minutes)}</span>
              <span className="mt-1 block text-[10px] uppercase tracking-wider text-ink-faint">de {goal} min</span>
            </Enso>
            <Button onClick={() => setAdding(true)} variant="outline" className="bg-paper-raised/80">
              <Plus /> Vocabulario de clase
            </Button>
          </div>
        </div>
      </section>

      {/* Cifras */}
      <section className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4" aria-label="Resumen">
        <Stat zh="周" label="Esta semana" value={formatMinutes(sum?.minutesWeek ?? 0)} />
        <Stat zh="词" label="Palabras conocidas" value={`${sum?.wordsKnown ?? 0}`} hint={`${sum?.wordsLearning ?? 0} aprendiendo · ${sum?.wordsTotal ?? 0} en el mazo`} />
        <Stat zh="字" label="Caracteres" value={`${sum?.charsKnown ?? 0}`} hint="reconocidos" />
        <Stat zh="卡" label="Repasos hoy" value={`${sum?.dueCards ?? 0}`} hint="tarjetas pendientes" />
      </section>

      {/* Tareas + examen/racha */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-[3fr_2fr] [&>*]:min-w-0">
        <Card className="p-0">
          <header className="flex items-baseline justify-between border-b border-line/70 px-4 py-3 sm:px-5">
            <h2 className="font-serif-es text-lg text-ink">
              <span lang="zh-CN" className="zh-kai mr-2 text-ink-soft">
                今日任务
              </span>
              Tareas de hoy
            </h2>
            <span className="text-xs text-ink-faint tabular">
              {formatMinutes(minutes)} / {formatMinutes(goal)}
            </span>
          </header>
          <ol className="divide-y divide-line/60">
            {plan.length ? (
              plan.map((step, i) => <PlanRow key={step.href + i} step={step} index={i} done={isDone(plan, i, minutes, sum?.dueCards ?? 0)} />)
            ) : (
              <li className="px-5 py-6 text-sm text-ink-faint">Calculando tu plan…</li>
            )}
          </ol>
        </Card>

        <div className="grid gap-4">
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-serif-es text-lg text-ink">Racha</h2>
                <p className="text-sm text-ink-soft">
                  <span className="font-serif-es text-2xl text-ink tabular">{sum?.streak ?? 0}</span> {sum?.streak === 1 ? "día" : "días"} seguidos
                </p>
              </div>
              <WeekLanterns daily={sum?.daily ?? []} date={date} />
            </div>
          </Card>
          <Card className="flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-serif-es text-lg text-ink">Examen HSK 1</h2>
                {examDays === null ? (
                  <p className="mt-1 text-sm text-ink-soft">
                    Pon la fecha de tu examen en{" "}
                    <Link href="/ajustes" className="text-indigo underline underline-offset-4">
                      Ajustes
                    </Link>{" "}
                    para ver la cuenta atrás.
                  </p>
                ) : (
                  <p className="mt-1 font-serif-es text-3xl leading-none text-ink tabular">
                    {examDays >= 0 ? examDays : 0} <span className="font-sans text-sm text-ink-faint">días</span>
                  </p>
                )}
              </div>
              {examDays !== null ? <Seal text="考" size={44} tone="ink" title="Examen" /> : null}
            </div>
            <Readiness known={sum?.wordsKnown ?? 0} />
          </Card>
        </div>
      </section>

      {/* Ciruelo + carácter del día */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif-es text-lg text-ink">
              <span lang="zh-CN" className="zh-kai mr-2 text-ink-soft">
                梅花
              </span>
              Tu ciruelo
            </h2>
            <span className="text-xs text-ink-faint tabular">{sum?.wordsKnown ?? 0} palabras dominadas</span>
          </div>
          <PlumBranch count={sum?.wordsKnown ?? 0} perFlower={10} className="mt-2" height={170} />
        </Card>
        <Card>
          <h2 className="mb-3 font-serif-es text-lg text-ink">
            <span lang="zh-CN" className="zh-kai mr-2 text-ink-soft">
              每日一字
            </span>
            Carácter del día
          </h2>
          <CharOfDay dayIndex={dayIndex} />
        </Card>
      </section>

      {/* Accesos rápidos */}
      <section aria-label="Accesos rápidos">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          <QuickLink href="/aprender" icon={<GraduationCap />} label="Lección" zh="学" />
          <QuickLink href="/flashcards/repasar" icon={<Layers />} label="Repasar" zh="卡" />
          <QuickLink href="/lectura" icon={<BookOpen />} label="Leer" zh="读" />
          <QuickLink href="/videos" icon={<Video />} label="Vídeo" zh="视" />
          <QuickLink href="/study-hall/cuaderno" icon={<NotebookPen />} label="Cuaderno" zh="斋" />
          <QuickLink href="/diccionario" icon={<Search />} label="Diccionario" zh="典" />
        </div>
      </section>

      {/* Actividad */}
      <section>
        <Card>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-serif-es text-lg text-ink">Actividad</h2>
            <span className="text-xs text-ink-faint">últimas 20 semanas</span>
          </div>
          <ActivityHeatmap daily={sum?.daily ?? []} />
        </Card>
      </section>

      {/* Cita del día */}
      <footer className="pb-2 text-center">
        <p lang="zh-CN" className="zh-kai text-xl text-ink">
          {quote.zh}
        </p>
        <p className="mt-1 text-xs text-ink-faint">
          {quote.py} · {quote.es}
        </p>
      </footer>

      <QuickAddDialog open={adding} onOpenChange={setAdding} source="class" />
    </div>
  );
}

/** Heurística de tarea hecha: minutos acumulados del plan alcanzados, o repaso sin tarjetas pendientes. */
function isDone(plan: PlanStep[], i: number, minutes: number, dueCards: number): boolean {
  const step = plan[i];
  if (step.kind === "review" && step.href === "/flashcards/repasar" && dueCards === 0) return true;
  const cumulative = plan.slice(0, i + 1).reduce((a, s) => a + s.minutes, 0);
  return minutes >= cumulative;
}

function PlanRow({ step, index, done }: { step: PlanStep; index: number; done: boolean }) {
  return (
    <li>
      <Link href={step.href} className={cn("group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-paper-sunk/50 sm:px-5", done && "text-ink-soft")}>
        <span className="relative flex size-9 shrink-0 items-center justify-center">
          {done ? (
            <Seal text="完" size={34} rotate={-6} title="Hecho" />
          ) : (
            <span className="flex size-8 items-center justify-center rounded-full border border-line font-serif-es text-sm text-ink-soft tabular">{index + 1}</span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block text-sm font-medium text-ink", done && "line-through decoration-ink/40")}>{step.title}</span>
          <span className="block truncate text-xs text-ink-faint">{step.subtitle}</span>
        </span>
        <span className="shrink-0 text-xs text-ink-faint tabular">{step.minutes} min</span>
        <ChevronRight className="size-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" />
      </Link>
    </li>
  );
}

function Stat({ zh, label, value, hint }: { zh: string; label: string; value: string; hint?: string }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span lang="zh-CN" className="zh-kai mt-0.5 text-xl leading-none text-ink-faint" aria-hidden="true">
        {zh}
      </span>
      <span className="min-w-0">
        <span className="block text-xs text-ink-faint">{label}</span>
        <span className="block font-serif-es text-2xl leading-tight text-ink tabular">{value}</span>
        {hint ? <span className="block truncate text-[11px] text-ink-faint">{hint}</span> : null}
      </span>
    </div>
  );
}

function QuickLink({ href, icon, label, zh }: { href: string; icon: React.ReactNode; label: string; zh: string }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-1 rounded-[10px] border border-line/80 bg-paper-raised/60 px-2 py-3 text-xs text-ink-soft transition-colors hover:border-ink/30 hover:bg-paper-raised hover:text-ink [&_svg]:size-4 [&_svg]:text-ink-faint">
      <span className="relative">
        {icon}
        <span lang="zh-CN" className="zh-kai absolute -right-3 -top-2 text-[10px] text-ink-faint" aria-hidden="true">
          {zh}
        </span>
      </span>
      {label}
    </Link>
  );
}

/** 灯笼 — siete farolillos (lunes a domingo); encendido = día con actividad esta semana. */
function WeekLanterns({ daily, date }: { daily: TodaySummary["daily"]; date: Date }) {
  const active = new Set(daily.filter((d) => d.minutes > 0 || d.reviews > 0 || d.exercises > 0 || d.newWords > 0).map((d) => d.date));
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { key, lit: active.has(key), future: d > date, label: ["L", "M", "X", "J", "V", "S", "D"][i] };
  });
  return (
    <ul className="flex items-end gap-1" aria-label="Días con estudio esta semana">
      {days.map((d) => (
        <li key={d.key} className={cn("flex flex-col items-center", d.future && "opacity-40")}>
          <Lantern lit={d.lit} size={22} title={`${d.label}: ${d.lit ? "estudiado" : "sin estudiar"}`} />
          <span className="text-[9px] text-ink-faint" aria-hidden="true">
            {d.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Readiness({ known }: { known: number }) {
  // HSK 3.0 nivel 1 = 300 palabras; aproximación: % de palabras conocidas × factor de práctica
  const pct = Math.min(100, Math.round((known / 300) * 100));
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-xs text-ink-faint">
        <span>Preparación estimada</span>
        <span className="tabular">{pct}%</span>
      </div>
      <Progress value={pct} className="mt-1" color="rgb(var(--celadon))" />
      <p className="mt-1 text-[11px] text-ink-faint">Según palabras conocidas (300 del HSK 3.0 nivel 1). Mejora con simulacros.</p>
    </div>
  );
}
