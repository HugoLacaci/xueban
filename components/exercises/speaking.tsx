"use client";
/**
 * Hablar: repite conmigo (shadowing), leer en voz alta y responder oralmente. Graba, transcribe (Web Speech zh-CN o
 * Whisper local) y compara la curva de tono por sílaba con el modelo: cada sílaba en verde / ámbar / rojo.
 * Se puede reproducir la grabación junto al modelo. La nota es orientativa (el reconocimiento «corrige» hacia frases plausibles).
 */
import { useMemo, useRef, useState } from "react";
import { Check, Info, Mic, Play, Square, X } from "lucide-react";
import type { SpeakingExercise, Tone } from "@/lib/exercises/types";
import { recognizeOnce, speechRecognitionAvailable } from "@/lib/tts";
import { normalizeContour, recordAndAnalyze, type PitchPoint } from "@/lib/pitch";
import { scoreShadowing, type SyllableScore } from "@/lib/shadowing";
import { usePack } from "@/lib/languages/provider";
import { useSettings } from "@/lib/settings";
import { PitchGraph } from "@/components/target/pitch-graph";
import { Button } from "@/components/ui/button";
import { AudioButton, playText, useSpaceToPlay } from "@/components/target/audio-button";
import { ChineseText } from "@/components/target/target-text";
import { Reading } from "@/components/target/reading";
import { cn } from "@/lib/utils";
import { ExerciseCard, Hint, Plate, type ExerciseProps } from "./exercise-view";
import { targetLang } from "@/lib/languages/registry";
import { Mixed } from "@/components/target/mixed";

const V_CLS: Record<SyllableScore["verdict"], string> = { good: "border-celadon bg-celadon/14 text-celadon-ink", ok: "border-gold bg-gold/14 text-gold-ink", bad: "border-danger bg-danger/10 text-danger" };

