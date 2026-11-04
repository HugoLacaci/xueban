"use client";
/** Tutor en el navegador (WebGPU): selector de modelo, progreso de la descarga y botón de activación en un clic. */
import { useEffect, useState } from "react";
import { Cpu, Download } from "lucide-react";
import { useSettings, DEFAULT_TUTOR } from "@/lib/settings";
import { DEFAULT_WEB_MODEL, getEngine, isModelCached, useWebLLM, webgpuAvailable, WEB_MODELS } from "@/lib/tutor/webllm";
import { markTutorChosen } from "@/lib/tutor/autodetect";
import { Button } from "@/components/ui/button";
import { Badge, Progress } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

function useCached(): Record<string, boolean> {
  const [cached, setCached] = useState<Record<string, boolean>>({});
  const ready = useWebLLM((s) => s.ready);
  useEffect(() => {
    let alive = true;
    void Promise.all(WEB_MODELS.map(async (m) => [m.id, await isModelCached(m.id)] as const)).then((r) => {
      if (alive) setCached(Object.fromEntries(r));
    });
    return () => {
      alive = false;
    };
  }, [ready]);
  return cached;
}

export function WebModelPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const cached = useCached();
  return (
    <div role="radiogroup" aria-label="Modelo en el navegador" className="space-y-1.5">
      {WEB_MODELS.map((m) => (
        <button
          key={m.id}
          type="button"
          role="radio"
          aria-checked={value === m.id}
          onClick={() => onChange(m.id)}
          className={cn("w-full rounded-[8px] border px-3 py-2 text-left text-sm", value === m.id ? "border-ink bg-paper-raised" : "border-line hover:border-ink/40")}
        >
          <span className="flex flex-wrap items-center gap-2 font-medium text-ink">
            {m.label}
            <span className="text-xs font-normal text-ink-faint">
              descarga {m.sizeGb.toString().replace(".", ",")} GB · gráfica {m.vramGb.toString().replace(".", ",")} GB
            </span>
            {cached[m.id] ? <Badge variant="jade">descargado</Badge> : null}
          </span>
          <span className="block text-xs text-ink-soft">{m.note}</span>
        </button>
      ))}
    </div>
  );
}

export function WebLLMStatus({ className }: { className?: string }) {
  const s = useWebLLM();
  if (!s.loading && !s.error) return null;
  return (
    <div className={cn("rounded-[10px] border border-line bg-paper-sunk/40 p-3 text-xs", className)} role="status" aria-live="polite">
      {s.loading ? (
        <>
          <p className="mb-1.5 flex items-center gap-1.5 font-medium text-ink">
            <Download className="size-3.5" /> Preparando el tutor en este navegador… {Math.round(s.progress * 100)} %
          </p>
          <Progress value={s.progress * 100} className="h-1.5" />
          <p className="mt-1 truncate text-ink-faint">{s.text}</p>
          <p className="mt-1 text-ink-faint">Solo la primera vez: después se carga desde la caché del navegador en unos segundos.</p>
        </>
      ) : (
        <p className="text-danger">{s.error}</p>
      )}
    </div>
  );
}

/** Activa el tutor en este navegador y empieza la descarga del modelo recomendado. */
export function ActivateInBrowser({ onActivated }: { onActivated?: () => void }) {
  const update = useSettings((s) => s.update);
  const tutor = useSettings((s) => s.settings.tutor ?? DEFAULT_TUTOR);
  const loading = useWebLLM((s) => s.loading);
  const [supported] = useState(() => webgpuAvailable());
  if (!supported) {
    return <p className="text-xs text-ink-faint">Este navegador no tiene WebGPU, así que no puede ejecutar el tutor por sí mismo. En un ordenador, usa Chrome o Edge actualizados.</p>;
  }
  const activate = async () => {
    await update({ tutor: { ...tutor, provider: "webgpu", model: DEFAULT_WEB_MODEL, baseUrl: "", apiKey: "" } });
    await markTutorChosen();
    try {
      await getEngine(DEFAULT_WEB_MODEL);
      toast.success("Tutor listo en este navegador", "El modelo queda guardado en el navegador y no envía nada a ningún servidor.");
      onActivated?.();
    } catch (e) {
      toast.error("No se pudo preparar el tutor", e instanceof Error ? e.message : String(e));
    }
  };
  return (
    <Button variant="ink" onClick={() => void activate()} disabled={loading}>
      <Cpu /> {loading ? "Descargando…" : "Usar el tutor en este navegador (gratis, ~2,3 GB una vez)"}
    </Button>
  );
}
