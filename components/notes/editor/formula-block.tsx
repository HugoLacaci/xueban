"use client";
/**
 * Bloque «fórmula gramatical»: fichas de colores por función (sujeto, tiempo, lugar, verbo, objeto, partícula…)
 * y generador de ejemplos que rellena la fórmula con el vocabulario conocido del usuario.
 */
import { useMemo, useState } from "react";
import type { NodeViewProps } from "@tiptap/react";
import { Plus, Shuffle, Wand2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { usePack } from "@/lib/languages/provider";
import { useKnowledge } from "@/lib/knowledge";
import { FORMULA_ROLES, type FormulaPart, type FormulaRole } from "@/lib/notes/templates";
import { fillFormula } from "@/lib/notes/formula";
import { TargetText } from "@/components/target/target-text";
import { AudioButton } from "@/components/target/audio-button";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { Mixed } from "@/components/target/mixed";
import { BlockFrame, useNoteEditorContext } from "./blocks";

/** Ficha de la fórmula (reutilizada por la vista de lectura y por el formulario de plantilla). */
export function FormulaChips({ parts, className, size = "md" }: { parts: FormulaPart[]; className?: string; size?: "sm" | "md" }) {
  const pack = usePack();
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)} lang={undefined}>
      {parts.map((p, i) => {
        const role = FORMULA_ROLES[p.role] ?? FORMULA_ROLES.other;
        const isTarget = pack.hasTargetText(p.text);
        return (
          <span key={i} className="flex items-center gap-1.5">
            <span className={cn("formula-chip inline-flex flex-col items-center rounded-[8px] border px-2.5 py-1 leading-tight", role.cls, size === "sm" && "px-2 py-0.5")}>
              <span lang={isTarget ? pack.bcp47 : undefined} className={cn(isTarget ? `${pack.meta.cssClass} ${pack.theme.fontClasses.serif}` : "font-medium", size === "sm" ? "text-sm" : "text-base")}>
                <Mixed>{p.text}</Mixed>
              </span>
              <span className="text-[9px] uppercase tracking-wide opacity-70">{role.label}</span>
            </span>
            {i < parts.length - 1 ? <span className="text-ink-faint">+</span> : null}
          </span>
        );
      })}
    </div>
  );
}

export function FormulaEditor({ parts, onChange }: { parts: FormulaPart[]; onChange: (p: FormulaPart[]) => void }) {
  const pack = usePack();
  const set = (i: number, patch: Partial<FormulaPart>) => onChange(parts.map((p, k) => (k === i ? { ...p, ...patch } : p)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= parts.length) return;
    const next = parts.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-1.5">
      {parts.map((p, i) => (
        <div key={i} className="flex flex-wrap items-center gap-1.5">
          <Input value={p.text} onChange={(e) => set(i, { text: e.target.value })} className={cn("h-8 w-36 text-sm", pack.hasTargetText(p.text) && pack.meta.cssClass)} lang={pack.hasTargetText(p.text) ? pack.bcp47 : undefined} placeholder="在 · lugar · V…" aria-label={`Parte ${i + 1}`} />
          <Select value={p.role} onChange={(e) => set(i, { role: e.target.value as FormulaRole })} className="h-8 text-xs" aria-label="Función">
            {Object.entries(FORMULA_ROLES).map(([id, r]) => (
              <option key={id} value={id}>
                {r.label}
              </option>
            ))}
          </Select>
          <button type="button" onClick={() => move(i, -1)} className="rounded p-1 text-ink-faint hover:text-ink" aria-label="Mover a la izquierda">
            <ChevronLeft className="size-3.5" />
          </button>
          <button type="button" onClick={() => move(i, 1)} className="rounded p-1 text-ink-faint hover:text-ink" aria-label="Mover a la derecha">
            <ChevronRight className="size-3.5" />
          </button>
          <button type="button" onClick={() => onChange(parts.filter((_, k) => k !== i))} className="rounded p-1 text-ink-faint hover:text-danger" aria-label="Quitar">
            <X className="size-3.5" />
          </button>
        </div>
      ))}
      <Button size="sm" variant="secondary" onClick={() => onChange([...parts, { text: "", role: "other" }])}>
        <Plus /> Añadir ficha
      </Button>
    </div>
  );
}

/** Generador: rellena los huecos (sujeto, tiempo, lugar, verbo, objeto…) con palabras del mazo conocido. */
export function FormulaGenerator({ parts }: { parts: FormulaPart[] }) {
  const pack = usePack();
  const deck = useKnowledge((s) => s.deck);
  const known = useKnowledge((s) => s.known);
  const [seed, setSeed] = useState(1);
  const words = useMemo(() => Array.from(deck.values()).map((w) => ({ hanzi: w.hanzi, pinyin: w.pinyin, meaning: w.meaning, category: w.category, known: known.has(w.hanzi) })), [deck, known]);
  const examples = useMemo(() => (pack.id === "zh" ? fillFormula(parts, words, 3, seed) : []), [parts, words, seed, pack.id]);
  if (pack.id !== "zh") return null;
  return (
    <div className="mt-2 border-t border-line/70 pt-2" contentEditable={false}>
      <div className="mb-1 flex items-center gap-2 text-[11px] text-ink-faint">
        <Wand2 className="size-3" /> Ejemplos con mi vocabulario
        <button type="button" onClick={() => setSeed((s) => s + 1)} className="ml-auto inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 hover:text-ink" aria-label="Otros ejemplos">
          <Shuffle className="size-3" /> otros
        </button>
      </div>
      {examples.length ? (
        <ul className="space-y-1">
          {examples.map((e, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <AudioButton text={e.zh} size="sm" className="mt-0.5" />
              <TargetText text={e.zh} size="sm" translation={e.es} as="div" />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-ink-faint">Marca los huecos (sujeto, lugar, verbo, objeto…) para que pueda rellenarlos con tu vocabulario.</p>
      )}
    </div>
  );
}

export function FormulaView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const { parts, name } = node.attrs as { parts: FormulaPart[]; name: string };
  const { readOnly } = useNoteEditorContext();
  const [editing, setEditing] = useState(!parts?.length && !readOnly);
  return (
    <BlockFrame label="Fórmula" icon={<Wand2 className="size-3" />} selected={selected} editing={editing && !readOnly} onEdit={() => setEditing((e) => !e)} onDelete={deleteNode} tone="sunk">
      <div className="p-3 pr-16" contentEditable={false}>
        {editing && !readOnly ? (
          <div className="space-y-2">
            <Input value={name} onChange={(e) => updateAttributes({ name: e.target.value })} placeholder="Nombre de la estructura (opcional)" className="h-8 max-w-sm text-sm" aria-label="Nombre" />
            <FormulaEditor parts={parts ?? []} onChange={(p) => updateAttributes({ parts: p })} />
          </div>
        ) : (
          <>
            {name ? <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint"><Mixed>{name}</Mixed></p> : null}
            <FormulaChips parts={parts ?? []} />
            <FormulaGenerator parts={parts ?? []} />
          </>
        )}
      </div>
    </BlockFrame>
  );
}
