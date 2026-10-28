"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Mic, Square, X } from "lucide-react";
import type { SpeakingExercise } from "@/lib/exercises/types";
import { recognizeOnce, speechRecognitionAvailable, audioFileFor } from "@/lib/tts";
import { analyzeAudioUrl, idealContour, normalizeContour, recordAndAnalyze, type PitchPoint } from "@/lib/pitch";
import { tonesOf } from "@/lib/pinyin/tones";
import { useSettings } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { AudioButton, playText, useSpaceToPlay } from "@/components/zh/audio-button";
import { ChineseText } from "@/components/zh/chinese-text";
import { cn } from "@/lib/utils";
import { ExerciseCard, Hint, type ExerciseProps } from "./exercise-view";

export function Speaking({ ex, onSubmit, result }: ExerciseProps<SpeakingExercise>) {
  const [state, setState] = useState<"idle" | "recording" | "processing">("idle");
  const [transcript, setTranscript] = useState("");
  const [level, setLevel] = useState(0);
  const [userCurve, setUserCurve] = useState<number[]>([]);
  const [modelCurve, setModelCurve] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const stopRef = useRef<() => void>(() => undefined);
  const pinyinMode = useSettings((s) => s.settings.pinyinMode);
  const recAvailable = typeof window !== "undefined" && speechRecognitionAvailable();
  useSpaceToPlay(ex.zh, state === "idle");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const fromFile = await analyzeAudioUrl(audioFileFor(ex.zh));
      const curve = fromFile && fromFile.some((p) => p.hz > 0) ? normalizeContour(fromFile) : normalizeContour(idealContour(tonesOf(ex.pinyin)));
      if (!cancelled) setModelCurve(curve);
    })();
    return () => {
      cancelled = true;
    };
  }, [ex.zh, ex.pinyin]);

  const start = async () => {
    setError(null);
    setTranscript("");
    setState("recording");
    const stop = new Promise<void>((resolve) => {
      stopRef.current = resolve;
    });
    try {
      const [rec, analysis] = await Promise.all([
        recAvailable ? recognizeOnce({ timeoutMs: 7000, onInterim: setTranscript }).catch(() => ({ text: "", confidence: 0 })) : Promise.resolve({ text: "", confidence: 0 }),
        recordAndAnalyze({ maxSeconds: 7, onLevel: setLevel, stop }).catch((e: Error) => {
          setError(e.message.includes("Permission") || e.name === "NotAllowedError" ? "Permiso de micrófono denegado." : e.message);
          return { contour: [] as PitchPoint[], blob: null as Blob | null };
        }),
      ]);
      setState("processing");
      setTranscript(rec.text);
      setUserCurve(normalizeContour(analysis.contour));
      if (analysis.blob) setRecordingUrl(URL.createObjectURL(analysis.blob));
      setState("idle");
      if (recAvailable && rec.text) onSubmit({ kind: "speaking", transcript: rec.text });
    } catch (e) {
      setError((e as Error).message);
      setState("idle");
    }
  };

  const recording = state === "recording";

  return (
    <ExerciseCard prompt={ex.prompt}>
      <div className="mb-5 flex flex-col items-center gap-2 text-center">
        <div className="flex items-start gap-2">
          <AudioButton text={ex.zh} size="lg" variant="solid" autoPlay={ex.mode === "shadow"} />
          <ChineseText text={ex.zh} size="xl" pinyinLine={pinyinMode !== "hide" ? ex.pinyin : undefined} translation={ex.es} as="div" />
        </div>
        <Button size="sm" variant="ghost" onClick={() => void playText(ex.zh, 0.7)}>
          despacio
        </Button>
      </div>

      <div className="mx-auto w-full max-w-md">
        <PitchGraph model={modelCurve} user={userCurve} />
        <div className="mt-5 flex flex-col items-center gap-3">
          {/* micrófono: botón redondo de tinta; al grabar, anillo que respira (solo transform/opacity) */}
          <div className="relative flex size-24 items-center justify-center">
            {recording ? (
              <>
                <span className="absolute inset-0 rounded-full bg-cinnabar/25 motion-safe:animate-ping" aria-hidden="true" />
                <span className="absolute inset-2 rounded-full border-2 border-cinnabar/40 transition-transform duration-100" style={{ transform: `scale(${1 + Math.min(0.35, level * 4)})` }} aria-hidden="true" />
              </>
            ) : null}
            <button
              type="button"
              onClick={() => (recording ? stopRef.current() : void start())}
              disabled={!recording && (Boolean(result) || state === "processing")}
              aria-label={recording ? "Parar grabación" : userCurve.length ? "Grabar otra vez" : "Grabar"}
              className={cn(
                "relative flex size-[4.5rem] items-center justify-center rounded-full text-paper shadow-[var(--shadow-float)] transition-[transform,background-color] duration-[var(--dur-ui)] ease-[var(--ease-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60 focus-visible:ring-offset-4 focus-visible:ring-offset-paper enabled:hover:scale-105 enabled:active:scale-95 disabled:opacity-50",
                recording ? "bg-cinnabar" : "bg-ink",
              )}
            >
              {recording ? <Square className="size-6" /> : <Mic className="size-7" />}
            </button>
          </div>
          <p className="text-sm text-ink-soft" aria-live="polite">
            {recording ? "Grabando… pulsa para parar" : state === "processing" ? "Analizando…" : userCurve.length ? "Grabar otra vez" : "Pulsa y di la frase"}
          </p>
          {transcript ? (
            <p className="text-sm text-ink-soft">
              Reconocido:{" "}
              <span lang="zh-CN" className="zh-serif text-xl text-ink">
                {transcript}
              </span>
            </p>
          ) : null}
          {recordingUrl ? <audio controls src={recordingUrl} className="h-8" /> : null}
          {error ? <p className="text-xs text-danger">{error}</p> : null}
          {!recAvailable ? <Hint className="mt-0">Tu navegador no tiene reconocimiento de voz (usa Chrome o Edge). Puedes grabarte, comparar la curva de tono y autoevaluarte.</Hint> : null}
        </div>
        {!result ? (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-ink-faint">Autoevaluación:</span>
            <Button size="sm" variant="outline" onClick={() => onSubmit({ kind: "self", correct: true })}>
              <Check /> Bien dicho
            </Button>
            <Button size="sm" variant="outline" onClick={() => onSubmit({ kind: "self", correct: false })}>
              <X /> A repetir
            </Button>
          </div>
        ) : null}
      </div>
    </ExerciseCard>
  );
}

