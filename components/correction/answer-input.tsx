"use client";
/**
 * Entrada de respuesta en chino con cuatro modos: hanzi (teclado del sistema o pinyin con números + Tab para
 * elegir hanzi), pinyin (números, tildes o sin tonos), escritura a mano (reconocedor offline por trazos) y voz
 * (reconocimiento zh-CN). Reutilizado por el cuaderno de ejercicios y el tutor.
 */
import { useEffect, useRef, useState } from "react";
import { Keyboard, Mic, PenLine, Square, Type, X } from "lucide-react";
import type { AnswerMode } from "@/lib/db";
import { usePack } from "@/lib/languages/provider";
import { useDictionary } from "@/lib/dictionary/service";
import { recognizeOnce, speechRecognitionAvailable } from "@/lib/tts";
import { HandwritingPad } from "@/components/target/handwriting-pad";
import type { Candidate } from "@/lib/handwriting";
import { hanziCandidates, PINYIN_NUMBERED, PINYIN_RUN } from "@/components/notes/editor/slash-menu";
import { onChangeWithTones } from "@/lib/correction/live-tones";
import { Reading } from "@/components/target/reading";
import { Button } from "@/components/ui/button";
import { Input, Kbd } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export const MODES: { id: AnswerMode; label: string; icon: React.ReactNode; hint: string }[] = [
  { id: "hanzi", label: "Hanzi", icon: <Type className="size-4" />, hint: "teclado chino del sistema, o pinyin con números + Tab" },
  { id: "pinyin", label: "Pinyin", icon: <Keyboard className="size-4" />, hint: "ni3 hao3 · nǐ hǎo · ni hao (se corrige tono y sílaba)" },
  { id: "handwriting", label: "A mano", icon: <PenLine className="size-4" />, hint: "dibuja cada carácter y elige el candidato" },
  { id: "speech", label: "Hablando", icon: <Mic className="size-4" />, hint: "reconocimiento de voz zh-CN (orientativo)" },
];

