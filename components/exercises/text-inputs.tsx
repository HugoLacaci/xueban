"use client";
import { useState } from "react";
import { Check, Eye, X } from "lucide-react";
import type { DictationExercise, FreeTextExercise, PinyinInputExercise } from "@/lib/exercises/types";
import { numberedToMarked } from "@/lib/pinyin/tones";
import { useSettings } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/primitives";
import { Pinyin } from "@/components/zh/pinyin";
import { AudioButton, playText, useSpaceToPlay } from "@/components/zh/audio-button";
import { ChineseText } from "@/components/zh/chinese-text";
import { cn } from "@/lib/utils";
import { CheckButton, ExerciseCard, Hint, Plate, Stage, type ExerciseProps } from "./exercise-view";

const bigInput = "h-14 rounded-[12px] text-center text-2xl placeholder:text-base placeholder:text-ink-faint/80";

export function PinyinInput({ ex, onSubmit, result }: ExerciseProps<PinyinInputExercise>) {
  const [text, setText] = useState("");
  useSpaceToPlay(ex.zh, !result);
  const preview = numberedToMarked(text);
  return (
    <ExerciseCard prompt={ex.prompt}>
      <Stage zh={ex.zh}>
        {result ? <AudioButton text={ex.zh} /> : null}
        {ex.meaning ? <p className="font-serif-es text-lg text-ink-soft">{ex.meaning}</p> : null}
      </Stage>
      <form
        className="mx-auto w-full max-w-sm"
        onSubmit={(e) => {
          e.preventDefault();
          if (!result && text.trim()) onSubmit({ kind: "text", text });
        }}
      >
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="ni3 hao3 → nǐ hǎo" className={bigInput} autoFocus disabled={Boolean(result)} autoComplete="off" autoCapitalize="off" spellCheck={false} aria-label="Pinyin" />
        <div className="mt-1.5 h-6 text-center" aria-live="polite">
          {preview && preview !== text ? <Pinyin text={preview} className="text-base" /> : null}
        </div>
        {!result ? <CheckButton type="submit" disabled={!text.trim()} /> : null}
      </form>
      <Hint>Tonos con números (1–4, 5 = neutro) o con tildes · ü = v</Hint>
    </ExerciseCard>
  );
}

export function Dictation({ ex, onSubmit, result }: ExerciseProps<DictationExercise>) {
  const [text, setText] = useState("");
  const [showPinyin, setShowPinyin] = useState(false);
  useSpaceToPlay(ex.zh, !result);
  return (
    <ExerciseCard prompt={ex.prompt}>
      <div className="mb-6 flex flex-col items-center gap-3">
        <AudioButton text={ex.zh} size="lg" variant="solid" autoPlay />
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => void playText(ex.zh, 0.7)}>
            despacio
          </Button>
          {ex.pinyin && !result ? (
            <Button size="sm" variant="ghost" onClick={() => setShowPinyin((s) => !s)} aria-pressed={showPinyin}>
              <Eye /> pista (pinyin)
            </Button>
          ) : null}
        </div>
        <div className="h-7" aria-live="polite">
          {showPinyin && ex.pinyin && !result ? <Pinyin text={ex.pinyin} className="text-lg" /> : null}
        </div>
      </div>
      <form
        className="mx-auto w-full max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          if (!result && text.trim()) onSubmit({ kind: "text", text });
        }}
      >
        <Input lang="zh-CN" value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe con el teclado pinyin de tu sistema" className={cn("zh-serif", bigInput)} autoFocus disabled={Boolean(result)} aria-label="Lo que has oído" />
        {!result ? <CheckButton type="submit" disabled={!text.trim()} /> : null}
      </form>
      {result ? (
        <Plate className="mt-5">
          <ChineseText text={ex.zh} size="lg" pinyinLine={ex.pinyin} translation={ex.es} as="div" />
          <DiffChars want={ex.zh} got={text} />
        </Plate>
      ) : (
        <Hint>Sin teclado chino: Windows → Configuración → Hora e idioma → Idioma → Agregar → Chino (simplificado) → Microsoft Pinyin.</Hint>
      )}
    </ExerciseCard>
  );
}

function DiffChars({ want, got }: { want: string; got: string }) {
  const w = Array.from(want.replace(/[\s，。！？、,.!?]/g, ""));
  const g = Array.from(got.replace(/[\s，。！？、,.!?]/g, ""));
  if (!g.length) return null;
  return (
    <p className="mt-2 text-sm">
      <span className="text-ink-faint">Tu respuesta: </span>
      {g.map((c, i) => (
        <span key={i} lang="zh-CN" className={cn("zh-serif text-xl", w[i] === c ? "text-celadon-ink" : "text-danger line-through decoration-danger/60")}>
          {c}
        </span>
      ))}
    </p>
  );
}

export function FreeText({ ex, onSubmit, result }: ExerciseProps<FreeTextExercise>) {
  const [text, setText] = useState("");
  const [revealed, setRevealed] = useState(false);
  const pinyinMode = useSettings((s) => s.settings.pinyinMode);
  useSpaceToPlay(ex.zh, !result);
  return (
    <ExerciseCard prompt={ex.prompt}>
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <div className="flex items-start gap-2">
          <AudioButton text={ex.zh} className="mt-1" />
          <ChineseText text={ex.zh} size="xl" pinyinLine={pinyinMode === "show" ? ex.pinyin : undefined} as="div" />
        </div>
      </div>
      {!revealed && !result ? (
        <form
          className="mx-auto w-full max-w-md"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) onSubmit({ kind: "text", text });
          }}
        >
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe la traducción en español" className={cn(bigInput, "font-serif-es text-xl")} autoFocus aria-label="Traducción" />
          <div className="mt-3 flex justify-center">
            <Button type="button" variant="ghost" size="sm" onClick={() => setRevealed(true)}>
              <Eye /> Ver solución y autoevaluar
            </Button>
          </div>
          <CheckButton type="submit" disabled={!text.trim()} />
        </form>
      ) : null}
      {revealed && !result ? (
        <Plate className="mx-auto w-full max-w-md text-center">
          <p className="font-serif-es text-xl text-ink">{ex.answers[0]}</p>
          {ex.answers.length > 1 ? <p className="mt-1 text-sm text-ink-faint">También: {ex.answers.slice(1).join(" · ")}</p> : null}
          <p className="mt-4 text-sm text-ink-soft">¿Lo habías entendido bien?</p>
          <div className="mt-2 flex justify-center gap-2">
            <Button variant="jade" size="lg" onClick={() => onSubmit({ kind: "self", correct: true, text })}>
              <Check /> Sí
            </Button>
            <Button variant="outline" size="lg" onClick={() => onSubmit({ kind: "self", correct: false, text })}>
              <X /> No
            </Button>
          </div>
        </Plate>
      ) : null}
      {result && result.partial && !result.correct ? <p className="mt-3 text-center text-sm text-ink-faint">Tu traducción: «{text}»</p> : null}
    </ExerciseCard>
  );
}
