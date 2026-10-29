"use client";
/** Página «Kana y kanji», ficha de carácter, extras del diccionario (componentes + dibujo) y kanji del día. */
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Lightbulb, Save } from "lucide-react";
import { db } from "@/lib/db";
import { useKnowledge } from "@/lib/knowledge";
import Link from "@/lib/languages/link";
import { Button } from "@/components/ui/button";
import { Badge, Card, PageHeader, Tabs, TabsContent, TabsList, TabsTrigger, Textarea } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { StrokeOrder } from "@/components/target/stroke-order";
import { Reading } from "@/components/target/reading";
import { AudioButton } from "@/components/target/audio-button";
import { WritingGrid } from "@/components/ornament/writing-grid";
import { SealTag } from "@/components/ornament/seal";
import { HandwritingPad } from "@/components/target/handwriting-pad";
import type { Candidate } from "@/lib/handwriting";
import { cn } from "@/lib/utils";
import { isKana, isKanji, KANA_LIST, toRomaji } from "../kana";
import { jaCharacters, jlptData, kanjiInfo, loadKanji, radkTable } from "../characters";
import { lookupFirstJa, wordsContainingJa, jaDictionary } from "../dictionary";
import { KanaChart } from "./modules";
import { HIRAGANA_MNEMONICS, KATAKANA_MNEMONICS } from "./mnemonics";

function useKanjiLoaded() {
  const [ok, setOk] = useState(jaCharacters.loaded());
  useEffect(() => {
    void loadKanji().then(() => setOk(true));
  }, []);
  return ok;
}

