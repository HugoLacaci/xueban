"use client";
/**
 * Vistas React de los bloques propios del editor. Todas comparten <BlockFrame>: marco de papel con etiqueta,
 * asa de arrastre, botón de editar (campos inline) y eliminar. En modo lectura se pintan sin marco.
 */
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { AlertTriangle, Brush, ChevronDown, Eye, EyeOff, GripVertical, Image as ImageIcon, Link2, Lightbulb, Mic, Pencil, Pickaxe, Quote, Square, Trash2, Volume2, Check, Hash, GraduationCap, Brain, X, Flame } from "lucide-react";
import { usePack } from "@/lib/languages/provider";
import { useLangRouter } from "@/lib/languages/link";
import { useSettings } from "@/lib/settings";
import { lookupFirst, useDictionary } from "@/lib/dictionary/service";
import { TargetText, CharacterGlyph } from "@/components/target/target-text";
import { Reading } from "@/components/target/reading";
import { AudioButton } from "@/components/target/audio-button";
import { StrokeOrder } from "@/components/target/stroke-order";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { CALLOUT_KINDS, type CalloutKind } from "@/lib/notes/markdown";
import { resolveLink } from "@/lib/notes/repo";
import { assetUrl, saveAsset } from "@/lib/notes/assets";
import { cn } from "@/lib/utils";
import { Mixed } from "@/components/target/mixed";
export { FormulaView } from "./formula-block";
export { ExerciseView } from "./exercise-block";
export { DrawingView } from "./drawing-block";

/* ------------------------------------------------------------------ contexto del apunte */

export interface NoteEditorContextValue {
  noteId?: string;
  readOnly?: boolean;
}
export const NoteEditorContext = createContext<NoteEditorContextValue>({});
export const useNoteEditorContext = () => useContext(NoteEditorContext);

/* ------------------------------------------------------------------ marco común */

export function BlockFrame({ label, icon, selected, editing, onEdit, onDelete, children, className, tone = "paper" }: { label: string; icon?: ReactNode; selected?: boolean; editing?: boolean; onEdit?: () => void; onDelete?: () => void; children: ReactNode; className?: string; tone?: "paper" | "sunk" | "none" }) {
  const { readOnly } = useNoteEditorContext();
  return (
    <NodeViewWrapper className={cn("xb-block group/block relative my-2", className)} data-selected={selected || undefined}>
      <div className={cn("relative rounded-[10px] border transition-colors", tone === "paper" && "border-line bg-paper-raised/70", tone === "sunk" && "border-line bg-paper-sunk/50", tone === "none" && "border-transparent", selected && !readOnly && "border-ink/50 ring-2 ring-ink/10")}>
        {!readOnly ? (
          <div className="absolute -left-7 top-1.5 hidden cursor-grab text-ink-faint opacity-0 transition-opacity group-hover/block:opacity-100 md:block" data-drag-handle contentEditable={false} aria-label="Arrastrar bloque">
            <GripVertical className="size-4" />
          </div>
        ) : null}
        {!readOnly ? (
          <div className="absolute right-1.5 top-1.5 z-10 flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover/block:opacity-100 data-[selected]:opacity-100" contentEditable={false}>
            <span className="mr-1 inline-flex items-center gap-1 rounded-full bg-paper-sunk px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-faint">
              {icon}
              {label}
            </span>
            {onEdit ? (
              <button type="button" onClick={onEdit} className="rounded p-1 text-ink-faint hover:bg-paper-sunk hover:text-ink" aria-label={editing ? "Terminar de editar" : "Editar bloque"}>
                {editing ? <Check className="size-3.5" /> : <Pencil className="size-3.5" />}
              </button>
            ) : null}
            {onDelete ? (
              <button type="button" onClick={onDelete} className="rounded p-1 text-ink-faint hover:bg-danger/10 hover:text-danger" aria-label="Eliminar bloque">
                <Trash2 className="size-3.5" />
              </button>
            ) : null}
          </div>
        ) : null}
        {children}
      </div>
    </NodeViewWrapper>
  );
}

/** Campo de edición inline dentro de un bloque. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs text-ink-faint">
      <span className="mb-0.5 block">{label}</span>
      {children}
    </label>
  );
}

/** Hook: el bloque empieza en edición si está vacío (recién insertado). */
function useEditing(empty: boolean) {
  const { readOnly } = useNoteEditorContext();
  const [editing, setEditing] = useState(empty && !readOnly);
  return [editing && !readOnly, setEditing] as const;
}

/* ------------------------------------------------------------------ texto chino */

