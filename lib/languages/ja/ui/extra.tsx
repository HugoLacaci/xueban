"use client";
/** Páginas propias del japonés en «Aprender»: conjugación, cortesía (敬語) y contadores (助数詞). */
import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";
import { AudioButton } from "@/components/target/audio-button";
import { Markdown } from "@/components/learn/markdown";
import { ExerciseRunner } from "@/components/exercises/runner";
import { cn, seededRandom } from "@/lib/utils";
import { CLASS_INFO, conjugate, FORMS, type WordClass } from "../conjugation";
import { JA_COUNTERS, jaCounters } from "../characters";
import { genConjugation } from "../exercises";
import { SEED } from "../content";
import { KanaInput } from "./common";
import type { Exercise, PoolWord } from "@/lib/exercises/types";
import { toHiragana } from "../kana";
import { Mixed } from "@/components/target/mixed";

const SAMPLES: { w: string; r: string; cls: WordClass; es: string }[] = [
  { w: "食べる", r: "たべる", cls: "ichidan", es: "comer" },
  { w: "飲む", r: "のむ", cls: "godan", es: "beber" },
  { w: "書く", r: "かく", cls: "godan", es: "escribir" },
  { w: "話す", r: "はなす", cls: "godan", es: "hablar" },
  { w: "行く", r: "いく", cls: "godan", es: "ir" },
  { w: "帰る", r: "かえる", cls: "godan", es: "volver" },
  { w: "する", r: "する", cls: "suru", es: "hacer" },
  { w: "来る", r: "くる", cls: "kuru", es: "venir" },
  { w: "高い", r: "たかい", cls: "i-adj", es: "caro; alto" },
  { w: "いい", r: "いい", cls: "i-adj", es: "bueno" },
  { w: "静か", r: "しずか", cls: "na-adj", es: "tranquilo" },
];

function conjugationPool(): PoolWord[] {
  return SEED.words
    .filter((w) => ["godan", "ichidan", "suru", "kuru", "i-adj", "na-adj"].includes(String(w.extra?.word_type)))
    .map((w) => ({ id: w.id, hanzi: w.hanzi, pinyin: w.pinyin, meaning: w.meaning, wordType: String(w.extra?.word_type) }) as PoolWord);
}

