"use client";
/**
 * Configuración automática del tutor: si el alumno no ha elegido proveedor y hay un Ollama en este PC
 * (http://localhost:11434), se activa solo con el mejor modelo instalado. Se intenta una vez por navegador
 * y no se repite si el alumno cambia o apaga el tutor (clave «tutor:auto» en db.settings).
 */
import { db } from "@/lib/db";
import { useSettings } from "@/lib/settings";
import { listOllamaModels } from "./providers";

const KEY = "tutor:auto";
/** Orden de preferencia para chino (los Qwen son los que mejor lo hablan). */
const PREFERENCE = [/^qwen3\.5:9b/, /^qwen3:8b/, /^qwen3\.5/, /^qwen3/, /^qwen2\.5:7b/, /^qwen/];

export function pickModel(names: string[]): string | null {
  const chat = names.filter((n) => !/embed|whisper|vision-only/i.test(n));
  for (const re of PREFERENCE) {
    const hit = chat.find((n) => re.test(n));
    if (hit) return hit;
  }
  return chat[0] ?? null;
}

export async function autoConfigureTutor(): Promise<{ model: string } | null> {
  const s = useSettings.getState();
  if (!s.loaded) await s.load();
  const t = useSettings.getState().settings.tutor;
  if (t.provider !== "none") return null;
  const done = await db.settings.get(KEY).catch(() => undefined);
  if (done) return null;
  let names: string[] = [];
  try {
    names = (await Promise.race([listOllamaModels(), new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 2500))])).map((m) => m.name);
  } catch {
    return null; // no hay Ollama (o el navegador no deja llamar a localhost): se reintentará en la próxima visita
  }
  const model = pickModel(names);
  if (!model) return null;
  await useSettings.getState().update({ tutor: { ...t, provider: "ollama", baseUrl: "", model } });
  await db.settings.put({ key: KEY, value: { at: Date.now(), model }, updatedAt: Date.now() });
  return { model };
}

/** Si el alumno cambia de proveedor a mano, no volver a configurar solo. */
export async function markTutorChosen(): Promise<void> {
  await db.settings.put({ key: KEY, value: { at: Date.now(), manual: true }, updatedAt: Date.now() }).catch(() => undefined);
}