export function ZhTextView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const pack = usePack();
  const { text, es, py } = node.attrs as { text: string; es: string; py: string };
  const [editing, setEditing] = useEditing(!text);
  const reading = py || (text ? pack.reading(text) : "");
  const pinyinMode = useSettings((s) => s.settings.pinyinMode);
  return (
    <BlockFrame label={pack.meta.names.native} icon={<Quote className="size-3" />} selected={selected} editing={editing} onEdit={() => setEditing((e) => !e)} onDelete={deleteNode} tone="none" className="my-1">
      {editing ? (
        <div className="grid gap-2 p-3 sm:grid-cols-[1fr_1fr]" contentEditable={false}>
          <Field label={`Texto en ${pack.meta.names.adjective}`}>
            <Input lang={pack.bcp47} className={cn(pack.meta.cssClass, "text-lg")} value={text} autoFocus onChange={(e) => updateAttributes({ text: e.target.value })} onKeyDown={(e) => e.key === "Enter" && setEditing(false)} />
          </Field>
          <Field label="Traducción (opcional)">
            <Input value={es} onChange={(e) => updateAttributes({ es: e.target.value })} onKeyDown={(e) => e.key === "Enter" && setEditing(false)} />
          </Field>
          <Field label="Pinyin (se calcula; corrígelo si hace falta)">
            <Input value={py} placeholder={reading} onChange={(e) => updateAttributes({ py: e.target.value })} />
          </Field>
        </div>
      ) : (
        <div className="flex items-start gap-2 px-1 py-1" contentEditable={false}>
          <AudioButton text={text} size="sm" className="mt-1.5 shrink-0" />
          <TargetText text={text} size="lg" pinyinLine={pinyinMode !== "hide" ? reading : undefined} translation={es || undefined} as="div" className="min-w-0 flex-1" />
        </div>
      )}
    </BlockFrame>
  );
}

/* ------------------------------------------------------------------ ejemplo */

export function ExampleView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const pack = usePack();
  const { noteId } = useNoteEditorContext();
  const { zh, py, es, note } = node.attrs as { zh: string; py: string; es: string; note: string };
  const [editing, setEditing] = useEditing(!zh);
  const reading = py || (zh ? pack.reading(zh) : "");
  const mine = async () => {
    const { minePhrase } = await import("@/lib/notes/practice");
    await minePhrase({ zh, py: reading, es, noteId });
    toast.success("Frase minada", "Tarjeta y ejercicio creados");
  };
  return (
    <BlockFrame label="Ejemplo" icon={<Quote className="size-3" />} selected={selected} editing={editing} onEdit={() => setEditing((e) => !e)} onDelete={deleteNode}>
      {editing ? (
        <div className="grid gap-2 p-3 sm:grid-cols-2" contentEditable={false}>
          <Field label={pack.meta.names.native}>
            <Input lang={pack.bcp47} className={cn(pack.meta.cssClass, "text-lg")} value={zh} autoFocus onChange={(e) => updateAttributes({ zh: e.target.value })} />
          </Field>
          <Field label="Español">
            <Input value={es} onChange={(e) => updateAttributes({ es: e.target.value })} onKeyDown={(e) => e.key === "Enter" && setEditing(false)} />
          </Field>
          <Field label="Pinyin">
            <Input value={py} placeholder={reading} onChange={(e) => updateAttributes({ py: e.target.value })} />
          </Field>
          <Field label="Nota">
            <Input value={note} onChange={(e) => updateAttributes({ note: e.target.value })} />
          </Field>
        </div>
      ) : (
        <div className="flex items-start gap-2 p-3 pr-16" contentEditable={false}>
          <AudioButton text={zh} size="sm" className="mt-1 shrink-0" />
          <div className="min-w-0 flex-1">
            <TargetText text={zh} size="md" pinyinLine={reading} translation={es || undefined} as="div" />
            {note ? <p className="mt-1 text-xs text-ink-faint"><Mixed>{note}</Mixed></p> : null}
          </div>
          <button type="button" onClick={() => void mine()} className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[11px] text-ink-soft hover:border-ink/40 hover:text-ink" title="Crear tarjeta y ejercicio con esta frase">
            <Pickaxe className="size-3" /> minar
          </button>
        </div>
      )}
    </BlockFrame>
  );
}

/* ------------------------------------------------------------------ aviso (callout) */

