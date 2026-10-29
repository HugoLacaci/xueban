"use client";
/**
 * Texto a voz por idioma: audios pregenerados (public/audio/<hash>.mp3, vía msedge-tts) con
 * respaldo en Web Speech API (zh-CN / ja-JP / ko-KR). También expone grabación de micrófono y
 * reconocimiento de voz (Chrome/Edge).
 */
import { hashString } from "@/lib/utils";
import { withBase } from "@/lib/base-path";
import { getActivePackOrNull, getActiveLang, LANG_META } from "@/lib/languages/registry";
import { useSettings } from "@/lib/settings";
import type { Bcp47, Lang } from "@/lib/languages/types";

export interface SpeakOptions {
  rate?: number;
  voiceURI?: string;
  preferGenerated?: boolean;
  onEnd?: () => void;
  lang?: Lang;
}

let cachedVoices: SpeechSynthesisVoice[] = [];
let currentAudio: HTMLAudioElement | null = null;
const missingAudio = new Set<string>();

/** Ruta del audio pregenerado: el chino conserva el hash sin prefijo (compatibilidad con los MP3 existentes). */
export function audioFileFor(text: string, lang: Lang = getActiveLang()): string {
  const h = hashString(text.trim()).toString(16);
  return withBase(lang === "zh" ? `/audio/${h}.mp3` : `/audio/${lang}/${h}.mp3`);
}

const VOICE_PATTERNS: Record<Lang, { lang: RegExp; name: RegExp }> = {
  zh: { lang: /^zh([-_](CN|Hans|SG|TW|HK))?$/i, name: /chinese|中文|普通话|mandarin/i },
  ja: { lang: /^ja([-_]JP)?$/i, name: /japanese|日本語/i },
  ko: { lang: /^ko([-_]KR)?$/i, name: /korean|한국어/i },
};

export function listVoices(lang: Lang = getActiveLang()): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  const all = window.speechSynthesis.getVoices();
  if (all.length) cachedVoices = all;
  const p = VOICE_PATTERNS[lang];
  return cachedVoices.filter((v) => p.lang.test(v.lang) || p.name.test(v.name));
}

/** @deprecated usa listVoices(lang) */
export const listZhVoices = () => listVoices("zh");

/** Elige la mejor voz disponible para el idioma (prioriza voces naturales/online de Edge y las preferidas del paquete). */
export function bestVoice(lang: Lang = getActiveLang(), voiceURI?: string): SpeechSynthesisVoice | undefined {
  const voices = listVoices(lang);
  if (!voices.length) return undefined;
  if (voiceURI) {
    const v = voices.find((x) => x.voiceURI === voiceURI);
    if (v) return v;
  }
  const prefs = getActivePackOrNull()?.id === lang ? (getActivePackOrNull()?.tts.voicePrefs ?? []) : [];
  const score = (v: SpeechSynthesisVoice) => {
    let s = 0;
    if (new RegExp(`^${lang}[-_]`, "i").test(v.lang)) s += 10;
    if (/natural|online/i.test(v.name)) s += 8;
    prefs.forEach((re, i) => {
      if (re.test(v.name)) s += 6 - i;
    });
    if (/google/i.test(v.name)) s += 3;
    if (!v.localService) s += 1;
    return s;
  };
  return voices.slice().sort((a, b) => score(b) - score(a))[0];
}

export const bestZhVoice = (voiceURI?: string) => bestVoice("zh", voiceURI);

export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

function speakWeb(text: string, opts: SpeakOptions, lang: Lang): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LANG_META[lang].bcp47;
    u.rate = opts.rate ?? 0.9;
    // la voz elegida en Ajustes es por idioma; la global (heredada) solo vale para el chino
    const perLang = useSettings.getState().settings.langs?.[lang]?.voiceURI;
    const v = bestVoice(lang, perLang || (lang === "zh" ? opts.voiceURI : undefined));
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

/** Reproduce un texto en la lengua meta. Devuelve una promesa que se resuelve al terminar. */
export async function speak(text: string, opts: SpeakOptions = {}): Promise<void> {
  const clean = text.trim();
  if (!clean) return;
  const lang = opts.lang ?? getActiveLang();
  stopSpeaking();
  const prefer = opts.preferGenerated ?? true;
  const file = audioFileFor(clean, lang);
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
  await speakWeb(clean, opts, lang);
}

/** Pre-carga voces (Chrome las carga de forma asíncrona). */
export function warmVoices() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  listVoices();
  window.speechSynthesis.onvoiceschanged = () => listVoices();
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

/** Escucha una frase en la lengua meta y devuelve el texto reconocido (o lanza error). */
export function recognizeOnce(opts: { timeoutMs?: number; onInterim?: (t: string) => void; locale?: Bcp47 } = {}): Promise<{ text: string; confidence: number }> {
  return new Promise((resolve, reject) => {
    const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return reject(new Error("Reconocimiento de voz no disponible en este navegador (usa Chrome o Edge)."));
    const rec = new Ctor();
    rec.lang = opts.locale ?? getActivePackOrNull()?.asr.locale ?? LANG_META[getActiveLang()].bcp47;
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
