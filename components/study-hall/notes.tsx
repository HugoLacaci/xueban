"use client";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Save, Trash2 } from "lucide-react";
import { db, uuid, type Note } from "@/lib/db";
import { hanziOnly, hasHanzi } from "@/lib/pinyin/convert";
import { Button } from "@/components/ui/button";
import { Card, Input, Textarea } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { Markdown } from "@/components/learn/markdown";
import { ChineseText } from "@/components/zh/chinese-text";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

/** Notas de estudio en Markdown; las palabras chinas de la nota quedan vinculadas (popup + enlace al mazo). */
export function NotesPanel() {
  const notes = useLiveQuery(() => db.notes.where("kind").equals("note").reverse().sortBy("updatedAt"), []) ?? [];
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
    const n: Note = { id, title: "Nueva nota", markdown: "", wordIds: [], kind: "note", createdAt: Date.now(), updatedAt: Date.now() };
    await db.notes.put(n);
    setSel(id);
    setTitle(n.title);
    setMd("");
    setPreview(false);
  };
  const save = async () => {
    if (!current) return;
    const words = await db.words.toArray();
    const linked = words.filter((w) => md.includes(w.hanzi)).map((w) => w.id);
    await db.notes.update(current.id, { title: title.trim() || "Sin título", markdown: md, wordIds: linked, updatedAt: Date.now() });
    toast.success("Nota guardada", linked.length ? `${linked.length} palabras del mazo vinculadas` : undefined);
  };
  const remove = async () => {
    if (!current || !window.confirm("¿Eliminar esta nota?")) return;
    await db.notes.delete(current.id);
    setSel(null);
  };
  const zhWords = Array.from(new Set((md.match(/[一-鿿]{1,4}/g) ?? []).filter(hasHanzi).map(hanziOnly))).slice(0, 30);

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
                <span className="block truncate font-medium text-ink">{n.title}</span>
                <span className="block text-[11px] text-ink-faint">{formatDate(n.updatedAt)}</span>
              </button>
            </li>
          ))}
          {!notes.length ? (
            <li className="px-2 py-3 text-xs leading-relaxed text-ink-faint">
              <span lang="zh-CN" className="zh-kai block text-base text-ink">
                好记性不如烂笔头。
              </span>
              <span className="block">Una buena memoria no vale lo que un lápiz gastado. Escribe en Markdown: **negrita**, listas, tablas. Las palabras chinas se vinculan a tu mazo.</span>
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
              <Textarea value={md} onChange={(e) => setMd(e.target.value)} className="min-h-64 font-mono text-sm leading-relaxed" placeholder={"## Clase del martes\n- 请问 qǐngwèn: para preguntar con educación\n- Deberes: p. 23 ej. 2"} />
            )}
            {zhWords.length ? (
              <div className="flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
                <span className="text-xs text-ink-faint">Chino en esta nota:</span>
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
