"use client";
import { Mixed } from "@/components/target/mixed";
/**
 * Ajustes del tutor IA 老师: proveedor intercambiable (Ollama local, Gemini, Groq, OpenRouter, Claude, OpenAI, URL
 * propia), clave guardada solo en el navegador, «Probar conexión», modelos de Ollama detectados con recomendación,
 * límites y condiciones con enlace a la web oficial, modelo del alumno editable y Whisper local opcional.
 */
import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, PlugZap, RefreshCw, Trash2, XCircle } from "lucide-react";
import { useSettings, DEFAULT_TUTOR, type TutorProvider } from "@/lib/settings";
import { markTutorChosen } from "@/lib/tutor/autodetect";
import { listOllamaModels, PROVIDERS, providerInfo, testConnection, tutorConfigured } from "@/lib/tutor/providers";
import { buildStudentModel } from "@/lib/tutor/student";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Switch, Textarea, Badge } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function TutorPanel() {
  const settings = useSettings((s) => s.settings);
  const update = useSettings((s) => s.update);
  const t = settings.tutor ?? DEFAULT_TUTOR;
  const info = providerInfo(t.provider);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; ms: number } | null>(null);
  const [models, setModels] = useState<{ name: string; sizeGb: number; recommended: boolean }[] | null>(null);
  const [modelsErr, setModelsErr] = useState<string | null>(null);
  const [student, setStudent] = useState<string>("");
  const set = (patch: Partial<typeof t>) => void update({ tutor: { ...t, ...patch } });

  useEffect(() => {
    void buildStudentModel().then((m) => setStudent(m.summary));
  }, [settings.tutorMemory]);

  const detect = async () => {
    setModelsErr(null);
    try {
      const list = await listOllamaModels(t.baseUrl || "http://localhost:11434");
      setModels(list);
      if (!list.length) setModelsErr("Ollama responde pero no tiene modelos: ejecuta «ollama pull qwen3.5:9b».");
    } catch (e) {
      setModels(null);
      setModelsErr(`No se pudo hablar con Ollama (${(e as Error).message}). ¿Está abierto? Descárgalo en ollama.com.`);
    }
  };
  const test = async () => {
    setTesting(true);
    const r = await testConnection(t);
    setResult(r);
    setTesting(false);
    if (r.ok) toast.success("Tutor conectado", `${r.ms} ms`);
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="t-provider" className="mb-1.5 block">
            Proveedor
          </Label>
          <Select
            id="t-provider"
            value={t.provider}
            onChange={(e) => {
              const p = e.target.value as TutorProvider;
              const i = providerInfo(p);
              set({ provider: p, model: i?.defaultModel ?? "", baseUrl: "" });
              void markTutorChosen();
              setResult(null);
            }}
            className="w-full"
          >
            <option value="none">Sin tutor (role-plays y corrector por reglas)</option>
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        {t.provider !== "none" ? (
          <div>
            <Label htmlFor="t-model" className="mb-1.5 block">
              Modelo
            </Label>
            <Input id="t-model" value={t.model} placeholder={info?.defaultModel} onChange={(e) => set({ model: e.target.value })} list="t-models" />
            {models?.length ? (
              <datalist id="t-models">
                {models.map((m) => (
                  <option key={m.name} value={m.name} />
                ))}
              </datalist>
            ) : null}
          </div>
        ) : null}
        {t.provider !== "none" && (info?.needsKey || t.provider === "custom") ? (
          <div>
            <Label htmlFor="t-key" className="mb-1.5 block">
              Clave API {info?.needsKey ? "" : "(opcional)"}
            </Label>
            <Input id="t-key" type="password" value={t.apiKey} onChange={(e) => set({ apiKey: e.target.value })} autoComplete="off" placeholder="se guarda solo en este navegador" />
            {info?.docs ? (
              <a href={info.docs} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-indigo underline-offset-2 hover:underline">
                conseguir una clave <ExternalLink className="size-3" />
              </a>
            ) : null}
          </div>
        ) : null}
        {t.provider === "ollama" || t.provider === "custom" ? (
          <div>
            <Label htmlFor="t-url" className="mb-1.5 block">
              URL base
            </Label>
            <Input id="t-url" value={t.baseUrl} placeholder={info?.baseUrl || "http://localhost:1234/v1"} onChange={(e) => set({ baseUrl: e.target.value })} />
          </div>
        ) : null}
      </div>

      {info ? (
        <div className="rounded-[10px] border border-line bg-paper-sunk/40 p-3 text-xs text-ink-soft">
          <p>
            <strong className="text-ink">Ventajas:</strong> {info.pros}
          </p>
          <p className="mt-1">
            <strong className="text-ink">Limitaciones:</strong> {info.cons}
          </p>
          {info.limitsUrl ? (
            <p className="mt-1">
              Los límites y condiciones cambian: compruébalos en{" "}
              <a href={info.limitsUrl} target="_blank" rel="noreferrer" className="text-indigo underline-offset-2 hover:underline">
                la web oficial <ExternalLink className="inline size-3" />
              </a>
              .
            </p>
          ) : null}
        </div>
      ) : null}

      {t.provider !== "none" ? (
        <div className="flex flex-wrap items-center gap-2">
          {t.provider === "ollama" ? (
            <Button variant="secondary" onClick={() => void detect()}>
              <RefreshCw /> Detectar modelos de Ollama
            </Button>
          ) : null}
          <Button variant="ink" onClick={() => void test()} disabled={testing || !tutorConfigured(t)}>
            <PlugZap /> {testing ? "Probando…" : "Probar conexión"}
          </Button>
          {result ? (
            <span className={cn("inline-flex items-center gap-1 text-sm", result.ok ? "text-celadon-ink" : "text-danger")}>
              {result.ok ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />} {result.message}
            </span>
          ) : null}
        </div>
      ) : null}
      {modelsErr ? <p className="text-xs text-danger">{modelsErr}</p> : null}
      {models?.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {models.map((m) => (
            <li key={m.name}>
              <button type="button" onClick={() => set({ model: m.name })} className={cn("rounded-full border px-2.5 py-1 text-xs", t.model === m.name ? "border-ink bg-ink text-paper" : "border-line hover:border-ink/40")}>
                {m.name} <span className="opacity-70">{m.sizeGb} GB</span>
                {m.recommended ? <Badge variant="jade" className="ml-1">recomendado para chino</Badge> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {t.provider === "ollama" ? <p className="text-xs text-ink-faint">Recomendado: qwen3.5:9b (6,6 GB; va bien con 8 GB de memoria de gráfica). En equipos modestos, qwen3.5:4b o qwen2.5:3b. Para usar el tutor desde la web publicada (sin servidor local) arranca Ollama con OLLAMA_ORIGINS=*.</p> : null}

      {t.provider !== "none" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Label className="flex items-center gap-2 text-sm">
            <Switch checked={t.correct} onCheckedChange={(v) => set({ correct: v })} /> Usar el tutor como 4.ª capa del corrector (alternativas y matices)
          </Label>
          <Label className="flex items-center gap-2 text-sm">
            <Switch checked={t.speak} onCheckedChange={(v) => set({ speak: v })} /> Leer en voz alta las respuestas del tutor (modo voz)
          </Label>
        </div>
      ) : null}

      <div>
        <p className="mb-1 text-sm font-medium text-ink">Modelo del alumno (lo que el tutor sabe de ti)</p>
        <p className="mb-2 text-xs text-ink-faint">Se calcula en local: palabras conocidas (mazo y FSRS), errores frecuentes (<span lang="zh-CN">错题本</span>), nivel, objetivos y unidad actual. Puedes añadir notas o desactivarlo.</p>
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-[8px] border border-line bg-paper-sunk/50 p-2 text-xs text-ink-soft scrollbar-thin"><Mixed>{student || "…"}</Mixed></pre>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <Textarea value={settings.tutorMemory?.notes ?? ""} onChange={(e) => void update({ tutorMemory: { ...settings.tutorMemory, notes: e.target.value } })} placeholder="Notas para el tutor: «me cuesta el 3.er tono», «quiero practicar el restaurante»…" className="min-h-16 text-sm" aria-label="Notas para el tutor" />
          <Textarea value={settings.tutorMemory?.goals ?? ""} onChange={(e) => void update({ tutorMemory: { ...settings.tutorMemory, goals: e.target.value } })} placeholder="Objetivos: HSK 1 en junio, máster en Shanghái…" className="min-h-16 text-sm" aria-label="Objetivos" />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Label className="flex items-center gap-2 text-sm">
            <Switch checked={!settings.tutorMemory?.disabled} onCheckedChange={(v) => void update({ tutorMemory: { ...settings.tutorMemory, disabled: !v } })} /> Compartir el modelo del alumno con el tutor
          </Label>
          <Button size="sm" variant="ghost" className="text-danger hover:text-danger" onClick={() => void update({ tutorMemory: { notes: "", goals: "", disabled: false } })}>
            <Trash2 /> Borrar notas
          </Button>
        </div>
      </div>

      <div>
        <p className="mb-1 text-sm font-medium text-ink">Reconocimiento de voz local (Whisper)</p>
        <Label className="flex items-center gap-2 text-sm">
          <Switch checked={Boolean(settings.whisper?.enabled)} onCheckedChange={(v) => void update({ whisper: { ...settings.whisper, enabled: v } })} /> Usar Whisper en el navegador en vez del reconocimiento del navegador (no envía audio a la nube)
        </Label>
        <p className="mt-1 text-xs text-ink-faint">Descarga el modelo la primera vez (≈ 40 MB para whisper-tiny) y queda en caché. Es más lento y en chino de principiante acierta menos que el reconocimiento de Chrome/Edge; actívalo si prefieres privacidad.</p>
        {settings.whisper?.enabled ? (
          <Select value={settings.whisper.model} onChange={(e) => void update({ whisper: { ...settings.whisper, model: e.target.value } })} className="mt-2">
            <option value="Xenova/whisper-tiny">whisper-tiny (≈ 40 MB, rápido)</option>
            <option value="Xenova/whisper-base">whisper-base (≈ 75 MB, mejor)</option>
            <option value="Xenova/whisper-small">whisper-small (≈ 250 MB, lento)</option>
          </Select>
        ) : null}
      </div>
    </div>
  );
}
