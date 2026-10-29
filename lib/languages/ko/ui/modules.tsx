"use client";
/** Pasos propios de la Unidad 0 coreana: jamo, bloques silábicos, 받침, lisas/aspiradas/tensas, reglas fonológicas. */
import { useState } from "react";
import { Volume2 } from "lucide-react";
import { assemble } from "es-hangul";
import { playText, AudioButton } from "@/components/target/audio-button";
import { StrokeOrder } from "@/components/target/stroke-order";
import { Card } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { BASIC_CONSONANTS, BASIC_VOWELS, COMPOUND_VOWELS, TENSE_CONSONANTS } from "../strokes";
import { jamoInfo } from "../characters";
import { pronounce, RULE_INFO, romanizeRR, type RuleId } from "../phonology";
import { PronunciationCompare, SyllableBlock } from "./common";
import { Mixed } from "@/components/target/mixed";

type ModuleProps = { params?: Record<string, unknown>; onFinish?(score: number): void };

/** Sílaba de ejemplo para oír un jamo: consonante + ㅏ; vocal sola con ㅇ. */
const sample = (j: string) => (BASIC_VOWELS.includes(j) || COMPOUND_VOWELS.includes(j) ? assemble(["ㅇ", j]) : assemble([j, "ㅏ"]));

function JamoGrid({ jamo }: { jamo: string[] }) {
  const [sel, setSel] = useState<string | null>(null);
  const info = sel ? jamoInfo(sel) : undefined;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-7">
        {jamo.map((j) => {
          const ji = jamoInfo(j);
          return (
            <button
              key={j}
              onClick={() => {
                setSel(j);
                void playText(sample(j), 0.8);
              }}
              className={cn("flex flex-col items-center rounded-[10px] border bg-paper-raised py-2 hover:bg-paper-sunk", sel === j ? "border-cinnabar" : "border-line")}
            >
              <span lang="ko-KR" className="ko text-3xl leading-none">
                {j}
              </span>
              <span className="mt-1 text-[11px] text-ink-faint">{ji ? ji.romanInitial || "∅" : ""}</span>
            </button>
          );
        })}
      </div>
      {sel && info ? (
        <Card className="flex flex-wrap items-center gap-4">
          <StrokeOrder char={sel} size={140} />
          <div className="max-w-sm space-y-1 text-sm">
            <p className="font-medium text-ink">
              <span lang="ko-KR"><Mixed>{info.name}</Mixed></span> · inicial «{info.romanInitial || "muda"}»{info.romanFinal ? ` · final «${info.romanFinal}»` : ""}
            </p>
            <p className="text-ink-soft">{info.sound}</p>
            <p className="text-ink-faint">{info.mnemonic}</p>
            <AudioButton text={sample(sel)} label={`Oír ${sample(sel)}`} />
          </div>
        </Card>
      ) : (
        <p className="text-xs text-ink-faint">Pulsa un jamo para oírlo (con ㅏ) y ver cómo se escribe.</p>
      )}
    </div>
  );
}

export function HangulConsonants({ params }: ModuleProps) {
  const set = (params?.set as string) ?? "basic";
  const jamo = set === "tense" ? TENSE_CONSONANTS : set === "aspirated" ? ["ㅋ", "ㅌ", "ㅍ", "ㅊ", "ㅎ"] : BASIC_CONSONANTS;
  return <JamoGrid jamo={jamo} />;
}

export function HangulVowels({ params }: ModuleProps) {
  const set = (params?.set as string) ?? "basic";
  return <JamoGrid jamo={set === "compound" ? COMPOUND_VOWELS : BASIC_VOWELS} />;
}