export function Speaking({ ex, onSubmit, result }: ExerciseProps<SpeakingExercise>) {
  const [state, setState] = useState<"idle" | "recording" | "processing">("idle");
  const [transcript, setTranscript] = useState("");
  const [level, setLevel] = useState(0);
  const [userCurve, setUserCurve] = useState<number[]>([]);
  const [scores, setScores] = useState<ReturnType<typeof scoreShadowing> | null>(null);
  const pack = usePack();
  const View = pack.ui.PronunciationView;
  const [error, setError] = useState<string | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [whisperProgress, setWhisperProgress] = useState<number | null>(null);
  const stopRef = useRef<() => void>(() => undefined);
  const pinyinMode = useSettings((s) => s.settings.pinyinMode);
  const whisper = useSettings((s) => s.settings.whisper?.enabled);
  const recAvailable = typeof window !== "undefined" && speechRecognitionAvailable();
  const isZh = pack.id === "zh";
  useSpaceToPlay(ex.mode === "answer" ? ex.question?.zh : ex.zh, state === "idle");

  // sílabas del modelo (zh): hanzi + pinyin + tono
  const syllables = useMemo(() => {
    if (!isZh) return [];
    const tokens = pack.analyze(ex.zh).tokens;
    const out: { hanzi: string; pinyin: string; tone: Tone }[] = [];
    for (const t of tokens) if (t.isWord) for (const s of t.segments) if (s.reading) out.push({ hanzi: s.text, pinyin: s.reading, tone: Number(s.cls?.replace("tone-", "") ?? 5) as Tone });
    return out;
  }, [ex.zh, isZh, pack]);

  const start = async () => {
    setError(null);
    setTranscript("");
    setScores(null);
    setState("recording");
    const stop = new Promise<void>((resolve) => {
      stopRef.current = resolve;
    });
    try {
      const maxSeconds = ex.mode === "read" ? 15 : 8;
      const useWeb = recAvailable && !whisper;
      const [rec, analysis] = await Promise.all([
        useWeb ? recognizeOnce({ timeoutMs: maxSeconds * 1000, onInterim: setTranscript }).catch(() => ({ text: "", confidence: 0 })) : Promise.resolve({ text: "", confidence: 0 }),
        recordAndAnalyze({ maxSeconds, onLevel: setLevel, stop }).catch((e: Error) => {
          setError(e.message.includes("Permission") || e.name === "NotAllowedError" ? "Permiso de micrófono denegado." : e.message);
          return { contour: [] as PitchPoint[], blob: null as Blob | null };
        }),
      ]);
      setState("processing");
      let text = rec.text;
      if (whisper && analysis.blob) {
        try {
          const { transcribeLocal } = await import("@/lib/asr/whisper");
          setWhisperProgress(0);
          text = await transcribeLocal(analysis.blob, setWhisperProgress);
        } catch (e) {
          setError(`Whisper local no disponible: ${(e as Error).message}`);
        } finally {
          setWhisperProgress(null);
        }
      }
      setTranscript(text);
      setUserCurve(normalizeContour(analysis.contour));
      if (analysis.blob) setRecordingUrl(URL.createObjectURL(analysis.blob));
      if (isZh && syllables.length) setScores(scoreShadowing({ text: ex.zh, syllables, transcript: text || undefined, contour: analysis.contour }));
      setState("idle");
      if (text) onSubmit({ kind: "speaking", transcript: text });
    } catch (e) {
      setError((e as Error).message);
      setState("idle");
    }
  };

  const recording = state === "recording";
  const modelText = ex.zh;

  return (
    <ExerciseCard prompt={ex.prompt}>
      {ex.mode === "answer" && ex.question ? (
        <Plate className="mb-4 p-3 text-center">
          <p className="mb-1 text-[11px] uppercase tracking-wide text-ink-faint">Pregunta</p>
          <div className="flex items-start justify-center gap-2">
            <AudioButton text={ex.question.zh} size="lg" variant="solid" autoPlay />
            <ChineseText text={ex.question.zh} size="lg" pinyinLine={pinyinMode !== "hide" ? ex.question.py : undefined} translation={result ? ex.question.es : undefined} as="div" />
          </div>
          {!result ? <p className="mt-1 text-xs text-ink-faint">Responde en voz alta con tus palabras{ex.keywords?.length ? "; se esperan palabras como " + ex.keywords.slice(0, 2).join(" · ") : ""}.</p> : null}
        </Plate>
      ) : null}
      <div className="mb-5 flex flex-col items-center gap-2 text-center">
        {ex.mode !== "answer" || result ? (
          <div className="flex items-start gap-2">
            <AudioButton text={modelText} size="lg" variant="solid" autoPlay={ex.mode === "shadow"} />
            <ChineseText text={modelText} size={ex.mode === "read" ? "lg" : "xl"} pinyinLine={pinyinMode !== "hide" ? ex.pinyin : undefined} translation={ex.es} as="div" className="text-left" />
          </div>
        ) : null}
        {ex.mode !== "answer" ? (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => void playText(modelText, 0.7)}>
              despacio
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void playText(modelText, 0.9)}>
              normal
            </Button>
          </div>
        ) : null}
      </div>

      <div className="mx-auto w-full max-w-md">
        {View ? <View text={modelText} reading={ex.pinyin} samples={userCurve.length ? Float32Array.from(userCurve) : undefined} /> : <PitchGraph model={[]} user={userCurve} />}

        {scores ? (
          <div className="mt-3">
            <div className="flex flex-wrap justify-center gap-1.5" lang={targetLang()} aria-label="Resultado por sílaba">
              {scores.syllables.map((s, i) => (
                <span key={i} className={cn("flex flex-col items-center rounded-[8px] border px-2 py-1", V_CLS[s.verdict])} title={s.note ?? (s.verdict === "good" ? "bien" : s.verdict === "ok" ? "casi" : "revisar")}>
                  <span className="zh-serif text-2xl leading-none">{s.hanzi}</span>
                  <Reading text={s.pinyin} className="text-xs" />
                </span>
              ))}
            </div>
            <p className="mt-2 text-center text-xs text-ink-soft">
              {scores.recognizedRatio !== null ? `Reconocidas ${Math.round(scores.recognizedRatio * 100)} % · ` : ""}
              {scores.toneRatio !== null ? `tonos ${Math.round(scores.toneRatio * 100)} %` : "sin voz suficiente para medir tonos"}
              {scores.syllables.some((s) => s.note) ? <span className="block text-ink-faint">{scores.syllables.filter((s) => s.note && s.verdict === "bad").slice(0, 2).map((s) => `${s.hanzi}: ${s.note}`).join(" · ")}</span> : null}
            </p>
          </div>
        ) : null}

        <div className="mt-5 flex flex-col items-center gap-3">
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
            {recording ? "Grabando… pulsa para parar" : state === "processing" ? (whisperProgress !== null ? `Whisper local… ${Math.round(whisperProgress * 100)} %` : "Analizando…") : userCurve.length ? "Grabar otra vez" : ex.mode === "answer" ? "Pulsa y responde" : "Pulsa y di la frase"}
          </p>
          {transcript ? (
            <p className="text-sm text-ink-soft">
              Reconocido:{" "}
              <span lang={targetLang()} className="zh-serif text-xl text-ink">
                {transcript}
              </span>
            </p>
          ) : null}
          {recordingUrl ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <audio controls src={recordingUrl} className="h-8" aria-label="Tu grabación" />
              <Button size="sm" variant="secondary" onClick={async () => { await playText(modelText, 0.9); const a = new Audio(recordingUrl); void a.play(); }}>
                <Play /> modelo y luego yo
              </Button>
            </div>
          ) : null}
          {error ? <p className="text-xs text-danger">{error}</p> : null}
          {!recAvailable && !whisper ? <Hint className="mt-0">Tu navegador no tiene reconocimiento de voz (usa Chrome o Edge) o activa Whisper local en Ajustes. Puedes grabarte, comparar la curva de tono y autoevaluarte.</Hint> : null}
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
        <p className="mt-4 flex items-start gap-1.5 text-[11px] leading-snug text-ink-faint">
          <Info className="mt-0.5 size-3 shrink-0" />
          <span>
            <Mixed>El reconocimiento de voz tiende a «corregir» hacia frases plausibles y la curva de tono se mide con un micrófono normal: la nota de pronunciación es orientativa. Lo fiable es escucharte junto al modelo.</Mixed>
          </span>
        </p>
      </div>
    </ExerciseCard>
  );
}
