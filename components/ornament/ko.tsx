"use client";
/**
 * Ornamentos del tema coreano «한지와 오방색» (papel hanji y los cinco colores): patchwork 보자기,
 * celosía de ventana 창살, filete 단청, vasija lunar 달항아리 para el progreso diario, rama de
 * 무궁화 que florece y tejados de 한옥 entre montañas. Nada de estética K-pop ni de banderas.
 */
import { useId, useMemo } from "react";
import { cn } from "@/lib/utils";

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

const OBANG = ["var(--obang-blue)", "var(--obang-red)", "var(--obang-yellow)", "var(--ink)", "var(--paper-raised)"];

/** 보자기: patchwork geométrico (rectángulos que se subdividen), muy tenue como fondo. */
export function Bojagi({ className, opacity = 0.08, seed = 4, cols = 6, rows = 4 }: { className?: string; opacity?: number; seed?: number; cols?: number; rows?: number }) {
  const rects = useMemo(() => {
    const r = rand(seed);
    const out: { x: number; y: number; w: number; h: number; c: string }[] = [];
    const split = (x: number, y: number, w: number, h: number, depth: number) => {
      if (depth > 2 || (w < 18 && h < 18) || r() < 0.3) {
        out.push({ x, y, w, h, c: OBANG[Math.floor(r() * OBANG.length)] });
        return;
      }
      if (w > h) {
        const k = w * (0.35 + r() * 0.3);
        split(x, y, k, h, depth + 1);
        split(x + k, y, w - k, h, depth + 1);
      } else {
        const k = h * (0.35 + r() * 0.3);
        split(x, y, w, k, depth + 1);
        split(x, y + k, w, h - k, depth + 1);
      }
    };
    const cw = 100 / cols;
    const ch = 100 / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) split(i * cw, j * ch, cw, ch, 0);
    return out;
  }, [seed, cols, rows]);
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={cn("pointer-events-none absolute inset-0 h-full w-full", className)} aria-hidden="true" style={{ opacity }}>
      {rects.map((q, i) => (
        <rect key={i} x={q.x} y={q.y} width={q.w} height={q.h} fill={`rgb(${q.c})`} fillOpacity={q.c.includes("paper") ? 0.4 : 0.55} stroke="rgb(var(--ink))" strokeOpacity="0.5" strokeWidth="0.25" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

/** 창살: celosía de ventana de hanok (rejilla con motivos 卍 simplificados o cuadrícula). */
export function Changsal({ className, opacity = 0.06, size = 44, variant = "grid" }: { className?: string; opacity?: number; size?: number; variant?: string }) {
  const id = useId().replace(/:/g, "");
  const s = size;
  return (
    <svg className={cn("pointer-events-none absolute inset-0 h-full w-full text-ink", className)} aria-hidden="true" style={{ opacity }}>
      <defs>
        <pattern id={id} width={s} height={s} patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1.2">
            {variant === "grid" ? (
              <>
                <rect x="1" y="1" width={s - 2} height={s - 2} />
                <path d={`M${s / 2} 1 V${s - 1} M1 ${s / 2} H${s - 1}`} />
              </>
            ) : (
              <>
                <rect x="1" y="1" width={s - 2} height={s - 2} />
                <path d={`M${s / 4} ${s / 4} H${(3 * s) / 4} V${(3 * s) / 4} H${s / 4} Z M${s / 2} 1 V${s / 4} M${s / 2} ${(3 * s) / 4} V${s - 1} M1 ${s / 2} H${s / 4} M${(3 * s) / 4} ${s / 2} H${s - 1}`} />
              </>
            )}
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/** 단청: filete fino con bandas de los cinco colores (solo como línea de separación). */
export function DancheongRule({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 6" preserveAspectRatio="none" className={cn("h-1.5 w-full", className)} aria-hidden="true">
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
        <rect key={i} x={i * 20} y="0" width="20" height="6" fill={`rgb(${OBANG[i % 4]})`} opacity={i % 4 === 3 ? 0.5 : 0.7} />
      ))}
      <rect y="2.5" width="200" height="1" fill="rgb(var(--paper-raised))" opacity="0.8" />
    </svg>
  );
}

/** 달항아리: la silueta de la vasija lunar se llena como el progreso diario (0–1). */
export function MoonJar({ progress, size = 120, className, label }: { progress: number; size?: number; className?: string; label?: string }) {
  const id = useId().replace(/:/g, "");
  const p = Math.min(1, Math.max(0, progress));
  const path = "M50 8 C40 8 38 12 38 16 C22 20 10 36 10 56 C10 80 28 96 50 96 C72 96 90 80 90 56 C90 36 78 20 62 16 C62 12 60 8 50 8 Z";
  return (
    <svg viewBox="0 0 100 104" width={size} height={size * 1.04} className={className} role="img" aria-label={label ?? `Progreso diario ${Math.round(p * 100)} %`}>
      <defs>
        <clipPath id={id}>
          <path d={path} />
        </clipPath>
      </defs>
      <path d={path} fill="rgb(var(--paper-raised))" stroke="rgb(var(--ink) / 0.55)" strokeWidth="1.6" />
      <rect x="0" y={96 - 88 * p} width="100" height={88 * p + 8} fill="rgb(var(--celadon))" opacity="0.55" clipPath={`url(#${id})`} />
      <path d="M26 40 C30 32 38 28 44 27" stroke="rgb(var(--paper-raised))" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}

/** Rama de 무궁화 (hibisco de Siria) que florece con el progreso. */
export function MugunghwaBranch({ progress, className, label, height = 170 }: { progress: number; className?: string; label?: string; height?: number }) {
  const flowers = useMemo(() => {
    const r = rand(21);
    return Array.from({ length: 24 }, () => ({ x: 30 + r() * 280, y: 40 + r() * 100, s: 7 + r() * 5, rot: r() * 72 }));
  }, []);
  const n = Math.round(Math.min(1, Math.max(0, progress)) * flowers.length);
  return (
    <svg viewBox="0 0 330 170" style={{ height }} className={cn("w-full", className)} role="img" aria-label={label ?? `Rama de mugunghwa con ${n} flores`}>
      <path d="M10 160 C 80 140, 120 110, 180 96 S 280 60, 322 50" fill="none" stroke="rgb(var(--ink))" strokeWidth="4.5" strokeLinecap="round" opacity="0.8" />
      <path d="M140 110 C 160 80, 190 70, 220 66" fill="none" stroke="rgb(var(--ink))" strokeWidth="2.2" strokeLinecap="round" opacity="0.75" />
      {flowers.slice(0, n).map((f, i) => (
        <g key={i} transform={`translate(${f.x} ${f.y}) rotate(${f.rot})`} className="motion-safe:animate-pop">
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="0" cy={-f.s * 0.6} rx={f.s * 0.5} ry={f.s * 0.65} fill="rgb(var(--paper-raised))" stroke="rgb(var(--obang-red) / 0.4)" strokeWidth="0.6" transform={`rotate(${a})`} />
          ))}
          <circle r={f.s * 0.32} fill="rgb(var(--obang-red))" opacity="0.85" />
        </g>
      ))}
      {flowers.slice(n, n + 5).map((f, i) => (
        <ellipse key={`b${i}`} cx={f.x} cy={f.y} rx="2.4" ry="3.2" fill="rgb(var(--celadon))" opacity="0.6" />
      ))}
    </svg>
  );
}

