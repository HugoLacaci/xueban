"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "@/lib/languages/link";
import { useLiveQuery } from "dexie-react-hooks";
import { BookOpen, FileText, Plus, Search } from "lucide-react";
import { db, uuid } from "@/lib/db";
import { getReadings } from "@/lib/readings";
import { getActivePack } from "@/lib/languages/registry";
import type { GradedReading } from "@/lib/readings/types";
import { useKnowledge } from "@/lib/knowledge";
import { useDictionary } from "@/lib/dictionary/service";
import { comprehensionOfLines } from "@/lib/videos/breakdown";
import { Button } from "@/components/ui/button";
import { Badge, Dialog, DialogContent, Input, Label, PageHeader, SectionTitle, Textarea } from "@/components/ui/primitives";
import { SealTag } from "@/components/ornament/seal";
import { BrushCheck } from "@/components/ornament/ink-divider";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { getActiveLang } from "@/lib/languages/registry";
import { targetLang } from "@/lib/languages/registry";
import { pageNative } from "@/lib/languages/ui-text";
import { Mixed } from "@/components/target/mixed";

const KIND_LABEL: Record<GradedReading["kind"], string> = {
  dialogue: "diálogo",
  message: "mensaje",
  menu: "menú",
  sign: "cartel",
  schedule: "horario",
  story: "relato",
  wechat: "WeChat",
  email: "correo",
  list: "lista",
};

const chip = (on: boolean) => cn("min-h-9 rounded-[8px] border px-3 text-sm transition-colors", on ? "border-ink/60 bg-ink text-paper" : "border-line bg-paper-raised text-ink-soft hover:border-ink/30 hover:text-ink");

/** Pequeño medidor de tinta: % de palabras conocidas. */
function InkGauge({ ratio }: { ratio: number }) {
  const pct = Math.round(ratio * 100);
  const tone = ratio >= 0.95 ? "bg-celadon" : ratio >= 0.85 ? "bg-gold" : "bg-ink/60";
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] tabular-nums text-ink-faint" title={`${pct} % de palabras conocidas`}>
      <span className="relative h-1.5 w-14 overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Palabras conocidas">
        <span className={cn("absolute inset-y-0 left-0 rounded-full", tone)} style={{ width: `${pct}%` }} />
      </span>
      {pct} %
    </span>
  );
}

