"use client";
/**
 * Texto a voz: audios pregenerados (public/audio/<hash>.mp3, vía msedge-tts) con
 * respaldo en Web Speech API (zh-CN). También expone grabación de micrófono y
 * reconocimiento de voz (Chrome/Edge).
 */
import { hashString } from "@/lib/utils";

export interface SpeakOptions {
  rate?: number;
  voiceURI?: string;
  preferGenerated?: boolean;
  onEnd?: () => void;
}

let cachedVoices: SpeechSynthesisVoice[] = [];
let currentAudio: HTMLAudioElement | null = null;
const missingAudio = new Set<string>();

export function audioFileFor(text: string): string {
  return `/audio/${hashString(text.trim()).toString(16)}.mp3`;
}

export function listZhVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  const all = window.speechSynthesis.getVoices();
  if (all.length) cachedVoices = all;
  return cachedVoices.filter((v) => /^zh([-_](CN|Hans|SG|TW|HK))?$/i.test(v.lang) || /chinese|中文|普通话|mandarin/i.test(v.name));
}

/** Elige la mejor voz zh-CN disponible (prioriza voces naturales/online de Edge, luego Xiaoxiao/Huihui/Yunxi). */
export function bestZhVoice(voiceURI?: string): SpeechSynthesisVoice | undefined {
  const voices = listZhVoices();
  if (!voices.length) return undefined;
  if (voiceURI) {
    const v = voices.find((x) => x.voiceURI === voiceURI);
    if (v) return v;
  }
  const score = (v: SpeechSynthesisVoice) => {
    let s = 0;
    if (/zh[-_]CN/i.test(v.lang)) s += 10;
    if (/natural|online/i.test(v.name)) s += 8;
    if (/xiaoxiao|yunxi|yunyang|xiaoyi/i.test(v.name)) s += 6;
    if (/huihui|kangkang|yaoyao/i.test(v.name)) s += 4;
    if (/google/i.test(v.name)) s += 3;
    if (!v.localService) s += 1;
    return s;
  };
  return voices.slice().sort((a, b) => score(b) - score(a))[0];
}

export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

function speakWeb(text: string, opts: SpeakOptions): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-CN";
    u.rate = opts.rate ?? 0.9;
    const v = bestZhVoice(opts.voiceURI);
    if (v) u.voice = v;
    u.onend = () => {
      opts.onEnd?.();
      resolve();
    };
    u.onerror = () => resolve();
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  });
}

/** Reproduce un texto chino. Devuelve una promesa que se resuelve al terminar. */
export async function speak(text: string, opts: SpeakOptions = {}): Promise<void> {
  const clean = text.trim();
  if (!clean) return;
  stopSpeaking();
  const prefer = opts.preferGenerated ?? true;
  const file = audioFileFor(clean);
  if (prefer && !missingAudio.has(file)) {
    const ok = await new Promise<boolean>((resolve) => {
      const a = new Audio(file);
      a.playbackRate = Math.min(2, Math.max(0.5, (opts.rate ?? 0.9) / 0.9));
      a.onended = () => {
        opts.onEnd?.();
        resolve(true);
      };
      a.onerror = () => resolve(false);
      currentAudio = a;
      a.play().catch(() => resolve(false));
    });
    if (ok) return;
    missingAudio.add(file);
  }
  await speakWeb(clean, opts);
}

/** Pre-carga voces (Chrome las carga de forma asíncrona). */
export function warmVoices() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  listZhVoices();
  window.speechSynthesis.onvoiceschanged = () => listZhVoices();
}

/* -------------------- Reconocimiento de voz -------------------- */

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export function speechRecognitionAvailable(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

/** Escucha una frase en chino y devuelve el texto reconocido (o lanza error). */
export function recognizeOnce(opts: { timeoutMs?: number; onInterim?: (t: string) => void } = {}): Promise<{ text: string; confidence: number }> {
  return new Promise((resolve, reject) => {
    const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return reject(new Error("Reconocimiento de voz no disponible en este navegador (usa Chrome o Edge)."));
    const rec = new Ctor();
    rec.lang = "zh-CN";
    rec.interimResults = Boolean(opts.onInterim);
    rec.maxAlternatives = 3;
    rec.continuous = false;
    let done = false;
    let best = { text: "", confidence: 0 };
    const timer = setTimeout(() => {
      if (!done) rec.stop();
    }, opts.timeoutMs ?? 8000);
    rec.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      const alt = last[0];
      best = { text: alt.transcript, confidence: alt.confidence };
      opts.onInterim?.(alt.transcript);
    };
    rec.onerror = (e) => {
      done = true;
      clearTimeout(timer);
      reject(new Error(e.error === "not-allowed" ? "Permiso de micrófono denegado." : `Error de reconocimiento: ${e.error}`));
    };
    rec.onend = () => {
      clearTimeout(timer);
      if (done) return;
      done = true;
      resolve(best);
    };
    rec.start();
  });
}
