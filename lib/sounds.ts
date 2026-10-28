"use client";
/**
 * Sonidos de interfaz sintetizados con Web Audio (sin archivos ni licencias):
 *  - acierto: pulsación de guqin/guzheng (cuerda pinzada con armónicos que decaen)
 *  - error: 木鱼 (bloque de madera) suave
 *  - logro: campanilla
 *  - tick: toque breve
 * Volumen bajo. Se silencian desde Ajustes («Sonidos»).
 */
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function pluck(c: AudioContext, t: number, freq: number, gain: number, decay: number) {
  // cuerda: fundamental + armónicos con decaimiento más rápido en los agudos (timbre guqin)
  const master = c.createGain();
  master.gain.setValueAtTime(gain, t);
  master.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  master.connect(c.destination);
  const partials = [
    [1, 1],
    [2, 0.45],
    [3, 0.22],
    [4.02, 0.1],
    [5.1, 0.05],
  ];
  for (const [mult, amp] of partials) {
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(freq * mult, t);
    o.frequency.exponentialRampToValueAtTime(freq * mult * 0.995, t + decay);
    const g = c.createGain();
    g.gain.setValueAtTime(amp, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay / (1 + mult * 0.35));
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + decay + 0.05);
  }
  // ataque: ruido muy breve (uña sobre la cuerda)
  const buf = c.createBuffer(1, c.sampleRate * 0.02, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const n = c.createBufferSource();
  n.buffer = buf;
  const ng = c.createGain();
  ng.gain.value = gain * 0.4;
  n.connect(ng).connect(c.destination);
  n.start(t);
}

function woodblock(c: AudioContext, t: number, gain: number) {
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(820, t);
  o.frequency.exponentialRampToValueAtTime(420, t + 0.06);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 700;
  f.Q.value = 4;
  o.connect(f).connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + 0.14);
}

function bell(c: AudioContext, t: number, gain: number) {
  for (const [mult, amp, dec] of [
    [1, 1, 1.6],
    [2.76, 0.5, 1.1],
    [5.4, 0.25, 0.7],
  ] as const) {
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = 1046.5 * mult;
    const g = c.createGain();
    g.gain.setValueAtTime(gain * amp, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dec + 0.05);
  }
}

export function playFeedback(kind: "ok" | "fail" | "tick" | "achievement" | "stamp", enabled = true) {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  switch (kind) {
    case "ok":
      // dos notas pentatónicas ascendentes (G4 → D5), timbre de guqin
      pluck(c, t, 392, 0.14, 0.9);
      pluck(c, t + 0.09, 587.3, 0.1, 1.1);
      break;
    case "fail":
      woodblock(c, t, 0.18);
      break;
    case "tick":
      pluck(c, t, 659.3, 0.06, 0.25);
      break;
    case "achievement":
      bell(c, t, 0.12);
      pluck(c, t + 0.25, 523.3, 0.08, 1.2);
      pluck(c, t + 0.4, 784, 0.08, 1.4);
      break;
    case "stamp":
      woodblock(c, t, 0.12);
      pluck(c, t + 0.05, 261.6, 0.08, 0.6);
      break;
  }
}