export function ConjugationPage() {
  const [sel, setSel] = useState(SAMPLES[0]);
  const [mine, setMine] = useState("");
  const [drill, setDrill] = useState<Exercise[] | null>(null);
  const isAdj = sel.cls === "i-adj" || sel.cls === "na-adj";
  const forms = FORMS.filter((f) => f.appliesTo.includes(isAdj ? "adj" : "verb"));
  const startDrill = () => {
    const rng = seededRandom(Date.now() % 100000);
    const pool = { words: conjugationPool(), allWords: conjugationPool(), sentences: [] };
    const out: Exercise[] = [];
    for (let i = 0; i < 40 && out.length < 12; i++) {
      const e = genConjugation(pool, rng);
      if (e) out.push(e);
    }
    setDrill(out);
  };
  if (drill) return <ExerciseRunner exercises={drill} context="practice" title="Conjugación" onFinish={() => setDrill(null)} />;
  return (
    <div className="space-y-5">
      <PageHeader title="Conjugación" zh="活用" subtitle="Tablas interactivas de verbos (godan, ichidan, する, 来る) y adjetivos い/な, con las irregularidades del nivel N5–N4, y un generador de ejercicios con todo el vocabulario de la semilla." action={<Button onClick={startDrill}>Practicar (12)</Button>} />
      <div className="flex flex-wrap gap-1.5">
        {SAMPLES.map((s) => (
          <button key={s.w} onClick={() => setSel(s)} className={cn("rounded-[8px] border px-2.5 py-1 text-sm", sel.w === s.w ? "border-ink bg-ink text-paper" : "border-line hover:bg-paper-sunk")}>
            <span lang="ja-JP" className="ja">
              {s.w}
            </span>{" "}
            <span className="opacity-70"><Mixed>{s.es}</Mixed></span>
          </button>
        ))}
      </div>
      <Card>
        <div className="mb-3 flex items-center gap-2">
          <span lang="ja-JP" className="ja text-3xl">
            {sel.w}
          </span>
          <AudioButton text={sel.w} />
          <Badge variant="outline">{CLASS_INFO.find((c) => c.id === sel.cls)?.name}</Badge>
        </div>
        <p className="mb-3 text-sm text-ink-soft">{CLASS_INFO.find((c) => c.id === sel.cls)?.description}</p>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {forms.map((f) => {
            const v = conjugate(sel.w, f.id, sel.cls);
            const r = conjugate(sel.r, f.id, sel.cls);
            return v ? (
              <div key={f.id} className="flex items-center justify-between gap-2 rounded-[8px] border border-line px-3 py-1.5">
                <span className="text-sm text-ink-soft">
                  <Mixed>{f.name}</Mixed> <span lang="ja-JP" className="text-xs text-ink-faint">{f.native}</span> {f.level === "N4" ? <Badge variant="muted">N4</Badge> : null}
                </span>
                <span className="flex items-center gap-1">
                  <span lang="ja-JP" className="ja text-lg">
                    {v}
                  </span>
                  {r && r !== v ? <span className="text-xs text-ink-faint">{r}</span> : null}
                  <AudioButton text={v} size="sm" />
                </span>
              </div>
            ) : null;
          })}
        </div>
      </Card>
      <Card>
        <h2 className="mb-2 font-serif-es text-lg text-ink">Conjuga cualquier verbo</h2>
        <KanaInput value={mine} onChange={setMine} mode="text" placeholder="Escribe un verbo en forma de diccionario: yomu → よむ" />
        <MineTable word={mine} />
      </Card>
      <Card>
        <h2 className="mb-2 font-serif-es text-lg text-ink">Las irregularidades del nivel</h2>
        <Markdown>
          {`- **行く** es godan pero su forma て es **行って** (no ~~行いて~~).
- **ある** forma su negativo con **ない** (no ~~あらない~~).
- **いい** se conjuga desde **よい**: よくない, よかった, よくて.
- **する** y **来る** son totalmente irregulares (tabla de arriba).
- Verbos que parecen ichidan pero son godan: **帰る, 入る, 知る, 走る, 切る, 要る** → 帰らない, 帰ります, 帰って.
- Forma て de los godan según la terminación: う・つ・る → **って**; む・ぶ・ぬ → **んで**; く → **いて**; ぐ → **いで**; す → **して**.`}
        </Markdown>
      </Card>
    </div>
  );
}

