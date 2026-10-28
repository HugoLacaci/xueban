"use client";
import { useId } from "react";
import { cn } from "@/lib/utils";

export interface SealProps {
  text: string; // 1–4 caracteres
  variant?: "square" | "round" | "oval";
  size?: number; // px
  className?: string;
  tone?: "cinnabar" | "ink" | "gold" | "celadon";
  stamped?: boolean; // animación de estampado al montar
  rotate?: number; // grados
  title?: string;
}

const TONE: Record<NonNullable<SealProps["tone"]>, string> = {
  cinnabar: "rgb(var(--cinnabar))",
  ink: "rgb(var(--ink))",
  gold: "rgb(var(--gold))",
  celadon: "rgb(var(--celadon))",
};

/**
 * 印章 — sello bermellón con borde irregular (filtro de desplazamiento) y grano.
 * El texto se dispone en columna de arriba abajo cuando hay 2 caracteres y en 2×2 cuando hay 4.
 */
export function Seal({ text, variant = "square", size = 64, className, tone = "cinnabar", stamped, rotate = 0, title }: SealProps) {
  const id = useId().replace(/:/g, "");
  const chars = Array.from(text).slice(0, 4);
  const color = TONE[tone];
  const n = chars.length;
  const layout: { x: number; y: number }[] = n === 1 ? [{ x: 50, y: 50 }] : n === 2 ? [{ x: 50, y: 30 }, { x: 50, y: 70 }] : n === 3 ? [{ x: 50, y: 22 }, { x: 50, y: 50 }, { x: 50, y: 78 }] : [{ x: 70, y: 30 }, { x: 70, y: 70 }, { x: 30, y: 30 }, { x: 30, y: 70 }];
  const fontSize = n === 1 ? 56 : n === 2 ? 34 : n === 3 ? 26 : 32;
  const shape =
    variant === "round" ? <circle cx="50" cy="50" r="46" /> : variant === "oval" ? <ellipse cx="50" cy="50" rx="36" ry="46" /> : <rect x="5" y="5" width="90" height="90" rx="6" />;
  return (
    <span
      className={cn("inline-block select-none", stamped && "animate-stamp", className)}
      style={{ width: size, height: size, ["--stamp-rot" as string]: `${rotate}deg`, transform: stamped ? undefined : `rotate(${rotate}deg)` }}
      role="img"
      aria-label={title ?? `Sello ${text}`}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} className="block overflow-visible">
        <defs>
          <filter id={`seal-${id}`} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <mask id={`grain-${id}`}>
            <rect width="100" height="100" fill="#fff" />
            <rect width="100" height="100" filter={`url(#seal-g-${id})`} opacity="0.22" />
          </mask>
          <filter id={`seal-g-${id}`}>
            <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="1" seed="3" />
            <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
          </filter>
        </defs>
        <g filter={`url(#seal-${id})`} mask={`url(#grain-${id})`} fill={color}>
          {shape}
        </g>
        <g fill="rgb(var(--paper-raised))" fontFamily="var(--font-display-zh)" fontWeight="600" textAnchor="middle" dominantBaseline="central" lang="zh-CN">
          {chars.map((c, i) => (
            <text key={i} x={layout[i].x} y={layout[i].y} fontSize={fontSize}>
              {c}
            </text>
          ))}
        </g>
      </svg>
    </span>
  );
}

/** Sello de texto en línea (p. ej. HSK 1, 新) como pequeña etiqueta con borde de sello. */
export function SealTag({ children, className, tone = "cinnabar" }: { children: React.ReactNode; className?: string; tone?: SealProps["tone"] }) {
  return (
    <span className={cn("inline-flex items-center rounded-[4px] border-[1.5px] px-1.5 py-0.5 font-seal text-[11px] leading-none", className)} style={{ borderColor: TONE[tone!], color: TONE[tone!] }}>
      {children}
    </span>
  );
}