const BLOCK_EXAMPLES = ["가", "고", "과", "강", "한", "글", "닭", "밥"];
export function SyllableBlocks() {
  const [sel, setSel] = useState("한");
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft">
        Cada sílaba es un <strong>bloque</strong>, como una pieza de 보자기: la consonante inicial, la vocal (a la derecha si es vertical — ㅏ ㅓ ㅣ —, debajo si es horizontal — ㅗ ㅜ ㅡ) y, si la hay, la consonante final (<strong>받침</strong>) abajo. Una sílaba nunca empieza por vocal: se escribe con ㅇ muda (아, 오).
      </p>
      <div className="flex flex-wrap gap-1.5">
        {BLOCK_EXAMPLES.map((s) => (
          <button key={s} onClick={() => setSel(s)} lang="ko-KR" className={cn("ko size-12 rounded-[8px] border text-2xl", sel === s ? "border-cinnabar" : "border-line")}>
            {s}
          </button>
        ))}
      </div>
      <Card className="flex flex-wrap items-center justify-center gap-6">
        <SyllableBlock syllable={sel} />
        <StrokeOrder key={sel} char={sel} size={150} />
        <div className="text-center">
          <AudioButton text={sel} size="lg" />
          <p className="mt-1 text-sm text-ink-soft">{romanizeRR(sel)}</p>
        </div>
      </Card>
    </div>
  );
}

const BATCHIM = [
  { sound: "ㄱ [k]", letters: "ㄱ ㄲ ㅋ", ex: ["책", "밖", "부엌"] },
  { sound: "ㄴ [n]", letters: "ㄴ", ex: ["산", "눈"] },
  { sound: "ㄷ [t]", letters: "ㄷ ㅅ ㅆ ㅈ ㅊ ㅌ ㅎ", ex: ["옷", "낮", "꽃", "밭"] },
  { sound: "ㄹ [l]", letters: "ㄹ", ex: ["물", "말"] },
  { sound: "ㅁ [m]", letters: "ㅁ", ex: ["밤", "몸"] },
  { sound: "ㅂ [p]", letters: "ㅂ ㅍ", ex: ["밥", "앞"] },
  { sound: "ㅇ [ng]", letters: "ㅇ", ex: ["강", "방"] },
];