export function ReadingList() {
  const READINGS_ = getReadings();
  const dictStatus = useDictionary((s) => s.status);
  const load = useDictionary((s) => s.load);
  const known = useKnowledge((s) => s.known);
  const knownChars = useKnowledge((s) => s.knownChars);
  const user = useLiveQuery(() => db.readings.where("[lang+source]").equals([getActiveLang(), "user"]).reverse().sortBy("addedAt"), []) ?? [];
  const progress = useLiveQuery(() => db.readings.where("[lang+source]").equals([getActiveLang(), "builtin"]).toArray(), []) ?? [];
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<0 | 1 | 2 | 3>(0);
  const [importing, setImporting] = useState(false);
  useEffect(() => {
    if (dictStatus === "idle") void load();
    void getActivePack().levelLists();
  }, [dictStatus, load]);
  const progressMap = useMemo(() => new Map(progress.map((p) => [p.id, p])), [progress]);
  const stats = useMemo(() => {
    const m = new Map<string, number>();
    if (dictStatus !== "ready") return m;
    for (const r of READINGS_) m.set(r.id, comprehensionOfLines(r.text.split("\n").map((zh) => ({ zh })), known, knownChars).ratio);
    return m;
  }, [dictStatus, known, knownChars]);
  const list = READINGS_.filter((r) => (!level || r.level === level) && (!q || `${r.title} ${r.zh} ${r.tags.join(" ")}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lectura graduada"
        zh={pageNative("reading")}
        subtitle={`${READINGS_.length} textos cortos con vocabulario ${getActivePack().curriculum.levelTitle} controlado: diálogos, mensajes, menús, carteles y relatos de la vida de Hugo. Cada uno muestra el % de palabras que ya conoces.`}
        action={
          <Button variant="ink" onClick={() => setImporting(true)}>
            <Plus /> Importar mi texto
          </Button>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar tema…" className="h-9 w-full pl-9 sm:w-56" aria-label="Buscar lecturas" />
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Nivel">
          {([0, 1, 2, 3] as const).map((l) => (
            <button key={l} onClick={() => setLevel(l)} className={chip(level === l)} aria-pressed={level === l}>
              {l === 0 ? "Todos" : `Nivel ${l}`}
            </button>
          ))}
        </div>
      </div>

      {user.length ? (
        <section>
          <SectionTitle>Mis textos</SectionTitle>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {user.map((r) => (
              <li key={r.id}>
                <Link href={`/lectura/${encodeURIComponent(r.id)}`} className="card-paper flex h-full flex-col gap-1.5 p-3.5 transition-colors hover:bg-paper-sunk/60">
                  <span className="flex items-center gap-2 font-medium text-ink">
                    <FileText className="size-4 text-ink-faint" /> <Mixed>{r.title}</Mixed>
                  </span>
                  <span lang={targetLang()} className="zh line-clamp-2 text-sm text-ink-soft">
                    {r.text}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* estantería: tiras de papel */}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((r) => {
          const ratio = stats.get(r.id);
          const p = progressMap.get(r.id);
          return (
            <li key={r.id}>
              <Link href={`/lectura/${r.id}`} className="card-paper group relative flex h-full flex-col gap-2 overflow-hidden p-3.5 pl-4 transition-[background-color,transform] duration-[var(--dur-ui)] ease-[var(--ease-ink)] hover:bg-paper-sunk/60 motion-safe:hover:-translate-y-px">
                <span className={cn("absolute inset-y-0 left-0 w-[3px]", p?.completed ? "bg-celadon/80" : "bg-ink/15 group-hover:bg-ink/35")} aria-hidden="true" />
                <div className="flex items-start justify-between gap-2">
                  <span className="font-serif-es text-[17px] font-medium leading-snug text-ink"><Mixed>{r.title}</Mixed></span>
                  {p?.completed ? <BrushCheck size={22} animate={false} className="shrink-0 text-celadon-ink" /> : <SealTag tone="ink" className="shrink-0 opacity-70">{r.level}</SealTag>}
                </div>
                <span lang={targetLang()} className="zh-kai text-base text-cinnabar">
                  {r.zh}
                </span>
                <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-1">
                  <Badge variant="outline">{KIND_LABEL[r.kind]}</Badge>
                  <span className="text-[11px] text-ink-faint">{r.minutes} min</span>
                  {ratio !== undefined ? <InkGauge ratio={ratio} /> : null}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      {!list.length ? <p className="text-sm text-ink-faint">Sin textos con esos filtros.</p> : null}
      <ImportTextDialog open={importing} onOpenChange={setImporting} />
    </div>
  );
}

export function ImportTextDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [translation, setTranslation] = useState("");
  const save = async () => {
    if (!text.trim()) return toast.error("Pega un texto en chino.");
    const id = `user-${uuid()}`;
    await db.readings.put({ id, lang: getActiveLang(), title: title.trim() || text.trim().slice(0, 12), text: text.trim(), translation: translation.trim() || undefined, source: "user", addedAt: Date.now() });
    toast.success("Texto guardado");
    onOpenChange(false);
    setText("");
    setTitle("");
    setTranslation("");
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Importar un texto" description="Pega cualquier texto en chino (de tu libro, un cartel, un mensaje) y léelo con pinyin, popup y añadir palabras." side="bottom" className="sm:max-w-xl">
        <div className="space-y-3">
          <div>
            <Label htmlFor="it-title">Título</Label>
            <Input id="it-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Texto de la clase del martes" />
          </div>
          <div>
            <Label htmlFor="it-text">Texto en chino</Label>
            <Textarea id="it-text" lang={targetLang()} className="zh min-h-40 text-base" value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="it-es">Traducción (opcional)</Label>
            <Textarea id="it-es" value={translation} onChange={(e) => setTranslation(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button onClick={() => void save()}>
              <BookOpen /> Guardar y leer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
