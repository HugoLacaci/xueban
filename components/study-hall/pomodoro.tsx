"use client";
import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { logStudy } from "@/lib/db";
import { playFeedback } from "@/lib/sounds";
import { useSettings } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Card, Select } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { FilterChip } from "./filter-chip";
import { cn } from "@/lib/utils";
import { targetLang } from "@/lib/languages/registry";
import { ui } from "@/lib/languages/ui-text";

const PRESETS = [
  { work: 25, rest: 5 },
  { work: 15, rest: 3 },
  { work: 45, rest: 10 },
];

/**
 * 一炷香 — una varilla de incienso que se consume con el tiempo. La parte quemada (arriba) desaparece
 * y la brasa baja; en descanso la brasa es celadón. Solo cambia `transform` (escala en Y) y opacidad.
 */
function Incense({ pct, mode, running }: { pct: number; mode: "work" | "rest"; running: boolean }) {
  const top = 22; // y del extremo superior de la varilla
  const bottom = 150; // y de la base (quemador)
  const len = bottom - top;
  const remaining = Math.max(0, 1 - pct);
  const emberY = top + len * (1 - remaining);
  const ember = mode === "work" ? "rgb(var(--cinnabar))" : "rgb(var(--celadon))";
  return (
    <svg viewBox="0 0 120 180" className="h-56 w-auto" aria-hidden="true">
      <defs>
        <radialGradient id="incense-glow" r="50%">
          <stop offset="0%" stopColor={ember} stopOpacity="0.9" />
          <stop offset="100%" stopColor={ember} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* humo: dos hilos que suben y se desvanecen */}
      {running ? (
        <g fill="none" stroke="rgb(var(--ink))" strokeWidth="1.1" strokeLinecap="round" className="motion-safe:animate-breathe" style={{ transformOrigin: `60px ${emberY}px` }}>
          <path d={`M60 ${emberY - 4} C 54 ${emberY - 16}, 68 ${emberY - 26}, 58 ${emberY - 40} S 64 ${emberY - 62}, 56 ${emberY - 74}`} opacity="0.3" />
          <path d={`M60 ${emberY - 4} C 66 ${emberY - 14}, 52 ${emberY - 30}, 62 ${emberY - 46} S 54 ${emberY - 70}, 63 ${emberY - 86}`} opacity="0.16" />
        </g>
      ) : null}
      {/* varilla restante: se encoge desde arriba (escala Y con origen en la base) */}
      <g style={{ transformOrigin: `60px ${bottom}px`, transform: `scaleY(${remaining})`, transition: "transform 900ms var(--ease-ink)" }}>
        <rect x="57.5" y={top} width="5" height={len} rx="1.5" fill="rgb(var(--gold-ink))" opacity="0.85" />
        <rect x="58.5" y={top} width="1.2" height={len} fill="rgb(var(--paper))" opacity="0.25" />
      </g>
      {/* brasa */}
      <circle cx="60" cy={emberY} r="16" fill="url(#incense-glow)" style={{ transition: "cy 900ms var(--ease-ink)", opacity: running ? 1 : 0.55 }} className={cn(running && "motion-safe:animate-breathe")} />
      <circle cx="60" cy={emberY} r="3.4" fill={ember} style={{ transition: "cy 900ms var(--ease-ink)" }} />
      {/* ceniza caída (aparece cuando ya ha ardido algo) */}
      <ellipse cx="60" cy={bottom + 3} rx={6 + pct * 8} ry="1.6" fill="rgb(var(--ink))" opacity={0.08 + pct * 0.12} />
      {/* quemador: cuenco de cerámica con pie */}
      <path d="M30 150 C 30 166, 90 166, 90 150 Z" fill="rgb(var(--paper-sunk))" stroke="rgb(var(--ink))" strokeOpacity="0.55" strokeWidth="1.4" />
      <path d="M28 150 H92" stroke="rgb(var(--ink))" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" />
      <path d="M46 165 H74" stroke="rgb(var(--ink))" strokeOpacity="0.45" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M60 150 V146" stroke="rgb(var(--ink))" strokeOpacity="0.3" strokeWidth="6" />
    </svg>
  );
}

