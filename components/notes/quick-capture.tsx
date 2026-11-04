"use client";
/**
 * Captura rápida global (atajo N, botón «+ apunte»): texto, dictado por voz o foto del cuaderno → bandeja de entrada.
 * Lleva el contexto de dónde vino (palabra, ejercicio, vídeo, lectura) para procesarlo después.
 */
import { useEffect, useRef, useState } from "react";
import { create } from "zustand";
import { Camera, Inbox, Mic, Square, X } from "lucide-react";
import { captureToInbox } from "@/lib/notes/repo";
import type { NoteSource } from "@/lib/db";
import { useLangRouter } from "@/lib/languages/link";
import { usePack } from "@/lib/languages/provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, Kbd, Textarea } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { recognizeOnce, speechRecognitionAvailable } from "@/lib/tts";
import { cn } from "@/lib/utils";

interface CaptureState {
  open: boolean;
  text: string;
  source?: NoteSource;
  show: (opts?: { text?: string; source?: NoteSource }) => void;
  hide: () => void;
}

export const useQuickCapture = create<CaptureState>((set) => ({
  open: false,
  text: "",
  show: (opts) => set({ open: true, text: opts?.text ?? "", source: opts?.source }),
  hide: () => set({ open: false, text: "", source: undefined }),
}));

/** Abre la captura rápida desde cualquier sitio (sin React). */
export function openQuickCapture(opts?: { text?: string; source?: NoteSource }) {
  useQuickCapture.getState().show(opts);
}

const isTyping = (el: Element | null) => !!el && (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || (el as HTMLElement).isContentEditable);

export function QuickCaptureHost() {
  const open = useQuickCapture((s) => s.open);
  // atajo N
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "n" || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTyping(document.activeElement)) return;
      if (useQuickCapture.getState().open) return;
      e.preventDefault();
      useQuickCapture.getState().show();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  if (!open) return null;
  return <CaptureDialog />;
}

/** Se monta solo mientras el diálogo está abierto: el estado inicial sale del store sin efectos. */
function CaptureDialog() {
  const { open, text, source, hide } = useQuickCapture();
  const pack = usePack();
  const router = useLangRouter();
  const [value, setValue] = useState(text);
  const [dictating, setDictating] = useState<"es" | "zh" | null>(null);
  const [saving, setSaving] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const t = setTimeout(() => taRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  const save = async (goInbox = false) => {
    if (!value.trim()) return;
    setSaving(true);
    try {
      await captureToInbox({ text: value, source: source ?? { kind: "capture" } });
      toast.success("Guardado en la bandeja", "Procésalo después de clase en Apuntes → Bandeja");
      hide();
      if (goInbox) router.push("/apuntes/bandeja");
    } finally {
      setSaving(false);
    }
  };

  const dictate = async (lang: "es" | "zh") => {
    if (!speechRecognitionAvailable()) return toast.error("Tu navegador no tiene reconocimiento de voz (usa Chrome o Edge)");
    setDictating(lang);
    try {
      const r = await recognizeOnce({ timeoutMs: 15000, locale: lang === "es" ? ("es-ES" as never) : pack.bcp47 });
      if (r.text) setValue((v) => (v ? `${v}\n${r.text}` : r.text));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDictating(null);
    }
  };

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    setOcrBusy(true);
    try {
      const { ocrImage } = await import("@/lib/notes/ocr");
      const res = await ocrImage(file, pack.id);
      if (res.text.trim()) setValue((v) => (v ? `${v}\n${res.text.trim()}` : res.text.trim()));
      else toast.info("No se reconoció texto en la foto");
      const { saveAsset } = await import("@/lib/notes/assets");
      await saveAsset({ kind: "image", blob: file, mime: file.type, name: file.name });
    } catch (e) {
      toast.error("No se pudo leer la foto", (e as Error).message);
    } finally {
      setOcrBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : hide())}>
      <DialogContent title="Captura rápida" description={source?.context ? `Desde: ${source.context.slice(0, 80)}` : "Apunta lo que diga el profesor; lo ordenarás después."} side="bottom" className="sm:max-w-xl">
        <Textarea
          ref={taRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") void save();
            if (e.key === "Escape") hide();
          }}
          className="min-h-32 text-base leading-relaxed"
          placeholder={"Ej.: 「在」va antes del verbo · 我在家吃饭 · deberes p. 23"}
          aria-label="Texto de la captura"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => void dictate("es")} disabled={!!dictating} aria-pressed={dictating === "es"}>
            {dictating === "es" ? <Square /> : <Mic />} Dictar (es)
          </Button>
          <Button size="sm" variant="secondary" onClick={() => void dictate("zh")} disabled={!!dictating} aria-pressed={dictating === "zh"}>
            {dictating === "zh" ? <Square /> : <Mic />} Dictar ({pack.meta.names.adjective})
          </Button>
          <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()} disabled={ocrBusy}>
            <Camera /> {ocrBusy ? "Leyendo foto…" : "Foto del cuaderno"}
          </Button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void onPhoto(e.target.files?.[0])} aria-label="Foto del cuaderno" />
          <span className="ml-auto hidden items-center gap-1 text-xs text-ink-faint sm:flex">
            <Kbd>Ctrl</Kbd>
            <Kbd>Enter</Kbd> guardar
          </span>
        </div>
        <div className={cn("flex flex-wrap justify-end gap-2 border-t border-line pt-3")}>
          <Button variant="ghost" onClick={hide}>
            <X /> Cancelar
          </Button>
          <Button variant="secondary" onClick={() => void save(true)} disabled={saving || !value.trim()}>
            <Inbox /> Guardar y abrir bandeja
          </Button>
          <Button variant="ink" onClick={() => void save()} disabled={saving || !value.trim()}>
            Guardar en la bandeja
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
