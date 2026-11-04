"use client";
/**
 * OCR de fotos del cuaderno con Tesseract.js (gratis, en el navegador). Modelos chi_sim + spa (ja: jpn; ko: kor).
 * Carga diferida: el paquete y los modelos (~15 MB la primera vez, luego en caché del navegador) solo se descargan al usarlo.
 */
import type { Lang } from "@/lib/languages/types";

const LANGS: Record<Lang, string> = { zh: "chi_sim+spa", ja: "jpn+spa", ko: "kor+spa" };

export interface OcrResult {
  text: string;
  confidence: number;
  lines: { text: string; confidence: number }[];
}

let workerPromise: Promise<import("tesseract.js").Worker> | undefined;
let workerLang = "";

async function getWorker(lang: Lang, onProgress?: (p: number) => void) {
  const langs = LANGS[lang];
  if (workerPromise && workerLang === langs) return workerPromise;
  const { createWorker } = await import("tesseract.js");
  workerLang = langs;
  workerPromise = createWorker(langs, 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") onProgress?.(m.progress);
    },
  });
  return workerPromise;
}

/** Reconoce el texto de una imagen. Devuelve líneas para poder corregirlas antes de guardar. */
export async function ocrImage(file: Blob, lang: Lang = "zh", onProgress?: (p: number) => void): Promise<OcrResult> {
  const worker = await getWorker(lang, onProgress);
  const { data } = await worker.recognize(file);
  const lines = (data.blocks ?? [])
    .flatMap((b) => b.paragraphs.flatMap((p) => p.lines))
    .map((l) => ({ text: cleanLine(l.text, lang), confidence: l.confidence }))
    .filter((l) => l.text);
  const text = lines.length ? lines.map((l) => l.text).join("\n") : cleanLine(data.text, lang);
  return { text, confidence: data.confidence, lines };
}

/** Tesseract separa los hanzi con espacios: se quitan los espacios entre caracteres CJK. */
export function cleanLine(s: string, lang: Lang = "zh"): string {
  let t = s.replace(/\s+/g, " ").trim();
  if (lang !== "ko") t = t.replace(/(?<=[　-鿿＀-￯])\s+(?=[　-鿿＀-￯])/g, "");
  return t;
}

export async function terminateOcr() {
  if (workerPromise) {
    const w = await workerPromise;
    await w.terminate();
    workerPromise = undefined;
  }
}
