"use client";
/** Cuadrícula de escritura del idioma activo: 田字格 (zh), 練習帳 con guías en cruz (ja) o bloque silábico (ko). */
import { cn } from "@/lib/utils";
import { usePackOptional } from "@/lib/languages/provider";

const CLASSES: Record<string, { full: string; faint: string }> = {
  tianzige: { full: "tianzige", faint: "tianzige-faint" },
  renshucho: { full: "renshucho", faint: "renshucho-faint" },
  hangul: { full: "hangul-grid", faint: "hangul-grid-faint" },
};

export function WritingGrid({ children, size = 160, faint, className, style, variant }: { children?: React.ReactNode; size?: number | string; faint?: boolean; className?: string; style?: React.CSSProperties; variant?: "tian" | "mi" }) {
  const pack = usePackOptional();
  const kind = pack?.strokeData.grid ?? "tianzige";
  const c = CLASSES[kind] ?? CLASSES.tianzige;
  return (
    <div className={cn("relative inline-flex items-center justify-center rounded-lg", faint ? c.faint : cn(c.full, kind === "tianzige" && variant === "mi" && "mizige"), className)} style={{ width: size, height: size, ...style }}>
      {children}
    </div>
  );
}
