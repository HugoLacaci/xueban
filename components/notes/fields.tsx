"use client";
/**
 * Formulario de los campos estructurados de cada plantilla de apunte (lib/notes/templates.ts) y su vista de lectura.
 * Cada `kind` tiene un editor y un renderizador. Todo el texto en la lengua meta se pinta con <TargetText>.
 */
import { useMemo } from "react";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { usePack } from "@/lib/languages/provider";
import { useSettings } from "@/lib/settings";
import type { DialogueLine, Example, FieldDef, FormulaPart, MiniTestItem, NoteTemplate, Pair, QA, TopicNode } from "@/lib/notes/templates";
import { TargetText } from "@/components/target/target-text";
import { AudioButton } from "@/components/target/audio-button";
import { Reading } from "@/components/target/reading";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/primitives";
import { FormulaChips, FormulaEditor, FormulaGenerator } from "@/components/notes/editor/formula-block";
import { NoteEditorContext } from "@/components/notes/editor/blocks";
import { cn } from "@/lib/utils";
import { Mixed } from "@/components/target/mixed";

type Fields = Record<string, unknown>;

export interface FieldsProps {
  template: NoteTemplate;
  fields: Fields;
  onChange: (fields: Fields) => void;
  readOnly?: boolean;
  /** Ids de campos visibles (por defecto todos) */
  only?: string[];
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const list = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/* ------------------------------------------------------------------ helpers de edición */

function ZhInput({ value, onChange, placeholder, className, ariaLabel }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; ariaLabel?: string }) {
  const pack = usePack();
  return <Input lang={pack.bcp47} className={cn(pack.meta.cssClass, "text-base", className)} value={value} onChange={(e) => onChange(pack.id === "zh" ? e.target.value : e.target.value)} placeholder={placeholder} aria-label={ariaLabel} autoCapitalize="off" spellCheck={false} />;
}

