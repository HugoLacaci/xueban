"use client";
/** Pasos propios de la Unidad 0 japonesa (kana, dakuten, yōon, っ y vocales largas, acento tonal, kanji). */
import { useMemo, useState } from "react";
import { Volume2 } from "lucide-react";
import { playText, AudioButton } from "@/components/target/audio-button";
import { StrokeOrder } from "@/components/target/stroke-order";
import { TargetText } from "@/components/target/target-text";
import { Card, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ALL_ROWS, DAKUTEN, GOJUON, rowById, YOON, type KanaRow } from "../kana";
import { HIRAGANA_MNEMONICS, KATAKANA_MNEMONICS } from "./mnemonics";
import { PATTERN_INFO, PITCH_PAIRS } from "../pitch";
import { PitchDiagram } from "./common";
import { Mixed } from "@/components/target/mixed";

type Script = "hiragana" | "katakana";
type ModuleProps = { params?: Record<string, unknown>; onFinish?(score: number): void };

function rowsFrom(params?: Record<string, unknown>): KanaRow[] {
  const ids = (params?.rows as string[] | undefined) ?? [];
  const rows = ids.map((id) => rowById(id)).filter((r): r is KanaRow => Boolean(r));
  return rows.length ? rows : GOJUON;
}

/** Cuadrícula de kana con audio: pulsa para oír; los huecos del gojūon se respetan. */
export function KanaGrid({ params }: ModuleProps) {
  const script = (params?.script as Script) ?? "hiragana";
  const rows = rowsFrom(params);
  const [sel, setSel] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-[12px] border border-line bg-paper-raised p-2">
        <table className="mx-auto">
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <th className="pr-3 text-left text-xs font-normal text-ink-faint"><Mixed>{r.name}</Mixed></th>
                {(script === "hiragana" ? r.hiragana : r.katakana).map((k, i) => (
                  <td key={i} className="p-1">
                    {k ? (
                      <button
                        onClick={() => {
                          setSel(k);
                          void playText(k, 0.8);
                        }}
                        className={cn("flex size-16 flex-col items-center justify-center rounded-[10px] border border-line bg-paper transition-colors hover:border-ink/40 hover:bg-paper-sunk sm:size-[4.5rem]", sel === k && "border-cinnabar bg-cinnabar/8")}
                        aria-label={`${k} (${r.romaji[i]})`}
                      >
                        <span lang="ja-JP" className="ja zh-kai text-3xl leading-none">
                          {k}
                        </span>
                        <span className="mt-1 text-[11px] text-ink-faint">{r.romaji[i]}</span>
                      </button>
                    ) : (
                      <span className="block size-16 sm:size-[4.5rem]" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sel ? (
        <Card className="flex flex-wrap items-center gap-4">
          <StrokeOrder char={sel} size={140} />
          <p className="max-w-sm text-sm text-ink-soft">{(script === "hiragana" ? HIRAGANA_MNEMONICS : KATAKANA_MNEMONICS)[sel] ?? "Pulsa ▶ para ver el orden de trazos."}</p>
        </Card>
      ) : (
        <p className="text-xs text-ink-faint">Pulsa un kana para oírlo y ver cómo se escribe. Lee en voz alta cada fila: la vocal japonesa es siempre corta y limpia, como en español.</p>
      )}
    </div>
  );
}

/** Mnemotecnias en español, una tarjeta por kana. */
export function KanaMnemonics({ params }: ModuleProps) {
  const script = (params?.script as Script) ?? "hiragana";
  const rows = rowsFrom(params);
  const table = script === "hiragana" ? HIRAGANA_MNEMONICS : KATAKANA_MNEMONICS;
  const kana = rows.flatMap((r) => (script === "hiragana" ? r.hiragana : r.katakana).map((k, i) => ({ k, ro: r.romaji[i] }))).filter((x) => x.k);
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {kana.map(({ k, ro }) => (
        <Card key={k} className="flex items-start gap-3 p-3">
          <button onClick={() => void playText(k, 0.8)} className="flex size-14 shrink-0 items-center justify-center rounded-[10px] border border-line bg-paper hover:bg-paper-sunk" aria-label={`Oír ${k}`}>
            <span lang="ja-JP" className="ja zh-kai text-3xl">
              {k}
            </span>
          </button>
          <div>
            <p className="text-sm font-medium text-ink">{ro}</p>
            <p className="text-sm text-ink-soft">{table[k] ?? "Inventa tu propia imagen: el dibujo más absurdo es el que mejor se recuerda."}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

/** Practicar la escritura trazo a trazo. */
export function KanaWriting({ params }: ModuleProps) {
  const chars = (params?.chars as string[] | undefined) ?? GOJUON[0].hiragana;
  const [i, setI] = useState(0);
  const [mode, setMode] = useState<"animate" | "quiz">("animate");
  const ch = chars[i % chars.length];
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-wrap justify-center gap-1">
        {chars.map((c, k) => (
          <button key={c + k} onClick={() => setI(k)} lang="ja-JP" className={cn("ja size-10 rounded-[8px] border text-xl", k === i ? "border-cinnabar bg-cinnabar/8" : "border-line")}>
            {c}
          </button>
        ))}
      </div>
      <StrokeOrder key={`${ch}-${mode}`} char={ch} size={220} mode={mode} />
      <div className="flex gap-2">
        <Button variant={mode === "animate" ? "secondary" : "ghost"} size="sm" onClick={() => setMode("animate")}>
          Ver trazos
        </Button>
        <Button variant={mode === "quiz" ? "secondary" : "ghost"} size="sm" onClick={() => setMode("quiz")}>
          Escribir yo
        </Button>
        <Button size="sm" onClick={() => setI((x) => x + 1)}>
          Siguiente
        </Button>
      </div>
      <p className="text-center text-xs text-ink-faint">Orden general: de arriba abajo y de izquierda a derecha. Los trazos que «barren» terminan en punta (はらい).</p>
    </div>
  );
}

/** Leer palabras reales con los kana aprendidos. */
export function KanaReading({ params }: ModuleProps) {
  const words = (params?.words as { kana: string; es: string }[] | undefined) ?? [];
  const [shown, setShown] = useState<Set<number>>(new Set());
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {words.map((w, i) => (
        <Card key={i} className="flex items-center gap-3 p-3">
          <AudioButton text={w.kana} />
          <span lang="ja-JP" className="ja text-2xl">
            {w.kana}
          </span>
          <button className="ml-auto text-sm text-ink-faint underline-offset-2 hover:underline" onClick={() => setShown((s) => new Set(s).add(i))}>
            {shown.has(i) ? w.es : "ver significado"}
          </button>
        </Card>
      ))}
      {!words.length ? <p className="text-sm text-ink-faint">Lee en voz alta y luego comprueba con el audio.</p> : null}
    </div>
  );
}

export function Dakuten() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft">
        Las dos rayitas <strong>゛ (dakuten)</strong> sonorizan la consonante: k→g, s→z, t→d, h→b. El circulito <strong>゜ (handakuten)</strong> convierte h→p. Ojo: じ y ぢ suenan igual (ji), como ず y づ (zu); casi siempre se escribe じ y ず.
      </p>
      <KanaGrid params={{ script: "hiragana", rows: DAKUTEN.map((r) => r.id) }} />
    </div>
  );
}

export function Yoon() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft">
        Un kana de la columna «i» + ゃ・ゅ・ょ <strong>pequeños</strong> forma una sola sílaba (una mora): き + ゃ = きゃ (kya). Compara きや (ki-ya, dos moras) con きゃ (kya, una).
      </p>
      <KanaGrid params={{ script: "hiragana", rows: YOON.map((r) => r.id) }} />
    </div>
  );
}

const LONG_PAIRS = [
  ["おばさん", "おばあさん", "tía / abuela"],
  ["おじさん", "おじいさん", "tío / abuelo"],
  ["きて", "きって", "ven / sello"],
  ["いた", "いった", "estaba / fue"],
  ["ビル", "ビール", "edificio / cerveza"],
  ["ゆき", "ゆうき", "nieve / valor"],
  ["ここ", "こうこう", "aquí / instituto"],
  ["さか", "サッカー", "cuesta / fútbol"],
] as const;

export function SokuonLong() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft">
        En japonés cuenta el <strong>tiempo</strong>: cada mora dura lo mismo. La <strong>っ pequeña</strong> es una pausa de una mora antes de la consonante (きって = ki·t·te). Una vocal larga (おばあさん, ビール con ー) dura el doble. Para un hispanohablante es el error número uno: alarga y corta sin miedo.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {LONG_PAIRS.map(([a, b, es]) => (
          <Card key={a} className="flex items-center justify-between gap-2 p-3">
            <button onClick={() => void playText(a, 0.8)} className="flex items-center gap-1" lang="ja-JP">
              <Volume2 className="size-4 text-cinnabar" /> <span className="ja text-xl">{a}</span>
            </button>
            <span className="text-xs text-ink-faint">{es}</span>
            <button onClick={() => void playText(b, 0.8)} className="flex items-center gap-1" lang="ja-JP">
              <span className="ja text-xl">{b}</span> <Volume2 className="size-4 text-cinnabar" />
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function PitchAccent() {
  const patterns = useMemo(
    () => [
      { kana: "さくら", acc: 0, es: "cerezo" },
      { kana: "ねこ", acc: 1, es: "gato" },
      { kana: "たまご", acc: 2, es: "huevo" },
      { kana: "やま", acc: 2, es: "montaña" },
    ],
    [],
  );
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        El japonés no tiene acento de intensidad como el español, sino <strong>acento tonal</strong>: cada mora es alta (H) o baja (L) y lo que importa es <em>dónde baja</em> el tono. En el japonés estándar la 1.ª y la 2.ª mora siempre tienen alturas distintas. Hay cuatro patrones:
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {patterns.map((p) => {
          const key = p.acc === 0 ? "heiban" : p.acc === 1 ? "atamadaka" : p.acc >= Array.from(p.kana).length ? "odaka" : "nakadaka";
          const info = PATTERN_INFO[key];
          return (
            <Card key={p.kana} className="flex items-center gap-3 p-3">
              <PitchDiagram kana={p.kana} accent={p.acc} showName={false} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">
                  <span lang="ja-JP">{info.native}</span> · <Mixed>{info.name}</Mixed>
                </p>
                <p className="text-xs text-ink-faint"><Mixed>{info.description}</Mixed></p>
                <p className="text-xs text-ink-soft">
                  <span lang="ja-JP" className="ja">
                    {p.kana}
                  </span>{" "}
                  = <Mixed>{p.es}</Mixed>
                </p>
              </div>
              <AudioButton text={p.kana} className="ml-auto" />
            </Card>
          );
        })}
      </div>
      <h3 className="font-serif-es text-lg text-ink">Pares mínimos</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {PITCH_PAIRS.map((pp) => (
          <Card key={pp.a.text} className="flex items-center justify-around gap-2 p-3">
            {[pp.a, pp.b].map((x) => (
              <button key={x.text} onClick={() => void playText(x.text, 0.8)} className="flex flex-col items-center">
                <PitchDiagram kana={x.reading} accent={x.accent} showName={false} />
                <span lang="ja-JP" className="ja text-lg">
                  {x.text}
                </span>
                <span className="text-xs text-ink-faint"><Mixed>{x.es}</Mixed></span>
              </button>
            ))}
          </Card>
        ))}
      </div>
      <p className="text-xs text-ink-faint">Datos de acento: Kanjium (CC BY-SA 4.0). Las voces sintéticas no siempre respetan el acento; para comprobarlo usa OJAD o el diccionario.</p>
    </div>
  );
}

const FIRST_KANJI = [
  ["日", "sol; día", "にち・ひ"],
  ["月", "luna; mes", "げつ・つき"],
  ["山", "montaña", "さん・やま"],
  ["川", "río", "せん・かわ"],
  ["人", "persona", "じん・ひと"],
  ["口", "boca", "こう・くち"],
  ["木", "árbol", "もく・き"],
  ["一", "uno", "いち・ひと"],
  ["二", "dos", "に・ふた"],
  ["三", "tres", "さん・みっ"],
] as const;

export function KanjiIntro() {
  const [sel, setSel] = useState<string>("日");
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft">
        Los kanji vienen del chino y tienen dos tipos de lectura: <strong>on&apos;yomi</strong> (音読み, de origen chino, en compuestos: 日本 <em>nihon</em>) y <strong>kun&apos;yomi</strong> (訓読み, japonesa, sola o con okurigana: 日 <em>hi</em>). No hace falta memorizarlas todas: aprende cada kanji dentro de palabras.
      </p>
      <div className="flex flex-wrap gap-2">
        {FIRST_KANJI.map(([k, es, rd]) => (
          <button key={k} onClick={() => setSel(k)} className={cn("flex flex-col items-center rounded-[10px] border px-3 py-2", sel === k ? "border-cinnabar bg-cinnabar/8" : "border-line")}>
            <span lang="ja-JP" className="ja zh-kai text-3xl">
              {k}
            </span>
            <span className="text-[11px] text-ink-faint">{es}</span>
            <span lang="ja-JP" className="text-[10px] text-ink-faint">
              {rd}
            </span>
          </button>
        ))}
      </div>
      <Card className="flex justify-center">
        <StrokeOrder key={sel} char={sel} size={200} />
      </Card>
    </div>
  );
}

const ES_ERRORS = [
  { t: "Vocales largas y っ", d: "En español no distinguimos duración: おばさん / おばあさん, ビル / ビール. Cuenta moras con los dedos.", ex: "おばあさん" },
  { t: "La «r» japonesa", d: "No es ni la r fuerte ni la doble: es un toque suave entre r, l y d, como la «r» de «pero» muy relajada.", ex: "ありがとう" },
  { t: "う y い que «desaparecen»", d: "Entre consonantes sordas o al final, う e い casi no se oyen: です suena «des», します «shimas».", ex: "です" },
  { t: "ん", d: "Se asimila a lo que sigue: さんぽ suena «sampo», てんき «tenki» con n velar. Ocupa una mora entera.", ex: "さんぽ" },
  { t: "ふ", d: "No es la «f» con los dientes: se sopla con los labios redondeados, como apagando una vela.", ex: "ふじさん" },
  { t: "Acento de intensidad", d: "No subrayes ninguna sílaba con fuerza (TO-kyo): el japonés marca la melodía, no la fuerza.", ex: "とうきょう" },
];

export function SpanishErrors() {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {ES_ERRORS.map((e) => (
        <Card key={e.t} className="p-3">
          <div className="flex items-center justify-between">
            <p className="font-medium text-ink">{e.t}</p>
            <AudioButton text={e.ex} size="sm" />
          </div>
          <p className="text-sm text-ink-soft">{e.d}</p>
          <TargetText text={e.ex} size="md" interactive={false} markUnknown={false} />
        </Card>
      ))}
    </div>
  );
}

/** Tabla completa (para la página de caracteres). */
export function KanaChart({ script }: { script: Script }) {
  return <KanaGrid params={{ script, rows: ALL_ROWS.map((r) => r.id) }} />;
}

export const JA_MODULES = {
  "kana-grid": KanaGrid,
  "kana-mnemonics": KanaMnemonics,
  "kana-writing": KanaWriting,
  "kana-reading": KanaReading,
  dakuten: Dakuten,
  yoon: Yoon,
  "sokuon-long": SokuonLong,
  "pitch-accent": PitchAccent,
  "kanji-intro": KanjiIntro,
  "spanish-errors": SpanishErrors,
};

export { Badge };
