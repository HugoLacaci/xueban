"use client";
import * as Icons from "lucide-react";
import type { NoteType } from "@/lib/db";
import { templateFor } from "@/lib/notes/templates";
import { usePack } from "@/lib/languages/provider";
import { cn } from "@/lib/utils";

/** Chip con el carácter nativo y el nombre de la plantilla. */
export function NoteTypeBadge({ type, className, size = "sm" }: { type: NoteType; className?: string; size?: "sm" | "md" }) {
  const t = templateFor(type);
  const pack = usePack();
  const Icon = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[t.icon] ?? Icons.FileText;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-line bg-paper-raised px-2 py-0.5 text-ink-soft", size === "sm" ? "text-[11px]" : "text-xs", className)}>
      <span lang="zh-CN" className={cn("zh-serif leading-none text-cinnabar", size === "sm" ? "text-sm" : "text-base")} aria-hidden="true">
        {t.native}
      </span>
      <Icon className="size-3 text-ink-faint" />
      <span>{t.name}</span>
      <span className="sr-only">({pack.meta.names.adjective})</span>
    </span>
  );
}

export function NoteTypeIcon({ type, className }: { type: NoteType; className?: string }) {
  const t = templateFor(type);
  const Icon = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[t.icon] ?? Icons.FileText;
  return <Icon className={className} />;
}
