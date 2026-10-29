"use client";
/**
 * Entrada de hangul con teclado 2-beolsik (두벌식) en pantalla y composición de jamo en vivo,
 * vista de pronunciación (escritura frente a pronunciación real con las reglas aplicadas y forma de
 * onda de tu grabación) y bloque silábico tipo bojagi (inicial · vocal · final).
 */
import { useState } from "react";
import { Keyboard, Delete } from "lucide-react";
import { convertQwertyToHangul, assemble, disassemble } from "es-hangul";
import type { ReadingInputProps } from "@/lib/languages/types";
import { Input } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { decompose, pronounce, romanizeRR, RULE_INFO } from "../phonology";

const ROWS: [string, string][][] = [
  [["q", "ㅂ"], ["w", "ㅈ"], ["e", "ㄷ"], ["r", "ㄱ"], ["t", "ㅅ"], ["y", "ㅛ"], ["u", "ㅕ"], ["i", "ㅑ"], ["o", "ㅐ"], ["p", "ㅔ"]],
  [["a", "ㅁ"], ["s", "ㄴ"], ["d", "ㅇ"], ["f", "ㄹ"], ["g", "ㅎ"], ["h", "ㅗ"], ["j", "ㅓ"], ["k", "ㅏ"], ["l", "ㅣ"]],
  [["z", "ㅋ"], ["x", "ㅌ"], ["c", "ㅊ"], ["v", "ㅍ"], ["b", "ㅠ"], ["n", "ㅜ"], ["m", "ㅡ"]],
];
const SHIFT: Record<string, string> = { ㅂ: "ㅃ", ㅈ: "ㅉ", ㄷ: "ㄸ", ㄱ: "ㄲ", ㅅ: "ㅆ", ㅐ: "ㅒ", ㅔ: "ㅖ" };

