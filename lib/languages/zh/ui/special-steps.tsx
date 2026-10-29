"use client";
import { useEffect, useMemo, useState } from "react";
import { Volume2 } from "lucide-react";
import { BASIC_STROKES, INITIALS, SPANISH_ERRORS, STROKE_RULES, SYLLABLES, SYLLABLE_EXAMPLES, TONES, TONE_PAIRS } from "../data/pronunciation";
import { addToneMark, type Tone } from "../pinyin/tones";
import { RADICALS, charsByRadical, getHsk, loadCharInfo, loadHsk, radicalInfo } from "../dictionary";
import { playText, AudioButton } from "@/components/target/audio-button";
import { Pinyin } from "@/components/target/reading";
import { Hanzi, ChineseText } from "@/components/target/target-text";
import { StrokeOrder } from "@/components/target/stroke-order";
import { Card, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { PitchGraph } from "@/components/target/pitch-graph";
import { idealContour, normalizeContour } from "@/lib/pitch";
import { cn } from "@/lib/utils";
import { Mixed } from "@/components/target/mixed";

/** Reproduce una sílaba en un tono: usa un carácter de ejemplo si existe (mejor TTS). */
function speakSyllable(syl: string, tone: Tone) {
  const ex = SYLLABLE_EXAMPLES[`${syl}${tone}`];
  void playText(ex ?? addToneMark(syl, tone), 0.8);
}

export function TonesStep() {
  return (
    <div className="space-y-3">
      {TONES.map((t) => (
        <Card key={t.tone} className="flex flex-wrap items-center gap-4">
          <div className="w-28 shrink-0">
            <PitchGraph model={normalizeContour(idealContour([t.tone]))} user={[]} height={60} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={cn("text-lg font-semibold", `tone-${t.tone}`)}><Mixed>{t.name}</Mixed></span>
              <Badge variant="outline">{t.contour}</Badge>
            </div>
            <p className="text-sm text-ink-soft"><Mixed>{t.description}</Mixed></p>
            <p className="text-xs text-ink-faint"><Mixed>{t.tip}</Mixed></p>
          </div>
          <button onClick={() => void playText(t.example.zh)} className="flex items-center gap-2 rounded-[10px] border border-line bg-paper-raised px-3 py-2 hover:bg-paper-sunk">
            <Hanzi text={t.example.zh} size="lg" />
            <span>
              <Pinyin text={t.example.py} className="block text-base" />
              <span className="block text-xs text-ink-faint"><Mixed>{t.example.es}</Mixed></span>
            </span>
            <Volume2 className="size-4 text-cinnabar" />
          </button>
        </Card>
      ))}
      <Card>
        <p className="text-sm">
          <strong>Práctica:</strong> pulsa en orden 妈 má mǎ mà y repite dibujando el tono con la mano. Luego prueba la frase <ChineseText text="妈妈骑马，马慢，妈妈骂马。" size="sm" ruby={false} /> con el botón de audio.
        </p>
        <AudioButton text="妈妈骑马，马慢，妈妈骂马。" className="mt-2" />
      </Card>
    </div>
  );
}

export function PinyinTableStep() {
  const [tone, setTone] = useState<Tone>(1);
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-ink-faint">Tono al pulsar:</span>
        {([1, 2, 3, 4] as Tone[]).map((t) => (
          <button key={t} onClick={() => setTone(t)} className={cn("rounded-md border px-3 py-1 text-sm", tone === t ? `border-current tone-${t} bg-paper-sunk` : "border-line")}>
            {t}.º
          </button>
        ))}
        {selected ? (
          <span className="ml-auto flex items-center gap-1 text-sm">
            <span className="text-ink-faint">{selected}:</span>
            {([1, 2, 3, 4] as Tone[]).map((t) => (
              <button key={t} onClick={() => speakSyllable(selected, t)} className={cn("rounded-md border border-line px-2 py-0.5", `tone-${t}`)}>
                {addToneMark(selected, t)}
              </button>
            ))}
          </span>
        ) : null}
      </div>
      <div className="max-h-[60vh] overflow-auto rounded-[10px] border border-line bg-paper-raised scrollbar-thin">
        <table className="text-xs">
          <tbody>
            {["-", ...INITIALS].map((ini) => (
              <tr key={ini} className="border-b border-line">
                <th className="sticky left-0 bg-paper-sunk px-2 py-1 text-left font-mono text-sm">{ini === "-" ? "∅" : ini}</th>
                <td className="px-1 py-1">
                  <div className="flex flex-wrap gap-1">
                    {(SYLLABLES[ini] ?? []).map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setSelected(s);
                          speakSyllable(s, tone);
                        }}
                        className={cn("rounded border border-line px-1.5 py-0.5 font-mono hover:bg-paper-sunk", selected === s && "border-cinnabar bg-cinnabar/10")}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-faint">Pulsa una sílaba para oírla en el tono elegido; arriba a la derecha puedes oírla en los cuatro tonos. Las sílabas sin inicial (∅) se escriben con y/w: yi, wu, yu.</p>
    </div>
  );
}

export function TonePairsStep() {
  const groups = useMemo(() => {
    const m = new Map<string, typeof TONE_PAIRS>();
    for (const p of TONE_PAIRS) m.set(p.pattern[0], [...(m.get(p.pattern[0]) ?? []), p]);
    return Array.from(m.entries());
  }, []);
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {groups.map(([first, pairs]) => (
          <Card key={first} className="p-3">
            <p className={cn("mb-2 text-xs font-medium uppercase tracking-wide", `tone-${first}`)}>Primera sílaba: {first}.º tono</p>
            <ul className="space-y-1">
              {pairs.map((p) => (
                <li key={p.pattern}>
                  <button onClick={() => void playText(p.word)} className="flex w-full items-center gap-3 rounded-lg px-2 py-1 text-left hover:bg-paper-sunk">
                    <span className="w-12 font-mono text-xs text-ink-faint">{p.pattern.replace("0", "·").split("").join("+")}</span>
                    <Hanzi text={p.word} size="md" />
                    <Pinyin text={p.pinyin} className="text-sm" />
                    <span className="ml-auto text-xs text-ink-faint"><Mixed>{p.label}</Mixed></span>
                    <Volume2 className="size-3.5 text-cinnabar" />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
      <Card>
        <h3 className="mb-1 text-sm font-semibold">Sandhi en acción</h3>
        <ul className="space-y-1 text-sm">
          {[
            ["你好", "nǐ hǎo → ní hǎo", "3+3 → 2+3"],
            ["不是", "bù shì → bú shì", "不 + 4.º → bú"],
            ["不好", "bù hǎo", "不 + 3.º → sin cambio"],
            ["一个", "yī ge → yí ge", "一 + 4.º (个 gè) → yí"],
            ["一天", "yī tiān → yì tiān", "一 + 1.º → yì"],
            ["第一", "dì-yī", "ordinal → sin cambio"],
          ].map(([zh, py, why]) => (
            <li key={zh} className="flex items-center gap-3">
              <AudioButton text={zh} size="sm" />
              <Hanzi text={zh} size="md" />
              <span className="font-mono text-xs">{py}</span>
              <span className="ml-auto text-xs text-ink-faint">{why}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export function SpanishErrorsStep() {
  return (
    <div className="space-y-3">
      {SPANISH_ERRORS.map((e) => (
        <Card key={e.title}>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold"><Mixed>{e.title}</Mixed></h3>
            {e.sounds.map((s) => (
              <Badge key={s} variant="outline">
                {s}
              </Badge>
            ))}
          </div>
          <p className="mt-1 text-sm text-ink-soft">{e.problem}</p>
          <p className="mt-1 text-sm">
            <strong>Truco:</strong> <Mixed>{e.tip}</Mixed>
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {e.minimalPairs.map((p, i) => (
              <div key={i} className="flex items-center gap-1 rounded-[10px] border border-line bg-paper p-1.5">
                {[p.a, p.b].map((x) => (
                  <button key={x.zh} onClick={() => void playText(x.zh, 0.8)} className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-paper-sunk">
                    <Hanzi text={x.zh} size="md" />
                    <span>
                      <Pinyin text={x.py} className="block text-sm" />
                      <span className="block text-[11px] text-ink-faint"><Mixed>{x.es}</Mixed></span>
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

export function StrokesStep() {
  return (
    <div className="space-y-3">
      <Card>
        <h3 className="mb-2 text-sm font-semibold">Los 8 trazos básicos</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {BASIC_STROKES.map((s) => (
            <div key={s.name} className="rounded-[10px] border border-line bg-paper p-2 text-center">
              <span lang="zh-CN" className="zh-kai block text-3xl">
                {s.shape}
              </span>
              <span lang="zh-CN" className="zh text-sm">
                <Mixed>{s.name}</Mixed>
              </span>{" "}
              <Pinyin text={s.py} className="text-xs" />
              <span className="block text-[11px] text-ink-faint">en {s.example}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h3 className="mb-2 text-sm font-semibold">Reglas del orden de trazos (pulsa ▶ para ver la animación)</h3>
        <ul className="grid gap-3 sm:grid-cols-2">
          {STROKE_RULES.map((r) => (
            <li key={r.rule} className="flex items-center gap-3">
              <StrokeOrder char={r.zh} size={72} autoplay={false} controls={false} />
              <div>
                <p className="text-sm font-medium">{r.rule}</p>
                <p className="text-xs text-ink-faint">{r.example}</p>
                <Button size="sm" variant="ghost" className="mt-0.5 h-7 px-2 text-xs" onClick={() => void playText(r.zh)}>
                  <Volume2 /> oír
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export function RadicalsStep({ radicals }: { radicals: string[] }) {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    void Promise.all([loadCharInfo(), loadHsk()]).then(() => setReady(true));
  }, []);
  const pool = useMemo(() => {
    const h = ready ? getHsk() : undefined;
    if (!h) return undefined;
    const set = new Set<string>();
    for (const key of ["3.0", "2.0"] as const) for (const lv of [1, 2, 3]) for (const c of h.chars[key]?.[lv] ?? []) set.add(c);
    return set;
  }, [ready]);
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {radicals.map((r) => {
          const info = radicalInfo(r) ?? RADICALS.find((x) => x.radical === r);
          const chars = ready ? charsByRadical(r, pool).slice(0, 10) : [];
          return (
            <button key={r} onClick={() => setOpen(open === r ? null : r)} className={cn("rounded-[10px] border bg-paper-raised p-3 text-left transition-colors hover:bg-paper-sunk", open === r ? "border-cinnabar" : "border-line")}>
              <div className="flex items-center gap-3">
                <span lang="zh-CN" className="zh text-3xl">
                  {r}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <Pinyin text={info?.pinyin ?? ""} className="text-sm" />
                    <span className="truncate text-sm"><Mixed>{info?.meaning}</Mixed></span>
                  </div>
                  <p className="text-[11px] text-ink-faint">{info?.variants.length ? `variantes: ${info.variants.join(" ")}` : `radical n.º ${info?.number ?? "?"}`}</p>
                </div>
              </div>
              {chars.length ? (
                <p lang="zh-CN" className="zh mt-2 text-lg leading-tight text-ink-soft">
                  {chars.join(" ")}
                </p>
              ) : null}
              {open === r ? (
                <div className="mt-2 flex items-center gap-2">
                  <StrokeOrder char={r} size={64} controls={false} />
                  <span className="text-xs text-ink-faint">Pulsa los caracteres de la ficha del diccionario para ver cómo aporta el significado.</span>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-ink-faint">Debajo de cada radical: caracteres HSK que lo contienen. Fíjate en cómo el radical anticipa el significado (氵→ líquidos, 讠→ hablar, 亻→ personas).</p>
    </div>
  );
}
