"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Clock, PenLine, Search, Star, Grid3x3, X, Loader2, Type } from "lucide-react";
import { db } from "@/lib/db";
import { search, useDictionary, lookup, loadCharInfo, type SearchResult } from "@/lib/dictionary/service";
import { hanziOnly, hasHanzi } from "@/lib/pinyin/convert";
import { useKnowledge } from "@/lib/knowledge";
import { Badge, PageHeader, Tabs, TabsContent, TabsList, TabsTrigger, EmptyState } from "@/components/ui/primitives";
import { Pinyin } from "@/components/zh/pinyin";
import { HandwritingPad } from "@/components/zh/handwriting-pad";
import { SealTag } from "@/components/ornament/seal";
import { XiaoMo } from "@/components/ornament/mascot";
import type { Candidate } from "@/lib/handwriting";
import { WordDetail } from "./word-detail";
import { RadicalPicker } from "./radical-picker";
import { cn } from "@/lib/utils";

/** Pistas de búsqueda: cada chip rellena la caja con un ejemplo del tipo de consulta. */
const HINTS: { label: string; q: string; zh?: boolean }[] = [
  { label: "Hanzi", q: "你好", zh: true },
  { label: "Pinyin", q: "ni3hao" },
  { label: "Español", q: "hola" },
];