/** Teclado 두벌식 en pantalla: los jamo se componen en sílabas automáticamente. */
export function Dubeolsik({ onJamo, onBackspace, className }: { onJamo(j: string): void; onBackspace(): void; className?: string }) {
  const [shift, setShift] = useState(false);
  return (
    <div className={cn("select-none space-y-1 rounded-[12px] border border-line bg-paper-sunk/60 p-2", className)} role="group" aria-label="Teclado coreano 2-beolsik">
      {ROWS.map((row, i) => (
        <div key={i} className="flex justify-center gap-1">
          {i === 2 ? (
            <button type="button" onClick={() => setShift((s) => !s)} className={cn("h-10 rounded-[6px] border px-2 text-xs", shift ? "border-ink bg-ink text-paper" : "border-line bg-paper-raised")} aria-pressed={shift}>
              ⇧
            </button>
          ) : null}
          {row.map(([k, j]) => {
            const out = shift ? (SHIFT[j] ?? j) : j;
            return (
              <button
                key={k}
                type="button"
                onClick={() => {
                  onJamo(out);
                  setShift(false);
                }}
                className="flex h-10 w-8 flex-col items-center justify-center rounded-[6px] border border-line bg-paper-raised text-lg leading-none hover:bg-paper-sunk sm:w-9"
                aria-label={out}
              >
                <span lang="ko-KR">{out}</span>
                <span className="text-[8px] text-ink-faint">{k}</span>
              </button>
            );
          })}
          {i === 2 ? (
            <button type="button" onClick={onBackspace} className="h-10 rounded-[6px] border border-line bg-paper-raised px-2" aria-label="Borrar">
              <Delete className="size-4" />
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

const bigInput = "h-14 rounded-[12px] text-center text-2xl placeholder:text-base placeholder:text-ink-faint/80";

/**
 * Entrada en hangul: acepta el IME coreano del sistema; si se teclea en QWERTY latino (dkssud) se convierte
 * como si fuera el teclado 두벌식 (안녕). En «reading» también vale escribir la romanización.
 */
export function HangulInput({ value, onChange, onSubmit, placeholder, autoFocus, disabled, id, className, mode = "reading", ...rest }: ReadingInputProps) {
  const [kb, setKb] = useState(false);
  const [qwerty, setQwerty] = useState(false);
  const addJamo = (j: string) => onChange(assemble([...disassemble(value).split(""), j]));
  const back = () => {
    const parts = disassemble(value).split("");
    parts.pop();
    onChange(assemble(parts));
  };
  return (
    <div className={className}>
      <div className="flex items-center gap-1">
        <Input
          id={id}
          lang="ko-KR"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            onChange(qwerty && /[a-zA-Z]$/.test(v) ? convertQwertyToHangul(v) : v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onSubmit) {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder={placeholder ?? (mode === "reading" ? "Escribe en hangul" : "Escribe en coreano")}
          className={cn(bigInput, "ko")}
          autoFocus={autoFocus}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          aria-label={rest["aria-label"] ?? "Escribe en hangul"}
        />
        <Button type="button" size="icon" variant={kb ? "secondary" : "ghost"} onClick={() => setKb((k) => !k)} aria-label="Teclado coreano en pantalla" aria-pressed={kb}>
          <Keyboard />
        </Button>
      </div>
      <label className="mt-1 flex items-center justify-center gap-1.5 text-[11px] text-ink-faint">
        <input type="checkbox" checked={qwerty} onChange={(e) => setQwerty(e.target.checked)} className="size-3" /> mi teclado físico como 두벌식 (dkssud → 안녕)
      </label>
      {kb ? <Dubeolsik onJamo={addJamo} onBackspace={back} className="mt-2" /> : null}
    </div>
  );
}

/** Escritura frente a pronunciación real, con las reglas aplicadas resaltadas. */
export function PronunciationCompare({ text, className }: { text: string; className?: string }) {
  const p = pronounce(text);
  const chars = Array.from(text);
  const pron = Array.from(p.pron);
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-end justify-center gap-4">
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-wide text-ink-faint">se escribe</p>
          <p lang="ko-KR" className="ko text-3xl">
            {text}
          </p>
        </div>
        <span className="pb-2 text-ink-faint">→</span>
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-wide text-ink-faint">se pronuncia</p>
          <p lang="ko-KR" className="ko text-3xl">
            [
            {pron.map((c, i) => {
              const r = p.perSyllable[i];
              return (
                <span key={i} className={cn(c !== chars[i] && r ? RULE_INFO[r].cls : undefined, c !== chars[i] && "underline decoration-2 underline-offset-4")} title={r ? RULE_INFO[r].name : undefined}>
                  {c}
                </span>
              );
            })}
            ]
          </p>
        </div>
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-wide text-ink-faint">romanización</p>
          <p className="text-lg text-ink-soft">{romanizeRR(text)}</p>
        </div>
      </div>
      {p.rules.length ? (
        <ul className="space-y-1 text-sm">
          {p.rules.map((r) => (
            <li key={r} className="flex gap-2">
              <span className={cn("shrink-0 font-medium", RULE_INFO[r].cls)} lang="ko-KR">
                {RULE_INFO[r].native}
              </span>
              <span className="text-ink-soft">
                <strong className="font-medium text-ink">{RULE_INFO[r].name}.</strong> {RULE_INFO[r].description}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-center text-xs text-ink-faint">Se pronuncia tal como se escribe.</p>
      )}
    </div>
  );
}

/** Vista de pronunciación en ejercicios de habla: reglas + forma de onda de la grabación (duración y aspiración). */
export function KoPronunciationView({ text, samples, className }: { text: string; reading: string; samples?: Float32Array; sampleRate?: number; className?: string }) {
  const user = samples ? Array.from(samples) : [];
  const w = 320;
  const h = 70;
  const max = Math.max(1, ...user.map((v) => Math.abs(v)));
  return (
    <div className={cn("space-y-3", className)}>
      <PronunciationCompare text={text.replace(/[.?!]/g, "")} />
      <svg viewBox={`0 0 ${w} ${h}`} className="h-[70px] w-full rounded-[var(--radius-card)] border border-line bg-paper-raised" role="img" aria-label="Forma de onda de tu grabación">
        <line x1="0" x2={w} y1={h / 2} y2={h / 2} stroke="rgb(var(--line))" />
        {user.length ? user.map((v, i) => <rect key={i} x={(i / user.length) * w} y={h / 2 - (Math.abs(v) / max) * (h / 2 - 4)} width={Math.max(1, w / user.length - 0.5)} height={(Math.abs(v) / max) * (h - 8)} fill="rgb(var(--cinnabar))" opacity="0.7" />) : <text x="8" y={h / 2 + 4} fontSize="10" fill="rgb(var(--ink-faint))">Graba tu voz: aquí verás la duración y los golpes de aire (aspiradas).</text>}
      </svg>
    </div>
  );
}

/** Bloque silábico como pieza de bojagi: inicial · vocal · final encajan. */
export function SyllableBlock({ syllable, size = 140, showLabels = true }: { syllable: string; size?: number; showLabels?: boolean }) {
  const s = decompose(syllable);
  if (!s) return null;
  const vertical = /[ㅏㅐㅑㅒㅓㅔㅕㅖㅣ]/.test(s.jung);
  const H = s.jong ? 0.62 : 1;
  const cells = vertical
    ? [
        { j: s.cho, x: 0, y: 0, w: 0.55, h: H, c: "obang-blue", l: "inicial" },
        { j: s.jung, x: 0.55, y: 0, w: 0.45, h: H, c: "obang-yellow", l: "vocal" },
      ]
    : [
        { j: s.cho, x: 0, y: 0, w: 1, h: H * 0.5, c: "obang-blue", l: "inicial" },
        { j: s.jung, x: 0, y: H * 0.5, w: 1, h: H * 0.5, c: "obang-yellow", l: "vocal" },
      ];
  if (s.jong) cells.push({ j: s.jong, x: 0, y: H, w: 1, h: 1 - H, c: "obang-red", l: "final (받침)" });
  return (
    <div className="inline-flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        {cells.map((c, i) => (
          <div key={i} className="absolute flex items-center justify-center border border-ink/40" style={{ left: c.x * size, top: c.y * size, width: c.w * size, height: c.h * size, background: `rgb(var(--${c.c}) / 0.22)` }}>
            <span lang="ko-KR" className="ko text-3xl">
              {c.j}
            </span>
          </div>
        ))}
      </div>
      {showLabels ? <p className="text-[11px] text-ink-faint">{cells.map((c) => c.l).join(" · ")}</p> : null}
    </div>
  );
}
