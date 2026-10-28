"use client";
import { cn } from "@/lib/utils";

/** Numerales chinos para los nodos del mapa (0–20). */
const NUM = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
export function zhNumeral(n: number): string {
  if (n <= 10) return NUM[n];
  if (n < 20) return `十${NUM[n - 10]}`;
  return `二十${n > 20 ? NUM[n - 20] : ""}`;
}

/** 亭 — pabellón a tinta (un solo trazo), para la cima del mapa y los hitos. */
export function Pavilion({ size = 56, className, tone = "ink" }: { size?: number; className?: string; tone?: "ink" | "faint" | "cinnabar" }) {
  const color = tone === "cinnabar" ? "rgb(var(--cinnabar))" : tone === "faint" ? "rgb(var(--ink-faint))" : "rgb(var(--ink))";
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={cn("block", className)} aria-hidden="true">
      <g fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {/* remate */}
        <path d="M32 6 v6" />
        {/* tejado curvo */}
        <path d="M6 30 C 16 26, 24 18, 32 12 C 40 18, 48 26, 58 30" />
        <path d="M10 30 C 18 29, 26 27, 32 22 C 38 27, 46 29, 54 30" strokeWidth="1.4" opacity="0.6" />
        {/* aleros levantados */}
        <path d="M6 30 c -2 -2 -3 -5 -2 -8" />
        <path d="M58 30 c 2 -2 3 -5 2 -8" />
        {/* columnas */}
        <path d="M16 31 v22 M48 31 v22 M32 31 v22" />
        {/* barandilla */}
        <path d="M12 44 h40" strokeWidth="1.6" />
        {/* base */}
        <path d="M8 54 h48" />
      </g>
    </svg>
  );
}

/** 牌坊 — pórtico/arco conmemorativo para los checkpoints. */
export function Paifang({ size = 56, className, tone = "ink" }: { size?: number; className?: string; tone?: "ink" | "faint" | "cinnabar" | "gold" }) {
  const color = tone === "cinnabar" ? "rgb(var(--cinnabar))" : tone === "gold" ? "rgb(var(--gold-ink))" : tone === "faint" ? "rgb(var(--ink-faint))" : "rgb(var(--ink))";
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={cn("block", className)} aria-hidden="true">
      <g fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {/* tejado superior */}
        <path d="M14 18 C 20 16, 26 13, 32 10 C 38 13, 44 16, 50 18" />
        <path d="M14 18 c -1.5 -1.5 -2 -4 -1 -6 M50 18 c 1.5 -1.5 2 -4 1 -6" />
        {/* dintel con la placa */}
        <path d="M10 26 h44" />
        <rect x="24" y="19" width="16" height="7" rx="1" strokeWidth="1.4" />
        {/* tejadillos laterales */}
        <path d="M6 34 c 4 -2 7 -4 10 -6 M58 34 c -4 -2 -7 -4 -10 -6" strokeWidth="1.6" />
        {/* pilares */}
        <path d="M18 26 v30 M46 26 v30" />
        <path d="M12 56 h12 M40 56 h12" strokeWidth="1.6" />
      </g>
    </svg>
  );
}

/** Tramo del camino de montaña entre dos nodos (S suave). Coordenadas 0–100, altura elástica. */
export function PathSegment({ from, to, done, className }: { from: number; to: number; done?: boolean; className?: string }) {
  const d = `M ${from} 0 C ${from} 40, ${to} 60, ${to} 100`;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={cn("absolute inset-0 h-full w-full overflow-visible", className)} aria-hidden="true">
      <path d={d} fill="none" stroke={done ? "rgb(var(--cinnabar))" : "rgb(var(--ink))"} strokeOpacity={done ? 0.75 : 0.35} strokeWidth={done ? 3 : 2} strokeLinecap="round" strokeDasharray={done ? undefined : "1 7"} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
