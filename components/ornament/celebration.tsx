"use client";
import { useEffect, useRef } from "react";

/** Lluvia breve de pétalos de ciruelo (canvas, ≤ 1,5 s). Respeta prefers-reduced-motion. */
export function PetalRain({ duration = 1400, count = 36 }: { duration?: number; count?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = (c.width = window.innerWidth * dpr);
    const h = (c.height = window.innerHeight * dpr);
    const styles = getComputedStyle(document.documentElement);
    const cin = styles.getPropertyValue("--cinnabar").trim() || "184 58 43";
    const gold = styles.getPropertyValue("--gold").trim() || "176 132 58";
    const petals = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: -20 * dpr - Math.random() * h * 0.3,
      vx: (Math.random() - 0.5) * 0.8 * dpr,
      vy: (1.2 + Math.random() * 1.6) * dpr,
      r: (4 + Math.random() * 5) * dpr,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.08,
      col: Math.random() < 0.85 ? cin : gold,
      a: 0.6 + Math.random() * 0.4,
    }));
    const start = performance.now();
    let raf = 0;
    const draw = (t: number) => {
      const el = t - start;
      ctx.clearRect(0, 0, w, h);
      const fade = el > duration - 400 ? Math.max(0, (duration - el) / 400) : 1;
      for (const p of petals) {
        p.x += p.vx + Math.sin(el / 300 + p.r) * 0.3 * dpr;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = `rgb(${p.col} / ${p.a * fade})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.r * 0.6, p.r, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (el < duration) raf = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, w, h);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [duration, count]);
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-[80] h-full w-full" aria-hidden="true" />;
}

/** Onda de tinta jade que se expande desde un punto (acierto). */
export function InkRipple({ x, y, color = "rgb(var(--celadon))" }: { x: number; y: number; color?: string }) {
  return (
    <span
      className="pointer-events-none fixed z-[75] rounded-full"
      style={{ left: x, top: y, width: 8, height: 8, marginLeft: -4, marginTop: -4, background: color, animation: "ink-ripple 520ms var(--ease-ink) forwards" }}
      aria-hidden="true"
    >
      <style>{`@keyframes ink-ripple { 0% { transform: scale(1); opacity: .55; } 100% { transform: scale(28); opacity: 0; } }`}</style>
    </span>
  );
}