export function CalloutView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const { readOnly } = useNoteEditorContext();
  const kind = (node.attrs.kind as CalloutKind) ?? "tip";
  const k = CALLOUT_KINDS[kind] ?? CALLOUT_KINDS.tip;
  const ICON: Record<CalloutKind, ReactNode> = { tip: <Lightbulb className="size-4" />, warn: <AlertTriangle className="size-4" />, teacher: <GraduationCap className="size-4" />, error: <X className="size-4" />, mnemonic: <Brain className="size-4" />, culture: <Flame className="size-4" /> };
  return (
    <NodeViewWrapper className={cn("xb-block group/block relative my-2", selected && !readOnly && "rounded-[10px] ring-2 ring-ink/10")} data-selected={selected || undefined}>
      <aside className={cn("callout flex gap-3 rounded-[10px] border px-3 py-2.5", `callout-${kind}`)}>
        <div className="mt-0.5 flex shrink-0 flex-col items-center gap-1" contentEditable={false}>
          <span className="callout-icon flex size-7 items-center justify-center rounded-full" aria-hidden="true">
            {ICON[kind]}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center gap-2" contentEditable={false}>
            {readOnly ? (
              <span className="callout-label text-[11px] font-semibold uppercase tracking-wide">{k.label}</span>
            ) : (
              <label className="callout-label inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide">
                <select value={kind} onChange={(e) => updateAttributes({ kind: e.target.value })} className="cursor-pointer appearance-none bg-transparent pr-3 font-semibold uppercase outline-none" aria-label="Tipo de aviso">
                  {Object.entries(CALLOUT_KINDS).map(([id, v]) => (
                    <option key={id} value={id}>
                      {v.emoji} {v.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="-ml-3 size-3" />
              </label>
            )}
            {!readOnly ? (
              <button type="button" onClick={deleteNode} className="ml-auto rounded p-1 text-ink-faint opacity-0 hover:text-danger group-hover/block:opacity-100" aria-label="Eliminar aviso">
                <Trash2 className="size-3.5" />
              </button>
            ) : null}
          </div>
          <NodeViewContent className="callout-body text-sm leading-relaxed" />
        </div>
      </aside>
    </NodeViewWrapper>
  );
}

/* ------------------------------------------------------------------ ficha de palabra / carácter */

export function WordCardView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const pack = usePack();
  const router = useLangRouter();
  const { text, kind } = node.attrs as { text: string; kind: "word" | "character" };
  const [editing, setEditing] = useEditing(!text);
  const dictStatus = useDictionary((s) => s.status);
  const load = useDictionary((s) => s.load);
  useEffect(() => {
    if (dictStatus === "idle") void load();
  }, [dictStatus, load]);
  const entry = text ? lookupFirst(text) : undefined;
  const chars = pack.characters.charsOf(text);
  const info = chars.length === 1 ? pack.characters.info(chars[0]) : undefined;
  const ety = info?.extra?.etymology as { type?: string; hint?: string } | undefined;
  return (
    <BlockFrame label={kind === "character" ? "Carácter" : "Palabra"} icon={<Brush className="size-3" />} selected={selected} editing={editing} onEdit={() => setEditing((e) => !e)} onDelete={deleteNode}>
      {editing ? (
        <div className="grid gap-2 p-3 sm:grid-cols-[1fr_auto]" contentEditable={false}>
          <Field label="Palabra o carácter">
            <Input lang={pack.bcp47} className={cn(pack.meta.cssClass, "text-lg")} value={text} autoFocus onChange={(e) => updateAttributes({ text: e.target.value })} onKeyDown={(e) => e.key === "Enter" && setEditing(false)} />
          </Field>
          <Field label="Tipo">
            <Select value={kind} onChange={(e) => updateAttributes({ kind: e.target.value })}>
              <option value="word">palabra</option>
              <option value="character">carácter</option>
            </Select>
          </Field>
        </div>
      ) : (
        <div className="flex flex-col gap-3 p-3 pr-16 sm:flex-row sm:items-start" contentEditable={false}>
          {chars.length > 0 && chars.length <= 2 ? (
            <div className="flex shrink-0 gap-1">
              {chars.map((c) => (
                <StrokeOrder key={c} char={c} size={84} controls={false} autoplay={false} />
              ))}
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
              <CharacterGlyph text={text} size="xl" font="serif" />
              <Reading text={entry?.p ?? pack.reading(text)} className="pb-1 text-lg" />
              <AudioButton text={text} size="sm" className="mb-1" />
            </div>
            <p className="mt-1 text-sm text-ink"><Mixed>{entry?.es ?? entry?.en?.slice(0, 2).join("; ") ?? ""}</Mixed></p>
            {info ? (
              <p className="mt-1 text-xs text-ink-faint">
                {info.strokes ? `${info.strokes} trazos · ` : ""}radical {info.radical}
                {info.components.length ? ` · componentes ${info.components.join(" + ")}` : ""}
                {ety?.hint ? ` · ${ety.hint}` : ""}
              </p>
            ) : null}
            <button type="button" onClick={() => router.push(kind === "character" || chars.length === 1 ? `/caracteres?q=${encodeURIComponent(chars[0] ?? text)}` : `/diccionario?q=${encodeURIComponent(text)}`)} className="mt-1.5 text-xs text-indigo underline-offset-2 hover:underline">
              abrir ficha completa
            </button>
          </div>
        </div>
      )}
    </BlockFrame>
  );
}

/* ------------------------------------------------------------------ imagen */

export function ImageView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const { assetId, src, alt } = node.attrs as { assetId: string; src: string; alt: string };
  const [url, setUrl] = useState<string | undefined>(src || undefined);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let revoked: string | undefined;
    if (assetId && !src) void assetUrl(assetId).then((u) => { revoked = u; setUrl(u); });
    return () => { if (revoked) URL.revokeObjectURL(revoked); };
  }, [assetId, src]);
  const pick = async (f: File | undefined) => {
    if (!f) return;
    const a = await saveAsset({ kind: "image", blob: f, mime: f.type, name: f.name });
    updateAttributes({ assetId: a.id, alt: f.name });
  };
  return (
    <BlockFrame label="Imagen" icon={<ImageIcon className="size-3" />} selected={selected} onDelete={deleteNode}>
      <div className="p-2" contentEditable={false}>
        {url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- blob local de IndexedDB, sin optimizador */}
            <img src={url} alt={alt || "Foto del cuaderno"} className="mx-auto max-h-[28rem] rounded-[8px] object-contain" />
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 py-6 text-sm text-ink-faint">
            <ImageIcon className="size-6" />
            <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
              Elegir foto del cuaderno o la pizarra
            </Button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} aria-label="Elegir imagen" />
          </div>
        )}
      </div>
    </BlockFrame>
  );
}