export function JaCharactersPage() {
  const ok = useKanjiLoaded();
  const known = useKnowledge((s) => s.known);
  const knownChars = useKnowledge((s) => s.knownChars);
  const [level, setLevel] = useState("N5");
  const [sel, setSel] = useState<string | null>(null);
  const states = useLiveQuery(() => db.charStates.where("lang").equals("ja").toArray(), []) ?? [];
  const stMap = useMemo(() => new Map(states.map((s) => [s.hanzi, s])), [states]);
  const list = ok ? (jlptData()?.kanji[level] ?? []) : [];
  const isKnown = (c: string) => stMap.get(c)?.known || knownChars.has(c) || Array.from(known).some((w) => w.includes(c));
  return (
    <div className="space-y-4">
      <PageHeader title="Kana y kanji" zh="文字" subtitle="Hiragana y katakana con audio y orden de trazos (KanjiVG), y los kanji por nivel JLPT con lecturas on/kun, significados en español (KANJIDIC2) y componentes." />
      <Tabs defaultValue="hiragana">
        <TabsList className="w-full">
          <TabsTrigger value="hiragana" className="flex-1">
            ひらがな
          </TabsTrigger>
          <TabsTrigger value="katakana" className="flex-1">
            カタカナ
          </TabsTrigger>
          <TabsTrigger value="kanji" className="flex-1">
            漢字
          </TabsTrigger>
        </TabsList>
        <TabsContent value="hiragana">
          <KanaChart script="hiragana" />
        </TabsContent>
        <TabsContent value="katakana">
          <KanaChart script="katakana" />
        </TabsContent>
        <TabsContent value="kanji">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {["N5", "N4", "N3", "N1"].map((l) => (
              <button key={l} onClick={() => setLevel(l)} className={cn("rounded-full border px-3 py-1 text-sm", level === l ? "border-ink bg-ink text-paper" : "border-line")}>
                {l === "N3" ? "N3–N2" : l}
              </button>
            ))}
            <span className="ml-auto text-xs text-ink-faint tabular">
              {list.filter(isKnown).length} / {list.length} conocidos
            </span>
          </div>
          <p className="mb-2 text-xs text-ink-faint">Niveles orientativos: KANJIDIC2 usa los 4 niveles del JLPT anterior a 2010 (no hay listas oficiales actuales).</p>
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-10">
            {list.map((c) => (
              <button key={c} onClick={() => setSel(c)} lang="ja-JP" className={cn("ja aspect-square rounded-[8px] border text-2xl transition-colors hover:bg-paper-sunk", sel === c ? "border-cinnabar" : "border-line", isKnown(c) && "bg-celadon/14")}>
                {c}
              </button>
            ))}
          </div>
          {sel ? (
            <div className="mt-4">
              <JaCharacterDetail char={sel} />
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function JaCharacterDetail({ char, onNavigate }: { char: string; onNavigate?(q: string): void }) {
  const ok = useKanjiLoaded();
  const [, setTick] = useState(0);
  useEffect(() => {
    void jaDictionary.load().then(() => setTick((t) => t + 1));
  }, []);
  const st = useLiveQuery(() => db.charStates.get(`ja:${char}`), [char]);
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const info = ok ? jaCharacters.info(char) : undefined;
  const k = kanjiInfo(char);
  const words = isKanji(char) ? wordsContainingJa(char, 12) : [];
  const save = async (patch: Partial<{ known: boolean; canWrite: boolean; mnemonic: string }>) => {
    const cur = await db.charStates.get(`ja:${char}`);
    await db.charStates.put({ id: `ja:${char}`, lang: "ja", hanzi: char, known: cur?.known ?? false, canWrite: cur?.canWrite ?? false, writingAttempts: cur?.writingAttempts ?? 0, writingMistakes: cur?.writingMistakes ?? 0, mnemonic: cur?.mnemonic, ...patch, updatedAt: Date.now() });
  };
  const kanaMn = isKana(char) ? (HIRAGANA_MNEMONICS[char] ?? KATAKANA_MNEMONICS[char]) : undefined;
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start gap-5">
        <StrokeOrder char={char} size={184} />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <WritingGrid faint size={72}>
              <span lang="ja-JP" className="ja zh-serif text-5xl leading-none">
                {char}
              </span>
            </WritingGrid>
            <AudioButton text={char} />
            {info?.level ? <SealTag>{info.level}</SealTag> : null}
            {info?.strokes ? <Badge variant="muted">{info.strokes} trazos</Badge> : null}
          </div>
          {isKana(char) ? (
            <p className="text-sm text-ink-soft">
              {KANA_LIST.find((x) => x.kana === char)?.script === "katakana" ? "Katakana" : "Hiragana"} · se lee «{toRomaji(char)}».
            </p>
          ) : null}
          {k ? (
            <>
              <p className="font-serif-es text-xl text-ink">{k.es.length ? k.es.join(", ") : k.en.join(", ")}</p>
              {k.es.length ? <p className="text-xs text-ink-faint">en: {k.en.join(", ")}</p> : null}
              <p className="text-sm">
                <span className="mr-1 text-xs uppercase text-ink-faint">on</span>
                <span lang="ja-JP" className="ja">
                  {k.on.join("、") || "—"}
                </span>
                <span className="ml-3 mr-1 text-xs uppercase text-ink-faint">kun</span>
                <span lang="ja-JP" className="ja">
                  {k.kun.join("、") || "—"}
                </span>
              </p>
              {k.c.length ? (
                <p className="flex flex-wrap items-center gap-1 text-sm text-ink-faint">
                  Componentes:
                  {k.c.map((c) => (
                    <button key={c} lang="ja-JP" className="ja rounded border border-line px-1.5 text-lg text-ink hover:bg-paper-sunk" onClick={() => onNavigate?.(c)}>
                      {c}
                    </button>
                  ))}
                </p>
              ) : null}
            </>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={st?.known ? "jade" : "outline"} onClick={() => void save({ known: !st?.known })}>
              {st?.known ? "Lo reconozco ✓" : "Marcar como reconocido"}
            </Button>
            <Button size="sm" variant={st?.canWrite ? "jade" : "outline"} onClick={() => void save({ canWrite: !st?.canWrite })}>
              {st?.canWrite ? "Sé escribirlo ✓" : "Marcar: sé escribirlo"}
            </Button>
          </div>
        </div>
      </div>
      <div className="rounded-[10px] border border-line bg-paper-sunk/50 p-3">
        <p className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-ink-faint">
          <Lightbulb className="size-3.5" /> Mnemotecnia
        </p>
        {mnemonic !== null ? (
          <div className="space-y-2">
            <Textarea value={mnemonic} onChange={(e) => setMnemonic(e.target.value)} aria-label="Mnemotecnia" />
            <Button
              size="sm"
              onClick={() => {
                void save({ mnemonic: mnemonic.trim() || undefined });
                setMnemonic(null);
                toast.success("Mnemotecnia guardada");
              }}
            >
              <Save /> Guardar
            </Button>
          </div>
        ) : (
          <button className="text-left text-sm text-ink-soft" onClick={() => setMnemonic(st?.mnemonic ?? kanaMn ?? "")}>
            {st?.mnemonic ?? kanaMn ?? "Inventa una historia con los componentes y el significado (pulsa para editar)."}
          </button>
        )}
      </div>
      {words.length ? (
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-wide text-ink-faint">Palabras con {char}</p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {words.map((w) => (
              <button key={w.s + w.p} onClick={() => onNavigate?.(w.s)} className="flex items-center gap-2 rounded-[8px] border border-line px-2 py-1 text-left hover:bg-paper-sunk">
                <span lang="ja-JP" className="ja text-lg">
                  {w.s}
                </span>
                <Reading text={w.p} className="text-xs" />
                <span className="truncate text-xs text-ink-faint">{w.es ?? w.en.slice(0, 2).join("; ")}</span>
                {w.lv ? <Badge variant="outline" className="ml-auto">{w.lv}</Badge> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  );
}

/** Búsqueda de kanji por componentes (estilo jisho.org, RADKFILE) y por dibujo. */
export function JaDictionaryExtras({ onPick }: { onPick(q: string): void }) {
  const ok = useKanjiLoaded();
  const [tab, setTab] = useState<"radk" | "draw">("radk");
  const [picked, setPicked] = useState<string[]>([]);
  const [cands, setCands] = useState<Candidate[]>([]);
  const table = ok ? radkTable() : {};
  const byStroke = useMemo(() => {
    const m = new Map<number, string[]>();
    for (const [r, [s]] of Object.entries(table)) m.set(s, [...(m.get(s) ?? []), r]);
    return Array.from(m.entries()).sort((a, b) => a[0] - b[0]);
  }, [table]);
  const results = useMemo(() => {
    if (!picked.length) return [];
    let set = null as Set<string> | null;
    for (const r of picked) {
      const ks = new Set(Array.from(table[r]?.[1] ?? ""));
      set = set ? new Set([...set].filter((k: string) => ks.has(k))) : ks;
    }
    return [...(set ?? [])].sort((a, b) => (kanjiInfo(a)?.s ?? 99) - (kanjiInfo(b)?.s ?? 99)).slice(0, 120);
  }, [picked, table]);
  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        <button className={cn("rounded-full border px-3 py-1 text-xs", tab === "radk" ? "border-ink bg-ink text-paper" : "border-line")} onClick={() => setTab("radk")}>
          Por componentes
        </button>
        <button className={cn("rounded-full border px-3 py-1 text-xs", tab === "draw" ? "border-ink bg-ink text-paper" : "border-line")} onClick={() => setTab("draw")}>
          Dibujar
        </button>
      </div>
      {tab === "radk" ? (
        <>
          <div className="max-h-56 overflow-y-auto rounded-[10px] border border-line bg-paper-raised p-2 scrollbar-thin">
            {byStroke.map(([s, rs]) => (
              <div key={s} className="flex flex-wrap items-center gap-1 py-0.5">
                <span className="w-5 text-right text-[10px] text-ink-faint tabular">{s}</span>
                {rs.map((r) => (
                  <button key={r} lang="ja-JP" onClick={() => setPicked((p) => (p.includes(r) ? p.filter((x) => x !== r) : [...p, r]))} className={cn("ja size-8 rounded border text-lg", picked.includes(r) ? "border-cinnabar bg-cinnabar/12" : "border-line hover:bg-paper-sunk")}>
                    {r}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {results.map((k) => (
              <button key={k} lang="ja-JP" onClick={() => onPick(k)} className="ja min-h-10 min-w-10 rounded-[8px] border border-line bg-paper-raised text-2xl hover:bg-paper-sunk">
                {k}
              </button>
            ))}
            {picked.length && !results.length ? <p className="text-sm text-ink-faint">Ningún kanji del núcleo tiene todos esos componentes.</p> : null}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <HandwritingPad onCandidates={setCands} />
          <div className="flex flex-wrap justify-center gap-1.5">
            {cands.map((c) => (
              <button key={c.char} lang="ja-JP" onClick={() => onPick(c.char)} className="ja min-h-12 min-w-12 rounded-[10px] border border-line bg-paper-raised px-2 text-3xl hover:bg-paper-sunk">
                {c.char}
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-ink-faint">Dibuja con el orden de trazos correcto (kanji N5–N2 y kana).</p>
        </div>
      )}
    </div>
  );
}

/** 今日の漢字 — kanji del día (N5). */
export function KanjiOfDay({ dayIndex }: { dayIndex: number }) {
  const ok = useKanjiLoaded();
  const list = ok ? (jlptData()?.kanji.N5 ?? []) : [];
  if (!list.length) return <p className="text-sm text-ink-faint">Cargando kanji…</p>;
  const ch = list[dayIndex % list.length];
  const k = kanjiInfo(ch);
  const word = wordsContainingJa(ch, 1)[0] ?? lookupFirstJa(ch);
  return (
    <div className="flex items-start gap-4">
      <WritingGrid size={112}>
        <span lang="ja-JP" className="ja zh-serif text-7xl leading-none">
          {ch}
        </span>
      </WritingGrid>
      <div className="min-w-0 space-y-1 text-sm">
        <p className="font-serif-es text-lg text-ink">{k?.es.slice(0, 3).join(", ") || k?.en.slice(0, 3).join(", ")}</p>
        <p>
          <span className="text-[11px] uppercase text-ink-faint">on </span>
          <span lang="ja-JP">{k?.on.slice(0, 3).join("、")}</span>
          <span className="ml-2 text-[11px] uppercase text-ink-faint">kun </span>
          <span lang="ja-JP">{k?.kun.slice(0, 3).join("、")}</span>
        </p>
        {word ? (
          <p className="text-ink-soft">
            <span lang="ja-JP" className="ja">
              {word.s}
            </span>{" "}
            ({word.p}) · {word.es ?? word.en[0]}
          </p>
        ) : null}
        <Link href={`/diccionario?q=${encodeURIComponent(ch)}`} className="text-indigo underline-offset-2 hover:underline">
          Ver ficha →
        </Link>
      </div>
    </div>
  );
}
