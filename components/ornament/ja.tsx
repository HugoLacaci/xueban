"use client";
/**
 * Ornamentos del tema japonés «和紙と藍» (washi e índigo): patrones 和柄 (seigaiha, asanoha, shippō,
 * ichimatsu, kikkō) en SVG propio y muy tenue, rama de cerezo que florece, paisaje en capas al estilo
 * ukiyo-e minimalista y camino entre montañas con torii para el mapa de unidades.
 * Nada de 旭日旗 ni clichés (geishas, samuráis).
 */
import { useId, useMemo } from "react";
import { cn } from "@/lib/utils";

type PatternVariant = "seigaiha" | "asanoha" | "shippo" | "ichimatsu" | "kikko";

/** Patrón 和柄 de fondo (absoluto, sin eventos). */
export function WagaraPattern({ className, opacity = 0.06, variant = "seigaiha", size = 40 }: { className?: string; opacity?: number; variant?: string; size?: number }) {
  const id = useId().replace(/:/g, "");
  const v = (["seigaiha", "asanoha", "shippo", "ichimatsu", "kikko"].includes(variant) ? variant : "seigaiha") as PatternVariant;
  const s = size;
  return (
    <svg className={cn("pointer-events-none absolute inset-0 h-full w-full text-indigo", className)} aria-hidden="true" style={{ opacity }}>
      <defs>
        <pattern id={id} width={s} height={v === "seigaiha" ? s / 2 : v === "kikko" ? s * 0.866 * 2 : s} patternUnits="userSpaceOnUse">
          {v === "seigaiha" ? (
            <g fill="none" stroke="currentColor" strokeWidth="1">
              {[0, 1].map((row) =>
                [0, 1, 2].map((col) => {
                  const cx = col * s - (row ? s / 2 : 0);
                  const cy = row * (s / 2) + s / 2;
                  return [0.48, 0.36, 0.24, 0.12].map((r, k) => <circle key={`${row}${col}${k}`} cx={cx} cy={cy} r={s * r} />);
                }),
              )}
            </g>
          ) : v === "asanoha" ? (
            <g fill="none" stroke="currentColor" strokeWidth="0.8">
              <path d={`M0 0 L${s} ${s} M${s} 0 L0 ${s} M${s / 2} 0 L${s / 2} ${s} M0 ${s / 2} L${s} ${s / 2}`} />
              <path d={`M${s / 2} ${s / 2} L0 ${s / 4} M${s / 2} ${s / 2} L${s} ${s / 4} M${s / 2} ${s / 2} L0 ${(3 * s) / 4} M${s / 2} ${s / 2} L${s} ${(3 * s) / 4}`} />
            </g>
          ) : v === "shippo" ? (
            <g fill="none" stroke="currentColor" strokeWidth="0.9">
              <circle cx="0" cy="0" r={s / 2} />
              <circle cx={s} cy="0" r={s / 2} />
              <circle cx="0" cy={s} r={s / 2} />
              <circle cx={s} cy={s} r={s / 2} />
              <circle cx={s / 2} cy={s / 2} r={s / 2} />
            </g>
          ) : v === "ichimatsu" ? (
            <g fill="currentColor">
              <rect width={s / 2} height={s / 2} />
              <rect x={s / 2} y={s / 2} width={s / 2} height={s / 2} />
            </g>
          ) : (
            <g fill="none" stroke="currentColor" strokeWidth="0.9">
              <polygon points={`${s / 4},0 ${(3 * s) / 4},0 ${s},${s * 0.433} ${(3 * s) / 4},${s * 0.866} ${s / 4},${s * 0.866} 0,${s * 0.433}`} />
            </g>
          )}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

function rand(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rama de cerezo (桜) que florece con el progreso (0–1). Pétalos de cinco lóbulos en rosa sakura. */
export function SakuraBranch({ progress, className, label, height = 170, autumn }: { progress: number; className?: string; label?: string; height?: number; autumn?: boolean }) {
  const flowers = useMemo(() => {
    const r = rand(11);
    const pts: { x: number; y: number; s: number; rot: number }[] = [];
    const along = (t: number, path: [number, number][]) => {
      const i = Math.min(path.length - 2, Math.floor(t * (path.length - 1)));
      const f = t * (path.length - 1) - i;
      return [path[i][0] + (path[i + 1][0] - path[i][0]) * f, path[i][1] + (path[i + 1][1] - path[i][1]) * f];
    };
    const main: [number, number][] = [
      [8, 150],
      [90, 112],
      [170, 88],
      [250, 54],
      [320, 40],
    ];
    const twig: [number, number][] = [
      [150, 94],
      [190, 120],
      [240, 128],
    ];
    for (let k = 0; k < 40; k++) {
      const onTwig = k % 3 === 2;
      const [x, y] = along(0.15 + r() * 0.85, onTwig ? twig : main);
      pts.push({ x: x + (r() - 0.5) * 26, y: y + (r() - 0.5) * 22, s: 5 + r() * 4, rot: r() * 72 });
    }
    return pts;
  }, []);
  const n = Math.round(Math.min(1, Math.max(0, progress)) * flowers.length);
  const petal = autumn ? "rgb(var(--shu))" : "rgb(var(--sakura))";
  return (
    <svg viewBox="0 0 330 170" style={{ height }} className={cn("w-full", className)} role="img" aria-label={label ?? `Rama de cerezo con ${n} flores`}>
      <path d="M8 150 C 70 125, 110 108, 170 88 S 270 50, 322 40" fill="none" stroke="rgb(var(--ink))" strokeWidth="5" strokeLinecap="round" opacity="0.82" />
      <path d="M150 94 C 175 110, 205 124, 240 128" fill="none" stroke="rgb(var(--ink))" strokeWidth="2.6" strokeLinecap="round" opacity="0.78" />
      {flowers.slice(0, n).map((f, i) => (
        <g key={i} transform={`translate(${f.x} ${f.y}) rotate(${f.rot})`} className="motion-safe:animate-pop">
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="0" cy={-f.s * 0.62} rx={f.s * 0.42} ry={f.s * 0.62} fill={petal} opacity="0.9" transform={`rotate(${a})`} />
          ))}
          <circle r={f.s * 0.22} fill="rgb(var(--shu))" opacity="0.8" />
        </g>
      ))}
      {flowers.slice(n, n + 6).map((f, i) => (
        <circle key={`b${i}`} cx={f.x} cy={f.y} r="2.2" fill="rgb(var(--ink))" opacity="0.35" />
      ))}
    </svg>
  );
}

