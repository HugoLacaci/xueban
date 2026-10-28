"use client";
import { useId } from "react";
import { cn } from "@/lib/utils";

/** 回纹 — greca/meandro como borde fino (un solo trazo) para cabeceras y momentos importantes. */
export function FretBorder({ className, color = "currentColor", height = 10, opacity = 0.5 }: { className?: string; color?: string; height?: number; opacity?: number }) {
  const id = useId().replace(/:/g, "");
  const u = height;
  return (
    <svg className={cn("block w-full", className)} height={height} aria-hidden="true" style={{ opacity }}>
      <defs>
        <pattern id={`fret-${id}`} width={u * 2} height={u} patternUnits="userSpaceOnUse">
          <path d={`M0 ${u * 0.9} H${u * 1.6} V${u * 0.1} H${u * 0.4} V${u * 0.6} H${u * 1.2} V${u * 0.4} H${u * 0.8}`} fill="none" stroke={color} strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height={height} fill={`url(#fret-${id})`} />
    </svg>
  );
}

/** 云纹 — nubes auspiciosas como esquineros de un marco (4 esquinas) en trazo fino. */
export function CloudBorder({ children, className, color = "rgb(var(--gold))", inset = 6 }: { children?: React.ReactNode; className?: string; color?: string; inset?: number }) {
  const corner = (
    <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
      <path d="M2 38 V14 C2 8 6 4 12 4 H38 M8 38 V18 C8 14 11 11 15 11 C19 11 21 14 21 17 C21 20 19 22 16 22 C13 22 11 20 11 17 M28 11 C28 8 30 6 33 6 C36 6 38 8 38 11" fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute" style={{ left: inset, top: inset }}>
        {corner}
      </span>
      <span className="pointer-events-none absolute" style={{ right: inset, top: inset, transform: "scaleX(-1)" }}>
        {corner}
      </span>
      <span className="pointer-events-none absolute" style={{ left: inset, bottom: inset, transform: "scaleY(-1)" }}>
        {corner}
      </span>
      <span className="pointer-events-none absolute" style={{ right: inset, bottom: inset, transform: "scale(-1)" }}>
        {corner}
      </span>
      {children}
    </div>
  );
}

/** Marco de biombo 屏风 (filete doble con esquinas) para el reproductor de vídeo. */
export function ScreenFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative rounded-[14px] border border-ink/25 p-1.5", className)}>
      <div className="pointer-events-none absolute inset-[5px] rounded-[10px] border border-ink/15" />
      <div className="overflow-hidden rounded-[9px]">{children}</div>
    </div>
  );
}
