"use client";
import { useEffect, useId, useState } from "react";
import { targetLang } from "@/lib/languages/registry";
import { cn } from "@/lib/utils";

/** Pincelada fina como divisor; opcionalmente con un carácter o texto en el centro. */
export function InkDivider({ className, label, animate }: { className?: string; label?: React.ReactNode; animate?: boolean }) {
  return (
    <div className={cn("my-4 flex items-center gap-3", className)} role="separator">
      <Brush animate={animate} />
      {label ? <span lang={targetLang()} className="shrink-0 font-[family-name:var(--font-display-zh)] text-sm text-ink-faint">{label}</span> : null}
      {label ? <Brush animate={animate} flip /> : null}
    </div>
  );
}

function Brush({ animate, flip }: { animate?: boolean; flip?: boolean }) {
  return (
    <svg viewBox="0 0 400 8" preserveAspectRatio="none" className={cn("h-2 w-full flex-1 text-ink", flip && "scale-x-[-1]")} aria-hidden="true">
      <path
        d="M2 4.5 C 40 2.5, 90 6, 140 4 S 240 1.5, 300 4.5 S 370 6, 398 3.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        style={{ opacity: 0.55, strokeDasharray: animate ? 420 : undefined, strokeDashoffset: animate ? 420 : undefined, animation: animate ? "ink-draw 900ms var(--ease-ink) forwards" : undefined }}
      />
      <style>{`@keyframes ink-draw { to { stroke-dashoffset: 0; } }`}</style>
    </svg>
  );
}

/**
 * 圆相 Ensō — círculo de un solo trazo de pincel. Con `progress` (0–1) se rellena como anillo de progreso,
 * con el extremo abierto característico y un trazo de grosor variable.
 */
export function Enso({ size = 120, progress, className, children, stroke = "rgb(var(--ink))", trackOpacity = 0.12, label }: { size?: number; progress?: number; className?: string; children?: React.ReactNode; stroke?: string; trackOpacity?: number; label?: string }) {
  const id = useId().replace(/:/g, "");
  const r = 44;
  const c = 2 * Math.PI * r;
  const gap = 0.07; // apertura del ensō
  const visible = 1 - gap;
  const p = progress === undefined ? 1 : Math.max(0, Math.min(1, progress));
  const [dash, setDash] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setDash(p * visible), 30);
    return () => clearTimeout(t);
  }, [p]);
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }} role={progress !== undefined ? "progressbar" : undefined} aria-valuenow={progress !== undefined ? Math.round(p * 100) : undefined} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <svg viewBox="0 0 100 100" width={size} height={size} className="absolute inset-0 -rotate-[100deg]">
        <defs>
          <filter id={`enso-${id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="2" seed="5" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" />
          </filter>
        </defs>
        {progress !== undefined ? <circle cx="50" cy="50" r={r} fill="none" stroke={stroke} strokeOpacity={trackOpacity} strokeWidth="5" strokeDasharray={`${c * visible} ${c}`} strokeLinecap="round" /> : null}
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeDasharray={`${c * dash} ${c}`}
          filter={`url(#enso-${id})`}
          style={{ transition: "stroke-dasharray 900ms var(--ease-ink)" }}
        />
        {/* remate del trazo: más fino al final (pincel que se levanta) */}
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgb(var(--paper))" strokeWidth="2.2" strokeDasharray={`3 ${c}`} strokeDashoffset={-c * dash + 1} opacity={dash > 0.02 ? 0.9 : 0} />
      </svg>
      <div className="relative text-center">{children}</div>
    </div>
  );
}

/** ✓ trazado a pincel (acierto). */
export function BrushCheck({ size = 28, className, animate = true }: { size?: number; className?: string; animate?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={cn("text-celadon", className)} aria-hidden="true">
      <path d="M5 17 C 9 20, 11 24, 13 26 C 17 18, 22 11, 29 6" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" style={animate ? { strokeDasharray: 60, strokeDashoffset: 60, animation: "ink-draw 420ms var(--ease-ink) forwards" } : undefined} />
      <style>{`@keyframes ink-draw { to { stroke-dashoffset: 0; } }`}</style>
    </svg>
  );
}