export function Batchim() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft">
        Como consonante final, las 27 posibles se pronuncian solo de <strong>7 maneras</strong>. Y sin soltar el aire: la boca se cierra en la posición y ya (밥 suena «bap» sin la «p» explosiva).
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {BATCHIM.map((b) => (
          <Card key={b.sound} className="flex items-center justify-between gap-2 p-3">
            <div>
              <p className="font-medium text-ink" lang="ko-KR">
                {b.sound}
              </p>
              <p className="text-xs text-ink-faint" lang="ko-KR">
                se escribe: {b.letters}
              </p>
            </div>
            <div className="flex gap-1">
              {b.ex.map((e) => (
                <button key={e} onClick={() => void playText(e, 0.8)} lang="ko-KR" className="ko rounded-[6px] border border-line px-2 py-1 text-lg hover:bg-paper-sunk" title={`[${pronounce(e).pron}]`}>
                  {e}
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

interface Triplet {
  plain: string;
  aspirated: string;
  tense: string;
  es: string[];
}
const DEFAULT_TRIPLETS: Triplet[] = [
  { plain: "달", aspirated: "탈", tense: "딸", es: ["luna", "máscara", "hija"] },
  { plain: "불", aspirated: "풀", tense: "뿔", es: ["fuego", "hierba", "cuerno"] },
  { plain: "자다", aspirated: "차다", tense: "짜다", es: ["dormir", "patear", "salado"] },
];

export function ConsonantTriplets({ params }: ModuleProps) {
  const list = (params?.triplets as Triplet[] | undefined) ?? DEFAULT_TRIPLETS;
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft">
        El coreano distingue tres series que en español no existen: <strong>lisa</strong> (ㄱ ㄷ ㅂ ㅈ: suave, sin aire), <strong>aspirada</strong> (ㅋ ㅌ ㅍ ㅊ: con un golpe de aire; pon la mano delante de la boca) y <strong>tensa</strong> (ㄲ ㄸ ㅃ ㅉ: garganta apretada, sin aire, tono más alto en la vocal).
      </p>
      {list.map((t) => (
        <Card key={t.plain} className="grid grid-cols-3 gap-2 p-3 text-center">
          {[t.plain, t.aspirated, t.tense].map((w, i) => (
            <button key={w} onClick={() => void playText(w, 0.8)} className="rounded-[8px] border border-line py-2 hover:bg-paper-sunk">
              <span lang="ko-KR" className={cn("ko block text-2xl", ["tone-1", "tone-4", "tone-2"][i])}>
                {w}
              </span>
              <span className="text-[11px] text-ink-faint">
                {["lisa", "aspirada", "tensa"][i]} · {t.es[i]}
              </span>
            </button>
          ))}
        </Card>
      ))}
    </div>
  );
}

export function PhonologyRules({ params }: ModuleProps) {
  const rules = (params?.rules as RuleId[] | undefined) ?? (Object.keys(RULE_INFO) as RuleId[]);
  const examples = (params?.examples as { written: string; spoken: string; es: string }[] | undefined) ?? [];
  const [sel, setSel] = useState(examples[0]?.written ?? "한국어");
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        {rules.map((r) => (
          <p key={r} className="text-sm">
            <span lang="ko-KR" className={cn("mr-1 font-medium", RULE_INFO[r]?.cls)}>
              {RULE_INFO[r]?.native}
            </span>
            <strong className="font-medium">{RULE_INFO[r]?.name}.</strong> <span className="text-ink-soft">{RULE_INFO[r]?.description}</span>
          </p>
        ))}
      </div>
      {examples.length ? (
        <div className="flex flex-wrap gap-1.5">
          {examples.map((e) => (
            <button key={e.written} onClick={() => setSel(e.written)} className={cn("rounded-[8px] border px-2 py-1 text-sm", sel === e.written ? "border-cinnabar" : "border-line")}>
              <span lang="ko-KR">{e.written}</span> <span className="text-ink-faint"><Mixed>{e.es}</Mixed></span>
            </button>
          ))}
        </div>
      ) : null}
      <Card className="space-y-2">
        <PronunciationCompare text={sel} />
        <div className="flex justify-center">
          <AudioButton text={sel} />
        </div>
      </Card>
    </div>
  );
}

export function HangulReading({ params }: ModuleProps) {
  const words = (params?.words as { hangul: string; es: string }[] | undefined) ?? [];
  const [shown, setShown] = useState<Set<number>>(new Set());
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {words.map((w, i) => (
        <Card key={i} className="flex items-center gap-3 p-3">
          <AudioButton text={w.hangul} />
          <span lang="ko-KR" className="ko text-2xl">
            {w.hangul}
          </span>
          <button className="ml-auto text-sm text-ink-faint underline-offset-2 hover:underline" onClick={() => setShown((s) => new Set(s).add(i))}>
            {shown.has(i) ? `${romanizeRR(w.hangul)} · ${w.es}` : "comprobar"}
          </button>
        </Card>
      ))}
    </div>
  );
}

interface ErrPair {
  a: string;
  b: string;
  c?: string;
  contrast: string;
  es: string[];
}
export function SpanishErrors({ params }: ModuleProps) {
  const pairs = (params?.pairs as ErrPair[] | undefined) ?? [];
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft">Los errores típicos de un hispanohablante: ㅓ/ㅗ (abierta frente a cerrada), ㅐ/ㅔ (hoy casi iguales), la ㄹ (r suave entre vocales, l al final) y la triple serie lisa/aspirada/tensa.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {pairs.map((p) => (
          <Card key={p.a + p.b} className="p-3">
            <p className="mb-1 text-xs text-ink-faint" lang="ko-KR">
              {p.contrast}
            </p>
            <div className="flex flex-wrap gap-2">
              {[p.a, p.b, p.c].filter(Boolean).map((w, i) => (
                <button key={w} onClick={() => void playText(w!, 0.8)} className="flex items-center gap-1 rounded-[8px] border border-line px-2 py-1 hover:bg-paper-sunk">
                  <Volume2 className="size-3.5 text-cinnabar" />
                  <span lang="ko-KR" className="ko text-lg">
                    {w}
                  </span>
                  <span className="text-xs text-ink-faint">{p.es[i]}</span>
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export const KO_MODULES = {
  "hangul-consonants": HangulConsonants,
  "hangul-vowels": HangulVowels,
  "syllable-blocks": SyllableBlocks,
  batchim: Batchim,
  "consonant-triplets": ConsonantTriplets,
  "phonology-rules": PhonologyRules,
  "hangul-reading": HangulReading,
  "spanish-errors": SpanishErrors,
};
