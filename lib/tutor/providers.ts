"use client";
/**
 * Proveedores del tutor IA, intercambiables: cliente compatible con la API de OpenAI (Ollama, Groq, OpenRouter,
 * Gemini vía su endpoint compatible, OpenAI, URL propia) y un adaptador aparte para Claude (Anthropic).
 * Las llamadas salen del navegador: en el servidor de desarrollo pasan por la ruta /api/tutor (proxy local, evita CORS);
 * en la exportación estática se llama directamente al proveedor (Ollama necesita OLLAMA_ORIGINS=*).
 * La clave nunca sale de este navegador salvo hacia el proveedor elegido.
 */
import type { TutorProvider, TutorSettings } from "@/lib/settings";
import { BASE_PATH } from "@/lib/base-path";

export interface ChatTurn {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
}

export interface ChatResult {
  text: string;
  toolCalls: { id: string; name: string; args: Record<string, unknown> }[];
  raw?: unknown;
}

export interface ProviderInfo {
  id: TutorProvider;
  name: string;
  baseUrl: string; // por defecto
  defaultModel: string;
  needsKey: boolean;
  docs: string;
  /** Ventajas / limitaciones (texto; los límites exactos deben verificarse en la web oficial) */
  pros: string;
  cons: string;
  limitsUrl: string;
  kind: "openai" | "anthropic";
}