/* ------------------------------------------------------------------ audio */

export function AudioView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const { assetId, label } = node.attrs as { assetId: string; label: string };
  const [url, setUrl] = useState<string | undefined>();
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    let u: string | undefined;
    if (assetId) void assetUrl(assetId).then((x) => { u = x; setUrl(x); });
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [assetId]);
  useEffect(() => {
    if (!rec) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [rec]);
  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: r.mimeType || "audio/webm" });
        const a = await saveAsset({ kind: "audio", blob, mime: blob.type, name: label || "grabación" });
        updateAttributes({ assetId: a.id });
        setRec(null);
        setSecs(0);
      };
      r.start();
      setRec(r);
    } catch (e) {
      toast.error("No se pudo grabar", (e as Error).message);
    }
  };
  return (
    <BlockFrame label="Audio" icon={<Mic className="size-3" />} selected={selected} onDelete={deleteNode}>
      <div className="flex flex-wrap items-center gap-3 p-3 pr-16" contentEditable={false}>
        {url ? <audio controls src={url} className="h-9 max-w-full" /> : null}
        {rec ? (
          <Button size="sm" variant="destructive" onClick={() => rec.stop()}>
            <Square /> Parar ({secs}s)
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => void start()}>
            <Mic /> {url ? "Grabar otra vez" : "Grabar (al profe con su permiso, o a ti)"}
          </Button>
        )}
        <Input value={label} onChange={(e) => updateAttributes({ label: e.target.value })} placeholder="Etiqueta: «profe explicando 了»" className="h-8 max-w-xs text-xs" aria-label="Etiqueta del audio" />
      </div>
    </BlockFrame>
  );
}

/* ------------------------------------------------------------------ pregunta Cornell */

export function CueView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const { q, a } = node.attrs as { q: string; a: string };
  const [editing, setEditing] = useEditing(!q);
  const [shown, setShown] = useState(false);
  return (
    <BlockFrame label="Pregunta" icon={<Lightbulb className="size-3" />} selected={selected} editing={editing} onEdit={() => setEditing((e) => !e)} onDelete={deleteNode} tone="sunk">
      {editing ? (
        <div className="grid gap-2 p-3" contentEditable={false}>
          <Field label="Pregunta clave (para recordar activamente)">
            <Input value={q} autoFocus onChange={(e) => updateAttributes({ q: e.target.value })} placeholder="¿Cómo se niega 有?" />
          </Field>
          <Field label="Respuesta (se tapa al repasar)">
            <Textarea value={a} onChange={(e) => updateAttributes({ a: e.target.value })} className="min-h-16" />
          </Field>
        </div>
      ) : (
        <div className="p-3 pr-16" contentEditable={false}>
          <p className="font-medium text-ink">
            <span className="mr-1.5 text-cinnabar">?</span>
            <Mixed>{q}</Mixed>
          </p>
          <button type="button" onClick={() => setShown((s) => !s)} className="mt-1 inline-flex items-center gap-1 text-xs text-ink-faint hover:text-ink" aria-expanded={shown}>
            {shown ? <EyeOff className="size-3" /> : <Eye className="size-3" />} {shown ? "ocultar respuesta" : "ver respuesta"}
          </button>
          {shown ? <p className="mt-1 text-sm text-ink-soft"><Mixed>{a}</Mixed></p> : null}
        </div>
      )}
    </BlockFrame>
  );
}

