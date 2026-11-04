"use client";
/**
 * Diálogo «Nuevo apunte»: elige plantilla (con consejo pedagógico) y crea el apunte, prerrellenado desde el
 * contexto de origen (palabra del diccionario, ejercicio, vídeo, lectura).
 */
import { useState } from "react";
import { create } from "zustand";
import { ArrowRight } from "lucide-react";
import { useLangRouter } from "@/lib/languages/link";
import { usePack } from "@/lib/languages/provider";
import type { NoteSource, NoteType } from "@/lib/db";
import { createNote } from "@/lib/notes/repo";
import { NOTE_TYPES, templateFor } from "@/lib/notes/templates";
import { Dialog, DialogContent } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { NoteTypeIcon } from "./type-badge";
import { cn } from "@/lib/utils";
import { Mixed } from "@/components/target/mixed";

interface NewNoteState {
  open: boolean;
  prefill?: { type?: NoteType; title?: string; fields?: Record<string, unknown>; markdown?: string; source?: NoteSource; tags?: string[] };
  show: (prefill?: NewNoteState["prefill"]) => void;
  hide: () => void;
}
export const useNewNote = create<NewNoteState>((set) => ({ open: false, show: (prefill) => set({ open: true, prefill }), hide: () => set({ open: false, prefill: undefined }) }));

/** Abre el diálogo desde cualquier sitio (p. ej. popup del diccionario). */
export function openNewNote(prefill?: NewNoteState["prefill"]) {
  useNewNote.getState().show(prefill);
}

/** Prerrelleno para crear un apunte desde una palabra del diccionario. */
export function prefillFromWord(word: string, pinyin?: string, meaning?: string, context?: string): NewNoteState["prefill"] {
  const chars = Array.from(word).filter((c) => /[㐀-鿿]/.test(c));
  if (chars.length === 1) return { type: "character", title: word, fields: { char: word, pinyin: pinyin ?? "", meaning: meaning ?? "" }, source: { kind: "dictionary", ref: word, context } };
  return { type: "word", title: word, fields: { hanzi: word, pinyin: pinyin ?? "", meaning: meaning ?? "", examples: context ? [{ zh: context, es: "" }] : [] }, source: { kind: "dictionary", ref: word, context } };
}

export function NewNoteDialogHost() {
  const { open, prefill, hide } = useNewNote();
  const router = useLangRouter();
  const pack = usePack();
  const [type, setType] = useState<NoteType>(prefill?.type ?? "word");
  const [busy, setBusy] = useState(false);
  const chosen = prefill?.type ?? type;
  const tpl = templateFor(chosen);

  const createAndGo = async () => {
    setBusy(true);
    try {
      const n = await createNote({ type: chosen, title: prefill?.title, fields: prefill?.fields, markdown: prefill?.markdown, source: prefill?.source ?? { kind: "manual" }, tags: prefill?.tags });
      hide();
      router.push(`/apuntes/${encodeURIComponent(n.id)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : hide())}>
      <DialogContent title="Nuevo apunte" description={`Una idea por apunte. Elige la plantilla que mejor encaje${prefill?.title ? ` para «${prefill.title}»` : ""}.`} side="bottom" className="sm:max-w-2xl">
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3" role="radiogroup" aria-label="Plantilla">
          {NOTE_TYPES.filter((t) => t !== "lesson").map((t) => {
            const x = templateFor(t);
            const active = chosen === t;
            return (
              <button key={t} type="button" role="radio" aria-checked={active} onClick={() => setType(t)} onDoubleClick={() => void createAndGo()} className={cn("flex items-start gap-2 rounded-[10px] border p-2 text-left transition-colors", active ? "border-ink bg-paper-sunk" : "border-line hover:border-ink/40")}>
                <span lang="zh-CN" className="zh-serif mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[6px] bg-paper-raised text-base leading-none text-cinnabar" aria-hidden="true">
                  {x.native}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1 text-sm font-medium text-ink">
                    <NoteTypeIcon type={t} className="size-3.5 text-ink-faint" /> {x.name}
                  </span>
                  <span className="line-clamp-2 block text-[11px] leading-snug text-ink-faint">
                    <Mixed>{x.description}</Mixed>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="rounded-[8px] bg-gold/10 px-3 py-2 text-xs text-gold-ink">
          <Mixed>{tpl.coach}</Mixed>
        </p>
        <div className="flex items-center justify-end gap-2">
          <span className="mr-auto text-[11px] text-ink-faint">{pack.meta.names.es}</span>
          <Button variant="ghost" onClick={hide}>
            Cancelar
          </Button>
          <Button variant="ink" onClick={() => void createAndGo()} disabled={busy}>
            Crear <ArrowRight />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