function MineTable({ word }: { word: string }) {
  const w = toHiragana(word.trim());
  const cls: WordClass | undefined = /する$/.test(w) ? "suru" : w === "くる" ? "kuru" : /[いえ]る$/.test(w) ? undefined : /[うくぐすつぬぶむる]$/.test(w) ? "godan" : /い$/.test(w) ? "i-adj" : undefined;
  const [choice, setChoice] = useState<WordClass | undefined>(undefined);
  const c = choice ?? cls;
  if (!w) return null;
  return (
    <div className="mt-3 space-y-2">
      {/[いえ]る$/.test(w) ? (
        <p className="text-sm text-ink-soft">
          Termina en -iru/-eru: puede ser ichidan (たべる) o godan (かえる).{" "}
          <button className={cn("underline", c === "ichidan" && "font-semibold")} onClick={() => setChoice("ichidan")}>
            ichidan
          </button>{" "}
          ·{" "}
          <button className={cn("underline", c === "godan" && "font-semibold")} onClick={() => setChoice("godan")}>
            godan
          </button>
        </p>
      ) : null}
      {c ? (
        <div className="grid gap-1 sm:grid-cols-3">
          {FORMS.filter((f) => f.appliesTo.includes(c === "i-adj" || c === "na-adj" ? "adj" : "verb")).map((f) => (
            <span key={f.id} className="rounded border border-line px-2 py-1 text-sm">
              <span className="text-xs text-ink-faint">{f.name}: </span>
              <span lang="ja-JP">{conjugate(w, f.id, c)}</span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const KEIGO = [
  { name: "Lenguaje llano", native: "普通体", desc: "Con familia y amigos: 食べる, 行く, だ.", ex: [["今日は雨だ。", "Hoy llueve."], ["何食べる？", "¿Qué comes?"]] },
  { name: "Cortés (teineigo)", native: "丁寧語", desc: "El estándar con desconocidos, profesores y en clase: です・ます.", ex: [["今日は雨です。", "Hoy llueve."], ["何を食べますか。", "¿Qué va a comer?"]] },
  { name: "Respetuoso (sonkeigo)", native: "尊敬語", desc: "Eleva las acciones del otro (clientes, superiores). Verbos especiales: いらっしゃる (ir/venir/estar), 召し上がる (comer), おっしゃる (decir).", ex: [["先生はいらっしゃいますか。", "¿Está el profesor?"], ["どうぞ召し上がってください。", "Sírvase, por favor."]] },
  { name: "Humilde (kenjōgo)", native: "謙譲語", desc: "Rebaja tus propias acciones: 参ります (ir), いただきます (recibir/comer), 申します (llamarse).", ex: [["スペインから参りました。", "Vengo de España."], ["ウーゴと申します。", "Me llamo Hugo."]] },
];

export function PolitenessPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Cortesía (keigo)" zh="敬語" subtitle="En el N5 basta con dominar です・ます; el resto conviene reconocerlo: lo oirás en tiendas, estaciones y en la universidad." />
      {KEIGO.map((k) => (
        <Card key={k.native}>
          <p className="font-serif-es text-lg text-ink">
            <Mixed>{k.name}</Mixed> <span lang="ja-JP" className="ja text-base text-cinnabar">{k.native}</span>
          </p>
          <p className="text-sm text-ink-soft"><Mixed>{k.desc}</Mixed></p>
          <ul className="mt-2 space-y-1">
            {k.ex.map(([ja, es]) => (
              <li key={ja} className="flex items-center gap-2 text-sm">
                <AudioButton text={ja} size="sm" />
                <span lang="ja-JP" className="ja">
                  {ja}
                </span>
                <span className="text-ink-faint">{es}</span>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

export function CountersPage() {
  const [n, setN] = useState(3);
  const list = useMemo(() => JA_COUNTERS, []);
  return (
    <div className="space-y-4">
      <PageHeader title="Contadores" zh="助数詞" subtitle={jaCounters.markdown?.replace(/\*\*/g, "")} action={<Button variant="ghost" onClick={() => setN(1 + Math.floor(Math.random() * 10))}><RefreshCw /> Otro número</Button>} />
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((k) => (
          <button key={k} onClick={() => setN(k)} className={cn("size-9 rounded-full border text-sm tabular", n === k ? "border-ink bg-ink text-paper" : "border-line")}>
            {k}
          </button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {list.map((c) => (
          <Card key={c.counter} className="p-3">
            <div className="flex items-center justify-between">
              <p>
                <span lang="ja-JP" className="ja text-2xl">
                  {c.counter}
                </span>{" "}
                <span className="text-sm text-ink-faint"><Mixed>{c.es}</Mixed></span>
              </p>
              <span className="flex items-center gap-1">
                <span lang="ja-JP" className="ja text-lg text-cinnabar">
                  {c.series[n - 1]}
                </span>
                <AudioButton text={c.series[n - 1]} size="sm" />
              </span>
            </div>
            <p className="text-xs text-ink-faint">
              Ej.: <span lang="ja-JP">{c.nouns.join("・")}</span>
            </p>
            {c.note ? <p className="mt-1 text-xs text-ink-soft"><Mixed>{c.note}</Mixed></p> : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
