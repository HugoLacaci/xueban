"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowRight } from "lucide-react";
import { db, type Skill } from "@/lib/db";
import { reviewForecast, todaySummary, type TodaySummary } from "@/lib/stats";
import { getHsk, loadHsk } from "@/lib/dictionary/service";
import { EXERCISE_LABELS, type ExerciseType } from "@/lib/exercises/types";
import { useSettings } from "@/lib/settings";
import { formatMinutes } from "@/lib/utils";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";
import { InkDivider, Lantern, Seal } from "@/components/ornament";
import { ActivityHeatmap } from "@/components/today/heatmap";
import { ChineseText } from "@/components/zh/chinese-text";
import { cn } from "@/lib/utils";

const SKILL_LABEL: Record<Skill, string> = { listening: "Escuchar", reading: "Leer", writing: "Escribir", speaking: "Hablar", tones: "Tonos", vocabulary: "Vocabulario", grammar: "Gramática", characters: "Caracteres" };
const SKILL_ZH: Record<Skill, string> = { listening: "听", reading: "读", writing: "写", speaking: "说", tones: "调", vocabulary: "词", grammar: "法", characters: "字" };

export function ProgressPage() {
  const settings = useSettings((s) => s.settings);
  const [sum, setSum] = useState<TodaySummary | null>(null);
  const [forecast, setForecast] = useState<{ date: string; count: number }[]>([]);
  const [hskReady, setHskReady] = useState(false);
  const attemptsRaw = useLiveQuery(() => db.exerciseAttempts.toArray(), []);
  const wordsRaw = useLiveQuery(() => db.words.toArray(), []);
  const cardsRaw = useLiveQuery(() => db.cards.toArray(), []);
  const sessionsRaw = useLiveQuery(() => db.studySessions.toArray(), []);
  const attempts = useMemo(() => attemptsRaw ?? [], [attemptsRaw]);
  const words = useMemo(() => wordsRaw ?? [], [wordsRaw]);
  const cards = useMemo(() => cardsRaw ?? [], [cardsRaw]);
  const sessions = useMemo(() => sessionsRaw ?? [], [sessionsRaw]);
  const lessons = useLiveQuery(() => db.lessonProgress.where("status").equals("completed").count(), []) ?? 0;
  const tick = useLiveQuery(() => Promise.all([db.dailyStats.count(), db.reviewLogs.count()]), []);

  useEffect(() => {
    void todaySummary().then(setSum);
    void reviewForecast(30).then(setForecast);
  }, [tick]);
  useEffect(() => {
    void loadHsk().then(() => setHskReady(true));
  }, []);

  const knownWordIds = useMemo(() => {
    const s = new Set<string>();
    for (const c of cards) if ((c.state === 2 && c.stability >= 1) || c.ankiState === "review") s.add(c.wordId);
    return s;
  }, [cards]);
  const knownHanzi = useMemo(() => new Set(words.filter((w) => knownWordIds.has(w.id)).map((w) => w.hanzi)), [words, knownWordIds]);

  // conocidas por nivel HSK (3.0 y 2.0)
  const byLevel = useMemo(() => {
    const h = hskReady ? getHsk() : undefined;
    if (!h) return [];
    const key = settings.hskList === "2.0" ? "2.0" : "3.0";
    return Object.entries(h.words[key])
      .map(([lv, list]) => ({ level: Number(lv), total: list.length, known: list.filter((w) => knownHanzi.has(w)).length, inDeck: list.filter((w) => words.some((x) => x.hanzi === w)).length }))
      .filter((x) => x.level <= 4)
      .sort((a, b) => a.level - b.level);
  }, [hskReady, settings.hskList, knownHanzi, words]);
  const charsByLevel = useMemo(() => {
    const h = hskReady ? getHsk() : undefined;
    if (!h) return [];
    const knownChars = new Set<string>();
    for (const w of knownHanzi) for (const c of w) knownChars.add(c);
    const key = settings.hskList === "2.0" ? "2.0" : "3.0";
    return Object.entries(h.chars[key])
      .map(([lv, list]) => ({ level: Number(lv), total: list.length, known: list.filter((c) => knownChars.has(c)).length }))
      .filter((x) => x.level <= 3)
      .sort((a, b) => a.level - b.level);
  }, [hskReady, settings.hskList, knownHanzi]);

  // precisión por tipo y destreza
  const byType = useMemo(() => group(attempts, (a) => a.exerciseType), [attempts]);
  const bySkill = useMemo(() => group(attempts, (a) => a.skill), [attempts]);
  const weakWords = useMemo(() => {
    const m = new Map<string, { n: number; fails: number }>();
    for (const a of attempts) {
      if (a.itemKind !== "word" && a.itemKind !== "character") continue;
      const cur = m.get(a.itemId) ?? { n: 0, fails: 0 };
      cur.n++;
      if (!a.correct) cur.fails++;
      m.set(a.itemId, cur);
    }
    const lapses = new Map<string, number>();
    for (const c of cards) lapses.set(c.wordId, (lapses.get(c.wordId) ?? 0) + c.lapses);
    return Array.from(m.entries())
      .map(([id, v]) => ({ id, ...v, lapses: lapses.get(id) ?? 0, word: words.find((w) => w.id === id || w.hanzi === id) }))
      .filter((x) => x.fails + x.lapses > 0)
      .sort((a, b) => b.fails + b.lapses - (a.fails + a.lapses))
      .slice(0, 12);
  }, [attempts, cards, words]);
  const toneConfusion = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of attempts) {
      if (a.exerciseType !== "tone-choice" || a.correct || !a.answer || !a.expected) continue;
      const got = a.answer.split("");
      const want = a.expected.match(/[1-5]\.?/g)?.map((x) => x[0]) ?? [];
      got.forEach((g, i) => {
        if (want[i] && g !== want[i]) m.set(`${want[i]}→${g}`, (m.get(`${want[i]}→${g}`) ?? 0) + 1);
      });
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [attempts]);
  const totalMinutes = sessions.reduce((a, s) => a + s.minutes, 0);
  const minutesByKind = useMemo(() => group(sessions, (s) => s.kind, (s) => s.minutes), [sessions]);
  const streak = sum?.streak ?? 0;

  const achievements: { ok: boolean; seal: string; label: string; hint: string }[] = [
    { ok: knownWordIds.size >= 10, seal: "十", label: "10 palabras conocidas", hint: `${Math.min(10, knownWordIds.size)} / 10` },
    { ok: knownWordIds.size >= 100, seal: "百", label: "100 palabras conocidas", hint: `${Math.min(100, knownWordIds.size)} / 100` },
    { ok: knownWordIds.size >= 300, seal: "一级", label: "HSK 1 completo (300)", hint: `${Math.min(300, knownWordIds.size)} / 300` },
    { ok: streak >= 7, seal: "七日", label: "7 días seguidos", hint: `${Math.min(7, streak)} / 7` },
    { ok: streak >= 30, seal: "月", label: "30 días seguidos", hint: `${Math.min(30, streak)} / 30` },
    { ok: lessons >= 5, seal: "五课", label: "5 lecciones", hint: `${Math.min(5, lessons)} / 5` },
    { ok: lessons >= 30, seal: "卅课", label: "30 lecciones", hint: `${Math.min(30, lessons)} / 30` },
    { ok: totalMinutes >= 600, seal: "十时", label: "10 horas de estudio", hint: formatMinutes(Math.min(600, totalMinutes)) },
    { ok: attempts.length >= 500, seal: "五百", label: "500 ejercicios", hint: `${Math.min(500, attempts.length)} / 500` },
  ];
  const earned = achievements.filter((a) => a.ok).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Progreso" zh="进步" subtitle="Lo que importa: palabras y caracteres conocidos, precisión por destreza, puntos débiles, tiempo de input y previsión de repasos." />

      {/* ---- Informe: cuatro cifras ---- */}
      <section className="card-paper grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x" aria-label="Resumen">
        <Stat zh="词" label="Palabras conocidas" value={knownWordIds.size} hint={`${words.length} en el mazo`} />
        <Stat zh="字" label="Caracteres" value={sum?.charsKnown ?? 0} hint="reconocidos" />
        <Stat zh="日" label="Racha" value={streak} unit="días" hint={`${lessons} lecciones completadas`} lanterns />
        <Stat zh="时" label="Tiempo total" value={formatMinutes(totalMinutes)} hint={`${formatMinutes(sum?.minutesWeek ?? 0)} esta semana`} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ---- HSK: aguadas de tinta ---- */}
        <Card>
          <ReportTitle zh="级">Vocabulario por nivel HSK {settings.hskList === "2.0" ? "2.0" : "3.0"}</ReportTitle>
          {byLevel.length ? (
            <ul className="space-y-3.5">
              {byLevel.map((l) => (
                <li key={l.level}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium text-ink">Nivel {l.level}</span>
                    <span className="tabular text-xs text-ink-faint">
                      <strong className="font-semibold text-celadon-ink">{l.known}</strong> conocidas · {l.inDeck} en el mazo · {l.total}
                    </span>
                  </div>
                  <InkWash known={l.known / l.total} deck={l.inDeck / l.total} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-faint">Cargando listas HSK…</p>
          )}
          <p className="mt-3 flex items-center gap-3 text-[11px] text-ink-faint">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-4 rounded-sm bg-celadon" /> conocidas
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-4 rounded-sm bg-gold/45" /> en el mazo
            </span>
          </p>
          <InkDivider label="字" className="my-4" />
          <ul className="space-y-2.5">
            {charsByLevel.map((l) => (
              <li key={l.level}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-ink-soft">Caracteres · nivel {l.level}</span>
                  <span className="tabular text-xs text-ink-faint">
                    {l.known} / {l.total}
                  </span>
                </div>
                <InkWash known={l.known / l.total} thin />
              </li>
            ))}
          </ul>
        </Card>

        {/* ---- Precisión por destreza ---- */}
        <Card>
          <ReportTitle zh="能">Precisión por destreza</ReportTitle>
          {bySkill.length ? (
            <ul className="space-y-2.5">
              {bySkill.map((s) => {
                const tone = s.pct >= 80 ? "good" : s.pct >= 60 ? "mid" : "low";
                return (
                  <li key={s.key} className="flex items-center gap-3">
                    <span lang="zh-CN" className="zh-serif w-6 text-center text-lg leading-none text-ink-soft" aria-hidden="true">
                      {SKILL_ZH[s.key as Skill] ?? ""}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between text-sm">
                        <span className="text-ink">{SKILL_LABEL[s.key as Skill] ?? s.key}</span>
                        <span className={cn("tabular font-semibold", tone === "good" ? "text-celadon-ink" : tone === "mid" ? "text-gold-ink" : "text-danger")}>
                          {s.pct} % <span className="font-normal text-ink-faint">({s.n})</span>
                        </span>
                      </span>
                      <InkWash known={s.pct / 100} thin color={tone === "good" ? "rgb(var(--celadon))" : tone === "mid" ? "rgb(var(--gold))" : "rgb(var(--danger))"} />
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-ink-faint">Haz algunos ejercicios para ver tu precisión.</p>
          )}
          {byType.length ? (
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer text-ink-faint hover:text-ink">Por tipo de ejercicio</summary>
              <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
                {byType.map((t) => (
                  <li key={t.key} className="flex justify-between border-b border-dotted border-line py-0.5">
                    <span className="text-ink-soft">{EXERCISE_LABELS[t.key as ExerciseType] ?? t.key}</span>
                    <span className="tabular text-ink-faint">
                      {t.pct} % · {t.n}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </Card>

        {/* ---- Puntos débiles: papelitos ---- */}
        <Card>
          <ReportTitle zh="弱">Mis puntos débiles</ReportTitle>
          {weakWords.length ? (
            <ul className="flex flex-wrap gap-2">
              {weakWords.map((w, i) => (
                <li key={w.id}>
                  <Link
                    href={w.word ? `/flashcards/${encodeURIComponent(w.word.id)}` : `/diccionario?q=${encodeURIComponent(w.id)}`}
                    className="relative flex items-center gap-2 rounded-[6px] border border-line bg-paper-raised py-1.5 pl-3 pr-2 shadow-[var(--shadow-paper)] transition-transform duration-[var(--dur-ui)] ease-[var(--ease-ink)] hover:-translate-y-0.5"
                    style={{ transform: `rotate(${((i % 3) - 1) * 0.6}deg)` }}
                  >
                    <span className="absolute inset-y-1 left-0 w-[2px] rounded-r bg-cinnabar/70" aria-hidden="true" />
                    <ChineseText text={w.word?.hanzi ?? w.id} size="md" ruby={false} interactive={false} markUnknown={false} />
                    <span className="max-w-28 truncate text-xs text-ink-faint">{w.word?.meaning}</span>
                    <span className="tabular rounded-full bg-paper-sunk px-1.5 text-[11px] font-medium text-ink-soft">{w.fails + w.lapses}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-faint">Todavía no hay fallos registrados. 没关系 — llegarán, y ahí es donde se aprende.</p>
          )}
          {toneConfusion.length ? (
            <div className="mt-4">
              <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint">Tonos que confundes (correcto → elegido)</h3>
              <div className="flex flex-wrap gap-1.5">
                {toneConfusion.map(([k, n]) => (
                  <Badge key={k} variant="outline" className="tabular">
                    {k.replace("→", " → ")} ×{n}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-4">
            <Link href="/practicar?mode=mistakes" className="inline-flex items-center gap-1 text-sm font-medium text-indigo underline-offset-4 hover:underline">
              Practicar mis errores <ArrowRight className="size-4" />
            </Link>
          </div>
        </Card>

        {/* ---- Previsión ---- */}
        <Card>
          <ReportTitle zh="预">Previsión de repasos (30 días)</ReportTitle>
          <ForecastBars data={forecast} />
          <InkDivider label="时" className="my-4" />
          <ul className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {minutesByKind.map((k) => (
              <li key={k.key} className="flex justify-between border-b border-dotted border-line py-0.5">
                <span className="text-ink-soft">{KIND_LABEL[k.key] ?? k.key}</span>
                <span className="tabular text-ink-faint">{formatMinutes(k.sum)}</span>
              </li>
            ))}
            {!minutesByKind.length ? <li className="text-ink-faint">Sin sesiones registradas aún.</li> : null}
          </ul>
        </Card>
      </div>

      <Card>
        <ReportTitle zh="历">Actividad</ReportTitle>
        <ActivityHeatmap daily={sum?.daily ?? []} weeks={26} />
      </Card>

      {/* ---- Álbum de sellos ---- */}
      <Card className="relative overflow-hidden">
        <ReportTitle zh="章" action={<span className="tabular text-xs text-ink-faint">{earned} / {achievements.length}</span>}>
          Álbum de sellos
        </ReportTitle>
        <ul className="grid grid-cols-3 gap-x-2 gap-y-5 sm:grid-cols-5 lg:grid-cols-9">
          {achievements.map((a, i) => (
            <li key={a.label} className="flex flex-col items-center gap-2 text-center">
              {a.ok ? (
                <Seal text={a.seal} size={60} rotate={((i * 7) % 9) - 4} title={`Logro conseguido: ${a.label}`} />
              ) : (
                <GhostSeal text={a.seal} title={`Pendiente: ${a.label}`} />
              )}
              <span className={cn("text-[11px] leading-tight", a.ok ? "font-medium text-ink" : "text-ink-faint")}>{a.label}</span>
              {!a.ok ? <span className="tabular -mt-1 text-[10px] text-ink-faint/80">{a.hint}</span> : null}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

const KIND_LABEL: Record<string, string> = { review: "Repasos", lesson: "Lecciones", practice: "Práctica", video: "Vídeos", reading: "Lectura", pomodoro: "Pomodoro", other: "Otro" };

function group<T>(items: T[], key: (t: T) => string, value?: (t: T) => number): { key: string; n: number; pct: number; sum: number }[] {
  const m = new Map<string, { n: number; ok: number; sum: number }>();
  for (const it of items) {
    const k = key(it);
    const cur = m.get(k) ?? { n: 0, ok: 0, sum: 0 };
    cur.n++;
    if ((it as { correct?: boolean }).correct) cur.ok++;
    cur.sum += value ? value(it) : 0;
    m.set(k, cur);
  }
  return Array.from(m.entries())
    .map(([k, v]) => ({ key: k, n: v.n, pct: Math.round((v.ok / v.n) * 100), sum: v.sum }))
    .sort((a, b) => b.n - a.n);
}

/** Título de sección del informe: carácter en 宋体 como marca + título editorial. */
function ReportTitle({ zh, children, action }: { zh: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 font-serif-es text-lg font-semibold tracking-tight text-ink">
        <span lang="zh-CN" className="zh-serif text-base leading-none text-cinnabar" aria-hidden="true">
          {zh}
        </span>
        {children}
      </h2>
      {action}
    </div>
  );
}

function Stat({ zh, label, value, unit, hint, lanterns }: { zh: string; label: string; value: number | string; unit?: string; hint?: string; lanterns?: boolean }) {
  const n = typeof value === "number" ? value : 0;
  return (
    <div className="flex items-start gap-3 p-4 sm:p-5">
      <span lang="zh-CN" className="zh-serif mt-0.5 text-2xl leading-none text-ink/70" aria-hidden="true">
        {zh}
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] uppercase tracking-[0.12em] text-ink-faint">{label}</span>
        <span className="tabular block font-serif-es text-[28px] font-semibold leading-none tracking-tight text-ink">
          {value}
          {unit ? <span className="ml-1 text-sm font-normal text-ink-faint">{unit}</span> : null}
        </span>
        {lanterns ? (
          <span className="mt-1.5 flex gap-0.5" aria-hidden="true">
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <Lantern key={d} lit={n >= d} size={11} />
            ))}
          </span>
        ) : null}
        {hint ? <span className="mt-1 block text-[11px] leading-snug text-ink-faint">{hint}</span> : null}
      </span>
    </div>
  );
}

/** Barra como aguada de tinta: borde irregular suave, relleno celadón (conocido) sobre oro (en el mazo). */
function InkWash({ known, deck, thin, color = "rgb(var(--celadon))" }: { known: number; deck?: number; thin?: boolean; color?: string }) {
  return (
    <div className={cn("relative mt-1.5 w-full overflow-hidden rounded-[3px] bg-paper-sunk", thin ? "h-1.5" : "h-2.5")} role="presentation">
      {deck !== undefined ? <div className="absolute inset-y-0 left-0 rounded-r-[3px] bg-gold/45 transition-transform duration-700 ease-[var(--ease-ink)]" style={{ width: "100%", transform: `scaleX(${Math.min(1, deck)})`, transformOrigin: "left" }} /> : null}
      <div className="absolute inset-y-0 left-0 rounded-r-[3px] opacity-90 transition-transform duration-700 ease-[var(--ease-ink)]" style={{ width: "100%", background: `linear-gradient(90deg, ${color} 0%, ${color} 92%, transparent)`, transform: `scaleX(${Math.min(1, known)})`, transformOrigin: "left" }} />
    </div>
  );
}

/** Sello aún no estampado: contorno de tinta punteado con el carácter en gris. */
function GhostSeal({ text, title }: { text: string; title: string }) {
  const chars = Array.from(text);
  return (
    <span className="inline-flex size-[60px] items-center justify-center rounded-[6px] border-[1.5px] border-dashed border-ink/25 text-ink/30" role="img" aria-label={title}>
      <span lang="zh-CN" className={cn("zh-display leading-none", chars.length === 1 ? "text-3xl" : "text-base")}>
        {text}
      </span>
    </span>
  );
}

function ForecastBars({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div>
      <div className="flex h-24 items-end gap-[3px]" role="img" aria-label="Repasos previstos por día en los próximos 30 días">
        {data.map((d, i) => (
          <div key={d.date} className="group relative flex-1">
            <div className={cn("w-full rounded-t-[2px] transition-transform duration-500 ease-[var(--ease-ink)]", i === 0 ? "bg-cinnabar" : "bg-ink/55 dark:bg-ink/45")} style={{ height: `${Math.max(2, (d.count / max) * 88)}px` }} />
            <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink px-1.5 py-0.5 text-[10px] text-paper group-hover:block">
              {d.date.slice(5)}: {d.count}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-ink-faint">
        <span>hoy</span>
        <span>+30 días</span>
      </div>
    </div>
  );
}
