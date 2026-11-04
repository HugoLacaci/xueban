"use client";
import { useState } from "react";
import { Hash, X } from "lucide-react";
import Link from "@/lib/languages/link";
import { Mixed } from "@/components/target/mixed";

/** Chips de etiquetas con entrada rápida (Enter o coma para añadir). */
export function TagEditor({ tags, onChange, readOnly }: { tags: string[]; onChange: (t: string[]) => void; readOnly?: boolean }) {
  const [v, setV] = useState("");
  const add = () => {
    const t = v.replace(/^#/, "").trim();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setV("");
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-0.5 rounded-full bg-paper-sunk px-2 py-0.5 text-xs text-ink-soft">
          <Link href={`/apuntes?tag=${encodeURIComponent(t)}`} className="inline-flex items-center gap-0.5 hover:text-ink">
            <Hash className="size-3" />
            <Mixed>{t}</Mixed>
          </Link>
          {!readOnly ? (
            <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))} className="ml-0.5 rounded-full p-0.5 hover:text-danger" aria-label={`Quitar etiqueta ${t}`}>
              <X className="size-3" />
            </button>
          ) : null}
        </span>
      ))}
      {!readOnly ? (
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
            if (e.key === "Backspace" && !v && tags.length) onChange(tags.slice(0, -1));
          }}
          onBlur={add}
          placeholder={tags.length ? "+ etiqueta" : "añade etiquetas: #u03, #gramática…"}
          className="h-6 min-w-32 bg-transparent text-xs text-ink outline-none placeholder:text-ink-faint/80"
          aria-label="Nueva etiqueta"
        />
      ) : null}
    </div>
  );
}
