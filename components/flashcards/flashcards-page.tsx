"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { useVirtualizer } from "@tanstack/react-virtual";
import * as Icons from "lucide-react";
import { ArrowUpFromLine, FileDown, Play, Plus, Settings2, Upload } from "lucide-react";
import { db, type Card, type Word } from "@/lib/db";
import { useSettings } from "@/lib/settings";
import { useAnkiStatus } from "@/lib/anki/client";
import { Button } from "@/components/ui/button";
import { Input, PageHeader, Select } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { Pinyin } from "@/components/zh/pinyin";
import { Enso } from "@/components/ornament/ink-divider";
import { SealTag } from "@/components/ornament/seal";
import { XiaoMo } from "@/components/ornament/mascot";
import { QuickAddDialog } from "./quick-add";
import { BulkImportDialog } from "./bulk-import";
import { CategoryDialog } from "./category-dialog";
import { cn } from "@/lib/utils";
import { useNow } from "@/hooks/use-now";

type StateFilter = "all" | "new" | "learning" | "review" | "due";
type WordState = "new" | "learning" | "review";

function cardState(cards: Card[]): WordState {
  if (cards.some((c) => c.state === 2 && c.stability >= 1)) return "review";
  if (cards.some((c) => c.reps > 0 || c.state !== 0)) return "learning";
  return "new";
}

/** Estado de una palabra como pequeño sello: 熟 conocida · 习 aprendiendo · 新 nueva. */
const STATE_SEAL: Record<WordState, { zh: string; es: string; tone: "celadon" | "gold" | "ink" }> = {
  review: { zh: "熟", es: "conocida", tone: "celadon" },
  learning: { zh: "习", es: "aprendiendo", tone: "gold" },
  new: { zh: "新", es: "nueva", tone: "ink" },
};