/* ------------------------------------------------------------------ línea de diálogo */

const SPEAKER_RATE: Record<string, number> = { A: 0.9, B: 0.95 };

export function DialogueLineView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const pack = usePack();
  const { speaker, zh, py, es } = node.attrs as { speaker: string; zh: string; py: string; es: string };
  const [editing, setEditing] = useEditing(!zh);
  const reading = py || (zh ? pack.reading(zh) : "");
  return (
    <BlockFrame label="Diálogo" icon={<Volume2 className="size-3" />} selected={selected} editing={editing} onEdit={() => setEditing((e) => !e)} onDelete={deleteNode} tone="none" className="my-0.5">
      {editing ? (
        <div className="grid gap-2 p-2 sm:grid-cols-[5rem_1fr_1fr]" contentEditable={false}>
          <Field label="Hablante">
            <Input value={speaker} onChange={(e) => updateAttributes({ speaker: e.target.value })} />
          </Field>
          <Field label={pack.meta.names.native}>
            <Input lang={pack.bcp47} className={cn(pack.meta.cssClass, "text-base")} value={zh} autoFocus onChange={(e) => updateAttributes({ zh: e.target.value })} />
          </Field>
          <Field label="Español">
            <Input value={es} onChange={(e) => updateAttributes({ es: e.target.value })} onKeyDown={(e) => e.key === "Enter" && setEditing(false)} />
          </Field>
        </div>
      ) : (
        <div className="flex items-start gap-2 px-1 py-1 pr-16" contentEditable={false}>
          <span className={cn("mt-1 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold", speaker === "B" ? "bg-indigo/15 text-indigo" : "bg-cinnabar/12 text-cinnabar-ink")} lang={pack.hasTargetText(speaker) ? pack.bcp47 : undefined}>
            {speaker.slice(0, 2)}
          </span>
          <AudioButton text={zh} size="sm" rate={SPEAKER_RATE[speaker] ?? 0.9} className="mt-1 shrink-0" />
          <TargetText text={zh} size="md" pinyinLine={reading} translation={es || undefined} as="div" className="min-w-0 flex-1" />
        </div>
      )}
    </BlockFrame>
  );
}

/* ------------------------------------------------------------------ inline: enlace y etiqueta */

export function WikilinkView({ node }: NodeViewProps) {
  const router = useLangRouter();
  const pack = usePack();
  const { target, label } = node.attrs as { target: string; label: string };
  const go = async () => {
    const r = await resolveLink(target, pack.id);
    if (r.kind === "note") router.push(`/apuntes/${encodeURIComponent(r.note.id)}`);
    else if (r.kind === "word") router.push(`/diccionario?q=${encodeURIComponent(r.text)}`);
    else router.push(`/apuntes?nuevo=${encodeURIComponent(r.title)}`);
  };
  return (
    <NodeViewWrapper as="span" className="inline">
      <button type="button" onClick={() => void go()} className="inline-flex items-center gap-0.5 rounded px-0.5 text-indigo underline decoration-indigo/40 underline-offset-2 hover:decoration-indigo" contentEditable={false}>
        <Link2 className="size-3" />
        <Mixed>{label || target}</Mixed>
      </button>
    </NodeViewWrapper>
  );
}

export function HashtagView({ node }: NodeViewProps) {
  const router = useLangRouter();
  const { tag } = node.attrs as { tag: string };
  return (
    <NodeViewWrapper as="span" className="inline">
      <button type="button" onClick={() => router.push(`/apuntes?tag=${encodeURIComponent(tag)}`)} className="inline-flex items-center rounded-full bg-paper-sunk px-1.5 text-[0.85em] text-ink-soft hover:text-ink" contentEditable={false}>
        <Hash className="size-3" />
        <Mixed>{tag}</Mixed>
      </button>
    </NodeViewWrapper>
  );
}
