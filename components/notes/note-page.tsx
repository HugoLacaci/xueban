"use client";
/**
 * Página de un apunte: cabecera (tipo, título, etiquetas, fijado), campos de la plantilla, columna Cornell
 * (preguntas clave + resumen), editor de bloques, enlaces y backlinks, y acciones (práctica, exportar, imprimir).
 * Autoguardado con retardo; modo «Leer» (todo el chino interactivo) y modo «Editar».
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, BookOpen, Copy, Dumbbell, Eye, FileDown, Layers, Link2, Pencil, Pin, PinOff, Plus, Printer, Sparkles, Trash2, X, Archive, Check } from "lucide-react";
import Link from "@/lib/languages/link";
import { useLangRouter } from "@/lib/languages/link";
import { db, uuid, type Note, type NoteCue, type Word } from "@/lib/db";
import { usePack } from "@/lib/languages/provider";
import { backlinksOf, deleteNote, duplicateNote, saveNote } from "@/lib/notes/repo";
import { cueSuggestions, templateFor } from "@/lib/notes/templates";
import { docToMarkdown, type PMDoc } from "@/lib/notes/markdown";
import { Button } from "@/components/ui/button";
import { Badge, Card, Input, Spinner, Textarea, Dialog, DialogContent, Kbd } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { TargetText } from "@/components/target/target-text";
import { NoteFields } from "./fields";
import { NoteTypeBadge } from "./type-badge";
import { TagEditor } from "./tag-editor";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { Mixed } from "@/components/target/mixed";
import { ClassNoteView, classPackageOf } from "@/components/classes/class-note-view";

const NoteEditor = dynamic(() => import("./editor/editor"), { ssr: false, loading: () => <div className="flex h-40 items-center justify-center text-ink-faint"><Spinner /></div> });

function download(name: string, content: string, type = "text/plain") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function NoteEditorPage({ id }: { id: string }) {
  const pack = usePack();
  const router = useLangRouter();
  const note = useLiveQuery(() => db.notes.get(id), [id]);
  const backlinks = useLiveQuery(async () => (note ? backlinksOf(note) : []), [note?.id, note?.title]) ?? [];
  const linkedWords = useLiveQuery(async () => {
    if (!note?.wordIds.length) return [] as Word[];
    const rows = await db.words.bulkGet(note.wordIds);
    return rows.filter((w): w is Word => Boolean(w));
  }, [note?.wordIds.join(",")]) ?? [];
  const cards = useLiveQuery(() => db.noteCards.where("noteId").equals(id).count(), [id]) ?? 0;
  const [mode, setMode] = useState<"read" | "edit">("edit");
  const [showFields, setShowFields] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState<"idle" | "pending" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pendingRef = useRef<Partial<Note>>({});

  // los apuntes del profesor se abren en modo lectura (patrón «prev prop»)
  const [seenId, setSeenId] = useState<string | null>(null);
  if (note && seenId !== note.id) {
    setSeenId(note.id);
    if (note.builtin) setMode("read");
    else if (note.status === "inbox") setMode("edit");
    // clase importada de un paquete: se abre en lectura con la ficha plegada (el paquete se pinta arriba)
    if (classPackageOf(note)) {
      setMode("read");
      setShowFields(false);
    }
  }

  const flush = useCallback(async () => {
    const patch = pendingRef.current;
    pendingRef.current = {};
    if (!Object.keys(patch).length) return;
    await saveNote(id, patch);
    setSaving("saved");
    setTimeout(() => setSaving((s) => (s === "saved" ? "idle" : s)), 1500);
  }, [id]);

  const queue = useCallback(
    (patch: Partial<Note>) => {
      pendingRef.current = { ...pendingRef.current, ...patch };
      setSaving("pending");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), 700);
    },
    [flush],
  );
  useEffect(() => () => { clearTimeout(timer.current); void flush(); }, [flush]);

  const template = note ? templateFor(note.type) : undefined;
  const suggestions = useMemo(() => (note && template ? cueSuggestions(note.type, note.fields).filter((s) => !note.cues.some((c) => c.q === s)) : []), [note, template]);

  if (note === undefined) return <div className="flex h-40 items-center justify-center"><Spinner /></div>;
  if (note === null || !note) {
    return (
      <Card className="text-center">
        <p className="text-sm text-ink-faint">Este apunte no existe (o se ha borrado).</p>
        <Button asChild variant="secondary" className="mt-3">
          <Link href="/apuntes">Volver a Apuntes</Link>
        </Button>
      </Card>
    );
  }
  if (note.lang !== pack.id) {
    return <Card className="text-sm text-ink-faint">Este apunte es de otro idioma.</Card>;
  }

  const readOnly = mode === "read";
  const setCues = (cues: NoteCue[]) => queue({ cues });
  const title = note.title;

  const toPractice = async () => {
    const { generatePracticeFromNote } = await import("@/lib/notes/practice");
    const r = await generatePracticeFromNote(note);
    toast.success(`${r.cards} tarjetas y ${r.exercises} ejercicios creados`, "Repásalos en Apuntes → Repasar y en Practicar");
  };

  return (
    <div className="xb-print mx-auto max-w-5xl">
      <div className="xb-no-print mb-3 flex flex-wrap items-center gap-2 text-sm">
        <Link href="/apuntes" className="inline-flex items-center gap-1 text-ink-faint hover:text-ink">
          <ArrowLeft className="size-4" /> Apuntes
        </Link>
        {note.status === "inbox" ? <Badge variant="lacquer">en la bandeja</Badge> : null}
        {note.builtin ? <Badge variant="gold">apunte del profesor{note.reviewed === false ? " · pendiente de validar con tu profesor" : ""}</Badge> : null}
        <span className="ml-auto flex items-center gap-1">
          <span className="mr-2 text-xs text-ink-faint" aria-live="polite">
            {saving === "pending" ? "guardando…" : saving === "saved" ? "guardado" : `editado ${formatDate(note.updatedAt)}`}
          </span>
          <Button size="sm" variant={readOnly ? "ink" : "ghost"} onClick={() => setMode("read")} aria-pressed={readOnly}>
            <Eye /> Leer
          </Button>
          <Button size="sm" variant={!readOnly ? "ink" : "ghost"} onClick={() => setMode("edit")} aria-pressed={!readOnly} disabled={note.builtin}>
            <Pencil /> Editar
          </Button>
        </span>
      </div>

      <header className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <NoteTypeBadge type={note.type} />
          {note.level ? <Badge variant="jade">HSK {note.level}</Badge> : null}
          <button type="button" onClick={() => queue({ pinned: !note.pinned })} className={cn("ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs", note.pinned ? "border-gold bg-gold/12 text-gold-ink" : "border-line text-ink-faint hover:text-ink")} aria-pressed={note.pinned} title="Fijar">
            {note.pinned ? <Pin className="size-3" /> : <PinOff className="size-3" />} {note.pinned ? "fijado" : "fijar"}
          </button>
        </div>
        {readOnly ? (
          <h1 className="mt-2 font-serif-es text-[28px] font-semibold leading-tight tracking-tight text-ink sm:text-[34px]">{pack.hasTargetText(title) ? <TargetText text={title} size="xl" ruby={false} className="font-serif-es" /> : <Mixed>{title}</Mixed>}</h1>
        ) : (
          <Input defaultValue={title} key={note.id} onChange={(e) => queue({ title: e.target.value })} className="mt-2 h-auto border-0 bg-transparent px-0 font-serif-es text-[28px] font-semibold leading-tight tracking-tight shadow-none focus-visible:ring-0 sm:text-[34px]" placeholder={template?.defaultTitle} aria-label="Título del apunte" lang={pack.hasTargetText(title) ? pack.bcp47 : undefined} />
        )}
        <div className="mt-2">
          <TagEditor tags={note.tags} onChange={(tags) => queue({ tags })} readOnly={readOnly} />
        </div>
        {template && !readOnly && note.status === "inbox" ? <p className="mt-2 rounded-[8px] bg-gold/10 px-3 py-2 text-xs text-gold-ink">{template.coach}</p> : null}
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
        <div className="min-w-0 space-y-5">
          {pack.id === "zh" && classPackageOf(note) ? <ClassNoteView note={note} /> : null}
          {template && template.fields.length ? (
            <section className="card-paper p-4 sm:p-5" data-tour="fields">
              <button type="button" onClick={() => setShowFields((s) => !s)} className="mb-3 flex w-full items-center justify-between text-left" aria-expanded={showFields}>
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Ficha · {template.name}</span>
                <span className="text-xs text-ink-faint">{showFields ? "ocultar" : "mostrar"}</span>
              </button>
              {showFields ? <NoteFields template={template} fields={note.fields} onChange={(fields) => queue({ fields })} readOnly={readOnly} /> : null}
            </section>
          ) : null}

          <section className="card-paper p-4 sm:p-5" data-tour="editor">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Apuntes libres</p>
            <NoteEditor key={`${note.id}-${readOnly ? "r" : "e"}`} doc={note.doc as PMDoc} onChange={(doc) => queue({ doc })} noteId={note.id} readOnly={readOnly} placeholder={template?.coach} />
          </section>

          <section className="card-paper p-4 sm:p-5" data-tour="cornell">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Resumen en una línea</p>
            </div>
            {readOnly ? (
              <p className="text-sm text-ink">{note.summary ? <Mixed>{note.summary}</Mixed> : <span className="text-ink-faint">—</span>}</p>
            ) : (
              <Textarea defaultValue={note.summary ?? ""} key={`${note.id}-s`} onChange={(e) => queue({ summary: e.target.value })} className="min-h-12" placeholder="Si tuvieras que explicarlo en una frase a un compañero…" aria-label="Resumen" />
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="card-paper cornell-cue p-4" data-tour="cues">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Preguntas clave (Cornell)</p>
            <ul className="space-y-2">
              {note.cues.map((c) => (
                <li key={c.id} className="rounded-[8px] border border-line/70 bg-paper-raised/60 p-2 text-sm">
                  {readOnly ? (
                    <details>
                      <summary className="cursor-pointer font-medium text-ink"><Mixed>{c.q}</Mixed></summary>
                      <p className="mt-1 text-ink-soft"><Mixed>{c.a}</Mixed></p>
                    </details>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-start gap-1">
                        <Input defaultValue={c.q} onChange={(e) => setCues(note.cues.map((x) => (x.id === c.id ? { ...x, q: e.target.value } : x)))} className="h-8 text-sm" placeholder="Pregunta" aria-label="Pregunta clave" />
                        <button type="button" onClick={() => setCues(note.cues.filter((x) => x.id !== c.id))} className="rounded p-1 text-ink-faint hover:text-danger" aria-label="Quitar pregunta">
                          <X className="size-3.5" />
                        </button>
                      </div>
                      <Textarea defaultValue={c.a} onChange={(e) => setCues(note.cues.map((x) => (x.id === c.id ? { ...x, a: e.target.value } : x)))} className="min-h-10 text-sm" placeholder="Respuesta (se tapa al repasar)" aria-label="Respuesta" />
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {!readOnly ? (
              <div className="mt-2 space-y-1">
                <Button size="sm" variant="secondary" className="w-full" onClick={() => setCues([...note.cues, { id: uuid(), q: "", a: "" }])}>
                  <Plus /> Pregunta
                </Button>
                {suggestions.slice(0, 3).map((s) => (
                  <button key={s} type="button" onClick={() => setCues([...note.cues, { id: uuid(), q: s, a: "" }])} className="block w-full rounded-[6px] px-2 py-1 text-left text-xs text-indigo hover:bg-paper-sunk">
                    <Sparkles className="mr-1 inline size-3" />
                    <Mixed>{s}</Mixed>
                  </button>
                ))}
              </div>
            ) : null}
            {note.cues.length ? <p className="mt-2 text-[11px] text-ink-faint">Se repasan tapando la respuesta (FSRS) en <Link href="/apuntes/repasar" className="underline">Repasar</Link>.</p> : null}
          </section>

          <section className="card-paper xb-no-print p-4" data-tour="actions">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">De apunte a práctica</p>
            <div className="space-y-1.5">
              <Button size="sm" variant="jade" className="w-full justify-start" onClick={() => void toPractice()}>
                <Layers /> Crear tarjetas y ejercicios{cards ? ` (${cards})` : ""}
              </Button>
              <Button size="sm" variant="secondary" className="w-full justify-start" asChild>
                <Link href={`/practicar?mode=note&note=${encodeURIComponent(note.id)}`}>
                  <Dumbbell /> Practicar este apunte
                </Link>
              </Button>
              {pack.id === "zh" ? (
                <Button size="sm" variant="secondary" className="w-full justify-start" asChild>
                  <Link href={`/tutor?mode=explainer&note=${encodeURIComponent(note.id)}`}>
                    <BookOpen /> Pregúntale al tutor
                  </Link>
                </Button>
              ) : null}
            </div>
            <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Apunte</p>
            <div className="space-y-1.5">
              {note.builtin ? (
                <Button size="sm" variant="secondary" className="w-full justify-start" onClick={async () => { const c = await duplicateNote(note.id); if (c) router.push(`/apuntes/${encodeURIComponent(c.id)}`); }}>
                  <Copy /> Duplicar y anotar
                </Button>
              ) : (
                <Button size="sm" variant="ghost" className="w-full justify-start" onClick={async () => { const c = await duplicateNote(note.id); if (c) router.push(`/apuntes/${encodeURIComponent(c.id)}`); }}>
                  <Copy /> Duplicar
                </Button>
              )}
              <Button size="sm" variant="ghost" className="w-full justify-start" onClick={() => download(`${note.title}.md`, `# ${note.title}\n\n${docToMarkdown(note.doc as PMDoc)}`, "text/markdown")}>
                <FileDown /> Exportar Markdown
              </Button>
              <Button size="sm" variant="ghost" className="w-full justify-start" onClick={() => download(`${note.title}.json`, JSON.stringify(note, null, 1), "application/json")}>
                <FileDown /> Exportar JSON
              </Button>
              <Button size="sm" variant="ghost" className="w-full justify-start" asChild>
                <Link href={`/apuntes/imprimir?ids=${encodeURIComponent(note.id)}`}>
                  <Printer /> Imprimir (PDF)
                </Link>
              </Button>
              {note.status === "inbox" ? (
                <Button size="sm" variant="jade" className="w-full justify-start" onClick={() => { queue({ status: "active" }); toast.success("Apunte procesado"); }}>
                  <Check /> Marcar como procesado
                </Button>
              ) : null}
              {!note.builtin ? (
                <Button size="sm" variant="ghost" className="w-full justify-start" onClick={() => queue({ status: note.status === "archived" ? "active" : "archived" })}>
                  <Archive /> {note.status === "archived" ? "Desarchivar" : "Archivar"}
                </Button>
              ) : null}
              <Button size="sm" variant="ghost" className="w-full justify-start text-danger hover:text-danger" onClick={() => setConfirmDelete(true)}>
                <Trash2 /> Eliminar
              </Button>
            </div>
          </section>

          {note.source?.href || note.source?.context ? (
            <section className="card-paper p-4">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Origen</p>
              {note.source.context ? <p className="text-sm"><TargetText text={note.source.context} size="sm" ruby={false} /></p> : null}
              {note.source.href ? (
                <Link href={note.source.href} className="text-xs text-indigo underline underline-offset-2">
                  volver al {note.source.kind === "video" ? "vídeo" : note.source.kind === "reading" ? "texto" : note.source.kind === "exercise" ? "ejercicio" : "origen"}
                </Link>
              ) : null}
            </section>
          ) : null}

          {backlinks.length || note.links.length || linkedWords.length ? (
            <section className="card-paper p-4">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Conexiones</p>
              {backlinks.length ? (
                <ul className="mb-2 space-y-0.5 text-sm">
                  {backlinks.map((b) => (
                    <li key={b.id}>
                      <Link href={`/apuntes/${encodeURIComponent(b.id)}`} className="inline-flex items-center gap-1 text-indigo hover:underline">
                        <Link2 className="size-3" /> <Mixed>{b.title}</Mixed>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
              {linkedWords.length ? (
                <div className="flex flex-wrap gap-1">
                  {linkedWords.map((w) => (
                    <Link key={w.id} href={`/flashcards/${encodeURIComponent(w.id)}`} className="rounded-[6px] border border-line px-1.5 py-0.5 text-sm hover:border-ink/40">
                      <TargetText text={w.hanzi} size="sm" ruby={false} interactive={false} />
                    </Link>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}
          <p className="px-1 text-[11px] text-ink-faint">
            <Kbd>/</Kbd> bloque · <Kbd>[[</Kbd> enlace · <Kbd>#</Kbd> etiqueta · pinyin con números + <Kbd>Tab</Kbd>
          </p>
        </aside>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent title="¿Eliminar este apunte?" description="Se borran también sus tarjetas de repaso. Esta acción no se puede deshacer.">
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={async () => { await deleteNote(note.id); router.push("/apuntes"); }}>
              <Trash2 /> Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