function Row({ children, onRemove, onUp, onDown }: { children: React.ReactNode; onRemove: () => void; onUp?: () => void; onDown?: () => void }) {
  return (
    <div className="flex items-start gap-1 rounded-[8px] border border-line/70 bg-paper-raised/60 p-2">
      <div className="min-w-0 flex-1">{children}</div>
      <div className="flex shrink-0 flex-col">
        {onUp ? (
          <button type="button" onClick={onUp} className="rounded p-0.5 text-ink-faint hover:text-ink" aria-label="Subir">
            <ChevronUp className="size-3.5" />
          </button>
        ) : null}
        {onDown ? (
          <button type="button" onClick={onDown} className="rounded p-0.5 text-ink-faint hover:text-ink" aria-label="Bajar">
            <ChevronDown className="size-3.5" />
          </button>
        ) : null}
        <button type="button" onClick={onRemove} className="rounded p-0.5 text-ink-faint hover:text-danger" aria-label="Quitar">
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function useListOps<T>(items: T[], onChange: (v: T[]) => void) {
  return {
    set: (i: number, patch: Partial<T>) => onChange(items.map((it, k) => (k === i ? { ...it, ...patch } : it))),
    remove: (i: number) => onChange(items.filter((_, k) => k !== i)),
    move: (i: number, d: number) => {
      const j = i + d;
      if (j < 0 || j >= items.length) return;
      const n = items.slice();
      [n[i], n[j]] = [n[j], n[i]];
      onChange(n);
    },
    add: (it: T) => onChange([...items, it]),
  };
}

/* ------------------------------------------------------------------ editores por tipo */

function ExamplesEditor({ items, onChange, min }: { items: Example[]; onChange: (v: Example[]) => void; min?: number }) {
  const ops = useListOps(items, onChange);
  const pack = usePack();
  return (
    <div className="space-y-1.5">
      {items.map((e, i) => (
        <Row key={i} onRemove={() => ops.remove(i)} onUp={i > 0 ? () => ops.move(i, -1) : undefined} onDown={i < items.length - 1 ? () => ops.move(i, 1) : undefined}>
          <div className="grid gap-1.5 sm:grid-cols-2">
            <ZhInput value={e.zh} onChange={(v) => ops.set(i, { zh: v })} placeholder={pack.meta.names.native} ariaLabel={`Ejemplo ${i + 1} (${pack.meta.names.adjective})`} />
            <Input value={e.es ?? ""} onChange={(ev) => ops.set(i, { es: ev.target.value })} placeholder="Español" aria-label={`Ejemplo ${i + 1} (español)`} />
            <Input value={e.py ?? ""} onChange={(ev) => ops.set(i, { py: ev.target.value })} placeholder={e.zh ? pack.reading(e.zh) : "pinyin (se calcula)"} className="text-sm sm:col-span-2" aria-label={`Ejemplo ${i + 1} (lectura)`} />
          </div>
        </Row>
      ))}
      <Button size="sm" variant="secondary" onClick={() => ops.add({ zh: "", es: "" })}>
        <Plus /> Añadir ejemplo{min && items.length < min ? ` (${items.length}/${min})` : ""}
      </Button>
    </div>
  );
}

function QAEditor({ items, onChange }: { items: QA[]; onChange: (v: QA[]) => void }) {
  const ops = useListOps(items, onChange);
  return (
    <div className="space-y-1.5">
      {items.map((e, i) => (
        <Row key={i} onRemove={() => ops.remove(i)}>
          <div className="grid gap-1.5 sm:grid-cols-2">
            <ZhInput value={e.q} onChange={(v) => ops.set(i, { q: v })} placeholder="Pregunta 你是学生吗？" ariaLabel="Pregunta" />
            <Input value={e.qes ?? ""} onChange={(ev) => ops.set(i, { qes: ev.target.value })} placeholder="¿Eres estudiante?" aria-label="Pregunta en español" />
            <ZhInput value={e.a} onChange={(v) => ops.set(i, { a: v })} placeholder="Respuesta 是，我是学生。" ariaLabel="Respuesta" />
            <Input value={e.aes ?? ""} onChange={(ev) => ops.set(i, { aes: ev.target.value })} placeholder="Sí, soy estudiante." aria-label="Respuesta en español" />
          </div>
        </Row>
      ))}
      <Button size="sm" variant="secondary" onClick={() => ops.add({ q: "", a: "" })}>
        <Plus /> Añadir pregunta y respuesta
      </Button>
    </div>
  );
}

function PairsEditor({ items, onChange }: { items: Pair[]; onChange: (v: Pair[]) => void }) {
  const ops = useListOps(items, onChange);
  return (
    <div className="space-y-1.5">
      {items.map((e, i) => (
        <Row key={i} onRemove={() => ops.remove(i)}>
          <div className="grid gap-1.5 sm:grid-cols-2">
            <ZhInput value={e.wrong} onChange={(v) => ops.set(i, { wrong: v })} placeholder="❌ 我是很高兴" ariaLabel="Forma incorrecta" />
            <ZhInput value={e.right} onChange={(v) => ops.set(i, { right: v })} placeholder="✅ 我很高兴" ariaLabel="Forma correcta" />
            <Input value={e.why ?? ""} onChange={(ev) => ops.set(i, { why: ev.target.value })} placeholder="Por qué" className="sm:col-span-2" aria-label="Por qué" />
          </div>
        </Row>
      ))}
      <Button size="sm" variant="secondary" onClick={() => ops.add({ wrong: "", right: "" })}>
        <Plus /> Añadir par ❌ / ✅
      </Button>
    </div>
  );
}

function ZhListEditor({ items, onChange, placeholder }: { items: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const pack = usePack();
  const text = items.join("\n");
  return <Textarea lang={pack.bcp47} className={cn(pack.meta.cssClass, "min-h-20 text-base")} value={text} onChange={(e) => onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))} placeholder={placeholder ?? "una por línea"} aria-label="Lista" />;
}

function ListEditor({ items, onChange, placeholder }: { items: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  return <Textarea className="min-h-20" value={items.join("\n")} onChange={(e) => onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))} placeholder={placeholder ?? "una por línea"} aria-label="Lista" />;
}

