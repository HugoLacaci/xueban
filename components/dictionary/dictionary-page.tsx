"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Clock, Search, Star, X, Loader2, Type, Grid3x3 } from "lucide-react";
import { db } from "@/lib/db";
import { search, useDictionary, lookup, levelLabel, type SearchResult } from "@/lib/dictionary/service";
import { useKnowledge } from "@/lib/knowledge";
import { usePack } from "@/lib/languages/provider";
import { useLangRouter } from "@/lib/languages/link";
import { Badge, PageHeader, Tabs, TabsContent, TabsList, TabsTrigger, EmptyState } from "@/components/ui/primitives";
import { Reading } from "@/components/target/reading";
import { SealTag } from "@/components/ornament/seal";
import { XiaoMo } from "@/components/ornament/mascot";
import { WordDetail } from "./word-detail";
import { cn } from "@/lib/utils";
import { Mixed } from "@/components/target/mixed";

const HINTS: Record<string, { label: string; q: string; zh?: boolean }[]> = {
  zh: [
    { label: "Hanzi", q: "你好", zh: true },
    { label: "Pinyin", q: "ni3hao" },
    { label: "Español", q: "hola" },
  ],
  ja: [
    { label: "Kanji / kana", q: "食べる", zh: true },
    { label: "Rōmaji", q: "taberu" },
    { label: "Español", q: "comer" },
  ],
  ko: [
    { label: "Hangul", q: "먹다", zh: true },
    { label: "Iniciales", q: "ㅁㄷ", zh: true },
    { label: "Español", q: "comer" },
  ],
};

const SUBTITLE: Record<string, string> = {
  zh: "CC-CEDICT, listas HSK y tus palabras. Busca por hanzi, pinyin (con o sin tonos), español o inglés; por radical; o dibuja el carácter.",
  ja: "JMdict y KANJIDIC2 con glosas en español cuando existen, listas JLPT y tus palabras. Busca por kanji, kana, rōmaji, español o inglés; por radicales; o dibuja el kanji.",
  ko: "KRDict (NIKL) y Wiktionary, lista TOPIK y tus palabras. Busca por hangul, romanización, español, iniciales (ㅎㄱ → 한국) o hanja.",
};

const EMPTY: Record<string, { zh: string; py: string; es: string }> = {
  zh: { zh: "学而时习之", py: "xué ér shí xí zhī", es: "Aprender y repasar a su tiempo (论语)" },
  ja: { zh: "継続は力なり", py: "けいぞく は ちから なり", es: "La constancia es fuerza" },
  ko: { zh: "시작이 반이다", py: "sijagi banida", es: "Empezar es la mitad del camino" },
};

