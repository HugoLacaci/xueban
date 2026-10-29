"use client";
/**
 * Ilustraciones «hero» de la portada (Tres puertas), una por cultura y en tres capas (fondo, media,
 * primer plano) para el parallax. SVG deterministas, sin imágenes; los colores salen de los tokens de
 * la piel (`data-skin`), así que claro/oscuro y la fase del día se adaptan solos.
 *
 * El lienzo es ancho (x de −400 a 800, alto 800) con la composición principal en el centro (0…400):
 * con `xMidYMax slice` una puerta estrecha y vertical ve el centro, y una puerta ancha (un solo
 * idioma activo, móvil apaisado, miniatura) ve el paisaje completo sin recortar lo esencial.
 *   中文: 山水 a tinta — picos con lavado y niebla (留白), pabellón en el risco, pino, aves, sol bermellón.
 *   日本語: ukiyo-e — Fuji con nieve, sol 朱, nubes en franjas, colinas de añil, torii lejano, olas 青海波.
 *   한국어: montañas redondeadas en capas de 청 y celadón, pinos, tejados de hanok con aleros curvos.
 */
import { memo, useMemo } from "react";
import type { Lang } from "@/lib/languages/types";
import type { DayPhase } from "./shan-shui";
import { seededRandom } from "@/lib/utils";

export type ArtLayer = "far" | "mid" | "near";

const X0 = -400;
const X1 = 800;
const W = X1 - X0;
const H = 800;

/** Cresta suave (curvas) a lo ancho de todo el lienzo. */
function softRidge(rng: () => number, base: number, amp: number, step = 40) {
  let d = `M${X0} ${base}`;
  let px = X0;
  let py = base;
  for (let x = X0 + step; x <= X1 + step; x += step) {
    const y = base - amp * (0.3 + rng() * 0.7);
    d += ` Q${px + step / 2} ${((py + y) / 2 - amp * 0.25 * rng()).toFixed(1)} ${x} ${y.toFixed(1)}`;
    px = x;
    py = y;
  }
  return `${d} L${X1 + step} ${H} L${X0} ${H} Z`;
}

/** Montaña-pico de 山水: silueta con hombros y cumbre afilada. */
function peak(cx: number, top: number, base: number, width: number, rng: () => number) {
  const l = cx - width / 2;
  const r = cx + width / 2;
  const s1 = top + (base - top) * (0.35 + rng() * 0.1);
  const s2 = top + (base - top) * (0.3 + rng() * 0.1);
  return `M${l} ${base} C${l + width * 0.12} ${s1} ${cx - width * 0.18} ${top + 24} ${cx} ${top} C${cx + width * 0.16} ${top + 30} ${r - width * 0.14} ${s2} ${r} ${base} Z`;
}

/** Colinas redondeadas (montañas coreanas) a lo ancho del lienzo. */
function hills(rng: () => number, base: number, amp: number, seg: number) {
  let d = `M${X0} ${base}`;
  for (let x0 = X0; x0 < X1; x0 += seg) {
    const peakY = base - amp * (0.55 + rng() * 0.45);
    d += ` C${x0 + seg * 0.25} ${peakY.toFixed(1)} ${x0 + seg * 0.75} ${peakY.toFixed(1)} ${x0 + seg} ${(base - amp * 0.15 * rng()).toFixed(1)}`;
  }
  return `${d} L${X1} ${H} L${X0} ${H} Z`;
}

/** Copa de pino a tinta: almohadillas con borde inferior de agujas. */
function pinePad(w: number) {
  let d = `M${-w / 2} 0 Q0 ${-w * 0.32} ${w / 2} 0`;
  const n = Math.max(4, Math.round(w / 7));
  for (let i = n; i >= 0; i--) {
    const x = -w / 2 + (w * i) / n;
    d += ` L${x.toFixed(1)} ${i % 2 ? 4 : 1}`;
  }
  return `${d} Z`;
}

