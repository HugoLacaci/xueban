"use client";
import { cn } from "@/lib/utils";

/** Chip de filtro (categoría / nivel / preset): papel elevado, activo en tinta sólida. */
export function FilterChip({ active, onClick, children, className }: { active: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-[var(--dur-ui)]",
        active ? "border-ink bg-ink text-paper" : "border-line bg-paper-raised text-ink-soft hover:border-ink/40 hover:text-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}
