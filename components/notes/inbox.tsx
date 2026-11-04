"use client";
/**
 * Bandeja de entrada 收集箱: capturas de clase pendientes + asistente «Procesar bandeja» (10 minutos):
 * para cada captura sugiere una plantilla, prerrellena los campos y crea el apunte estructurado.
 */
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, ArrowRight, Check, Inbox, Sparkles, Trash2, Wand2, X } from "lucide-react";
import Link from "@/lib/languages/link";
import { useLangRouter } from "@/lib/languages/link";
import { db, type Note, type NoteType } from "@/lib/db";
import { usePack } from "@/lib/languages/provider";
import { deleteNote, saveNote } from "@/lib/notes/repo";
import { suggestTemplate } from "@/lib/notes/classify";
import { NOTE_TYPES, defaultsFor, templateFor } from "@/lib/notes/templates";
import { markdownToDoc } from "@/lib/notes/markdown";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, Input, PageHeader, Select } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { TargetText } from "@/components/target/target-text";
import { NoteFields } from "./fields";
import { openQuickCapture } from "./quick-capture";
import { formatDate } from "@/lib/utils";
import { pageNative } from "@/lib/languages/ui-text";
import { Mixed } from "@/components/target/mixed";

export function InboxPage() {
  const pack = usePack();
  const items = useLiveQuery(() => db.notes.where("[lang+status]").equals([pack.id, "inbox"]).reverse().sortBy("createdAt"), [pack.id]) ?? [];
  const [processing, setProcessing] = useState(false);
  const [idx, setIdx] = useState(0);
  const current = items[idx];

  if (processing && current) {
    return <ProcessOne key={current.id} note={current} index={idx} total={items.length} onDone={() => setIdx((i) => Math.min(i, Math.max(0, items.length - 2)))} onExit={() => setProcessing(false)} />;
  }
  if (processing && !current) {
    return (
      <div className="mx-auto max-w-lg">
        <EmptyState title="¡Bandeja procesada!" zh={{ zh: "温故而知新。", py: "Wēn gù ér zhī xīn.", es: "Repasar lo viejo para conocer lo nuevo." }} description="Todas las capturas son ya apuntes estructurados. Mañana aparecerán en tu repaso." action={<Button asChild variant="ink"><Link href="/apuntes">Ver apuntes</Link></Button>} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link href="/apuntes" className="inline-flex items-center gap-1 text-sm text-ink-faint hover:text-ink">
        <ArrowLeft className="size-4" /> Apuntes
      </Link>
      <PageHeader
        title="Bandeja de entrada"
        zh={pageNative("inbox")}
        subtitle="Durante la clase captura rápido (texto, foto, dictado). Después de clase, procesa la bandeja en 10 minutos: cada captura se convierte en un apunte con la plantilla adecuada."
        action={
          <>
            <Button variant="outline" onClick={() => openQuickCapture()}>
              <Inbox /> Captura
            </Button>
            <Button variant="ink" onClick={() => { setIdx(0); setProcessing(true); }} disabled={!items.length}>
              <Wand2 /> Procesar bandeja ({items.length})
            </Button>
          </>
        }
      />
      {items.length ? (
        <ul className="space-y-2">
          {items.map((n, i) => (
            <li key={n.id} className="card-paper flex items-start gap-3 p-3">
              <span className="tabular mt-0.5 text-xs text-ink-faint">{formatDate(n.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink">{pack.hasTargetText(n.markdown || n.title) ? <TargetText text={(n.markdown || n.title).slice(0, 300)} size="sm" ruby={false} /> : <Mixed>{(n.markdown || n.title).slice(0, 300)}</Mixed>}</p>
                {n.source?.context && n.source.context !== n.markdown ? <p className="mt-1 text-xs text-ink-faint">Desde: <TargetText text={n.source.context.slice(0, 80)} size="sm" ruby={false} /></p> : null}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="sm" variant="secondary" onClick={() => { setIdx(i); setProcessing(true); }}>
                  Procesar
                </Button>
                <Button size="icon-sm" variant="ghost" className="text-danger" onClick={() => void deleteNote(n.id)} aria-label="Borrar captura">
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Bandeja vacía" zh={{ zh: "好记性不如烂笔头。", py: "Hǎo jìxing bùrú làn bǐtóu.", es: "Más vale un mal lápiz que una buena memoria." }} description="En clase, pulsa N (o el botón + apunte) y apunta lo que diga el profesor sin ordenarlo. Aquí lo convertirás en apuntes." action={<Button onClick={() => openQuickCapture()}><Inbox /> Hacer una captura</Button>} />
      )}
    </div>
  );
}

function ProcessOne({ note, index, total, onDone, onExit }: { note: Note; index: number; total: number; onDone: () => void; onExit: () => void }) {
  const pack = usePack();
  const router = useLangRouter();
  const raw = note.markdown || note.title;
  const suggestion = useMemo(() => suggestTemplate(raw, { fromWord: note.source?.kind === "dictionary" ? note.source.ref : undefined }), [raw, note.source]);
  const [type, setType] = useState<NoteType>(suggestion.type);
  const [title, setTitle] = useState(suggestion.title);
  const [fields, setFields] = useState<Record<string, unknown>>({ ...defaultsFor(suggestion.type), ...suggestion.fields });
  const [rest, setRest] = useState(suggestion.rest);
  const [busy, setBusy] = useState(false);
  const tpl = templateFor(type);

  const changeType = (t: NoteType) => {
    setType(t);
    const s = suggestTemplate(raw);
    setFields({ ...defaultsFor(t), ...(s.type === t ? s.fields : {}) });
  };

  const save = async (open: boolean) => {
    setBusy(true);
    try {
      await saveNote(note.id, { type, title: title.trim() || tpl.defaultTitle, fields, status: "active", doc: markdownToDoc(rest), tags: Array.from(new Set([...note.tags, ...(note.source?.kind === "class" ? ["clase"] : [])])) });
      toast.success("Apunte creado", `${tpl.name}: ${title}`);
      onDone();
      if (open) router.push(`/apuntes/${encodeURIComponent(note.id)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between text-sm text-ink-faint">
        <button type="button" onClick={onExit} className="inline-flex items-center gap-1 hover:text-ink">
          <X className="size-4" /> Salir
        </button>
        <span className="tabular">
          Captura {index + 1} de {total}
        </span>
      </div>
      <Card className="bg-paper-sunk/40">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Lo que capturaste</p>
        <p className="whitespace-pre-wrap text-sm text-ink">{pack.hasTargetText(raw) ? <TargetText text={raw} size="sm" ruby={false} /> : <Mixed>{raw}</Mixed>}</p>
      </Card>
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Sparkles className="size-4 text-gold-ink" />
          <p className="text-sm text-ink">
            Sugerencia: <strong>{templateFor(suggestion.type).name}</strong> <span className="text-ink-faint">({suggestion.reason})</span>
          </p>
          <Select value={type} onChange={(e) => changeType(e.target.value as NoteType)} className="ml-auto h-9" aria-label="Plantilla">
            {NOTE_TYPES.filter((t) => t !== "lesson").map((t) => (
              <option key={t} value={t}>
                {templateFor(t).native} {templateFor(t).name}
              </option>
            ))}
          </Select>
        </div>
        <p className="rounded-[8px] bg-gold/10 px-3 py-2 text-xs text-gold-ink"><Mixed>{tpl.coach}</Mixed></p>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-soft">Título</span>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} lang={pack.hasTargetText(title) ? pack.bcp47 : undefined} />
        </label>
        <NoteFields template={tpl} fields={fields} onChange={setFields} />
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-soft">Resto (apuntes libres)</span>
          <textarea value={rest} onChange={(e) => setRest(e.target.value)} className="min-h-20 w-full rounded-[8px] border border-line bg-paper-sunk/70 px-3 py-2 text-sm" aria-label="Apuntes libres" />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <Button variant="ghost" className="text-danger hover:text-danger" onClick={async () => { await deleteNote(note.id); onDone(); }}>
            <Trash2 /> Descartar captura
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void save(true)} disabled={busy}>
              Guardar y abrir
            </Button>
            <Button variant="ink" onClick={() => void save(false)} disabled={busy}>
              <Check /> Guardar y siguiente <ArrowRight />
            </Button>
          </div>
        </div>
        <Badge variant="muted">Se recalculan pinyin, enlaces y palabras del mazo al guardar.</Badge>
      </Card>
    </div>
  );
}
