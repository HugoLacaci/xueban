"use client";
/** «+ apunte» contextual: abre la captura rápida con el texto y el origen (ejercicio, vídeo, lectura…) ya rellenos. */
import { NotebookPen } from "lucide-react";
import type { NoteSource } from "@/lib/db";
import { usePack } from "@/lib/languages/provider";
import { Button } from "@/components/ui/button";
import { openQuickCapture } from "./quick-capture";

export function NoteHereButton({ text, source, label = "apunte", className }: { text: string | (() => string); source: Omit<NoteSource, "href">; label?: string; className?: string }) {
  const pack = usePack();
  if (pack.id !== "zh") return null;
  const open = () => {
    const sel = typeof window !== "undefined" ? (window.getSelection()?.toString() ?? "").trim() : "";
    const t = sel || (typeof text === "function" ? text() : text);
    openQuickCapture({ text: t, source: { ...source, context: source.context ?? t, href: typeof window !== "undefined" ? window.location.pathname + window.location.search : undefined } });
  };
  return (
    <Button size="sm" variant="ghost" onClick={open} className={className} title="Guardar en la bandeja de apuntes (si seleccionas texto, se usa la selección)">
      <NotebookPen /> + {label}
    </Button>
  );
}