/** Tejados de 한옥 con sus aleros curvos ante montañas en capas. */
export function HanokLandscape({ className, seed = 3, height = 200, phase }: { className?: string; seed?: number; height?: number; phase?: string; layers?: number }) {
  const hills = useMemo(() => {
    const r = rand(seed);
    return [0, 1, 2].map((k) => {
      const base = 110 - k * 16;
      let d = `M0 ${base}`;
      for (let x = 0; x <= 400; x += 40) d += ` Q${x + 20} ${base - 30 - r() * 30 + k * 6} ${x + 40} ${base - r() * 10}`;
      return `${d} L400 220 L0 220 Z`;
    });
  }, [seed]);
  const night = phase === "night" || phase === "dusk";
  const roof = (x: number, y: number, w: number) => `M${x} ${y} Q${x + w * 0.08} ${y - 10} ${x + w * 0.2} ${y - 14} L${x + w * 0.8} ${y - 14} Q${x + w * 0.92} ${y - 10} ${x + w} ${y} Q${x + w / 2} ${y - 6} ${x} ${y} Z`;
  return (
    <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice" style={{ height }} className={cn("w-full", className)} aria-hidden="true">
      <circle cx="80" cy="56" r="15" fill={night ? "rgb(var(--paper-raised))" : "rgb(var(--obang-yellow))"} opacity={night ? 0.6 : 0.55} />
      {hills.map((d, i) => (
        <path key={i} d={d} fill="rgb(var(--obang-blue))" opacity={0.1 + i * 0.1} transform={`translate(0 ${i * 16})`} />
      ))}
      <g fill="rgb(var(--ink))" opacity="0.75">
        <path d={roof(210, 176, 120)} />
        <rect x="226" y="176" width="88" height="22" fill="rgb(var(--paper-raised))" stroke="rgb(var(--ink))" strokeOpacity="0.5" />
        <path d={roof(300, 186, 80)} />
        <rect x="312" y="186" width="56" height="14" fill="rgb(var(--paper-raised))" stroke="rgb(var(--ink))" strokeOpacity="0.5" />
      </g>
      <rect y="198" width="400" height="22" fill="rgb(var(--paper))" opacity="0.6" />
    </svg>
  );
}