/** Temporizador Pomodoro: los minutos de trabajo completados cuentan para el objetivo diario. */
export function Pomodoro() {
  const sounds = useSettings((s) => s.settings.sounds);
  const [preset, setPreset] = useState(0);
  const [mode, setMode] = useState<"work" | "rest">("work");
  const [left, setLeft] = useState(PRESETS[0].work * 60);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [kind, setKind] = useState<"other" | "review" | "lesson" | "practice" | "reading" | "video">("other");
  const [noise, setNoise] = useState<"off" | "rain" | "stream">("off");
  const noiseRef = useRef<{ ctx: AudioContext; node: AudioBufferSourceNode; gain: GainNode } | null>(null);
  const startedAt = useRef(0);
  const total = (mode === "work" ? PRESETS[preset].work : PRESETS[preset].rest) * 60;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          clearInterval(t);
          setRunning(false);
          playFeedback("ok", sounds);
          if (mode === "work") {
            const minutes = PRESETS[preset].work;
            void logStudy({ start: startedAt.current, end: Date.now(), minutes, kind: kind === "other" ? "pomodoro" : kind });
            setDone((d) => d + 1);
            toast.success("¡Pomodoro completado!", `${minutes} min añadidos a tu objetivo de hoy. Descansa ${PRESETS[preset].rest} min.`);
            setMode("rest");
            return PRESETS[preset].rest * 60;
          }
          toast.info("Descanso terminado", "¿Otro pomodoro?");
          setMode("work");
          return PRESETS[preset].work * 60;
        }
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, mode, preset, sounds, kind]);

  useEffect(() => {
    document.title = running ? `${fmt(left)} · ${mode === "work" ? "Estudio" : "Descanso"} · Xuébàn` : "Study Hall · Xuébàn";
    return () => {
      document.title = "Xuébàn";
    };
  }, [left, running, mode]);

  // ruido ambiente generado (sin archivos): lluvia (rosa con ráfagas) o arroyo (marrón filtrado)
  useEffect(() => {
    if (noise === "off") {
      noiseRef.current?.node.stop();
      noiseRef.current?.ctx.close();
      noiseRef.current = null;
      return;
    }
    const ctx = new AudioContext();
    const size = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < size; i++) {
      const white = Math.random() * 2 - 1;
      if (noise === "stream") {
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5 * (0.85 + 0.15 * Math.sin(i / 3000));
      } else {
        last = 0.98 * last + 0.02 * white;
        data[i] = (white * 0.3 + last) * (0.6 + 0.4 * Math.sin(i / 8000));
      }
    }
    const node = ctx.createBufferSource();
    node.buffer = buf;
    node.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 0.08;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = noise === "rain" ? 4000 : 900;
    node.connect(filter).connect(gain).connect(ctx.destination);
    node.start();
    noiseRef.current = { ctx, node, gain };
    return () => {
      node.stop();
      void ctx.close();
      noiseRef.current = null;
    };
  }, [noise]);

  const reset = (m = mode) => {
    setRunning(false);
    setLeft((m === "work" ? PRESETS[preset].work : PRESETS[preset].rest) * 60);
  };
  const pct = 1 - left / total;

  return (
    <div className="grid gap-4 md:grid-cols-[auto_1fr]">
      <Card className="flex flex-col items-center gap-3 md:min-w-[18rem]">
        <div className="flex items-center gap-5">
          <Incense pct={pct} mode={mode} running={running} />
          <div className="text-center">
            <span className="zh-display block text-sm text-ink-faint" lang={targetLang()}>
              {ui().incense}
            </span>
            <span className="tabular block font-serif-es text-5xl font-semibold leading-none text-ink" role="timer" aria-live="off">
              {fmt(left)}
            </span>
            <span className={cn("mt-1 block text-xs uppercase tracking-[0.18em]", mode === "work" ? "text-cinnabar" : "text-celadon-ink")}>{mode === "work" ? "estudio" : "descanso"}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              if (!running && left === total) startedAt.current = Date.now();
              setRunning((r) => !r);
            }}
            variant={mode === "work" ? "default" : "jade"}
          >
            {running ? <Pause /> : <Play />} {running ? "Pausar" : "Empezar"}
          </Button>
          <Button variant="ghost" onClick={() => reset()}>
            <RotateCcw /> Reiniciar
          </Button>
        </div>
        <p className="tabular text-xs text-ink-faint">Pomodoros en esta sesión: {done}</p>
      </Card>
      <Card className="space-y-4">
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink-soft">Duración (estudio + descanso)</p>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p, i) => (
              <FilterChip
                key={i}
                active={preset === i}
                onClick={() => {
                  setPreset(i);
                  setRunning(false);
                  setMode("work");
                  setLeft(p.work * 60);
                }}
              >
                {p.work} + {p.rest} min
              </FilterChip>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="pomo-kind" className="mb-1.5 block text-sm font-medium text-ink-soft">
            ¿Qué estudias? (para las estadísticas)
          </label>
          <Select id="pomo-kind" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className="w-full">
            <option value="other">Estudio general / escuela</option>
            <option value="review">Repaso (Anki / flashcards)</option>
            <option value="lesson">Lección</option>
            <option value="practice">Práctica</option>
            <option value="reading">Lectura</option>
            <option value="video">Vídeo / escucha</option>
          </Select>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink-soft">Ambiente</p>
          <div className="flex flex-wrap gap-1.5">
            {(["off", "rain", "stream"] as const).map((n) => (
              <FilterChip key={n} active={noise === n} onClick={() => setNoise(n)}>
                <span className="inline-flex items-center gap-1">
                  {n === "off" ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />} {n === "off" ? "silencio" : n === "rain" ? "lluvia" : "arroyo"}
                </span>
              </FilterChip>
            ))}
          </div>
        </div>
        <p className="text-xs leading-relaxed text-ink-faint">Consejo: un pomodoro = una tarea concreta (p. ej. «repasar 30 tarjetas» o «lección 3 de la unidad 2»). Al terminar, levántate y mira lejos.</p>
      </Card>
    </div>
  );
}

function fmt(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