export function DictionaryPage() {
  const params = useSearchParams();
  const router = useRouter();
  const initialQ = params.get("q") ?? "";
  const [q, setQ] = useState(initialQ);
  const [selected, setSelected] = useState<string | null>(initialQ && hasHanzi(initialQ) ? hanziOnly(initialQ) : null);
  const [mode, setMode] = useState<"text" | "radical" | "hand">("text");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const dict = useDictionary();
  const deck = useKnowledge((s) => s.deck);
  const history = useLiveQuery(() => db.dictHistory.orderBy("at").reverse().limit(12).toArray(), []) ?? [];
  const favorites = useLiveQuery(() => db.dictFavorites.orderBy("at").reverse().toArray(), []) ?? [];

  useEffect(() => {
    if (dict.status === "idle") void dict.load();
    void loadCharInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // sincroniza ?q= con el estado cuando se navega desde fuera (popup, paleta): estado derivado de props
  const paramQ = params.get("q") ?? "";
  const [prevParamQ, setPrevParamQ] = useState(paramQ);
  if (paramQ !== prevParamQ) {
    setPrevParamQ(paramQ);
    if (paramQ) {
      setQ(paramQ);
      if (hasHanzi(paramQ)) setSelected(hanziOnly(paramQ));
    }
  }

  const results = useMemo(() => (q.trim() ? search(q, 60) : []), [q, dict.status, dict.full, deck]); // eslint-disable-line react-hooks/exhaustive-deps

  // Si no hay resultados en el núcleo, carga el diccionario completo
  useEffect(() => {
    if (q.trim() && dict.status === "ready" && dict.full === "idle" && results.length < 3) void dict.loadFull();
  }, [q, results.length, dict]);

  const open = (word: string) => {
    setSelected(word);
    router.replace(`/diccionario?q=${encodeURIComponent(word)}`, { scroll: false });
    void db.dictHistory.add({ query: q, hanzi: word, at: Date.now() });
  };

  const kindOfQuery = !q.trim() ? null : hasHanzi(q) ? "hanzi" : /^[a-zü:\s0-5]+$/i.test(q) && /\d|[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(q) ? "pinyin" : "texto";

  return (
    <div>
      <PageHeader title="Diccionario" zh="词典" subtitle="CC-CEDICT, listas HSK y tus palabras. Busca por hanzi, pinyin (con o sin tonos), español o inglés; por radical; o dibuja el carácter." />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section className="min-w-0 space-y-3">
          <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
            <TabsList className="w-full">
              <TabsTrigger value="text" className="flex-1">
                <Type className="mr-1 size-4" /> Texto
              </TabsTrigger>
              <TabsTrigger value="radical" className="flex-1">
                <Grid3x3 className="mr-1 size-4" /> Radical
              </TabsTrigger>
              <TabsTrigger value="hand" className="flex-1">
                <PenLine className="mr-1 size-4" /> Dibujar
              </TabsTrigger>
            </TabsList>
            <TabsContent value="text">
              {/* Caja de búsqueda protagonista */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && results[0]) open(results[0].s);
                  }}
                  placeholder="你好 · ni3hao · hola"
                  className="h-14 w-full rounded-[12px] border border-line bg-paper-raised pl-12 pr-11 text-lg text-ink shadow-[var(--shadow-paper)] placeholder:font-[family-name:var(--font-serif)] placeholder:italic placeholder:text-ink-faint/80 focus-visible:border-ink/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15"
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Buscar en el diccionario"
                />
                {q ? (
                  <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-faint hover:bg-paper-sunk hover:text-ink" aria-label="Borrar búsqueda">
                    <X className="size-4" />
                  </button>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5" aria-label="Tipos de búsqueda">
                {HINTS.map((h) => (
                  <button
                    key={h.label}
                    type="button"
                    onClick={() => setQ(h.q)}
                    className={cn(
                      "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors",
                      (kindOfQuery === "hanzi" && h.label === "Hanzi") || (kindOfQuery === "pinyin" && h.label === "Pinyin") ? "border-ink/40 bg-ink/6 text-ink" : "border-line bg-paper-raised text-ink-soft hover:border-ink/30 hover:text-ink",
                    )}
                    title={`Ejemplo: ${h.q}`}
                  >
                    <span className="font-medium">{h.label}</span>
                    <span className={cn("text-ink-faint", h.zh && "zh")} lang={h.zh ? "zh-CN" : undefined}>
                      {h.q}
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-ink-faint">
                <span>
                  {dict.status === "loading" ? "Cargando diccionario…" : dict.status === "error" ? dict.error : `${dict.entries.toLocaleString("es")} entradas${dict.full === "loading" ? " · cargando el resto…" : ""}`}
                </span>
                {dict.status === "ready" && dict.full === "idle" ? (
                  <button className="text-indigo underline-offset-2 hover:underline" onClick={() => void dict.loadFull()}>
                    cargar diccionario completo
                  </button>
                ) : null}
              </div>
              <ResultList results={results} onOpen={open} selected={selected} query={q} loading={dict.status === "loading"} />
              {!q ? <Recent history={history} favorites={favorites} onOpen={open} /> : null}
            </TabsContent>
            <TabsContent value="radical">
              <RadicalPicker onPick={open} />
            </TabsContent>
            <TabsContent value="hand">
              <div className="flex flex-col items-center gap-3">
                <HandwritingPad onCandidates={setCandidates} />
                <div className="flex flex-wrap justify-center gap-1.5">
                  {candidates.map((c) => (
                    <button key={c.char} onClick={() => open(c.char)} lang="zh-CN" className="zh-serif min-h-14 min-w-14 rounded-[10px] border border-line bg-paper-raised px-3 text-3xl text-ink shadow-[var(--shadow-paper)] transition-colors hover:border-ink/40 hover:bg-paper-sunk" title={`distancia ${c.score.toFixed(2)}`}>
                      {c.char}
                    </button>
                  ))}
                </div>
                {!candidates.length ? <p className="text-center text-xs text-ink-faint">Dibuja el carácter con el orden de trazos correcto; los candidatos aparecen aquí.</p> : null}
              </div>
            </TabsContent>
          </Tabs>
        </section>
        <section className="min-w-0">
          {selected ? (
            <WordDetail word={selected} onNavigate={open} />
          ) : (
            <EmptyState
              icon={<XiaoMo mood="think" size={72} />}
              title="Elige una palabra"
              zh={{ zh: "学而时习之", py: "xué ér shí xí zhī", es: "Aprender y repasar a su tiempo (论语)" }}
              description="Los resultados aparecen en la lista. Pulsa una palabra para ver su ficha: pinyin, audio, significados, clasificadores, ejemplos, caracteres y trazos."
              className="min-h-[18rem]"
            />
          )}
        </section>
      </div>
    </div>
  );
}

function ResultList({ results, onOpen, selected, query, loading }: { results: SearchResult[]; onOpen: (w: string) => void; selected: string | null; query: string; loading: boolean }) {
  const deck = useKnowledge((s) => s.deck);
  if (!query.trim()) return null;
  if (!results.length)
    return (
      <div className="mt-3 flex items-center gap-2 rounded-[12px] border border-dashed border-line p-4 text-sm text-ink-faint">
        {loading ? <Loader2 className="size-4 animate-spin" /> : null}
        {loading ? "Cargando diccionario…" : "Sin resultados. Prueba con pinyin sin tonos o con otra palabra."}
      </div>
    );
  return (
    <ul className="card-paper mt-3 max-h-[46vh] divide-y divide-line/80 overflow-y-auto p-0 scrollbar-thin lg:max-h-[62vh]" aria-label="Resultados">
      {results.map((r, i) => {
        const active = selected === r.s;
        return (
          <li key={`${r.s}-${r.p}-${i}`}>
            <button
              onClick={() => onOpen(r.s)}
              aria-current={active ? "true" : undefined}
              className={cn("relative flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-paper-sunk/70", active && "bg-ink/6")}
            >
              {active ? <span className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-cinnabar" aria-hidden="true" /> : null}
              <span lang="zh-CN" className="zh-serif min-w-14 text-[26px] leading-none text-ink">
                {r.s}
              </span>
              <span className="min-w-0 flex-1">
                <Pinyin text={r.p} className="block text-sm" />
                <span className="block truncate text-sm text-ink-soft">{r.es ?? r.en.slice(0, 3).join("; ")}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                {r.hsk ? <SealTag>HSK {r.hsk === 7 ? "7–9" : r.hsk}</SealTag> : r.hsk2 ? <Badge variant="outline">2.0·{r.hsk2}</Badge> : null}
                {deck.has(r.s) ? <Badge variant="jade">mazo</Badge> : null}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Recent({ history, favorites, onOpen }: { history: { hanzi: string; id?: number }[]; favorites: { hanzi: string; pinyin: string; meaning: string }[]; onOpen: (w: string) => void }) {
  const uniq = Array.from(new Map(history.map((h) => [h.hanzi, h])).values());
  return (
    <div className="mt-5 space-y-4">
      {favorites.length ? (
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-faint">
            <Star className="size-3.5" /> Favoritos
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {favorites.map((f) => (
              <button key={f.hanzi} onClick={() => onOpen(f.hanzi)} className="inline-flex min-h-9 items-center gap-1.5 rounded-[8px] border border-line bg-paper-raised px-2.5 py-1 text-sm shadow-[var(--shadow-paper)] transition-colors hover:border-ink/30 hover:bg-paper-sunk">
                <span lang="zh-CN" className="zh-serif text-lg leading-none text-ink">
                  {f.hanzi}
                </span>
                <span className="text-ink-faint">{f.meaning.split(";")[0]}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {uniq.length ? (
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-faint">
            <Clock className="size-3.5" /> Recientes
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {uniq.map((h) => (
              <button key={h.hanzi} onClick={() => onOpen(h.hanzi)} lang="zh-CN" className="zh-serif min-h-9 rounded-[8px] border border-line bg-paper-raised px-2.5 py-1 text-lg leading-none text-ink shadow-[var(--shadow-paper)] transition-colors hover:border-ink/30 hover:bg-paper-sunk">
                {h.hanzi}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {!favorites.length && !uniq.length ? (
        <p className="rounded-[12px] border border-dashed border-line p-4 text-sm text-ink-faint">
          Consejos: escribe <em>ni3hao</em> o <em>nǐ hǎo</em> para buscar por pinyin con tonos; sin tonos encuentra todas las lecturas. En español busca palabras de tu mazo; en inglés busca en todo CC-CEDICT.
        </p>
      ) : null}
    </div>
  );
}

export function useLookupAll(word: string) {
  const status = useDictionary((s) => s.status);
  const full = useDictionary((s) => s.full);
  return useMemo(() => lookup(word), [word, status, full]); // eslint-disable-line react-hooks/exhaustive-deps
}
