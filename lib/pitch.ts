"use client";
/**
 * Análisis de tono (F0) con pitchy + Web Audio: graba el micrófono y devuelve la curva de tono
 * normalizada; también estima la curva del modelo a partir de un MP3 (si existe) o de los tonos.
 */
import type { Tone } from "@/lib/exercises/types";

export interface PitchPoint {
  t: number; // segundos
  hz: number; // 0 = silencio
}

export async function recordAndAnalyze(opts: { maxSeconds?: number; onLevel?: (v: number) => void; stop: Promise<void> }): Promise<{ contour: PitchPoint[]; blob: Blob }> {
  const { PitchDetector } = await import("pitchy");
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const ctx = new AudioContext();
  const src = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  src.connect(analyser);
  const detector = PitchDetector.forFloat32Array(analyser.fftSize);
  const buf = new Float32Array(analyser.fftSize);
  const contour: PitchPoint[] = [];
  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.start();
  const start = ctx.currentTime;
  let running = true;
  const tick = () => {
    if (!running) return;
    analyser.getFloatTimeDomainData(buf);
    const [hz, clarity] = detector.findPitch(buf, ctx.sampleRate);
    let rms = 0;
    for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / buf.length);
    opts.onLevel?.(rms);
    contour.push({ t: ctx.currentTime - start, hz: clarity > 0.9 && hz > 60 && hz < 600 && rms > 0.01 ? hz : 0 });
    if (ctx.currentTime - start < (opts.maxSeconds ?? 6)) requestAnimationFrame(tick);
    else running = false;
  };
  tick();
  await Promise.race([opts.stop, new Promise((r) => setTimeout(r, (opts.maxSeconds ?? 6) * 1000))]);
  running = false;
  const blob = await new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType }));
    recorder.stop();
  });
  stream.getTracks().forEach((t) => t.stop());
  await ctx.close();
  return { contour, blob };
}

/** Curva del modelo a partir de un archivo de audio (p. ej. MP3 pregenerado). */
export async function analyzeAudioUrl(url: string): Promise<PitchPoint[] | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const { PitchDetector } = await import("pitchy");
    const ctx = new OfflineAudioContext(1, 44100 * 10, 44100);
    const audio = await ctx.decodeAudioData(await res.arrayBuffer());
    const data = audio.getChannelData(0);
    const size = 2048;
    const hop = 512;
    const detector = PitchDetector.forFloat32Array(size);
    const out: PitchPoint[] = [];
    for (let i = 0; i + size <= data.length; i += hop) {
      const frame = data.subarray(i, i + size);
      const [hz, clarity] = detector.findPitch(frame, audio.sampleRate);
      let rms = 0;
      for (let k = 0; k < frame.length; k++) rms += frame[k] * frame[k];
      rms = Math.sqrt(rms / frame.length);
      out.push({ t: i / audio.sampleRate, hz: clarity > 0.9 && hz > 60 && hz < 600 && rms > 0.01 ? hz : 0 });
    }
    return out;
  } catch {
    return null;
  }
}

/** Curva ideal sintética a partir de los tonos (contornos 55 / 35 / 214 / 51 / neutro). */
export function idealContour(tones: Tone[], secondsPerSyllable = 0.35): PitchPoint[] {
  const out: PitchPoint[] = [];
  const shapes: Record<Tone, number[]> = { 1: [5, 5, 5, 5, 5], 2: [3, 3.3, 3.8, 4.4, 5], 3: [2, 1.4, 1, 1.6, 3], 4: [5, 4.2, 3, 2, 1], 5: [3, 2.8, 2.6, 2.4, 2.2] };
  tones.forEach((t, si) => {
    const sh = shapes[t] ?? shapes[5];
    const n = 12;
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * (sh.length - 1);
      const lo = Math.floor(x);
      const hi = Math.min(sh.length - 1, lo + 1);
      const v = sh[lo] + (sh[hi] - sh[lo]) * (x - lo);
      out.push({ t: si * secondsPerSyllable + (i / n) * secondsPerSyllable * 0.85, hz: 120 * Math.pow(2, (v - 1) / 6) });
    }
    out.push({ t: si * secondsPerSyllable + secondsPerSyllable * 0.9, hz: 0 });
  });
  return out;
}

/** Normaliza una curva a semitonos relativos a su mediana y la remuestrea en 0–1 del tiempo con voz. */
export function normalizeContour(c: PitchPoint[], points = 60): number[] {
  const voiced = c.filter((p) => p.hz > 0);
  if (voiced.length < 5) return [];
  const t0 = voiced[0].t;
  const t1 = voiced[voiced.length - 1].t;
  const semis = voiced.map((p) => ({ t: (p.t - t0) / Math.max(0.001, t1 - t0), s: 12 * Math.log2(p.hz) }));
  const sorted = semis.map((x) => x.s).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const out: number[] = [];
  for (let i = 0; i < points; i++) {
    const x = i / (points - 1);
    const near = semis.reduce((best, p) => (Math.abs(p.t - x) < Math.abs(best.t - x) ? p : best), semis[0]);
    out.push(near.s - median);
  }
  return out;
}