/** Paisaje en capas al estilo ukiyo-e minimalista: montañas planas en índigo, niebla y sol 朱 pequeño (no sol naciente con rayos). */
export function UkiyoeLandscape({ className, seed = 5, height = 200, phase }: { className?: string; seed?: number; height?: number; phase?: string; layers?: number }) {
  const layers = useMemo(() => {
    const r = rand(seed);
    return [0, 1, 2, 3].map((k) => {
      const base = 120 - k * 18 + r() * 8;
      let d = `M0 ${base}`;
      for (let x = 0; x <= 400; x += 25) d += ` L${x} ${base - Math.sin((x / 400) * Math.PI * (1.2 + k * 0.4) + r() * 2) * (30 - k * 4) - r() * 8}`;
      return `${d} L400 220 L0 220 Z`;
    });
  }, [seed]);
  const night = phase === "night" || phase === "dusk";
  return (
    <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice" style={{ height }} className={cn("w-full", className)} aria-hidden="true">
      <circle cx="300" cy="60" r="16" fill={night ? "rgb(var(--paper-raised))" : "rgb(var(--shu))"} opacity={night ? 0.6 : 0.75} />
      {layers.map((d, i) => (
        <path key={i} d={d} fill="rgb(var(--indigo))" opacity={0.1 + i * 0.12} transform={`translate(0 ${i * 14})`} />
      ))}
      <rect y="150" width="400" height="16" fill="rgb(var(--paper))" opacity="0.5" />
    </svg>
  );
}

/** Torii minimalista (solo en el mapa de unidades, como hito del camino). */
export function Torii({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 40 36" width={size} height={(size * 36) / 40} className={className} aria-hidden="true">
      <path d="M2 6 Q20 1 38 6 L37 9 Q20 5 3 9 Z" fill="rgb(var(--shu))" />
      <rect x="6" y="13" width="28" height="3" fill="rgb(var(--shu))" />
      <rect x="9" y="8" width="3" height="28" fill="rgb(var(--shu))" />
      <rect x="28" y="8" width="3" height="28" fill="rgb(var(--shu))" />
    </svg>
  );
}