export function AnswerInput({ mode, value, onChange, onSubmit, disabled, autoFocus }: { mode: AnswerMode; value: string; onChange: (v: string) => void; onSubmit: () => void; disabled?: boolean; autoFocus?: boolean }) {
  const pack = usePack();
  const dictStatus = useDictionary((s) => s.status);
  const load = useDictionary((s) => s.load);
  const [cands, setCands] = useState<{ s: string; p: string; es?: string }[]>([]);
  const [candIdx, setCandIdx] = useState(0);
  const [hw, setHw] = useState<Candidate[]>([]);
  const [hwKey, setHwKey] = useState(0);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (dictStatus === "idle") void load();
  }, [dictStatus, load]);

  // candidatos de hanzi para el último tramo de pinyin con números
  const refreshCands = (v: string) => {
    const m = v.match(PINYIN_RUN);
    if (mode === "hanzi" && m && PINYIN_NUMBERED.test(m[0])) {
      setCands(hanziCandidates(m[0], 8));
      setCandIdx(0);
    } else setCands([]);
  };
  const pickCand = (c: { s: string }) => {
    const m = value.match(PINYIN_RUN);
    const next = m ? value.slice(0, value.length - m[0].length) + c.s : value + c.s;
    onChange(next);
    setCands([]);
    ref.current?.focus();
  };

  if (mode === "handwriting") {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className={cn("flex min-h-12 flex-1 flex-wrap items-center gap-1 rounded-[8px] border border-line bg-paper-sunk/70 px-3 py-2 text-2xl", pack.meta.cssClass)} lang={pack.bcp47} aria-label="Respuesta">
            {value || <span className="text-sm text-ink-faint">dibuja un carácter y elige el candidato</span>}
          </div>
          <Button size="sm" variant="ghost" onClick={() => onChange(value.slice(0, -1))} disabled={!value} aria-label="Borrar último carácter">
            <X /> último
          </Button>
          <Button size="sm" variant="ink" onClick={onSubmit} disabled={disabled || !value}>
            Corregir
          </Button>
        </div>
        <div className="flex flex-wrap gap-3">
          <HandwritingPad key={hwKey} size={220} onCandidates={setHw} />
          <div className="flex flex-1 flex-wrap content-start gap-1.5">
            {hw.slice(0, 10).map((c) => (
              <button key={c.char} type="button" onClick={() => { onChange(value + c.char); setHw([]); setHwKey((k) => k + 1); }} className={cn("size-11 rounded-[8px] border border-line bg-paper-raised text-2xl hover:border-ink/50", pack.meta.cssClass)} lang={pack.bcp47}>
                {c.char}
              </button>
            ))}
            {!hw.length ? <p className="text-xs text-ink-faint">Los candidatos aparecen al dibujar (caracteres HSK 1–4).</p> : null}
          </div>
        </div>
      </div>
    );
  }

  if (mode === "speech") {
    const available = speechRecognitionAvailable();
    const start = async () => {
      setListening(true);
      setInterim("");
      try {
        const r = await recognizeOnce({ timeoutMs: 8000, onInterim: setInterim });
        if (r.text) onChange(r.text);
      } finally {
        setListening(false);
      }
    };
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void start()} disabled={!available || listening || disabled} className={cn("flex size-14 items-center justify-center rounded-full text-paper shadow-[var(--shadow-float)]", listening ? "bg-cinnabar motion-safe:animate-pulse" : "bg-ink")} aria-label={listening ? "Escuchando" : "Hablar"}>
            {listening ? <Square className="size-5" /> : <Mic className="size-6" />}
          </button>
          <div className={cn("min-h-12 flex-1 rounded-[8px] border border-line bg-paper-sunk/70 px-3 py-2 text-xl", pack.meta.cssClass)} lang={pack.bcp47} aria-live="polite">
            {value || interim || <span className="text-sm text-ink-faint">{available ? "pulsa el micrófono y di la frase" : "tu navegador no tiene reconocimiento de voz (usa Chrome o Edge)"}</span>}
          </div>
          <Button size="sm" variant="ink" onClick={onSubmit} disabled={disabled || !value}>
            Corregir
          </Button>
        </div>
        <p className="text-[11px] text-ink-faint">El reconocimiento tiende a «corregir» hacia frases plausibles: la nota es orientativa. Si reconoce mal, puedes editar el texto en modo hanzi.</p>
      </div>
    );
  }

  const isPinyin = mode === "pinyin";
  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Input
            ref={ref}
            value={value}
            onChange={(e) => {
              // en modo pinyin el número se convierte en tilde al escribirlo (xi3hua4n → xǐhuàn);
              // en modo hanzi se mantiene para poder elegir caracteres con Tab
              if (isPinyin) return onChangeWithTones(e, onChange);
              onChange(e.target.value);
              refreshCands(e.target.value);
            }}
            onKeyDown={(e) => {
              if (cands.length && (e.key === "Tab" || e.key === "ArrowDown" || e.key === "ArrowUp")) {
                e.preventDefault();
                if (e.key === "Tab") pickCand(cands[candIdx]);
                else setCandIdx((i) => (i + (e.key === "ArrowDown" ? 1 : cands.length - 1)) % cands.length);
                return;
              }
              if (e.key === "Escape" && cands.length) {
                e.preventDefault();
                setCands([]);
                return;
              }
              if (e.key === "Enter") {
                e.preventDefault();
                if (cands.length) pickCand(cands[candIdx]);
                else onSubmit();
              }
            }}
            lang={isPinyin ? undefined : pack.bcp47}
            className={cn("h-12 text-lg", !isPinyin && pack.meta.cssClass)}
            placeholder={isPinyin ? "wo3 zai4 jia1 chi1 fan4" : "我在家吃饭 (o escribe wo3zai4 + Tab)"}
            autoCapitalize="off"
            autoComplete="off"
            spellCheck={false}
            disabled={disabled}
            autoFocus={autoFocus}
            aria-label={isPinyin ? "Respuesta en pinyin" : "Respuesta en chino"}
          />
          {cands.length ? (
            <ul className="absolute left-0 top-full z-20 mt-1 flex max-w-full flex-wrap gap-1 rounded-[8px] border border-line bg-paper-raised p-1.5 shadow-[var(--shadow-float)]" role="listbox">
              {cands.map((c, i) => (
                <li key={c.s}>
                  <button type="button" role="option" aria-selected={i === candIdx} onMouseDown={(e) => e.preventDefault()} onClick={() => pickCand(c)} className={cn("flex items-center gap-1 rounded-[6px] px-2 py-1 text-sm", i === candIdx ? "bg-ink text-paper" : "hover:bg-paper-sunk")}>
                    <Kbd className={cn(i === candIdx && "border-paper/40 text-paper")}>{i + 1}</Kbd>
                    <span lang={pack.bcp47} className={cn(pack.meta.cssClass, "text-lg")}>
                      {c.s}
                    </span>
                    <span className="text-[11px] opacity-70">{c.p}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <Button variant="ink" size="lg" onClick={onSubmit} disabled={disabled || !value.trim()}>
          Corregir
        </Button>
      </div>
      {isPinyin && value ? <Reading text={pack.normalizeInput(value)} className="text-sm" /> : null}
      {!isPinyin ? <p className="text-[11px] text-ink-faint">Sin teclado chino: escribe el pinyin con números (wo3) y pulsa <Kbd>Tab</Kbd> para elegir los hanzi.</p> : null}
    </div>
  );
}