function Pine({ x, y, s = 1, flip }: { x: number; y: number; s?: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`} fill="rgb(var(--ink))">
      <path d="M0 120 C3 84 -6 54 4 0" stroke="rgb(var(--ink))" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M2 34 C-12 30 -28 26 -44 32" stroke="rgb(var(--ink))" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M3 58 C16 54 30 54 42 60" stroke="rgb(var(--ink))" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d={pinePad(70)} transform="translate(-6 8)" />
      <path d={pinePad(48)} transform="translate(-42 30)" />
      <path d={pinePad(52)} transform="translate(40 56)" />
      <path d={pinePad(44)} transform="translate(-14 84)" />
    </g>
  );
}

const SKY: Record<DayPhase, { top: string; mid: string; sunY: number }> = {
  dawn: { top: "rgb(var(--seal) / 0.16)", mid: "rgb(var(--gold) / 0.10)", sunY: 250 },
  day: { top: "rgb(var(--indigo) / 0.12)", mid: "rgb(var(--paper) / 0)", sunY: 170 },
  dusk: { top: "rgb(var(--gold) / 0.20)", mid: "rgb(var(--seal) / 0.08)", sunY: 290 },
  night: { top: "rgb(var(--indigo) / 0.26)", mid: "rgb(var(--paper) / 0)", sunY: 160 },
};

function Sky({ phase, id }: { phase: DayPhase; id: string }) {
  const s = SKY[phase];
  return (
    <>
      <defs>
        <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={s.top} />
          <stop offset="0.55" stopColor={s.mid} />
          <stop offset="1" stopColor="rgb(var(--paper) / 0)" />
        </linearGradient>
      </defs>
      <rect x={X0} width={W} height={H} fill={`url(#sky-${id})`} />
    </>
  );
}

function Stars({ seed }: { seed: number }) {
  const pts = useMemo(() => {
    const r = seededRandom(seed);
    return Array.from({ length: 90 }, () => [X0 + r() * W, r() * 400, 0.4 + r() * 1.1, 0.25 + r() * 0.5]);
  }, [seed]);
  return (
    <g fill="rgb(var(--ink))">
      {pts.map(([x, y, rr, o], i) => (
        <circle key={i} cx={x} cy={y} r={rr} opacity={o} />
      ))}
    </g>
  );
}

/* ------------------------------------------------------------------ 中文 · 山水 */
function wash(id: string, top: number) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="rgb(var(--ink))" stopOpacity={top} />
      <stop offset="0.55" stopColor="rgb(var(--ink))" stopOpacity={top * 0.45} />
      <stop offset="1" stopColor="rgb(var(--ink))" stopOpacity="0" />
    </linearGradient>
  );
}

function ZhArt({ phase, layer }: { phase: DayPhase; layer: ArtLayer }) {
  const shapes = useMemo(() => {
    const r = seededRandom(23);
    return {
      far: [softRidge(r, 500, 70, 36), softRidge(r, 545, 55, 44)],
      // picos principales (centro) y laterales para las puertas anchas
      peaksA: [peak(96, 210, 600, 200, r), peak(-250, 280, 620, 220, r), peak(640, 250, 610, 230, r)],
      peaksB: [peak(262, 300, 610, 240, r), peak(-90, 340, 630, 200, r), peak(520, 330, 620, 200, r)],
      peaksC: [peak(372, 360, 620, 170, r), peak(-330, 380, 640, 160, r), peak(740, 390, 640, 170, r)],
      small: [peak(180, 430, 640, 120, r), peak(330, 470, 650, 110, r), peak(-170, 460, 650, 120, r), peak(600, 450, 650, 120, r)],
      near: softRidge(r, 690, 50, 50),
    };
  }, []);
  const night = phase === "night";
  if (layer === "far")
    return (
      <>
        <Sky phase={phase} id="zh" />
        {night ? <Stars seed={5} /> : null}
        <circle cx="300" cy={SKY[phase].sunY} r="32" fill={night ? "rgb(var(--paper-raised))" : "rgb(var(--cinnabar))"} opacity={night ? 0.85 : 0.75} />
        <defs>{wash("zh-far", 0.16)}</defs>
        {/* aves */}
        <g fill="none" stroke="rgb(var(--ink))" strokeWidth="1.6" strokeLinecap="round" opacity="0.5">
          <path d="M150 230 q6 -6 12 0 q6 -6 12 0" />
          <path d="M186 254 q5 -5 10 0 q5 -5 10 0" />
          <path d="M130 270 q4 -4 8 0 q4 -4 8 0" />
          <path d="M-120 210 q6 -6 12 0 q6 -6 12 0" />
          <path d="M520 190 q5 -5 10 0 q5 -5 10 0" />
        </g>
        {shapes.far.map((d, i) => (
          <path key={i} d={d} fill="url(#zh-far)" />
        ))}
      </>
    );
  if (layer === "mid")
    return (
      <>
        <defs>
          {wash("zh-peak-a", 0.5)}
          {wash("zh-peak-b", 0.32)}
          {wash("zh-peak-c", 0.42)}
          {wash("zh-small", 0.38)}
        </defs>
        {shapes.peaksB.map((d, i) => (
          <path key={`b${i}`} d={d} fill="url(#zh-peak-b)" />
        ))}
        {shapes.peaksC.map((d, i) => (
          <path key={`c${i}`} d={d} fill="url(#zh-peak-c)" />
        ))}
        {shapes.peaksA.map((d, i) => (
          <path key={`a${i}`} d={d} fill="url(#zh-peak-a)" />
        ))}
        {/* pabellón en el risco */}
        <g transform="translate(78 196)" fill="none" stroke="rgb(var(--ink))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.92">
          <path d="M-4 12 C6 9 12 4 18 -2 C24 4 30 9 40 12" />
          <path d="M-4 12 c-2 -2 -3 -4 -2 -7 M40 12 c2 -2 3 -4 2 -7" strokeWidth="1.5" />
          <path d="M4 13 v14 M18 13 v14 M32 13 v14" />
          <path d="M0 28 h36" />
        </g>
        {shapes.small.map((d, i) => (
          <path key={i} d={d} fill="url(#zh-small)" />
        ))}
      </>
    );
  return (
    <>
      <defs>
        <linearGradient id="zh-near" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgb(var(--ink))" stopOpacity="0.62" />
          <stop offset="1" stopColor="rgb(var(--ink))" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <path d={shapes.near} fill="url(#zh-near)" />
      <g opacity="0.85">
        <Pine x={56} y={604} flip />
        <Pine x={700} y={620} s={0.8} />
      </g>
    </>
  );
}

