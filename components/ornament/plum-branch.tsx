"use client";
import { useMemo } from "react";
import { seededRandom } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  w: number;
}
interface Bud {
  x: number;
  y: number;
  r: number;
  rot: number;
}

/**
 * 梅花 — rama de ciruelo a tinta, procedural y determinista. Florece una flor bermellón por cada
 * `perFlower` palabras dominadas (`count`). Los capullos restantes se dibujan en tinta tenue.
 */
export function PlumBranch({ count, perFlower = 10, maxFlowers = 40, seed = 3, className, height = 150, label, caption = true }: { count: number; perFlower?: number; maxFlowers?: number; seed?: number; className?: string; height?: number; label?: string; caption?: boolean }) {
  const flowers = Math.min(maxFlowers, Math.floor(count / perFlower));
  const { segments, buds } = useMemo(() => {
    const rng = seededRandom(seed);
    const segs: Segment[] = [];
    const budsOut: Bud[] = [];
    const grow = (x: number, y: number, angle: number, len: number, w: number, depth: number) => {
      if (depth > 4 || len < 6) return;
      const x2 = x + Math.cos(angle) * len;
      const y2 = y + Math.sin(angle) * len;
      segs.push({ x1: x, y1: y, x2, y2, w });
      // capullos a lo largo de la rama
      const n = Math.floor(len / 14);
      for (let i = 1; i <= n; i++) {
        const t = i / (n + 1) + (rng() - 0.5) * 0.1;
        budsOut.push({ x: x + (x2 - x) * t + (rng() - 0.5) * 6, y: y + (y2 - y) * t + (rng() - 0.5) * 6, r: 3.2 + rng() * 1.6, rot: rng() * 360 });
      }
      const branches = depth < 2 ? 2 : rng() < 0.6 ? 2 : 1;
      for (let b = 0; b < branches; b++) {
        const da = (rng() - 0.5) * 1.3 + (b === 0 ? -0.25 : 0.35);
        grow(x2, y2, angle + da, len * (0.62 + rng() * 0.2), w * 0.62, depth + 1);
      }
    };
    grow(8, 150, -0.55, 70, 7, 0);
    budsOut.sort((a, b) => a.x - b.x);
    return { segments: segs, buds: budsOut.slice(0, maxFlowers) };
  }, [seed, maxFlowers]);
  const next = perFlower - (count % perFlower);
  return (
    <figure className={cn("relative w-full", className)}>
      <svg viewBox="0 0 320 160" className="h-auto w-full" style={{ maxHeight: height }} role="img" aria-label={label ?? `${flowers} flores: ${count} palabras dominadas`}>
        <g stroke="rgb(var(--ink))" strokeLinecap="round" fill="none" opacity="0.85">
          {segments.map((s, i) => (
            <path key={i} d={`M${s.x1} ${s.y1} Q${(s.x1 + s.x2) / 2 + 4} ${(s.y1 + s.y2) / 2 - 3} ${s.x2} ${s.y2}`} strokeWidth={s.w} />
          ))}
        </g>
        {buds.map((b, i) => {
          const bloom = i < flowers;
          return (
            <g key={i} transform={`translate(${b.x} ${b.y}) rotate(${b.rot})`}>
              {bloom ? (
                <g fill="rgb(var(--cinnabar))" opacity="0.92">
                  {[0, 72, 144, 216, 288].map((a) => (
                    <ellipse key={a} cx={0} cy={-b.r * 0.9} rx={b.r * 0.62} ry={b.r * 0.95} transform={`rotate(${a})`} />
                  ))}
                  <circle r={b.r * 0.35} fill="rgb(var(--gold))" />
                </g>
              ) : (
                <circle r={b.r * 0.55} fill="rgb(var(--ink))" opacity="0.22" />
              )}
            </g>
          );
        })}
      </svg>
      {caption ? (
      <figcaption className="mt-1 text-xs text-ink-faint">
        {flowers} {flowers === 1 ? "flor" : "flores"} · una por cada {perFlower} palabras dominadas · {next === perFlower ? "¡acabas de florecer!" : `${next} más para la siguiente`}
      </figcaption>
      ) : null}
    </figure>
  );
}
