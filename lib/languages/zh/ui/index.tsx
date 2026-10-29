"use client";
/** Componentes propios del paquete chino, expuestos al núcleo a través de pack.ui. */
import { useEffect, useState } from "react";
import type { LanguageUI, ReadingInputProps } from "@/lib/languages/types";
import { Input } from "@/components/ui/primitives";
import { Reading } from "@/components/target/reading";
import { PitchGraph } from "@/components/target/pitch-graph";
import { analyzeAudioUrl, idealContour, normalizeContour } from "@/lib/pitch";
import { audioFileFor } from "@/lib/tts";
import { numberedToMarked, tonesOf } from "../pinyin/tones";
import { cn } from "@/lib/utils";
import { CharactersPage } from "./characters-page";
import { CharDetail } from "./char-detail";
import { RadicalPicker } from "./radical-picker";
import { HandwritingPad } from "@/components/target/handwriting-pad";
import { PinyinTableStep, TonesStep, TonePairsStep, StrokesStep, RadicalsStep, SpanishErrorsStep } from "./special-steps";
import { CharOfDay } from "./char-of-day";
import type { Candidate } from "@/lib/handwriting";

const bigInput = "h-14 rounded-[12px] text-center text-2xl placeholder:text-base placeholder:text-ink-faint/80";

/** Entrada de pinyin: números → tildes en vivo (ni3 hao3 → nǐ hǎo). */
export function PinyinInputField({ value, onChange, onSubmit, placeholder, autoFocus, disabled, id, className, mode = "reading", ...rest }: ReadingInputProps) {
  const preview = mode === "reading" ? numberedToMarked(value) : "";
  return (
    <div className={className}>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onSubmit) {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder={placeholder ?? (mode === "reading" ? "ni3 hao3 → nǐ hǎo" : "Escribe en chino (teclado pinyin)")}
        className={cn(bigInput, mode === "text" && "zh")}
        lang={mode === "text" ? "zh-CN" : undefined}
        autoFocus={autoFocus}
        disabled={disabled}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label={rest["aria-label"] ?? (mode === "reading" ? "Pinyin" : "Texto en chino")}
      />
      {mode === "reading" ? (
        <div className="mt-1.5 h-6 text-center" aria-live="polite">
          {preview && preview !== value ? <Reading text={preview} className="text-base" /> : null}
        </div>
      ) : null}
    </div>
  );
}

/** Curva de tonos: modelo (MP3 pregenerado o contorno ideal por tonos) frente a la grabación. */
export function TonePitchView({ text, reading, samples, className }: { text: string; reading: string; samples?: Float32Array; sampleRate?: number; className?: string }) {
  const [model, setModel] = useState<number[]>([]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const fromFile = await analyzeAudioUrl(audioFileFor(text, "zh"));
      const curve = fromFile && fromFile.some((p) => p.hz > 0) ? normalizeContour(fromFile) : normalizeContour(idealContour(tonesOf(reading)));
      if (!cancelled) setModel(curve);
    })();
    return () => {
      cancelled = true;
    };
  }, [text, reading]);
  const user = samples ? Array.from(samples) : [];
  return (
    <div className={className}>
      <PitchGraph model={model} user={user} />
    </div>
  );
}

function DictionaryExtras({ onPick }: { onPick: (q: string) => void }) {
  const [tab, setTab] = useState<"radical" | "draw">("radical");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        <button className={cn("rounded-full border px-3 py-1 text-xs", tab === "radical" ? "border-ink bg-ink text-paper" : "border-line")} onClick={() => setTab("radical")}>
          Radical + trazos
        </button>
        <button className={cn("rounded-full border px-3 py-1 text-xs", tab === "draw" ? "border-ink bg-ink text-paper" : "border-line")} onClick={() => setTab("draw")}>
          Dibujar
        </button>
      </div>
      {tab === "radical" ? <RadicalPicker onPick={onPick} /> : null}
      {tab === "draw" ? (
        <div className="space-y-2">
          <HandwritingPad onCandidates={setCandidates} />
          {candidates.length ? (
            <div className="flex flex-wrap gap-1">
              {candidates.map((c) => (
                <button key={c.char} lang="zh-CN" className="zh rounded-[6px] border border-line bg-paper px-2 py-0.5 text-xl hover:bg-paper-sunk" onClick={() => onPick(c.char)}>
                  {c.char}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export const zhUI: LanguageUI = {
  CharactersPage,
  CharacterDetail: ({ char, onNavigate }) => <CharDetail ch={char} onNavigate={onNavigate} />,
  DictionaryExtras,
  modules: {
    "pinyin-table": PinyinTableStep,
    tones: TonesStep,
    "tone-pairs": TonePairsStep,
    strokes: StrokesStep,
    radicals: ({ params }) => <RadicalsStep radicals={(params?.radicals as string[]) ?? []} />,
    "spanish-errors": SpanishErrorsStep,
  },
  ReadingInput: PinyinInputField,
  PronunciationView: TonePitchView,
  ItemOfDay: CharOfDay,
};
