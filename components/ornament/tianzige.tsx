"use client";
import { cn } from "@/lib/utils";

/**
 * 田字格 / 米字格 — cuadrícula de caligrafía (línea discontinua bermellón tenue) como fondo funcional
 * de un carácter grande. `faint` para usarla bajo caracteres de tarjetas (no de práctica).
 */
export function TianZiGe({ children, size = 160, variant = "tian", faint, className, style }: { children?: React.ReactNode; size?: number | string; variant?: "tian" | "mi"; faint?: boolean; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={cn("relative inline-flex items-center justify-center rounded-lg", faint ? "tianzige-faint" : cn("tianzige", variant === "mi" && "mizige"), className)} style={{ width: size, height: size, ...style }}>
      {children}
    </div>
  );
}

/** Grano de papel para contenedores concretos (el body ya lo lleva). */
export function PaperTexture({ className, opacity = 0.05 }: { className?: string; opacity?: number }) {
  return (
    <svg className={cn("pointer-events-none absolute inset-0 h-full w-full", className)} aria-hidden="true" style={{ opacity }}>
      <filter id="paper-grain-local">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix values="0 0 0 0 0.3 0 0 0 0 0.22 0 0 0 0 0.12 0 0 0 1 0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#paper-grain-local)" />
    </svg>
  );
}

/** Farolillo 灯笼 encendido/apagado (racha). */
export function Lantern({ lit, size = 28, className, title }: { lit: boolean; size?: number; className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 24 32" width={size} height={size * 1.33} className={cn("inline-block", className)} role="img" aria-label={title ?? (lit ? "farol encendido" : "farol apagado")}>
      <rect x="9" y="1" width="6" height="3" rx="1" fill="rgb(var(--ink))" opacity="0.7" />
      <ellipse cx="12" cy="15" rx="10" ry="10.5" fill={lit ? "rgb(var(--cinnabar))" : "rgb(var(--ink))"} opacity={lit ? 0.95 : 0.14} />
      <g stroke={lit ? "rgb(var(--cinnabar-ink))" : "rgb(var(--ink))"} strokeOpacity={lit ? 0.5 : 0.18} strokeWidth="0.8" fill="none">
        <path d="M7 6 Q4 15 7 24" />
        <path d="M12 4.5 V25.5" />
        <path d="M17 6 Q20 15 17 24" />
      </g>
      {lit ? <ellipse cx="10" cy="11" rx="2.2" ry="3" fill="rgb(var(--gold))" opacity="0.55" /> : null}
      <rect x="9" y="25" width="6" height="2.5" rx="1" fill="rgb(var(--ink))" opacity="0.7" />
      <path d="M11 27.5 L10.5 31 M13 27.5 L13.5 31" stroke={lit ? "rgb(var(--gold))" : "rgb(var(--ink))"} strokeWidth="1" strokeOpacity={lit ? 0.9 : 0.3} />
    </svg>
  );
}
