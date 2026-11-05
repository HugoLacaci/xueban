"use client";
/**
 * Traduce al español las líneas de un vídeo que no tienen traducción, con el tutor configurado
 * (Ollama local, WebLLM en el navegador o API). Va por tandas y guarda tras cada una.
 */
import { db, type VideoLine } from "@/lib/db";
import { useSettings } from "@/lib/settings";
import { chat, extractJson, tutorConfigured } from "@/lib/tutor/providers";

const BATCH = 15;

export function canTranslateWithTutor(): boolean {
  return tutorConfigured(useSettings.getState().settings.tutor);
}

export async function translateMissingLines(videoId: string, lines: VideoLine[], onProgress?: (done: number, total: number) => void, signal?: AbortSignal): Promise<VideoLine[]> {
  const t = useSettings.getState().settings.tutor;
  const out = lines.map((l) => ({ ...l }));
  const todo = out.map((l, i) => (l.es ? -1 : i)).filter((i) => i >= 0);
  let done = 0;
  for (let k = 0; k < todo.length; k += BATCH) {
    if (signal?.aborted) break;
    const idx = todo.slice(k, k + BATCH);
    const payload = idx.map((i, n) => `${n + 1}. ${out[i].zh}`).join("\n");
    const res = await chat(
      t,
      [
        { role: "system", content: "Eres un traductor de chino a español de España. Traduce cada línea numerada de forma natural y fiel (son subtítulos o letras de canciones consecutivas; usa el contexto). Responde SOLO con JSON: {\"t\": [\"traducción 1\", \"traducción 2\", …]} con exactamente el mismo número de elementos." },
        { role: "user", content: payload },
      ],
      { json: true, temperature: 0.2, maxTokens: 2000, signal },
    );
    const parsed = extractJson(res.text) as { t?: unknown } | unknown[] | null;
    const arr = Array.isArray(parsed) ? parsed : Array.isArray((parsed as { t?: unknown })?.t) ? ((parsed as { t: unknown[] }).t as unknown[]) : [];
    idx.forEach((i, n) => {
      const v = arr[n];
      if (typeof v === "string" && v.trim()) out[i].es = v.trim();
    });
    done += idx.length;
    onProgress?.(done, todo.length);
    if (await db.videos.get(videoId)) await db.videos.update(videoId, { lines: out });
  }
  return out;
}