export function FlashcardsPage() {
  const settings = useSettings((s) => s.settings);
  const anki = useAnkiStatus();
  const wordsLive = useLiveQuery(() => db.words.toArray(), []);
  const cardsLive = useLiveQuery(() => db.cards.toArray(), []);
  const words = useMemo(() => wordsLive ?? [], [wordsLive]);
  const cards = useMemo(() => cardsLive ?? [], [cardsLive]);
  const categories = useLiveQuery(() => db.categories.orderBy("order").toArray(), []) ?? [];
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [state, setState] = useState<StateFilter>("all");
  const [hsk, setHsk] = useState("");
  const [source, setSource] = useState("");
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [catDialog, setCatDialog] = useState<null | { edit?: string }>(null);
  const now = useNow();

  const byWord = useMemo(() => {
    const m = new Map<string, Card[]>();
    for (const c of cards) m.set(c.wordId, [...(m.get(c.wordId) ?? []), c]);
    return m;
  }, [cards]);

  const stats = useMemo(() => {
    let due = 0;
    let fresh = 0;
    let learning = 0;
    let review = 0;
    for (const w of words) {
      const cs = byWord.get(w.id) ?? [];
      const st = cardState(cs);
      if (st === "review") review++;
      else if (st === "learning") learning++;
      else fresh++;
      if (cs.some((c) => !c.suspended && c.state !== 0 && c.due <= now)) due++;
    }
    return { due, fresh, learning, review };
  }, [words, byWord, now]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return words
      .filter((w) => {
        if (cat && w.category !== cat) return false;
        if (hsk && !(w.hsk.includes(hsk) || (hsk === "Extra" && !w.hsk.filter((h) => h !== "Extra").length))) return false;
        if (source && w.source !== source) return false;
        const cs = byWord.get(w.id) ?? [];
        if (state !== "all") {
          if (state === "due") {
            if (!cs.some((c) => c.state !== 0 && c.due <= now)) return false;
          } else if (cardState(cs) !== state) return false;
        }
        if (ql) {
          const hay = `${w.hanzi} ${w.pinyin} ${w.meaning} ${w.tags.join(" ")}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
          const needle = ql.normalize("NFD").replace(/[̀-ͯ]/g, "");
          if (!hay.includes(needle)) return false;
        }
        return true;
      })
      .sort((a, b) => (a.category === b.category ? a.createdAt - b.createdAt : a.category.localeCompare(b.category)));
  }, [words, byWord, q, cat, state, hsk, source, now]);

  const catCounts = useMemo(() => {
    const m = new Map<string, { total: number; known: number }>();
    for (const w of words) {
      const cur = m.get(w.category) ?? { total: 0, known: 0 };
      cur.total++;
      if (cardState(byWord.get(w.id) ?? []) === "review") cur.known++;
      m.set(w.category, cur);
    }
    return m;
  }, [words, byWord]);

  const knownRatio = words.length ? stats.review / words.length : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Flashcards"
        zh="卡片"
        subtitle="Tu mazo personal: repaso espaciado con FSRS, sincronizable con Anki."
        action={
          <>
            <Button variant="jade" onClick={() => setAdding(true)}>
              <Plus /> Añadir palabra
            </Button>
            <Button asChild>
              <Link href="/flashcards/repasar">
                <Play /> Repasar{stats.due ? ` (${stats.due})` : ""}
              </Link>
            </Button>
          </>
        }
      />

      {/* Estado del mazo: ensō (conocidas / total) + cifras tabulares + exportación */}
      <section className="card-paper flex flex-col gap-5 p-4 sm:flex-row sm:items-center sm:p-5" aria-label="Estado del mazo">
        <div className="flex items-center gap-4">
          <Enso size={104} progress={knownRatio} stroke="rgb(var(--celadon))" label={`${stats.review} de ${words.length} palabras conocidas`}>
            <span className="tabular block text-2xl font-semibold leading-none text-ink">{Math.round(knownRatio * 100)}%</span>
            <span className="mt-1 block text-[10px] uppercase tracking-wider text-ink-faint">conocidas</span>
          </Enso>
          <dl className="tabular grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Stat label="pendientes hoy" value={stats.due} className={stats.due ? "text-cinnabar" : undefined} />
            <Stat label="palabras" value={words.length} />
            <Stat label="conocidas" value={stats.review} className="text-celadon-ink" />
            <Stat label="aprendiendo" value={stats.learning} className="text-gold-ink" />
          </dl>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
          <Button size="sm" variant="secondary" onClick={() => setImporting(true)}>
            <Upload /> Importar lista
          </Button>
          <Button size="sm" variant="secondary" onClick={() => void import("@/lib/anki/apkg").then((m) => m.downloadApkg(filtered)).then(() => toast.success("Paquete .apkg descargado"))}>
            <FileDown /> .apkg
          </Button>
          <Button size="sm" variant="secondary" onClick={() => void import("@/lib/anki/apkg").then((m) => m.downloadCsv(filtered))}>
            <FileDown /> CSV
          </Button>
          {settings.anki.enabled && anki.connected ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                void import("@/lib/anki/sync").then(async (m) => {
                  const r = await m.pushWordsToAnki(filtered);
                  toast.success("Enviado a Anki", `${r.created} creadas · ${r.updated} actualizadas`);
                })
              }
            >
              <ArrowUpFromLine /> A Anki ({filtered.length})
            </Button>
          ) : null}
        </div>
      </section>

      {/* Categorías */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-serif-es text-lg font-semibold tracking-tight text-ink">Categorías</h2>
          <Button size="sm" variant="ghost" onClick={() => setCatDialog({})}>
            <Plus /> Nueva categoría
          </Button>
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 no-scrollbar sm:mx-0 sm:px-0">
          <CategoryChip active={cat === ""} onClick={() => setCat("")} label="Todas" count={words.length} color="rgb(var(--ink-faint))" icon="Layers" />
          {categories.map((c) => {
            const cc = catCounts.get(c.name);
            return (
              <CategoryChip
                key={c.id}
                active={cat === c.name}
                onClick={() => setCat(cat === c.name ? "" : c.name)}
                onEdit={() => setCatDialog({ edit: c.id })}
                label={c.name}
                count={cc?.total ?? 0}
                known={cc?.known ?? 0}
                color={c.color}
                icon={c.icon}
              />
            );
          })}
        </div>
      </section>

      {/* Filtros */}
      <section className="flex flex-wrap items-center gap-2" aria-label="Filtros">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en el mazo…" className="h-9 w-full sm:w-52" aria-label="Buscar en el mazo" />
        <Select value={state} onChange={(e) => setState(e.target.value as StateFilter)} className="h-9" aria-label="Estado">
          <option value="all">Estado: todas</option>
          <option value="due">Pendientes de repaso</option>
          <option value="new">Nuevas</option>
          <option value="learning">Aprendiendo</option>
          <option value="review">Conocidas</option>
        </Select>
        <Select value={hsk} onChange={(e) => setHsk(e.target.value)} className="h-9" aria-label="Nivel">
          <option value="">Nivel: todos</option>
          <option value="HSK2.0">HSK 2.0</option>
          <option value="HSK3.0">HSK 3.0</option>
          <option value="Extra">Extra (fuera de lista)</option>
        </Select>
        <Select value={source} onChange={(e) => setSource(e.target.value)} className="h-9" aria-label="Fuente">
          <option value="">Fuente: todas</option>
          <option value="seed">HSK 1 (semilla)</option>
          <option value="class">Clase</option>
          <option value="video">Vídeo</option>
          <option value="reading">Lectura</option>
          <option value="dictionary">Diccionario</option>
          <option value="anki">Anki</option>
          <option value="import">Importación</option>
        </Select>
        <span className="tabular ml-auto text-sm text-ink-faint">{filtered.length} palabras</span>
      </section>

      <WordList words={filtered} byWord={byWord} />

      <QuickAddDialog open={adding} onOpenChange={setAdding} source="manual" />
      <BulkImportDialog open={importing} onOpenChange={setImporting} />
      {catDialog ? <CategoryDialog open onOpenChange={(o) => !o && setCatDialog(null)} editId={catDialog.edit} /> : null}
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="mt-0.5 text-[11px] text-ink-faint">{label}</dt>
      <dd className={cn("text-xl font-semibold leading-none text-ink", className)}>{value}</dd>
    </div>
  );
}

/** Chip de categoría: papel con un pequeño sello de color y el icono. */
function CategoryChip({ active, onClick, onEdit, label, count, known, color, icon }: { active: boolean; onClick: () => void; onEdit?: () => void; label: string; count: number; known?: number; color: string; icon: string }) {
  const Icon = (Icons as unknown as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>)[icon] ?? Icons.Tag;
  return (
    <div className={cn("group flex shrink-0 items-center gap-1 rounded-[10px] border pl-2 pr-1 text-sm transition-[border-color,box-shadow] duration-[var(--dur-ui)]", active ? "border-ink/60 bg-paper-raised shadow-[var(--shadow-paper)]" : "border-line bg-paper-raised/60 hover:border-ink/30")}>
      <button type="button" onClick={onClick} aria-pressed={active} className="flex items-center gap-2 rounded-md py-1.5 pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30">
        <span className="relative inline-flex size-6 items-center justify-center">
          <span className="absolute size-2 rounded-[2px] -top-0.5 -right-0.5 rotate-12" style={{ background: color }} aria-hidden="true" />
          <Icon className="size-4 text-ink-soft" />
        </span>
        <span className={cn("font-medium", active ? "text-ink" : "text-ink-soft")}>{label}</span>
        <span className="tabular text-xs text-ink-faint">
          {known !== undefined ? `${known}/` : ""}
          {count}
        </span>
      </button>
      {onEdit ? (
        <button type="button" onClick={onEdit} className="rounded p-1 text-ink-faint opacity-60 hover:text-ink focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 sm:opacity-0 sm:group-hover:opacity-100" aria-label={`Editar categoría ${label}`}>
          <Settings2 className="size-3.5" />
        </button>
      ) : (
        <span className="w-1" />
      )}
    </div>
  );
}

function WordList({ words, byWord }: { words: Word[]; byWord: Map<string, Card[]> }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({ count: words.length, getScrollElement: () => parentRef.current, estimateSize: () => 64, overscan: 10 });
  const now = useNow();
  if (!words.length) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-[14px] border border-dashed border-line px-6 py-10 text-center">
        <XiaoMo mood="think" size={72} />
        <p className="font-serif-es text-lg text-ink">No hay palabras con estos filtros.</p>
        <p className="text-sm text-ink-faint">Prueba a quitar un filtro o añade una palabra nueva.</p>
      </div>
    );
  }
  return (
    <div ref={parentRef} className="card-paper max-h-[70vh] overflow-y-auto scrollbar-thin">
      <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
        {rowVirtualizer.getVirtualItems().map((v) => {
          const w = words[v.index];
          const cs = byWord.get(w.id) ?? [];
          const st = STATE_SEAL[cardState(cs)];
          const due = cs.some((c) => c.state !== 0 && c.due <= now);
          return (
            <Link
              key={w.id}
              href={`/flashcards/${encodeURIComponent(w.id)}`}
              className="absolute left-0 flex w-full items-center gap-3 border-b border-line/70 px-3 transition-colors hover:bg-paper-sunk/60 focus-visible:bg-paper-sunk/60 focus-visible:outline-none sm:px-4"
              style={{ top: v.start, height: v.size }}
            >
              <span lang="zh-CN" className="zh zh-serif w-[4.5rem] shrink-0 text-[26px] font-medium leading-none text-ink sm:w-24">
                {w.hanzi}
              </span>
              <span className="min-w-0 flex-1">
                <Pinyin text={w.pinyin} className="block text-sm" />
                <span className="block truncate text-sm text-ink-soft">{w.meaning}</span>
              </span>
              <span className="hidden text-xs text-ink-faint md:block">{w.category}</span>
              <span className="flex shrink-0 items-center gap-2">
                {due ? (
                  <span className="flex items-center gap-1 text-[11px] text-cinnabar">
                    <span className="size-1.5 rounded-full bg-cinnabar" aria-hidden="true" />
                    pendiente
                  </span>
                ) : null}
                <span className="hidden text-[11px] text-ink-faint sm:inline">{st.es}</span>
                <SealTag tone={st.tone} className="text-[13px]">
                  <span aria-hidden="true">{st.zh}</span>
                  <span className="sr-only sm:hidden">{st.es}</span>
                </SealTag>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