function TableEditor({ value, onChange }: { value: { columns: string[]; rows: string[][] }; onChange: (v: { columns: string[]; rows: string[][] }) => void }) {
  const pack = usePack();
  const cols = value.columns?.length ? value.columns : ["", "A", "B"];
  const rows = value.rows ?? [];
  const setCol = (i: number, v: string) => onChange({ columns: cols.map((c, k) => (k === i ? v : c)), rows });
  const setCell = (r: number, c: number, v: string) => onChange({ columns: cols, rows: rows.map((row, k) => (k === r ? row.map((x, j) => (j === c ? v : x)) : row)) });
  return (
    <div className="overflow-x-auto rounded-[8px] border border-line">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {cols.map((c, i) => (
              <th key={i} className="border-b border-line bg-paper-sunk p-1">
                <Input value={c} onChange={(e) => setCol(i, e.target.value)} placeholder={i === 0 ? "aspecto" : `columna ${i}`} className="h-8 text-xs font-medium" aria-label={`Columna ${i + 1}`} />
              </th>
            ))}
            <th className="w-8 border-b border-line bg-paper-sunk" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {cols.map((_, c) => (
                <td key={c} className="border-b border-line/70 p-1">
                  <Input value={row[c] ?? ""} onChange={(e) => setCell(r, c, e.target.value)} lang={pack.hasTargetText(row[c] ?? "") ? pack.bcp47 : undefined} className={cn("h-8 text-sm", pack.hasTargetText(row[c] ?? "") && pack.meta.cssClass)} aria-label={`Fila ${r + 1}, columna ${c + 1}`} />
                </td>
              ))}
              <td className="border-b border-line/70 p-1 text-center">
                <button type="button" onClick={() => onChange({ columns: cols, rows: rows.filter((_, k) => k !== r) })} className="rounded p-0.5 text-ink-faint hover:text-danger" aria-label="Quitar fila">
                  <X className="size-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-1 p-1">
        <Button size="sm" variant="ghost" onClick={() => onChange({ columns: cols, rows: [...rows, cols.map(() => "")] })}>
          <Plus /> fila
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onChange({ columns: [...cols, ""], rows: rows.map((r) => [...r, ""]) })}>
          <Plus /> columna
        </Button>
      </div>
    </div>
  );
}

function DialogueEditor({ items, onChange }: { items: DialogueLine[]; onChange: (v: DialogueLine[]) => void }) {
  const ops = useListOps(items, onChange);
  const next = items.length % 2 === 0 ? "A" : "B";
  return (
    <div className="space-y-1.5">
      {items.map((l, i) => (
        <Row key={i} onRemove={() => ops.remove(i)} onUp={i > 0 ? () => ops.move(i, -1) : undefined} onDown={i < items.length - 1 ? () => ops.move(i, 1) : undefined}>
          <div className="grid gap-1.5 sm:grid-cols-[4rem_1fr_1fr]">
            <Input value={l.speaker} onChange={(e) => ops.set(i, { speaker: e.target.value })} aria-label="Hablante" className="text-sm" />
            <ZhInput value={l.zh} onChange={(v) => ops.set(i, { zh: v })} ariaLabel="Línea" />
            <Input value={l.es ?? ""} onChange={(e) => ops.set(i, { es: e.target.value })} placeholder="Español" aria-label="Traducción" />
          </div>
        </Row>
      ))}
      <Button size="sm" variant="secondary" onClick={() => ops.add({ speaker: next, zh: "", es: "" })}>
        <Plus /> Añadir línea ({next})
      </Button>
    </div>
  );
}

function MiniTestEditor({ items, onChange }: { items: MiniTestItem[]; onChange: (v: MiniTestItem[]) => void }) {
  const ops = useListOps(items, onChange);
  return (
    <div className="space-y-1.5">
      {items.map((t, i) => (
        <Row key={i} onRemove={() => ops.remove(i)}>
          <div className="grid gap-1.5 sm:grid-cols-[1fr_8rem_1fr]">
            <ZhInput value={t.zh} onChange={(v) => ops.set(i, { zh: v })} placeholder="我＿去过中国。" ariaLabel="Frase con hueco" />
            <ZhInput value={t.answer} onChange={(v) => ops.set(i, { answer: v })} placeholder="没" ariaLabel="Respuesta" />
            <Input value={t.es ?? ""} onChange={(e) => ops.set(i, { es: e.target.value })} placeholder="No he ido a China." aria-label="Traducción" />
          </div>
        </Row>
      ))}
      <Button size="sm" variant="secondary" onClick={() => ops.add({ zh: "", answer: "" })}>
        <Plus /> Añadir frase del minitest
      </Button>
    </div>
  );
}

