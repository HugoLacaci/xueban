"use client";
import { useId, useMemo } from "react";
import { seededRandom } from "@/lib/utils";
import { cn } from "@/lib/utils";

export type DayPhase = "dawn" | "day" | "dusk" | "night";

export function dayPhase(d = new Date()): DayPhase {
  const h = d.getHours();
  if (h >= 5 && h < 9) return "dawn";
  if (h >= 9 && h < 18) return "day";
  if (h >= 18 && h < 21) return "dusk";
  return "night";
}

const SKY: Record<DayPhase, { top: string; bottom: string; ink: number; sun?: string }> = {
  dawn: { top: "rgb(var(--cinnabar) / 0.10)", bottom: "rgb(var(--paper) / 0)", ink: 0.75, sun: "rgb(var(--cinnabar) / 0.55)" },
  day: { top: "rgb(var(--indigo) / 0.06)", bottom: "rgb(var(--paper) / 0)", ink: 0.85 },
  dusk: { top: "rgb(var(--gold) / 0.12)", bottom: "rgb(var(--cinnabar) / 0.04)", ink: 0.8, sun: "rgb(var(--gold) / 0.6)" },
  night: { top: "rgb(var(--indigo) / 0.18)", bottom: "rgb(var(--paper) / 0)", ink: 0.9, sun: "rgb(var(--paper-raised) / 0.9)" },
};

/** Genera una cadena montañosa como path SVG (0–100 de ancho). */
function ridge(rng: () => number, baseY: number, amp: number, peaks: number, width = 100): string {
  const pts: [number, number][] = [];
  const step = width / peaks;
  for (let i = 0; i <= peaks; i++) {
    const x = i * step + (i > 0 && i < peaks ? (rng() - 0.5) * step * 0.4 : 0);
    const y = baseY - rng() * amp - (i % 2 === 0 ? amp * 0.25 : 0);
    pts.push([x, y]);
  }
  let d = `M -5 110 L -5 ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const cx = (x1 + x2) / 2;
    const jag = (rng() - 0.5) * amp * 0.6;
    d += ` Q ${cx} ${Math.min(y1, y2) - Math.abs(jag)} ${x2} ${y2}`;
  }
  d += ` L 105 ${pts[pts.length - 1][1]} L 105 110 Z`;
  return d;
}

/**
 * 山水 — paisaje de montañas a tinta diluida, procedural y determinista (semilla), con niebla.
 * `phase` cambia el cielo y añade sol (amanecer/atardecer) o luna (noche).
 */
export function ShanShui({ seed = 7, phase, className, height = 200, layers = 4, parallax, children }: { seed?: number; phase?: DayPhase; className?: string; height?: number; layers?: number; parallax?: boolean; children?: React.ReactNode }) {
  const id = useId().replace(/:/g, "");
  const ph = phase ?? "day";
  const sky = SKY[ph];
  const paths = useMemo(() => {
    const rng = seededRandom(seed);
    return Array.from({ length: layers }, (_, i) => ({
      d: ridge(rng, 92 - i * 14, 18 + i * 6, 4 + i),
      opacity: (0.16 + i * 0.16) * sky.ink,
    }));
  }, [seed, layers, sky.ink]);
  return (
    <div className={cn("relative w-full overflow-hidden", className)} style={{ height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={sky.top} />
            <stop offset="1" stopColor={sky.bottom} />
          </linearGradient>
          <linearGradient id={`mist-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgb(var(--paper))" stopOpacity="0" />
            <stop offset="1" stopColor="rgb(var(--paper))" stopOpacity="1" />
          </linearGradient>
          <filter id={`wash-${id}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.02 0.08" numOctaves="2" seed={seed} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="1.5" />
          </filter>
        </defs>
        <rect width="100" height="100" fill={`url(#sky-${id})`} />
        {sky.sun ? <circle cx={ph === "night" ? 78 : ph === "dawn" ? 22 : 76} cy={ph === "night" ? 20 : 30} r={ph === "night" ? 5 : 6.5} fill={sky.sun} /> : null}
        {ph === "night" ? <circle cx="76" cy="19" r="4.6" fill="rgb(var(--paper))" opacity="0.0" /> : null}
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill="rgb(var(--ink))" opacity={p.opacity} filter={`url(#wash-${id})`} className={parallax ? "shanshui-layer" : undefined} style={parallax ? { ["--depth" as string]: String(i + 1) } : undefined} />
        ))}
        {/* niebla entre capas */}
        <rect x="0" y="55" width="100" height="45" fill={`url(#mist-${id})`} opacity="0.75" />
      </svg>
      {children ? <div className="relative h-full">{children}</div> : null}
    </div>
  );
}
