"use client";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Save, Trash2 } from "lucide-react";
import { db, uuid, type Note } from "@/lib/db";
import { targetWordsIn } from "@/lib/languages/helpers";
import { getActiveLang } from "@/lib/languages/registry";
import { Button } from "@/components/ui/button";
import { Card, Input, Textarea } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { Markdown } from "@/components/learn/markdown";
import { ChineseText } from "@/components/target/target-text";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { targetLang } from "@/lib/languages/registry";
import { ui } from "@/lib/languages/ui-text";
import { getActivePack } from "@/lib/languages/registry";
import { Mixed } from "@/components/target/mixed";

/** Notas de estudio en Markdown; las palabras chinas de la nota quedan vinculadas (popup + enlace al mazo). */
export function NotesPanel() {
  const notes = useLiveQuery(() => db.notes.where("[lang+kind]").equals([getActiveLang(), "note"]).reverse().sortBy("updatedAt"), []) ?? [];
  const [sel, setSel] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [md, setMd] = useState("");
  const [preview, setPreview] = useState(false);
  const current = notes.find((n) => n.id === sel);

  // estado derivado: al cambiar de nota se cargan sus campos (patrón "prev prop")
  const [prevSel, setPrevSel] = useState<string | null>(null);
  if (sel !== prevSel) {
    setPrevSel(sel);
    if (current) {
      setTitle(current.title);
      setMd(current.markdown);
    }
  }

  const create = async () => {
    const id = uuid();
    const n: Note = { id, lang: getActiveLang(), title: "Nueva nota", markdown: "", wordIds: [], kind: "note", createdAt: Date.now(), updatedAt: Date.now() };
    await db.notes.put(n);
    setSel(id);
    setTitle(n.title);
    setMd("");
    setPreview(false);
  };
  const save = async () => {
    if (!current) return;
    const words = await db.words.where("lang").equals(getActiveLang()).toArray();
    const linked = words.filter((w) => md.includes(w.hanzi)).map((w) => w.id);
    await db.notes.update(current.id, { title: title.trim() || "Sin título", markdown: md, wordIds: linked, updatedAt: Date.now() });
    toast.success("Nota guardada", linked.length ? `${linked.length} palabras del mazo vinculadas` : undefined);
  };
  const remove = async () => {
    if (!current || !window.confirm("¿Eliminar esta nota?")) return;
    await db.notes.delete(current.id);
    setSel(null);
  };
  const zhWords = targetWordsIn(md, 30);

  return (
    <div className="grid gap-3 md:grid-cols-[15rem_1fr]">
      <Card className="p-2 sm:p-2">
        <Button size="sm" variant="ink" className="w-full" onClick={() => void create()}>
          <Plus /> Nueva nota
        </Button>
        <ul className="mt-2 max-h-96 space-y-0.5 overflow-y-auto scrollbar-thin">
          {notes.map((n) => (
            <li key={n.id}>
              <button
                onClick={() => setSel(n.id)}
                aria-current={sel === n.id ? "true" : undefined}
                className={cn("relative w-full rounded-[8px] px-2.5 py-1.5 text-left text-sm transition-colors duration-[var(--dur-ui)] hover:bg-paper-sunk", sel === n.id && "bg-paper-sunk")}
              >
                {sel === n.id ? <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r bg-cinnabar" aria-hidden="true" /> : null}
                <span className="block truncate font-medium text-ink"><Mixed>{n.title}</Mixed></span>
                <span className="block text-[11px] text-ink-faint">{formatDate(n.updatedAt)}</span>
              </button>
            </li>
          ))}
          {!notes.length ? (
            <li className="px-2 py-3 text-xs leading-relaxed text-ink-faint">
              <span lang={targetLang()} className="zh-kai block text-base text-ink">
                {ui().notesQuote.text}
              </span>
              <span className="block">{ui().notesQuote.es} Escribe en Markdown: **negrita**, listas, tablas. Las palabras en {getActivePack().meta.names.adjective} se vinculan a tu mazo.</span>
            </li>
          ) : null}
        </ul>
      </Card>
      <Card>
        {current ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="min-w-0 flex-1 font-serif-es text-base font-medium" aria-label="Título de la nota" />
              <Button size="sm" variant="ghost" onClick={() => setPreview((p) => !p)}>
                {preview ? "Editar" : "Vista previa"}
              </Button>
              <Button size="sm" variant="ink" onClick={() => void save()}>
                <Save /> Guardar
              </Button>
              <Button size="icon-sm" variant="ghost" className="text-danger" onClick={() => void remove()} aria-label="Eliminar">
                <Trash2 />
              </Button>
            </div>
            {preview ? (
              <div className="card-sunk min-h-64 p-4">
                <Markdown>{md || "*Nota vacía*"}</Markdown>
              </div>
            ) : (
              <Textarea value={md} onChange={(e) => setMd(e.target.value)} className="min-h-64 font-mono text-sm leading-relaxed" placeholder={`## Clase del martes\n- ${ui().examples.question} ${getActivePack().reading(ui().examples.question)}: para llamar la atención con educación\n- Deberes: p. 23 ej. 2`} />
            )}
            {zhWords.length ? (
              <div className="flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
                <span className="text-xs text-ink-faint">Palabras en esta nota:</span>
                {zhWords.map((w) => (
                  <ChineseText key={w} text={w} size="sm" ruby={false} />
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-ink-faint">Selecciona una nota o crea una nueva.</p>
        )}
      </Card>
    </div>
  );
}
