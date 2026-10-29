"use client";
/** Panel global /me: resumen de todos los idiomas (activos, minutos, racha global, repasos pendientes). */
import { useEffect, useState } from "react";
import NextLink from "next/link";
import { useSettings } from "@/lib/settings";
import { LANG_META, LANGS } from "@/lib/languages/registry";
import { globalSummary, type GlobalSummary } from "@/lib/stats";
import { PageHeader, Progress } from "@/components/ui/primitives";
import { LangCard } from "./language-home";
import { formatMinutes } from "@/lib/utils";

export function GlobalPanel() {
  const settings = useSettings((s) => s.settings);
  const loaded = useSettings((s) => s.loaded);
  const [sum, setSum] = useState<GlobalSummary | null>(null);
  useEffect(() => {
    if (loaded) void globalSummary(LANGS).then(setSum);
  }, [loaded]);
  const active = settings.activeLangs;
  const others = LANGS.filter((l) => !active.includes(l));
  const goal = settings.dailyGoalMinutes;
  const due = sum ? active.reduce((n, l) => n + (sum.perLang[l]?.due ?? 0), 0) : 0;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Mis idiomas" zh="学 · 学 · 학" subtitle="Resumen de todo lo que estudias. Cada idioma guarda su propio progreso." />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Box label="Idiomas activos" value={String(active.length)} />
        <Box label="Hoy" value={sum ? `${sum.minutesToday} / ${goal} min` : "…"} />
        <Box label="Racha global" value={sum ? `${sum.streak} días` : "…"} />
        <Box label="Tiempo total" value={sum ? formatMinutes(sum.minutesTotal) : "…"} />
      </div>
      {sum ? <Progress value={Math.min(100, (sum.minutesToday / Math.max(1, goal)) * 100)} className="mt-3 h-1.5" label="Objetivo total de hoy" /> : null}

      <h2 className="mt-8 font-serif-es text-xl text-ink">Repasos pendientes {sum ? <span className="text-ink-faint tabular">· {due}</span> : null}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {active.map((l) => (
          <LangCard key={l} lang={l} stats={sum?.perLang[l]} primary />
        ))}
      </div>
      {sum ? (
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-faint">
              <th className="py-1 font-normal">Idioma</th>
              <th className="py-1 font-normal">Repasos hoy</th>
              <th className="py-1 font-normal">Palabras conocidas</th>
              <th className="py-1 font-normal">Minutos (7 días)</th>
              <th className="py-1 font-normal">Racha</th>
            </tr>
          </thead>
          <tbody>
            {active.map((l) => {
              const p = sum.perLang[l];
              return (
                <tr key={l} className="border-t border-line tabular">
                  <td className="py-1.5">
                    <NextLink href={`/${l}/flashcards/repasar`} className="hover:underline">
                      <span lang={LANG_META[l].bcp47}>{LANG_META[l].names.native}</span> · {LANG_META[l].names.es}
                    </NextLink>
                  </td>
                  <td>{p?.due ?? 0}</td>
                  <td>
                    {p?.wordsKnown ?? 0} / {p?.wordsTotal ?? 0}
                  </td>
                  <td>{p?.minutesWeek ?? 0}</td>
                  <td>{p?.streak ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : null}
      {others.length ? (
        <div className="mt-8">
          <p className="text-xs uppercase tracking-wide text-ink-faint">Añadir otro idioma</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            {others.map((l) => (
              <LangCard key={l} lang={l} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-paper p-3">
      <p className="text-xs text-ink-faint">{label}</p>
      <p className="font-serif-es text-xl text-ink tabular">{value}</p>
    </div>
  );
}
