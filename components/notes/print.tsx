"use client";
/**
 * Exportar a PDF (imprimir desde el navegador) con estilo papel: un apunte, un tema/etiqueta o todos.
 * Incluye pinyin visible, ejemplos, preguntas Cornell y, opcionalmente, 田字格 para practicar los hanzi del apunte.
 */
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Printer } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "@/lib/languages/link";
import { db, type Note } from "@/lib/db";
import { usePack } from "@/lib/languages/provider";
import { templateFor } from "@/lib/notes/templates";
import type { PMDoc } from "@/lib/notes/markdown";
import { Button } from "@/components/ui/button";
import { Select, Switch, Label } from "@/components/ui/primitives";
import { TargetText } from "@/components/target/target-text";
import { NoteFields } from "./fields";
import { Mixed } from "@/components/target/mixed";

const NoteEditor = dynamic(() => import("./editor/editor"), { ssr: false });
const EMPTY: Note[] = [];

export function PrintNotesPage() {
  const pack = usePack();
  const sp = useSearchParams();
  const ids = (sp.get("ids") ?? "").split(",").filter(Boolean);
  const tagParam = sp.get("tag") ?? "";
  const [scope, setScope] = useState<"ids" | "tag" | "all">(ids.length ? "ids" : tagParam ? "tag" : "all");
  const [tag, setTag] = useState(tagParam);
  const [grid, setGrid] = useState(true);
  const [cues, setCues] = useState(true);
  const notes = useLiveQuery(() => db.notes.where("lang").equals(pack.id).filter((n) => n.status === "active").toArray(), [pack.id]) ?? EMPTY;
  const tags = useMemo(() => Array.from(new Set(notes.flatMap((n) => n.tags))).sort(), [notes]);
  const selected = useMemo(() => {
    if (scope === "ids") return ids.map((id) => notes.find((n) => n.id === id)).filter((n): n is Note => Boolean(n));
    if (scope === "tag") return notes.filter((n) => n.tags.includes(tag));
    return notes.filter((n) => !n.builtin);
  }, [scope, ids, tag, notes]);

  return (
    <div className="xb-print mx-auto max-w-3xl">
      <div className="xb-no-print mb-4 space-y-3">
        <Link href="/apuntes" className="inline-flex items-center gap-1 text-sm text-ink-faint hover:text-ink">
          <ArrowLeft className="size-4" /> Apuntes
        </Link>
        <div className="card-paper flex flex-wrap items-center gap-3 p-3">
          <Select value={scope} onChange={(e) => setScope(e.target.value as typeof scope)} aria-label="Qué imprimir">
            {ids.length ? <option value="ids">Este apunte</option> : null}
            <option value="tag">Un tema (etiqueta)</option>
            <option value="all">Todos mis apuntes</option>
          </Select>
          {scope === "tag" ? (
            <Select value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Etiqueta">
              <option value="">elige etiqueta…</option>
              {tags.map((t) => (
                <option key={t} value={t}>
                  #{t}
                </option>
              ))}
            </Select>
          ) : null}
          <Label className="flex items-center gap-2 text-xs">
            <Switch checked={grid} onCheckedChange={setGrid} /> 田字格 para practicar
          </Label>
          <Label className="flex items-center gap-2 text-xs">
            <Switch checked={cues} onCheckedChange={setCues} /> preguntas Cornell
          </Label>
          <Button variant="ink" className="ml-auto" onClick={() => window.print()}>
            <Printer /> Imprimir / guardar PDF
          </Button>
        </div>
        <p className="text-xs text-ink-faint">En el diálogo de impresión elige «Guardar como PDF». Se imprimen {selected.length} apuntes con pinyin visible.</p>
      </div>
      <div className="space-y-8">
        {selected.map((n) => (
          <PrintNote key={n.id} note={n} grid={grid} cues={cues} />
        ))}
      </div>
    </div>
  );
}

function PrintNote({ note, grid, cues }: { note: Note; grid: boolean; cues: boolean }) {
  const pack = usePack();
  const tpl = templateFor(note.type);
  const chars = useMemo(() => {
    const text = `${note.title} ${JSON.stringify(note.fields)} ${note.markdown}`;
    const set = new Set<string>();
    for (const c of pack.characters.charsOf(text)) set.add(c);
    return Array.from(set).slice(0, 40);
  }, [note, pack]);
  return (
    <article className="card-paper break-inside-avoid p-5">
      <header className="mb-3 border-b border-line pb-2">
        <p className="text-[11px] uppercase tracking-[0.14em] text-ink-faint">
          <span lang="zh-CN" className="zh-serif mr-1 text-cinnabar">{tpl.native}</span> {tpl.name}
          {note.level ? ` · HSK ${note.level}` : ""}
          {note.tags.length ? ` · ${note.tags.map((t) => `#${t}`).join(" ")}` : ""}
        </p>
        <h2 className="font-serif-es text-2xl font-semibold text-ink">{pack.hasTargetText(note.title) ? <TargetText text={note.title} size="lg" interactive={false} /> : <Mixed>{note.title}</Mixed>}</h2>
      </header>
      <div className="grid gap-4 md:grid-cols-[1fr_14rem]">
        <div className="space-y-4">
          {tpl.fields.length ? <NoteFields template={tpl} fields={note.fields} onChange={() => undefined} readOnly /> : null}
          <NoteEditor doc={note.doc as PMDoc} onChange={() => undefined} readOnly />
          {note.summary ? (
            <p className="border-t border-line pt-2 text-sm">
              <span className="text-[11px] uppercase tracking-wide text-ink-faint">Resumen · </span>
              <Mixed>{note.summary}</Mixed>
            </p>
          ) : null}
        </div>
        {cues && note.cues.length ? (
          <aside className="cornell-cue pr-3 text-sm">
            <p className="mb-1 text-[11px] uppercase tracking-wide text-ink-faint">Preguntas clave</p>
            <ul className="space-y-2">
              {note.cues.map((c) => (
                <li key={c.id}>
                  <p className="font-medium text-ink"><Mixed>{c.q}</Mixed></p>
                  <p className="text-xs text-ink-faint"><Mixed>{c.a}</Mixed></p>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
      </div>
      {grid && chars.length ? (
        <div className="mt-4 border-t border-line pt-3">
          <p className="mb-1 text-[11px] uppercase tracking-wide text-ink-faint">Practica los caracteres</p>
          <div className="print-tianzige flex flex-wrap gap-0">
            {chars.map((c) => (
              <span key={c} lang="zh-CN" className="zh-serif tianzige inline-flex size-12 items-center justify-center border border-cinnabar/40 text-2xl text-ink/25">
                {c}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}
