"use client";
import type { DailyStat } from "@/lib/db";
import { todayKey } from "@/lib/db";
import { cn } from "@/lib/utils";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/**
 * Actividad como cuadrícula de pequeños sellos: cada día es un sello cuadrado de esquinas suaves
 * en cinco diluciones de tinta (枯墨 → 浓墨). El día de hoy lleva un contorno bermellón.
 */
export function ActivityHeatmap({ daily, weeks = 20 }: { daily: DailyStat[]; weeks?: number }) {
  const map = new Map(daily.map((d) => [d.date, d]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayK = todayKey(today);
  // empezar en lunes de hace N semanas
  const start = new Date(today);
  start.setDate(start.getDate() - weeks * 7 + 1);
  const dow = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - dow);
  const days: { key: string; minutes: number; reviews: number; month: number; dom: number }[] = [];
  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const k = todayKey(d);
    const s = map.get(k);
    days.push({ key: k, minutes: s?.minutes ?? 0, reviews: (s?.reviews ?? 0) + (s?.exercises ?? 0), month: d.getMonth(), dom: d.getDate() });
  }
  const cols: (typeof days)[] = [];
  for (let i = 0; i < days.length; i += 7) cols.push(days.slice(i, i + 7));
  const level = (m: number, r: number) => {
    const score = m + r / 4;
    if (score <= 0) return 0;
    if (score < 10) return 1;
    if (score < 25) return 2;
    if (score < 45) return 3;
    return 4;
  };
  const tiers = ["bg-paper-sunk", "bg-ink/25", "bg-ink/45", "bg-ink/68", "bg-ink"];
  const cell = 13;
  const gap = 3;
  return (
    <div className="overflow-x-auto no-scrollbar">
      <div style={{ minWidth: cols.length * (cell + gap) }}>
        {/* meses */}
        <div className="relative mb-1 h-4 text-[10px] uppercase tracking-wide text-ink-faint" aria-hidden="true">
          {cols.map((col, ci) => {
            const first = col.find((d) => d.dom <= 7);
            const prevMonth = ci > 0 ? cols[ci - 1][0].month : -1;
            return first && col[0].month !== prevMonth && ci > 0 ? (
              <span key={ci} className="absolute top-0" style={{ left: ci * (cell + gap) }}>
                {MONTHS[first.month]}
              </span>
            ) : null;
          })}
        </div>
        <div className="flex" style={{ gap }} role="img" aria-label={`Actividad de las últimas ${weeks} semanas`}>
          {cols.map((col, ci) => (
            <div key={ci} className="flex flex-col" style={{ gap }}>
              {col.map((d) => {
                const lv = level(d.minutes, d.reviews);
                // title nativo en vez de 140 tooltips de Radix: mismo dato, sin coste de render en el hilo principal
                return (
                  <div
                    key={d.key}
                    className={cn("rounded-[3px]", tiers[lv], d.key === todayK && "ring-1 ring-cinnabar ring-offset-1 ring-offset-paper-raised")}
                    style={{ width: cell, height: cell }}
                    role="img"
                    title={`${d.key}: ${Math.round(d.minutes)} min · ${d.reviews} ejercicios`}
                    aria-label={`${d.key}: ${Math.round(d.minutes)} minutos`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-ink-faint" aria-hidden="true">
          <span className="mr-1">menos</span>
          {tiers.map((t, i) => (
            <span key={i} className={cn("inline-block size-2.5 rounded-[2px]", t)} />
          ))}
          <span className="ml-1">más</span>
        </div>
      </div>
    </div>
  );
}
