"use client";
/**
 * Reconocimiento de voz local opcional con Whisper (transformers.js, modelo pequeño) sin enviar audio a la nube.
 * Desactivable en Ajustes (descarga ~40–80 MB la primera vez; luego queda en la caché del navegador).
 */
import { useSettings } from "@/lib/settings";

type Pipeline = (audio: Float32Array, opts: Record<string, unknown>) => Promise<{ text: string }>;
let pipe: Promise<Pipeline> | undefined;
let loadedModel = "";

export function whisperEnabled(): boolean {
  const w = useSettings.getState().settings.whisper;
  return Boolean(w?.enabled);
}

export async function loadWhisper(onProgress?: (p: number) => void): Promise<Pipeline> {
  const model = useSettings.getState().settings.whisper?.model || "Xenova/whisper-tiny";
  if (pipe && loadedModel === model) return pipe;
  loadedModel = model;
  pipe = import("@huggingface/transformers").then(async (m) => {
    const p = await m.pipeline("automatic-speech-recognition", model, {
      progress_callback: (x: { progress?: number }) => {
        if (typeof x.progress === "number") onProgress?.(x.progress / 100);
      },
    } as never);
    return p as unknown as Pipeline;
  });
  return pipe;
}

/** Decodifica un Blob de audio a 16 kHz mono (lo que espera Whisper). */
async function toPcm16k(blob: Blob): Promise<Float32Array> {
  const ctx = new AudioContext({ sampleRate: 16000 });
  const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
  const data = buf.getChannelData(0);
  await ctx.close();
  return data;
}

/** Transcribe una grabación en chino con Whisper local. */
export async function transcribeLocal(blob: Blob, onProgress?: (p: number) => void): Promise<string> {
  const p = await loadWhisper(onProgress);
  const audio = await toPcm16k(blob);
  const r = await p(audio, { language: "chinese", task: "transcribe", chunk_length_s: 15 });
  return (r.text ?? "").trim();
}
