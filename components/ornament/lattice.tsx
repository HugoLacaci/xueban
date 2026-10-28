"use client";
import { useId } from "react";
import { cn } from "@/lib/utils";

/** 窗棂 — celosía geométrica de ventana, como patrón de fondo muy tenue (opacidad 4–6 %). */
export function Lattice({ className, opacity = 0.05, size = 48, variant = "ice" }: { className?: string; opacity?: number; size?: number; variant?: "ice" | "square" | "wan" }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className={cn("pointer-events-none absolute inset-0 h-full w-full", className)} aria-hidden="true">
      <defs>
        <pattern id={`lat-${id}`} width={size} height={size} patternUnits="userSpaceOnUse">
          {variant === "ice" ? (
            <g fill="none" stroke="currentColor" strokeWidth="1">
              <path d={`M0 ${size / 2} L${size / 2} 0 L${size} ${size / 2} L${size / 2} ${size} Z`} />
              <path d={`M${size / 4} ${size / 4} L${size * 0.75} ${size / 4} M${size / 4} ${size * 0.75} L${size * 0.75} ${size * 0.75} M${size / 2} 0 V${size}`} />
            </g>
          ) : variant === "wan" ? (
            <g fill="none" stroke="currentColor" strokeWidth="1">
              <path d={`M${size * 0.2} ${size * 0.5} H${size * 0.5} V${size * 0.2} H${size * 0.8} M${size * 0.5} ${size * 0.5} V${size * 0.8} H${size * 0.2} M${size * 0.5} ${size * 0.5} H${size * 0.8} V${size * 0.8}`} />
            </g>
          ) : (
            <g fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="0.5" y="0.5" width={size - 1} height={size - 1} />
              <rect x={size * 0.25} y={size * 0.25} width={size * 0.5} height={size * 0.5} />
            </g>
          )}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#lat-${id})`} opacity={opacity} />
    </svg>
  );
}

/** 月亮门 — marco circular «puerta luna» para avatares o ilustraciones. */
export function MoonGate({ children, size = 160, className }: { children?: React.ReactNode; size?: number; className?: string }) {
  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded-full border-[3px] border-ink/70 bg-paper-sunk", className)} style={{ width: size, height: size }}>
      <div className="absolute inset-[6px] rounded-full border border-ink/20" />
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
