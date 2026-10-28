"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Brush, Grid3x3, PenLine, Printer, Shuffle, X } from "lucide-react";
import { db } from "@/lib/db";
import { getCharInfo, getHsk, loadCharInfo, loadHsk, lookup, RADICALS, radicalVariants, useDictionary, charsByRadical } from "@/lib/dictionary/service";
import { useKnowledge } from "@/lib/knowledge";
import { useSettings } from "@/lib/settings";
import { wordPinyin } from "@/lib/pinyin/convert";
import { Button } from "@/components/ui/button";
import { Card, Dialog, DialogContent, PageHeader, Progress, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/primitives";
import { Pinyin } from "@/components/zh/pinyin";
import { StrokeOrder } from "@/components/zh/stroke-order";
import { CharDetail } from "@/components/dictionary/char-detail";
import { SealTag } from "@/components/ornament/seal";
import { BrushCheck } from "@/components/ornament/ink-divider";
import { CalligraphySheet } from "./calligraphy-sheet";
import { cn, shuffle } from "@/lib/utils";

/** Chip de selección (tinta cuando está activo). */
const chip = (on: boolean) => cn("min-h-9 rounded-[8px] border px-3 text-sm transition-colors", on ? "border-ink/60 bg-ink text-paper" : "border-line bg-paper-raised text-ink-soft hover:border-ink/30 hover:text-ink");

export function CharactersPage() {
  const [ready, setReady] = useState(false);
  const hskList = useSettings((s) => s.settings.hskList);
  const known = useKnowledge((s) => s.known);
  const knownChars = useKnowledge((s) => s.knownChars);
  const dictStatus = useDictionary((s) => s.status);
  const load = useDictionary((s) => s.load);
  const charStatesLive = useLiveQuery(() => db.characters.toArray(), []);
  const charStates = useMemo(() => charStatesLive ?? [], [charStatesLive]);
  const [open, setOpen] = useState<string | null>(null);
  const [level, setLevel] = useState(1);
  const [radicalOrder, setRadicalOrder] = useState<"freq" | "strokes">("freq");
  const [sheetChars, setSheetChars] = useState<string[]>([]);

  useEffect(() => {
    void Promise.all([loadCharInfo(), loadHsk()]).then(() => setReady(true));
    if (dictStatus === "idle") void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hsk = getHsk();
  const levelChars = useMemo(() => {
    if (!hsk) return [];
    const key = hskList === "2.0" ? "2.0" : "3.0";
    const set: string[] = [];
    for (let lv = 1; lv <= level; lv++) for (const c of hsk.chars[key]?.[lv] ?? []) set.push(c);
    if (hskList === "both" && level === 1) for (const c of hsk.chars["2.0"]?.[1] ?? []) if (!set.includes(c)) set.push(c);
    return set;
  }, [hsk, hskList, level, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const stateMap = useMemo(() => new Map(charStates.map((c) => [c.hanzi, c])), [charStates]);
  const isKnown = (c: string) => stateMap.get(c)?.known || known.has(c) || knownChars.has(c);
  const canWrite = (c: string) => Boolean(stateMap.get(c)?.canWrite);
  const knownCount = levelChars.filter(isKnown).length;
  const writeCount = levelChars.filter(canWrite).length;

  // Radicales ordenados por frecuencia entre los caracteres HSK
  const radicalStats = useMemo(() => {
    if (!ready || !hsk) return [];
    const pool = new Set<string>();
    for (const key of ["3.0", "2.0"] as const) for (const lv of Object.values(hsk.chars[key])) for (const c of lv) pool.add(c);
    return RADICALS.map((r) => {
      const variants = radicalVariants(r.radical);
      let count = 0;
      for (const c of pool) {
        const info = getCharInfo(c);
        if (info && variants.has(info.radical)) count++;
      }
      return { ...r, count };
    }).sort((a, b) => (radicalOrder === "freq" ? b.count - a.count || a.strokes - b.strokes : a.strokes - b.strokes || a.number - b.number));
  }, [ready, hsk, radicalOrder]);

  return (
    <div>
      <PageHeader
        title="Caracteres y radicales"
        zh="汉字"
        subtitle="Aprende los caracteres por componentes: los 214 radicales (primero los ~50 más útiles), los caracteres del HSK 1 y práctica de escritura con cuadrícula 田字格."
        action={
          <Button variant="secondary" asChild>
            <Link href="/diccionario">Buscar en el diccionario</Link>
          </Button>
        }
      />
      <Tabs defaultValue="hsk">
        <TabsList className="h-auto max-w-full flex-wrap justify-start">
          <TabsTrigger value="hsk">
            <Grid3x3 className="mr-1 size-4" /> Caracteres HSK
          </TabsTrigger>
          <TabsTrigger value="radicals">
            <Brush className="mr-1 size-4" /> Radicales
          </TabsTrigger>
          <TabsTrigger value="write">
            <PenLine className="mr-1 size-4" /> Practicar escritura
          </TabsTrigger>
          <TabsTrigger value="sheet">
            <Printer className="mr-1 size-4" /> Hoja de caligrafía
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hsk">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5" role="group" aria-label="Nivel HSK">
                <span className="mr-1 text-sm text-ink-faint">Nivel HSK {hskList === "2.0" ? "2.0" : "3.0"}</span>
                {[1, 2, 3, 4].map((lv) => (
                  <button key={lv} onClick={() => setLevel(lv)} className={chip(level === lv)} aria-pressed={level === lv}>
                    {lv}
                  </button>
                ))}
              </div>
              <p className="text-sm tabular-nums text-ink-faint">
                {levelChars.length} caracteres · <span className="text-celadon-ink">{knownCount} reconocidos</span> · <span className="text-indigo">{writeCount} sé escribir</span>
              </p>
            </div>
            <Progress value={levelChars.length ? (knownCount / levelChars.length) * 100 : 0} className="mt-3" color="rgb(var(--celadon))" />
            <p className="mt-1.5 text-xs text-ink-faint">
              Según el formato anunciado del HSK 3.0 nivel 1, se piden unos 300 caracteres de lectura y una parte de escritura; verifica el syllabus oficial en chinesetest.cn. Pulsa un carácter para ver su ficha y marcarlo.
            </p>
            <div className="mt-4 flex items-center gap-3 text-[11px] text-ink-faint" aria-hidden="true">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block size-3 rounded-[3px] border border-celadon/60 bg-celadon/14" /> reconocido
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block size-1.5 rounded-full bg-cinnabar" /> sé escribirlo
              </span>
            </div>
            <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(3rem,1fr))] gap-1.5">
              {levelChars.map((c) => (
                <button
                  key={c}
                  onClick={() => setOpen(c)}
                  lang="zh-CN"
                  className={cn(
                    "zh-serif relative flex aspect-square items-center justify-center rounded-[8px] border text-[26px] leading-none transition-colors",
                    isKnown(c) ? "border-celadon/50 bg-celadon/14 text-ink hover:bg-celadon/22" : "border-line bg-paper-raised text-ink hover:border-ink/40 hover:bg-paper-sunk",
                  )}
                  title={isKnown(c) ? (canWrite(c) ? "reconocido · sé escribirlo" : "reconocido") : "aún no"}
                >
                  {c}
                  {canWrite(c) ? <span className="absolute right-1 top-1 size-1.5 rounded-full bg-cinnabar" aria-hidden="true" /> : null}
                </button>
              ))}
            </div>
            {!ready ? <p className="mt-2 text-sm text-ink-faint">Cargando…</p> : null}
          </Card>
        </TabsContent>

        <TabsContent value="radicals">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="max-w-xl text-sm text-ink-faint">Los 214 radicales Kangxi. Ordenados por frecuencia entre los caracteres HSK (los primeros ~50 cubren la mayoría) o por número de trazos.</p>
              <div className="flex gap-1" role="group" aria-label="Orden">
                <button onClick={() => setRadicalOrder("freq")} className={chip(radicalOrder === "freq")} aria-pressed={radicalOrder === "freq"}>
                  por frecuencia
                </button>
                <button onClick={() => setRadicalOrder("strokes")} className={chip(radicalOrder === "strokes")} aria-pressed={radicalOrder === "strokes"}>
                  por trazos
                </button>
              </div>
            </div>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {radicalStats.map((r, i) => (
                <li key={r.number}>
                  <button onClick={() => setOpen(r.radical)} className="group flex w-full items-center gap-3 rounded-[10px] border border-line bg-paper-raised p-2 text-left shadow-[var(--shadow-paper)] transition-colors hover:border-ink/40 hover:bg-paper-sunk">
                    <span lang="zh-CN" className="zh-serif flex size-14 shrink-0 items-center justify-center rounded-[6px] border-[1.5px] border-ink/45 bg-paper text-[30px] leading-none text-ink transition-colors group-hover:border-ink/70">
                      {r.radical}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <Pinyin text={r.pinyin} className="text-sm" />
                        <span className="truncate text-sm text-ink">{r.meaning}</span>
                      </span>
                      <span className="block text-[11px] tabular-nums text-ink-faint">
                        n.º {r.number} · {r.strokes} trazos{r.variants.length ? ` · variantes ${r.variants.join(" ")}` : ""} · {r.count} car. HSK
                      </span>
                    </span>
                    {radicalOrder === "freq" && i < 50 ? <SealTag tone="gold">top 50</SealTag> : null}
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </TabsContent>

        <TabsContent value="write">
          <WritingPractice pool={levelChars} />
        </TabsContent>

        <TabsContent value="sheet">
          <CalligraphySheet chars={sheetChars} setChars={setSheetChars} suggestions={levelChars.slice(0, 40)} />
        </TabsContent>
      </Tabs>

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent title={open ?? ""} side="bottom" className="max-w-2xl">
          {open ? <CharOrRadical ch={open} onNavigate={(w) => setOpen(w)} /> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CharOrRadical({ ch, onNavigate }: { ch: string; onNavigate: (w: string) => void }) {
  const rad = RADICALS.find((r) => r.radical === ch || r.variants.some((v) => v.replace(/\(.*\)/, "") === ch));
  const [chars, setChars] = useState<string[]>([]);
  useEffect(() => {
    if (!rad) return;
    void Promise.all([loadCharInfo(), loadHsk()]).then(() => {
      const h = getHsk();
      const pool = new Set<string>();
      if (h) for (const key of ["3.0", "2.0"] as const) for (const lv of Object.values(h.chars[key])) for (const c of lv) pool.add(c);
      setChars(charsByRadical(rad.radical, pool).slice(0, 80));
    });
  }, [rad]);
  return (
    <div className="space-y-3">
      {rad ? (
        <div className="card-sunk p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span lang="zh-CN" className="zh-serif flex size-14 items-center justify-center rounded-[6px] border-[1.5px] border-cinnabar bg-cinnabar/8 text-3xl leading-none text-cinnabar">
              {rad.radical}
            </span>
            <div className="min-w-0">
              <p className="font-medium text-ink">
                Radical n.º {rad.number} · <Pinyin text={rad.pinyin} /> · «{rad.meaning}» <span className="text-ink-faint">({rad.meaningEn})</span>
              </p>
              <p className="text-sm text-ink-faint">
                {rad.strokes} trazos{rad.variants.length ? ` · variantes: ${rad.variants.join(" ")}` : ""}
              </p>
            </div>
          </div>
          {chars.length ? (
            <div className="mt-3">
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-faint">Caracteres HSK con este radical</p>
              <div className="flex flex-wrap gap-1">
                {chars.map((c) => (
                  <button key={c} onClick={() => onNavigate(c)} lang="zh-CN" className="zh-serif flex size-10 items-center justify-center rounded-[8px] border border-line bg-paper-raised text-xl leading-none text-ink transition-colors hover:border-ink/40 hover:bg-paper-sunk">
                    {c}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      <CharDetail ch={ch} onNavigate={onNavigate} />
      <div className="text-right">
        <Button size="sm" variant="link" asChild>
          <Link href={`/diccionario?q=${encodeURIComponent(ch)}`}>Abrir en el diccionario →</Link>
        </Button>
      </div>
    </div>
  );
}

function WritingPractice({ pool }: { pool: string[] }) {
  const deck = useKnowledge((s) => s.deck);
  const [source, setSource] = useState<"hsk" | "deck">("hsk");
  const [queue, setQueue] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const [result, setResult] = useState<{ mistakes: number } | null>(null);
  const [size, setSize] = useState(260);
  const boxRef = useRef<HTMLDivElement>(null);
  const dictStatus = useDictionary((s) => s.status);
  const deckChars = useMemo(() => Array.from(new Set(Array.from(deck.keys()).flatMap((w) => Array.from(w)))), [deck]);

  const start = () => {
    const src = source === "hsk" ? pool : deckChars;
    setQueue(shuffle(src).slice(0, 10));
    setIdx(0);
    setResult(null);
  };
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 300;
      setSize(Math.max(200, Math.min(320, Math.floor(w) - 16)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const cur = queue[idx];
  const entry = cur ? lookup(cur)[0] : undefined;
  const info = cur ? getCharInfo(cur) : undefined;
  void dictStatus;

  const onComplete = async (r: { totalMistakes: number }) => {
    setResult({ mistakes: r.totalMistakes });
    const now = Date.now();
    const st = await db.characters.get(cur);
    await db.characters.put({
      hanzi: cur,
      known: st?.known ?? true,
      canWrite: r.totalMistakes <= 2 ? true : (st?.canWrite ?? false),
      mnemonic: st?.mnemonic,
      writingAttempts: (st?.writingAttempts ?? 0) + 1,
      writingMistakes: (st?.writingMistakes ?? 0) + r.totalMistakes,
      lastPracticed: now,
      updatedAt: now,
    });
    await db.exerciseAttempts.add({ exerciseType: "writing", itemId: cur, itemKind: "character", skill: "writing", correct: r.totalMistakes <= 2, at: now, context: "practice" });
  };

  return (
    <Card>
      <div ref={boxRef} className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 text-sm" role="group" aria-label="Origen de los caracteres">
          <span className="mr-1 text-ink-faint">Caracteres de</span>
          <button onClick={() => setSource("hsk")} className={chip(source === "hsk")} aria-pressed={source === "hsk"}>
            lista HSK
          </button>
          <button onClick={() => setSource("deck")} className={chip(source === "deck")} aria-pressed={source === "deck"}>
            mi mazo ({deckChars.length})
          </button>
        </div>
        <Button onClick={start} variant={queue.length ? "secondary" : "ink"}>
          <Shuffle /> {queue.length ? "Nueva serie" : "Empezar (10 caracteres)"}
        </Button>
      </div>
      {cur ? (
        <div className="mt-5 flex flex-col items-center gap-3">
          <p className="text-xs tabular-nums text-ink-faint">
            {idx + 1} / {queue.length} · escribe el carácter en la cuadrícula (pista tras 2 fallos)
          </p>
          <div className="text-center">
            <Pinyin text={entry?.p ?? wordPinyin(cur)} className="text-2xl" />
            <p className="font-serif-es text-lg text-ink">{entry?.es ?? info?.definition ?? entry?.en?.[0]}</p>
            {info ? (
              <p className="text-xs text-ink-faint">
                {info.strokes} trazos · radical <span lang="zh-CN" className="zh text-sm text-cinnabar">{info.radical}</span>
              </p>
            ) : null}
          </div>
          <div className="rounded-lg shadow-[var(--shadow-paper)]">
            <StrokeOrder key={cur + idx} char={cur} mode="quiz" size={size} onQuizComplete={(r) => void onComplete(r)} controls={false} />
          </div>
          {result ? (
            <div className="flex flex-col items-center gap-2 motion-safe:animate-pop">
              <p className={cn("flex items-center gap-2 font-medium", result.mistakes <= 2 ? "text-celadon-ink" : "text-danger")}>
                {result.mistakes <= 2 ? <BrushCheck size={22} /> : <X className="size-4" />}
                {result.mistakes === 0 ? "¡Perfecto! 太棒了" : result.mistakes <= 2 ? `Bien (${result.mistakes} fallos)` : `Repásalo: ${result.mistakes} fallos`}
              </p>
              <Button
                onClick={() => {
                  setResult(null);
                  setIdx((i) => i + 1);
                }}
                disabled={idx + 1 >= queue.length}
              >
                {idx + 1 >= queue.length ? "Serie terminada" : "Siguiente"}
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-5 flex flex-col items-center gap-3 py-4 text-center">
          <div className="tianzige size-36 rounded-lg opacity-60" aria-hidden="true" />
          <p className="max-w-sm text-sm text-ink-faint">Pulsa «Empezar» para practicar el orden de trazos de 10 caracteres al azar. Cada intento se registra en tu progreso de escritura.</p>
        </div>
      )}
    </Card>
  );
}

export { X };
