"use client";
import { create } from "zustand";
import { CircleAlert, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrushCheck } from "@/components/ornament/ink-divider";

export interface ToastItem {
  id: number;
  title: string;
  description?: string;
  kind: "info" | "success" | "error";
  action?: { label: string; onClick: () => void };
  leaving?: boolean;
}

interface ToastStore {
  toasts: ToastItem[];
  push: (t: Omit<ToastItem, "id">) => void;
  dismiss: (id: number) => void;
}

const EXIT_MS = 180;
let nextId = 1;
export const useToasts = create<ToastStore>((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }));
    setTimeout(() => get().dismiss(id), t.kind === "error" ? 7000 : 4000);
  },
  dismiss: (id) => {
    // salida en dos tiempos: marca «leaving» (animación CSS) y retira el nodo después
    set((s) => ({ toasts: s.toasts.map((x) => (x.id === id ? { ...x, leaving: true } : x)) }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), EXIT_MS);
  },
}));

export const toast = {
  info: (title: string, description?: string) => useToasts.getState().push({ title, description, kind: "info" }),
  success: (title: string, description?: string, action?: ToastItem["action"]) =>
    useToasts.getState().push({ title, description, kind: "success", action }),
  error: (title: string, description?: string) => useToasts.getState().push({ title, description, kind: "error" }),
};

/** Sello pequeño que acompaña cada aviso: 好 (éxito), 误 (error), 注 (información). */
function ToastSeal({ kind }: { kind: ToastItem["kind"] }) {
  const glyph = kind === "success" ? "好" : kind === "error" ? "误" : "注";
  const color = kind === "success" ? "rgb(var(--celadon))" : kind === "error" ? "rgb(var(--danger))" : "rgb(var(--ink-soft))";
  return (
    <span
      aria-hidden="true"
      className="zh-display flex size-8 shrink-0 -rotate-6 items-center justify-center rounded-[5px] border-[1.5px] text-base leading-none"
      style={{ color, borderColor: color }}
      lang="zh-CN"
    >
      {glyph}
    </span>
  );
}

/**
 * Avisos como pequeños papeles: filete de color a la izquierda, sello con un carácter,
 * icono + texto para el error (nunca solo color). Animación en CSS (sin librería) para no cargar
 * motion en todas las páginas; respeta prefers-reduced-motion vía `motion-safe:`.
 */
export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6" aria-live="polite">
      <style>{`@keyframes toast-in { from { opacity: 0; transform: translateY(12px) scale(.98); } to { opacity: 1; transform: none; } }
@keyframes toast-out { to { opacity: 0; transform: translateY(8px) scale(.98); } }`}</style>
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{ animation: `${t.leaving ? "toast-out" : "toast-in"} ${EXIT_MS}ms var(--ease-ink) forwards` }}
          className={cn(
            "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[10px] border border-line border-l-[3px] bg-paper-raised p-3 pr-2 text-ink shadow-[var(--shadow-float)] motion-reduce:!animate-none",
            t.leaving && "motion-reduce:opacity-0",
            t.kind === "success" && "border-l-celadon",
            t.kind === "error" && "border-l-danger",
            t.kind === "info" && "border-l-ink-soft/60",
          )}
          role={t.kind === "error" ? "alert" : "status"}
        >
          <ToastSeal kind={t.kind} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
              {t.kind === "success" ? <BrushCheck size={16} /> : t.kind === "error" ? <CircleAlert className="size-4 text-danger" aria-hidden="true" /> : <Info className="size-4 text-ink-faint" aria-hidden="true" />}
              <span className="min-w-0">{t.title}</span>
            </p>
            {t.description ? <p className="mt-0.5 text-xs text-ink-faint">{t.description}</p> : null}
            {t.action ? (
              <button
                className="mt-1.5 text-xs font-medium text-indigo underline-offset-2 hover:underline"
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            ) : null}
          </div>
          <button onClick={() => dismiss(t.id)} className="rounded p-1 text-ink-faint transition-colors hover:text-ink" aria-label="Cerrar aviso">
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