function NodesEditor({ items, onChange, depth = 0 }: { items: TopicNode[]; onChange: (v: TopicNode[]) => void; depth?: number }) {
  const ops = useListOps(items, onChange);
  return (
    <div className={cn("space-y-1.5", depth > 0 && "ml-4 border-l border-line pl-2")}>
      {items.map((n, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-start gap-1">
            <Select value={n.kind} onChange={(e) => ops.set(i, { kind: e.target.value as TopicNode["kind"] })} className="h-9 text-xs" aria-label="Tipo de nodo">
              <option value="group">grupo</option>
              <option value="word">palabra</option>
              <option value="phrase">frase</option>
              <option value="structure">estructura</option>
            </Select>
            <ZhInput value={n.text} onChange={(v) => ops.set(i, { text: v })} ariaLabel="Nodo" className="h-9" />
            <Input value={n.es ?? ""} onChange={(e) => ops.set(i, { es: e.target.value })} placeholder="es" className="h-9 max-w-40" aria-label="Traducción" />
            <button type="button" onClick={() => ops.set(i, { children: [...(n.children ?? []), { text: "", kind: "word" }] })} className="rounded p-1.5 text-ink-faint hover:text-ink" aria-label="Añadir hijo">
              <Plus className="size-4" />
            </button>
            <button type="button" onClick={() => ops.remove(i)} className="rounded p-1.5 text-ink-faint hover:text-danger" aria-label="Quitar">
              <X className="size-4" />
            </button>
          </div>
          {n.children?.length ? <NodesEditor items={n.children} onChange={(c) => ops.set(i, { children: c })} depth={depth + 1} /> : null}
        </div>
      ))}
      {depth === 0 ? (
        <Button size="sm" variant="secondary" onClick={() => ops.add({ text: "", kind: "group" })}>
          <Plus /> Añadir rama
        </Button>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ vistas de lectura */

function ExamplesView({ items, kind = "examples" }: { items: Example[]; kind?: "examples" | "ok" }) {
  const pinyinMode = useSettings((s) => s.settings.pinyinMode);
  if (!items.length) return null;
  return (
    <ul className="space-y-1.5">
      {items.map((e, i) => (
        <li key={i} className="flex items-start gap-2 rounded-[8px] border border-line/70 bg-paper-raised/60 p-2">
          {kind === "ok" ? <span className="mt-1 text-celadon-ink">✅</span> : null}
          <AudioButton text={e.zh} size="sm" className="mt-0.5 shrink-0" />
          <TargetText text={e.zh} size="md" pinyinLine={pinyinMode !== "hide" ? e.py || undefined : undefined} translation={e.es} as="div" className="min-w-0 flex-1" />
        </li>
      ))}
    </ul>
  );
}

function QAView({ items }: { items: QA[] }) {
  return (
    <ul className="space-y-2">
      {items.map((e, i) => (
        <li key={i} className="rounded-[8px] border border-line/70 bg-paper-raised/60 p-2">
          <div className="flex items-start gap-2">
            <span className="mt-1 text-xs font-semibold text-cinnabar">问</span>
            <AudioButton text={e.q} size="sm" className="mt-0.5" />
            <TargetText text={e.q} size="md" pinyinLine={e.qpy || undefined} translation={e.qes} as="div" className="flex-1" />
          </div>
          <div className="mt-1 flex items-start gap-2 border-t border-line/60 pt-1">
            <span className="mt-1 text-xs font-semibold text-celadon-ink">答</span>
            <AudioButton text={e.a} size="sm" className="mt-0.5" />
            <TargetText text={e.a} size="md" pinyinLine={e.apy || undefined} translation={e.aes} as="div" className="flex-1" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function PairsView({ items }: { items: Pair[] }) {
  const pack = usePack();
  return (
    <ul className="space-y-1.5">
      {items.map((p, i) => (
        <li key={i} className="rounded-[8px] border border-danger/25 bg-danger/[0.04] p-2 text-sm">
          <span lang={pack.bcp47} className={cn(pack.meta.cssClass, "text-danger line-through decoration-danger/60")}>
            {p.wrong}
          </span>
          <span className="mx-2 text-ink-faint">→</span>
          <TargetText text={p.right} size="sm" ruby={false} />
          {p.why ? <span className="block text-xs text-ink-faint"><Mixed>{p.why}</Mixed></span> : null}
        </li>
      ))}
    </ul>
  );
}

function TableView({ value }: { value: { columns: string[]; rows: string[][] } }) {
  const pack = usePack();
  const cell = (s: string) => (pack.hasTargetText(s) ? <TargetText text={s} size="sm" ruby={false} /> : <Mixed>{s}</Mixed>);
  if (!value.rows?.length) return null;
  return (
    <div className="overflow-x-auto rounded-[8px] border border-line">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {value.columns.map((c, i) => (
              <th key={i} className="border-b border-line bg-paper-sunk px-2.5 py-1.5 text-left font-medium text-ink">
                {cell(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {value.rows.map((r, i) => (
            <tr key={i}>
              {value.columns.map((_, c) => (
                <td key={c} className={cn("border-b border-line/70 px-2.5 py-1.5 align-top", c === 0 && "font-medium text-ink")}>
                  {cell(r[c] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DialogueView({ items }: { items: DialogueLine[] }) {
  const pack = usePack();
  return (
    <ul className="space-y-1">
      {items.map((l, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className={cn("mt-1 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold", i % 2 ? "bg-indigo/15 text-indigo" : "bg-cinnabar/12 text-cinnabar-ink")} lang={pack.hasTargetText(l.speaker) ? pack.bcp47 : undefined}>
            {l.speaker.slice(0, 2)}
          </span>
          <AudioButton text={l.zh} size="sm" rate={i % 2 ? 0.95 : 0.9} className="mt-1" />
          <TargetText text={l.zh} size="md" pinyinLine={l.py || undefined} translation={l.es} as="div" className="min-w-0 flex-1" />
        </li>
      ))}
    </ul>
  );
}

function MiniTestView({ items, a, b }: { items: MiniTestItem[]; a?: string; b?: string }) {
  const pack = usePack();
  return (
    <ol className="list-decimal space-y-1 pl-5 text-sm">
      {items.map((t, i) => (
        <li key={i}>
          <span lang={pack.bcp47} className={cn(pack.meta.cssClass, "text-base")}>
            {t.zh}
          </span>
          {t.es ? <span className="ml-2 text-xs text-ink-faint"><Mixed>{t.es}</Mixed></span> : null}
          <details className="inline-block align-middle text-xs text-ink-faint">
            <summary className="ml-2 cursor-pointer">respuesta</summary>
            <span lang={pack.bcp47} className={cn(pack.meta.cssClass, "ml-1 text-sm text-celadon-ink")}>
              {t.answer}
            </span>
          </details>
        </li>
      ))}
      {a && b && items.length ? <p className="mt-1 text-xs text-ink-faint">Practícalo como ejercicio desde «Convertir en práctica».</p> : null}
    </ol>
  );
}

function NodesView({ items, depth = 0 }: { items: TopicNode[]; depth?: number }) {
  const pack = usePack();
  return (
    <ul className={cn("space-y-1", depth > 0 && "ml-4 border-l border-line pl-3")}>
      {items.map((n, i) => (
        <li key={i}>
          <span className={cn("inline-flex items-center gap-2 rounded-[6px] px-1.5 py-0.5", n.kind === "group" ? "bg-paper-sunk font-medium text-ink" : n.kind === "structure" ? "bg-gold/12 text-gold-ink" : "")}>
            {pack.hasTargetText(n.text) ? <TargetText text={n.text} size="sm" ruby={false} /> : <Mixed>{n.text}</Mixed>}
            {n.es ? <span className="text-xs text-ink-faint"><Mixed>{n.es}</Mixed></span> : null}
          </span>
          {n.children?.length ? <NodesView items={n.children} depth={depth + 1} /> : null}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ campo genérico */

function FieldEditor({ def, value, onChange, fields }: { def: FieldDef; value: unknown; onChange: (v: unknown) => void; fields: Fields }) {
  const pack = usePack();
  switch (def.kind) {
    case "text":
      return <Input value={str(value)} onChange={(e) => onChange(e.target.value)} placeholder={def.placeholder} id={`f-${def.id}`} />;
    case "long":
      return <Textarea value={str(value)} onChange={(e) => onChange(e.target.value)} placeholder={def.placeholder} id={`f-${def.id}`} className="min-h-20" />;
    case "zh":
      return <ZhInput value={str(value)} onChange={onChange} placeholder={def.placeholder} ariaLabel={def.label} />;
    case "pinyin": {
      const src = str(fields.hanzi ?? fields.char ?? fields.zh ?? fields.particle);
      const auto = src ? pack.reading(src) : "";
      return <Input value={str(value)} onChange={(e) => onChange(pack.normalizeInput(e.target.value))} placeholder={auto || "se calcula al escribir la palabra"} id={`f-${def.id}`} />;
    }
    case "select":
      return (
        <Select value={str(value)} onChange={(e) => onChange(e.target.value)} id={`f-${def.id}`} className="w-full">
          <option value="">—</option>
          {def.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      );
    case "date":
      return <Input type="date" value={str(value)} onChange={(e) => onChange(e.target.value)} id={`f-${def.id}`} className="tabular" />;
    case "zhList":
      return <ZhListEditor items={list<string>(value)} onChange={onChange} placeholder={def.placeholder ?? def.hint} />;
    case "list":
      return <ListEditor items={list<string>(value)} onChange={onChange} placeholder={def.placeholder ?? def.hint} />;
    case "examples":
      return <ExamplesEditor items={list<Example>(value)} onChange={onChange} min={def.min} />;
    case "qa":
      return <QAEditor items={list<QA>(value)} onChange={onChange} />;
    case "pairs":
      return <PairsEditor items={list<Pair>(value)} onChange={onChange} />;
    case "table":
      return <TableEditor value={(value as { columns: string[]; rows: string[][] }) ?? { columns: ["", "A", "B"], rows: [] }} onChange={onChange} />;
    case "formula":
      return (
        <div className="space-y-2">
          <FormulaEditor parts={list<FormulaPart>(value)} onChange={onChange} />
          {list<FormulaPart>(value).length ? (
            <div className="rounded-[8px] border border-line bg-paper-sunk/40 p-2">
              <FormulaChips parts={list<FormulaPart>(value)} size="sm" />
            </div>
          ) : null}
        </div>
      );
    case "dialogue":
      return <DialogueEditor items={list<DialogueLine>(value)} onChange={onChange} />;
    case "minitest":
      return <MiniTestEditor items={list<MiniTestItem>(value)} onChange={onChange} />;
    case "nodes":
      return <NodesEditor items={list<TopicNode>(value)} onChange={onChange} />;
    case "image":
    case "audio":
      return <p className="text-xs text-ink-faint">Usa el bloque «{def.kind === "image" ? "Imagen" : "Grabación de audio"}» del editor (menú + Bloque o /) para añadirlo.</p>;
  }
}

function FieldView({ def, value, fields }: { def: FieldDef; value: unknown; fields: Fields }) {
  const pack = usePack();
  const empty = value === "" || value === undefined || (Array.isArray(value) && !value.length) || (def.kind === "table" && !(value as { rows?: unknown[] })?.rows?.length);
  if (empty) return null;
  switch (def.kind) {
    case "zh":
      return (
        <div className="flex items-center gap-2">
          <TargetText text={str(value)} size="lg" />
          <AudioButton text={str(value)} size="sm" />
        </div>
      );
    case "pinyin":
      return <Reading text={str(value)} className="text-base" />;
    case "text":
      return <p className="text-sm text-ink"><Mixed>{str(value)}</Mixed></p>;
    case "long":
      return (
        <div className="space-y-1 text-sm text-ink-soft">
          {str(value)
            .split(/\n+/)
            .map((p, i) => (
              <p key={i}>{pack.hasTargetText(p) ? <TargetText text={p} size="sm" ruby={false} /> : <Mixed>{p}</Mixed>}</p>
            ))}
        </div>
      );
    case "select":
      return <p className="text-sm text-ink">{def.options?.find((o) => o.value === value)?.label ?? str(value)}</p>;
    case "date":
      return <p className="tabular text-sm text-ink">{str(value)}</p>;
    case "zhList":
      return (
        <div className="flex flex-wrap gap-1.5">
          {list<string>(value).map((w, i) => (
            <span key={i} className="rounded-[6px] border border-line bg-paper-raised px-2 py-0.5">
              <TargetText text={w} size="sm" ruby={false} />
            </span>
          ))}
        </div>
      );
    case "list":
      return (
        <ul className="list-disc space-y-0.5 pl-5 text-sm text-ink-soft marker:text-ink-faint">
          {list<string>(value).map((w, i) => (
            <li key={i}>{pack.hasTargetText(w) ? <TargetText text={w} size="sm" ruby={false} /> : <Mixed>{w}</Mixed>}</li>
          ))}
        </ul>
      );
    case "examples":
      return <ExamplesView items={list<Example>(value)} kind={def.id === "ok" ? "ok" : "examples"} />;
    case "qa":
      return <QAView items={list<QA>(value)} />;
    case "pairs":
      return <PairsView items={list<Pair>(value)} />;
    case "table":
      return <TableView value={value as { columns: string[]; rows: string[][] }} />;
    case "formula":
      return (
        <div className="rounded-[10px] border border-line bg-paper-sunk/40 p-3">
          <FormulaChips parts={list<FormulaPart>(value)} />
          <NoteEditorContext.Provider value={{ readOnly: true }}>
            <FormulaGenerator parts={list<FormulaPart>(value)} />
          </NoteEditorContext.Provider>
        </div>
      );
    case "dialogue":
      return <DialogueView items={list<DialogueLine>(value)} />;
    case "minitest":
      return <MiniTestView items={list<MiniTestItem>(value)} a={str(fields.a)} b={str(fields.b)} />;
    case "nodes":
      return <NodesView items={list<TopicNode>(value)} />;
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ formulario completo */

export function NoteFields({ template, fields, onChange, readOnly, only }: FieldsProps) {
  const defs = useMemo(() => template.fields.filter((f) => !only || only.includes(f.id)), [template, only]);
  if (!defs.length) return null;
  const set = (id: string, v: unknown) => onChange({ ...fields, [id]: v });
  if (readOnly) {
    const visible = defs.filter((d) => {
      const v = fields[d.id];
      return !(v === "" || v === undefined || (Array.isArray(v) && !v.length));
    });
    if (!visible.length) return null;
    return (
      <dl className="space-y-4">
        {visible.map((d) => (
          <div key={d.id}>
            <dt className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{d.label}</dt>
            <dd>
              <FieldView def={d} value={fields[d.id]} fields={fields} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {defs.map((d) => {
        const wide = !["text", "zh", "pinyin", "select", "date"].includes(d.kind);
        return (
          <div key={d.id} className={cn(wide && "sm:col-span-2")}>
            <label htmlFor={`f-${d.id}`} className="mb-1 block text-xs font-medium text-ink-soft">
              {d.label}
              {d.required ? <span className="ml-0.5 text-cinnabar">*</span> : null}
            </label>
            <FieldEditor def={d} value={fields[d.id]} onChange={(v) => set(d.id, v)} fields={fields} />
            {d.hint ? <p className="mt-1 text-[11px] text-ink-faint"><Mixed>{d.hint}</Mixed></p> : null}
          </div>
        );
      })}
    </div>
  );
}