export function DictionaryPage() {
  const pack = usePack();
  const params = useSearchParams();
  const router = useLangRouter();
  const initialQ = params.get("q") ?? "";
  const [q, setQ] = useState(initialQ);
  const [selected, setSelected] = useState<string | null>(initialQ && pack.hasTargetText(initialQ) ? initialQ.trim() : null);
  const [mode, setMode] = useState<"text" | "extras">("text");
  const dict = useDictionary();
  const deck = useKnowledge((s) => s.deck);
  const history = useLiveQuery(() => db.dictHistory.where("lang").equals(pack.id).reverse().limit(12).toArray(), [pack.id]) ?? [];
  const favorites = useLiveQuery(() => db.favorites.where("lang").equals(pack.id).reverse().sortBy("at"), [pack.id]) ?? [];

  useEffect(() => {
    if (dict.status === "idle") void dict.load();
    void pack.characters.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack.id]);

  const paramQ = params.get("q") ?? "";
  const [prevParamQ, setPrevParamQ] = useState(paramQ);
  if (paramQ !== prevParamQ) {
    setPrevParamQ(paramQ);
    if (paramQ) {
      setQ(paramQ);
      if (pack.hasTargetText(paramQ)) setSelected(paramQ.trim());
    }
  }

  const results = useMemo(() => (q.trim() ? search(q, 60) : []), [q, dict.status, dict.full, deck]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (q.trim() && dict.status === "ready" && dict.full === "idle" && results.length < 3 && pack.dictionary.loadFull) void dict.loadFull();
  }, [q, results.length, dict, pack.dictionary.loadFull]);

  const open = (word: string) => {
    setSelected(word);
    router.replace(`/diccionario?q=${encodeURIComponent(word)}`);
    void db.dictHistory.add({ lang: pack.id, query: q, hanzi: word, at: Date.now() });
  };

  const hints = HINTS[pack.id] ?? HINTS.zh;
  const Extras = pack.ui.DictionaryExtras;

  return (
    <div>
      <PageHeader title="Diccionario" zh={pack.id === "zh" ? "词典" : pack.id === "ja" ? "辞書" : "사전"} subtitle={SUBTITLE[pack.id]} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section className="min-w-0 space-y-3">
          <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
            {Extras ? (
              <TabsList className="w-full">
                <TabsTrigger value="text" className="flex-1">
                  <Type className="mr-1 size-4" /> Texto
                </TabsTrigger>
                <TabsTrigger value="extras" className="flex-1">
                  <Grid3x3 className="mr-1 size-4" /> {pack.id === "ko" ? "Hanja y jamo" : "Radical · dibujar"}
                </TabsTrigger>
              </TabsList>
            ) : null}
            <TabsContent value="text">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && results[0]) open(results[0].s);
                  }}
                  placeholder={hints.map((h) => h.q).join(" · ")}
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
                {hints.map((h) => (
                  <button key={h.label} type="button" onClick={() => setQ(h.q)} className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line bg-paper-raised px-2.5 text-xs text-ink-soft transition-colors hover:border-ink/30 hover:text-ink" title={`Ejemplo: ${h.q}`}>
                    <span className="font-medium"><Mixed>{h.label}</Mixed></span>
                    <span className={cn("text-ink-faint", h.zh && pack.meta.cssClass)} lang={h.zh ? pack.bcp47 : undefined}>
                      <Mixed>{h.q}</Mixed>
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-ink-faint">
                <span>{dict.status === "loading" ? "Cargando diccionario…" : dict.status === "error" ? dict.error : `${pack.dictionary.name} · ${dict.entries.toLocaleString("es")} entradas${dict.full === "loading" ? " · cargando el resto…" : ""}`}</span>
                {dict.status === "ready" && dict.full === "idle" && pack.dictionary.loadFull ? (
                  <button className="text-indigo underline-offset-2 hover:underline" onClick={() => void dict.loadFull()}>
                    cargar diccionario completo
                  </button>
                ) : null}
              </div>
              <ResultList results={results} onOpen={open} selected={selected} query={q} loading={dict.status === "loading"} />
              {!q ? <Recent history={history} favorites={favorites} onOpen={open} /> : null}
            </TabsContent>
            {Extras ? (
              <TabsContent value="extras">
                <Extras onPick={open} />
              </TabsContent>
            ) : null}
          </Tabs>
        </section>
        <section className="min-w-0">
          {selected ? (
            <WordDetail word={selected} onNavigate={open} />
          ) : (
            <EmptyState icon={<XiaoMo mood="think" size={72} />} title="Elige una palabra" zh={EMPTY[pack.id]} description="Los resultados aparecen en la lista. Pulsa una palabra para ver su ficha: lectura, audio, significados, ejemplos, caracteres y trazos." className="min-h-[18rem]" />
          )}
        </section>
      </div>
    </div>
  );
}

function ResultList({ results, onOpen, selected, query, loading }: { results: SearchResult[]; onOpen: (w: string) => void; selected: string | null; query: string; loading: boolean }) {
  const pack = usePack();
  const deck = useKnowledge((s) => s.deck);
  if (!query.trim()) return null;
  if (!results.length)
    return (
      <div className="mt-3 flex items-center gap-2 rounded-[12px] border border-dashed border-line p-4 text-sm text-ink-faint">
        {loading ? <Loader2 className="size-4 animate-spin" /> : null}
        {loading ? "Cargando diccionario…" : "Sin resultados. Prueba con otra escritura (sin tonos, en kana, en hangul) o con otra palabra."}
      </div>
    );
  return (
    <ul className="card-paper mt-3 max-h-[46vh] divide-y divide-line/80 overflow-y-auto p-0 scrollbar-thin lg:max-h-[62vh]" aria-label="Resultados">
      {results.map((r, i) => {
        const active = selected === r.s;
        const lv = levelLabel(r);
        return (
          <li key={`${r.s}-${r.p}-${i}`}>
            <button onClick={() => onOpen(r.s)} aria-current={active ? "true" : undefined} className={cn("relative flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-paper-sunk/70", active && "bg-ink/6")}>
              {active ? <span className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-cinnabar" aria-hidden="true" /> : null}
              <span lang={pack.bcp47} className={cn(pack.theme.fontClasses.serif, pack.meta.cssClass, "min-w-14 text-[26px] leading-none text-ink")}>
                <Mixed>{r.s}</Mixed>
              </span>
              <span className="min-w-0 flex-1">
                <Reading text={r.p} className="block text-sm" />
                <span className="block truncate text-sm text-ink-soft">
                  <Mixed>{r.es ?? r.en.slice(0, 3).join("; ")}</Mixed>
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                {lv ? <SealTag><Mixed>{lv}</Mixed></SealTag> : null}
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
  const pack = usePack();
  const uniq = Array.from(new Map(history.map((h) => [h.hanzi, h])).values());
  const serif = cn(pack.theme.fontClasses.serif, pack.meta.cssClass);
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
                <span lang={pack.bcp47} className={cn(serif, "text-lg leading-none text-ink")}>
                  <Mixed>{f.hanzi}</Mixed>
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
              <button key={h.hanzi} onClick={() => onOpen(h.hanzi)} lang={pack.bcp47} className={cn(serif, "min-h-9 rounded-[8px] border border-line bg-paper-raised px-2.5 py-1 text-lg leading-none text-ink shadow-[var(--shadow-paper)] transition-colors hover:border-ink/30 hover:bg-paper-sunk")}>
                <Mixed>{h.hanzi}</Mixed>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {!favorites.length && !uniq.length ? <p className="rounded-[12px] border border-dashed border-line p-4 text-sm text-ink-faint">Escribe en {pack.meta.names.adjective}, en su lectura latina o en español. Las palabras de tu mazo salen primero.</p> : null}
    </div>
  );
}

export function useLookupAll(word: string) {
  const status = useDictionary((s) => s.status);
  const full = useDictionary((s) => s.full);
  return useMemo(() => lookup(word), [word, status, full]); // eslint-disable-line react-hooks/exhaustive-deps
}