/** Gráfica de curva de tono en tinta: modelo (trazo discontinuo de tinta tenue) vs tú (trazo bermellón). */
export function PitchGraph({ model, user, height = 110 }: { model: number[]; user: number[]; height?: number }) {
  const w = 320;
  const all = [...model, ...user];
  const min = Math.min(-6, ...all);
  const max = Math.max(6, ...all);
  const path = (c: number[]) => c.map((v, i) => `${i === 0 ? "M" : "L"} ${(i / Math.max(1, c.length - 1)) * w} ${height - ((v - min) / (max - min)) * height}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="h-28 w-full rounded-[var(--radius-card)] border border-line bg-paper-raised shadow-[var(--shadow-paper)]" role="img" aria-label="Curva de tono: modelo frente a tu voz">
      <line x1="0" x2={w} y1={height / 2} y2={height / 2} stroke="rgb(var(--line))" strokeDasharray="3 3" />
      {model.length ? <path d={path(model)} fill="none" stroke="rgb(var(--ink-faint))" strokeWidth="2" strokeDasharray="6 4" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {user.length ? <path d={path(user)} fill="none" stroke="rgb(var(--cinnabar))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /> : null}
      <text x="8" y="15" fontSize="10" fill="rgb(var(--ink-faint))" fontFamily="var(--font-sans)">
        ╌╌ modelo · ── tú
      </text>
    </svg>
  );
}