/* ------------------------------------------------------------------ 日本語 · ukiyo-e */
function Seigaiha({ y }: { y: number }) {
  const arcs = [];
  for (let row = 0; row < 6; row++) {
    for (let col = -11; col < 21; col++) {
      const cx = col * 40 + (row % 2 ? 20 : 0);
      const cy = y + row * 16;
      arcs.push(
        <g key={`${row}-${col}`}>
          {[18, 13, 8].map((rr) => (
            <path key={rr} d={`M${cx - rr} ${cy} A${rr} ${rr} 0 0 1 ${cx + rr} ${cy}`} />
          ))}
        </g>,
      );
    }
  }
  return (
    <g fill="rgb(var(--paper))" stroke="rgb(var(--indigo))" strokeWidth="1.4">
      {arcs}
    </g>
  );
}

function JaArt({ phase, layer }: { phase: DayPhase; layer: ArtLayer }) {
  const hillPaths = useMemo(() => {
    const r = seededRandom(7);
    return [0, 1, 2].map((k) => {
      const base = 610 + k * 34;
      let d = `M${X0} ${base}`;
      for (let x = X0; x <= X1; x += 25) d += ` L${x} ${(base - Math.sin((x / 400) * Math.PI * (1.1 + k * 0.5) + r() * 2) * (34 - k * 6) - r() * 8).toFixed(1)}`;
      return `${d} L${X1} ${H} L${X0} ${H} Z`;
    });
  }, []);
  const night = phase === "night";
  if (layer === "far")
    return (
      <>
        <Sky phase={phase} id="ja" />
        {night ? <Stars seed={11} /> : null}
        <circle cx="290" cy={SKY[phase].sunY + 40} r="46" fill={night ? "rgb(var(--paper-raised))" : "rgb(var(--shu))"} opacity={night ? 0.85 : 0.8} />
        {/* nubes en franjas (estilo grabado) */}
        <g fill="rgb(var(--paper-raised))" opacity={night ? 0.25 : 0.85}>
          <rect x="40" y="250" width="190" height="10" rx="5" />
          <rect x="70" y="266" width="130" height="8" rx="4" />
          <rect x="230" y="320" width="150" height="9" rx="4.5" />
          <rect x="-320" y="300" width="220" height="10" rx="5" />
          <rect x="-280" y="316" width="140" height="8" rx="4" />
          <rect x="520" y="270" width="200" height="10" rx="5" />
        </g>
        {/* Fuji */}
        <path d="M-130 600 L150 400 C170 386 190 386 210 400 L520 600 Z" fill="rgb(var(--indigo))" opacity="0.3" />
        <path d="M150 400 C170 386 190 386 210 400 L238 432 L222 428 L206 442 L190 426 L176 444 L160 428 L132 432 Z" fill="rgb(var(--paper-raised))" opacity="0.95" />
      </>
    );
  if (layer === "mid")
    return (
      <>
        {hillPaths.map((d, i) => (
          <path key={i} d={d} fill="rgb(var(--indigo))" opacity={0.18 + i * 0.16} />
        ))}
        {/* torii lejano sobre la colina */}
        <g transform="translate(70 566)" fill="rgb(var(--shu))" opacity="0.9">
          <path d="M0 4 Q18 0 36 4 L35 7 Q18 3 1 7 Z" />
          <rect x="4" y="10" width="28" height="2.5" />
          <rect x="7" y="6" width="3" height="24" />
          <rect x="26" y="6" width="3" height="24" />
        </g>
      </>
    );
  return (
    <>
      <rect x={X0} y="690" width={W} height="110" fill="rgb(var(--paper))" />
      <Seigaiha y={706} />
      {/* pétalos de cerezo */}
      <g fill="rgb(var(--sakura))" opacity="0.85">
        {[
          [60, 470],
          [120, 520],
          [330, 460],
          [360, 540],
          [210, 500],
          [-200, 480],
          [-90, 540],
          [560, 500],
          [660, 450],
        ].map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx="5" ry="3" transform={`rotate(${i * 37} ${x} ${y})`} />
        ))}
      </g>
    </>
  );
}

