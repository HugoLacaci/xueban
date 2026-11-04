"use client";
/**
 * Tutor en el navegador (WebLLM + WebGPU): el modelo se descarga una vez desde Hugging Face, queda en la caché del
 * navegador y se ejecuta en la tarjeta gráfica de este ordenador. Gratis, sin instalar nada, sin claves y sin enviar
 * datos a ningún servidor. Necesita Chrome o Edge recientes con WebGPU.
 */
import { create } from "zustand";
import type { ChatOptions, ChatResult, ChatTurn } from "./providers";

export interface WebModel {
  id: string;
  label: string;
  sizeGb: number;
  vramGb: number;
  note: string;
}

/** Modelos Qwen3 precompilados de WebLLM (los que mejor hablan chino a este tamaño). */
export const WEB_MODELS: WebModel[] = [
  { id: "Qwen3-4B-q4f16_1-MLC", label: "Qwen3 4B (recomendado)", sizeGb: 2.3, vramGb: 3.4, note: "Buen equilibrio entre calidad y velocidad en casi cualquier portátil con gráfica." },
  { id: "Qwen3-1.7B-q4f16_1-MLC", label: "Qwen3 1.7B (ligero)", sizeGb: 1.1, vramGb: 2.0, note: "Para ordenadores modestos o gráficas integradas. Comete más errores." },
  { id: "Qwen3-8B-q4f16_1-MLC", label: "Qwen3 8B (mejor calidad)", sizeGb: 4.6, vramGb: 5.7, note: "Necesita una gráfica dedicada con 8 GB o más." },
];
export const DEFAULT_WEB_MODEL = WEB_MODELS[0].id;

export function webgpuAvailable(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

interface LoadState {
  model: string | null;
  progress: number; // 0..1
  text: string;
  loading: boolean;
  ready: boolean;
  error: string | null;
}
export const useWebLLM = create<LoadState>(() => ({ model: null, progress: 0, text: "", loading: false, ready: false, error: null }));

type Engine = {
  chat: { completions: { create: (req: Record<string, unknown>) => Promise<{ choices: { message: { content: string | null } }[] }> } };
  reload: (model: string) => Promise<void>;
};
let engine: Engine | null = null;
let loading: Promise<Engine> | null = null;
let loadedModel: string | null = null;

/** Carga (o reutiliza) el motor con el modelo pedido. La primera vez descarga el modelo con barra de progreso. */
export async function getEngine(model: string): Promise<Engine> {
  if (!webgpuAvailable()) throw new Error("Este navegador no tiene WebGPU. Usa Chrome o Edge actualizados en un ordenador.");
  if (engine && loadedModel === model) return engine;
  if (loading) await loading.catch(() => undefined);
  if (engine && loadedModel === model) return engine;
  useWebLLM.setState({ model, loading: true, ready: false, error: null, progress: 0, text: "Preparando…" });
  loading = (async () => {
    const webllm = await import("@mlc-ai/web-llm");
    const onProgress = (r: { progress: number; text: string }) => useWebLLM.setState({ progress: r.progress, text: r.text });
    if (engine) {
      await engine.reload(model);
    } else {
      engine = (await webllm.CreateMLCEngine(model, { initProgressCallback: onProgress })) as unknown as Engine;
    }
    loadedModel = model;
    return engine;
  })();
  try {
    const e = await loading;
    useWebLLM.setState({ loading: false, ready: true, progress: 1, text: "Listo" });
    return e;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    useWebLLM.setState({ loading: false, ready: false, error: msg });
    throw new Error(`No se pudo cargar el modelo en el navegador: ${msg}`);
  } finally {
    loading = null;
  }
}

/** ¿El modelo ya está descargado en la caché de este navegador? */
export async function isModelCached(model: string): Promise<boolean> {
  try {
    const webllm = await import("@mlc-ai/web-llm");
    return await webllm.hasModelInCache(model);
  } catch {
    return false;
  }
}

/** Llamada de chat compatible con la del resto de proveedores. Sin herramientas (WebLLM no las admite con Qwen3). */
export async function chatWebLLM(model: string, messages: ChatTurn[], opts: ChatOptions): Promise<ChatResult> {
  const e = await getEngine(model);
  // WebLLM exige un único mensaje de sistema y que vaya el primero
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const rest = messages.filter((m) => m.role !== "system");
  const msgs = [...(system ? [{ role: "system", content: system }] : []), ...rest];
  const req: Record<string, unknown> = {
    messages: msgs,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 900,
    // Qwen3 «piensa» por defecto: para un tutor conversacional se desactiva
    extra_body: { enable_thinking: false },
  };
  if (opts.json) req.response_format = { type: "json_object" };
  const r = await e.chat.completions.create(req);
  const text = (r.choices?.[0]?.message?.content ?? "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  return { text, toolCalls: [] };
}