export const PROVIDERS: ProviderInfo[] = [
  { id: "ollama", name: "Ollama (local)", baseUrl: "http://localhost:11434/v1", defaultModel: "qwen3.5:9b", needsKey: false, docs: "https://ollama.com/download", pros: "Gratis, privado y sin límites. Recomendado para chino: qwen3.5:9b (6,6 GB; va bien con 8 GB de memoria de gráfica); en equipos modestos, qwen3.5:4b o qwen2.5:3b con menos calidad.", cons: "Necesita un PC potente. Para llamar desde la web publicada hay que arrancar Ollama con OLLAMA_ORIGINS=* (en local, el proxy /api/tutor lo evita).", limitsUrl: "https://github.com/ollama/ollama/blob/main/docs/faq.md", kind: "openai" },
  { id: "gemini", name: "Google Gemini (nivel gratuito)", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", defaultModel: "gemini-2.5-flash", needsKey: true, docs: "https://aistudio.google.com/apikey", pros: "Nube gratis con clave de Google AI Studio.", cons: "Límites de uso por minuto y por día; en el nivel gratuito Google puede usar los datos para mejorar sus productos (comprueba las condiciones vigentes).", limitsUrl: "https://ai.google.dev/gemini-api/docs/rate-limits", kind: "openai" },
  { id: "groq", name: "Groq (modelos gratuitos)", baseUrl: "https://api.groq.com/openai/v1", defaultModel: "llama-3.3-70b-versatile", needsKey: true, docs: "https://console.groq.com/keys", pros: "Nube gratis y muy rápida.", cons: "Límites de peticiones y tokens por día; los modelos abiertos saben menos chino que Qwen.", limitsUrl: "https://console.groq.com/docs/rate-limits", kind: "openai" },
  { id: "openrouter", name: "OpenRouter (modelos :free)", baseUrl: "https://openrouter.ai/api/v1", defaultModel: "qwen/qwen3-235b-a22b:free", needsKey: true, docs: "https://openrouter.ai/keys", pros: "Acceso a muchos modelos; los que terminan en :free no cuestan.", cons: "Límites diarios en los modelos gratuitos y disponibilidad variable.", limitsUrl: "https://openrouter.ai/docs/api-reference/limits", kind: "openai" },
  { id: "anthropic", name: "Claude (API de Anthropic)", baseUrl: "https://api.anthropic.com", defaultModel: "claude-sonnet-5-5", needsKey: true, docs: "https://console.anthropic.com/", pros: "La mejor calidad de explicación y corrección.", cons: "De pago: solo si metes tu propia clave.", limitsUrl: "https://docs.anthropic.com/en/api/rate-limits", kind: "anthropic" },
  { id: "openai", name: "OpenAI (clave propia)", baseUrl: "https://api.openai.com/v1", defaultModel: "gpt-4o-mini", needsKey: true, docs: "https://platform.openai.com/api-keys", pros: "Buena calidad.", cons: "De pago.", limitsUrl: "https://platform.openai.com/docs/guides/rate-limits", kind: "openai" },
  { id: "custom", name: "Compatible con OpenAI (URL propia)", baseUrl: "", defaultModel: "", needsKey: false, docs: "", pros: "LM Studio, llama.cpp, vLLM, un servidor propio…", cons: "Depende del servidor.", limitsUrl: "", kind: "openai" },
];

export function providerInfo(id: TutorProvider): ProviderInfo | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

export function tutorConfigured(t: TutorSettings): boolean {
  if (t.provider === "none") return false;
  const info = providerInfo(t.provider);
  if (!info) return false;
  if (info.needsKey && !t.apiKey) return false;
  if (t.provider === "custom" && !t.baseUrl) return false;
  return true;
}

function resolve(t: TutorSettings): { url: string; model: string; key: string; kind: "openai" | "anthropic" } {
  const info = providerInfo(t.provider)!;
  return { url: (t.baseUrl || info.baseUrl).replace(/\/+$/, ""), model: t.model || info.defaultModel, key: t.apiKey, kind: info.kind };
}

/** ¿Hay servidor (ruta /api/tutor)? En la exportación estática no. Se comprueba una vez. */
let proxyAvailable: boolean | undefined;
async function hasProxy(): Promise<boolean> {
  if (proxyAvailable !== undefined) return proxyAvailable;
  try {
    const r = await fetch(`${BASE_PATH}/api/tutor`, { method: "OPTIONS" });
    proxyAvailable = r.ok;
  } catch {
    proxyAvailable = false;
  }
  return proxyAvailable;
}

async function post(url: string, body: unknown, headers: Record<string, string>, signal?: AbortSignal): Promise<unknown> {
  // proxy local si existe (evita CORS con Ollama/Groq); si no, directo
  const useProxy = await hasProxy();
  const res = await fetch(useProxy ? `${BASE_PATH}/api/tutor` : url, {
    method: "POST",
    headers: useProxy ? { "content-type": "application/json" } : { "content-type": "application/json", ...headers },
    body: JSON.stringify(useProxy ? { url, headers, body } : body),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${text ? `: ${text.slice(0, 300)}` : ""}`);
  }
  return res.json();
}

export interface ChatOptions {
  tools?: ToolDef[];
  json?: boolean; // pedir JSON
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

/** Una llamada de chat (sin streaming) con el proveedor configurado. */
export async function chat(t: TutorSettings, messages: ChatTurn[], opts: ChatOptions = {}): Promise<ChatResult> {
  const { url, model, key, kind } = resolve(t);
  if (kind === "anthropic") return chatAnthropic(url, model, key, messages, opts);
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: opts.temperature ?? t.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 1200,
  };
  // Qwen 3/3.5 «piensan» por defecto: en Ollama gastan todos los tokens razonando y devuelven el contenido vacío
  // (y tardan ~90 s). Para un tutor conversacional se desactiva el razonamiento.
  if (t.provider === "ollama") body.reasoning_effort = "none";
  if (opts.json) body.response_format = { type: "json_object" };
  if (opts.tools?.length) body.tools = opts.tools.map((f) => ({ type: "function", function: { name: f.name, description: f.description, parameters: f.parameters } }));
  const data = (await post(`${url}/chat/completions`, body, key ? { authorization: `Bearer ${key}` } : {}, opts.signal)) as { choices?: { message?: { content?: string | null; tool_calls?: { id: string; function: { name: string; arguments: string } }[] } }[] };
  const m = data.choices?.[0]?.message;
  const toolCalls = (m?.tool_calls ?? []).map((c) => {
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(c.function.arguments || "{}");
    } catch {
      /* argumentos inválidos → vacío */
    }
    return { id: c.id, name: c.function.name, args };
  });
  return { text: stripThinking(m?.content ?? ""), toolCalls, raw: data };
}

async function chatAnthropic(url: string, model: string, key: string, messages: ChatTurn[], opts: ChatOptions): Promise<ChatResult> {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const body: Record<string, unknown> = {
    model,
    max_tokens: opts.maxTokens ?? 1200,
    temperature: opts.temperature ?? 0.4,
    system: system || undefined,
    messages: messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.content })),
  };
  if (opts.tools?.length) body.tools = opts.tools.map((f) => ({ name: f.name, description: f.description, input_schema: f.parameters }));
  const data = (await post(`${url}/v1/messages`, body, { "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, opts.signal)) as { content?: { type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }[] };
  const text = (data.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n");
  const toolCalls = (data.content ?? []).filter((c) => c.type === "tool_use").map((c) => ({ id: c.id ?? "", name: c.name ?? "", args: c.input ?? {} }));
  return { text, toolCalls, raw: data };
}

/** Qwen3 y otros devuelven <think>…</think>: se quita. */
export function stripThinking(s: string): string {
  return s.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

/** Extrae el primer objeto JSON de una respuesta (tolera ```json … ```). */
export function extractJson(s: string): unknown {
  const t = stripThinking(s);
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1] : t;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("La respuesta del modelo no contiene JSON");
  return JSON.parse(candidate.slice(start, end + 1));
}

/** Modelos instalados en Ollama (/api/tags) con recomendación. */
export async function listOllamaModels(baseUrl = "http://localhost:11434"): Promise<{ name: string; sizeGb: number; recommended: boolean }[]> {
  const root = baseUrl.replace(/\/v1\/?$/, "").replace(/\/+$/, "");
  const useProxy = await hasProxy();
  const res = useProxy ? await fetch(`${BASE_PATH}/api/tutor?tags=${encodeURIComponent(root)}`) : await fetch(`${root}/api/tags`);
  if (!res.ok) throw new Error(`Ollama no responde (${res.status})`);
  const data = (await res.json()) as { models?: { name: string; size: number }[] };
  return (data.models ?? []).map((m) => ({ name: m.name, sizeGb: Math.round((m.size / 1e9) * 10) / 10, recommended: /qwen/i.test(m.name) }));
}

/** Prueba de conexión: una pregunta mínima en chino. */
export async function testConnection(t: TutorSettings): Promise<{ ok: boolean; message: string; ms: number }> {
  const t0 = Date.now();
  try {
    const r = await chat(t, [{ role: "system", content: "Responde solo con la palabra 你好." }, { role: "user", content: "你好" }], { maxTokens: 20, temperature: 0 });
    return { ok: true, message: `Conectado (${resolve(t).model}): «${r.text.slice(0, 40)}»`, ms: Date.now() - t0 };
  } catch (e) {
    return { ok: false, message: (e as Error).message, ms: Date.now() - t0 };
  }
}