/* ------------------------------------------------------------------ 한국어 · hanok */
function KoArt({ phase, layer }: { phase: DayPhase; layer: ArtLayer }) {
  const hillPaths = useMemo(() => {
    const r = seededRandom(3);
    return [hills(r, 520, 110, 200), hills(r, 580, 90, 140), hills(r, 640, 70, 200)];
  }, []);
  const night = phase === "night";
  const roof = (x: number, y: number, w: number) => `M${x} ${y} Q${x + w * 0.06} ${y - 14} ${x + w * 0.18} ${y - 22} L${x + w * 0.82} ${y - 22} Q${x + w * 0.94} ${y - 14} ${x + w} ${y} Q${x + w / 2} ${y - 9} ${x} ${y} Z`;
  if (layer === "far")
    return (
      <>
        <Sky phase={phase} id="ko" />
        {night ? <Stars seed={17} /> : null}
        {/* luna / sol como vasija de luna */}
        <circle cx="110" cy={SKY[phase].sunY + 20} r="40" fill={night ? "rgb(var(--paper-raised))" : "rgb(var(--obang-yellow))"} opacity={night ? 0.85 : 0.55} />
        <path d={hillPaths[0]} fill="rgb(var(--obang-blue))" opacity="0.14" />
      </>
    );
  if (layer === "mid")
    return (
      <>
        <path d={hillPaths[1]} fill="rgb(var(--celadon))" opacity="0.32" />
        <path d={hillPaths[2]} fill="rgb(var(--obang-blue))" opacity="0.32" />
        {/* pinos sobre la loma */}
        <g opacity="0.55">
          <Pine x={84} y={548} s={0.32} />
          <Pine x={110} y={562} s={0.26} flip />
          <Pine x={-180} y={560} s={0.3} />
          <Pine x={600} y={556} s={0.3} flip />
        </g>
      </>
    );
  return (
    <>
      <rect x={X0} y="700" width={W} height="100" fill="rgb(var(--paper))" opacity="0.7" />
      {/* tejados de hanok con tejas y aleros curvos */}
      <g fill="rgb(var(--ink))" opacity="0.82">
        <path d={roof(30, 712, 210)} />
        <path d={roof(200, 734, 190)} />
        <path d={roof(-300, 726, 200)} />
        <path d={roof(520, 718, 220)} />
      </g>
      <g stroke="rgb(var(--paper))" strokeWidth="1" opacity="0.35">
        {Array.from({ length: 14 }, (_, i) => (
          <line key={i} x1={52 + i * 12} y1="692" x2={52 + i * 12} y2="708" />
        ))}
      </g>
      <g fill="rgb(var(--paper-raised))" stroke="rgb(var(--ink))" strokeOpacity="0.5">
        <rect x="56" y="712" width="158" height="44" />
        <rect x="222" y="734" width="146" height="34" />
        <rect x="-278" y="726" width="156" height="40" />
        <rect x="544" y="718" width="172" height="44" />
      </g>
      {/* changsal: celosía de las puertas */}
      <g stroke="rgb(var(--ink))" strokeOpacity="0.35" strokeWidth="1">
        {[70, 100, 130, 160, 190].map((x) => (
          <line key={x} x1={x} y1="714" x2={x} y2="754" />
        ))}
        <line x1="58" y1="728" x2="212" y2="728" />
        <line x1="58" y1="742" x2="212" y2="742" />
        {[560, 590, 620, 650, 680].map((x) => (
          <line key={x} x1={x} y1="720" x2={x} y2="760" />
        ))}
      </g>
      {/* línea de dancheong */}
      <g>
        <rect x={X0} y="770" width={W} height="4" fill="rgb(var(--obang-blue))" opacity="0.6" />
        <rect x={X0} y="774" width={W} height="2" fill="rgb(var(--seal))" opacity="0.6" />
        <rect x={X0} y="776" width={W} height="24" fill="rgb(var(--paper))" />
      </g>
    </>
  );
}

/** Una capa de la ilustración del idioma (fondo, media o primer plano). */
export const PortalArt = memo(function PortalArt({ lang, phase, layer, className }: { lang: Lang; phase: DayPhase; layer: ArtLayer; className?: string }) {
  return (
    <svg viewBox={`${X0} 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" className={className} aria-hidden="true" focusable="false">
      {lang === "zh" ? <ZhArt phase={phase} layer={layer} /> : lang === "ja" ? <JaArt phase={phase} layer={layer} /> : <KoArt phase={phase} layer={layer} />}
    </svg>
  );
});
