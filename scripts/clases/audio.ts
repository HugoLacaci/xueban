/** ffmpeg: audio de una clase (desde URL o archivo) y recortes cortos del profesor. */
import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, renameSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { ffmpegPaths } from "./config";

/** Bitrate del audio completo para transcribir (opus 16 kHz mono: ~14 MB por hora). */
export const AUDIO_KBPS = 32;
/** Bitrate de los recortes del profesor. */
export const CLIP_KBPS = 24;
export const CLIP_MIN = 3;
export const CLIP_MAX = 15;

function run(args: string[], onProgress?: (sec: number) => void): Promise<void> {
  const { ffmpeg } = ffmpegPaths();
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpeg, args, { stdio: ["ignore", "ignore", "pipe"], windowsHide: true });
    let err = "";
    p.stderr.on("data", (d: Buffer) => {
      const s = d.toString();
      err = (err + s).slice(-4000);
      const m = s.match(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/);
      if (m && onProgress) onProgress(+m[1] * 3600 + +m[2] * 60 + +m[3]);
    });
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg terminó con código ${code}: ${err.trim().split("\n").slice(-3).join(" | ")}`))));
  });
}

/**
 * Extrae SOLO el audio (mono, 16 kHz, opus) de un archivo local o de una URL HTTP(S).
 * Con una URL, ffmpeg lee el vídeo por la red y nunca lo guarda en disco.
 * Escribe en un .part y renombra al final, así un corte no deja un audio a medias.
 */
export async function extraerAudio(input: string, out: string, onProgress?: (sec: number) => void): Promise<void> {
  mkdirSync(path.dirname(out), { recursive: true });
  const part = `${out}.part.opus`;
  const isUrl = /^https?:\/\//i.test(input);
  const args = [
    "-nostdin",
    "-hide_banner",
    "-y",
    ...(isUrl ? ["-reconnect", "1", "-reconnect_streamed", "1", "-reconnect_on_network_error", "1", "-reconnect_delay_max", "30", "-rw_timeout", "60000000"] : []),
    "-i",
    input,
    "-vn",
    "-sn",
    "-dn",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-c:a",
    "libopus",
    "-b:a",
    `${AUDIO_KBPS}k`,
    "-application",
    "voip",
    part,
  ];
  try {
    await run(args, onProgress);
    renameSync(part, out);
  } catch (e) {
    if (existsSync(part)) rmSync(part);
    throw e;
  }
}

export function duracion(file: string): number {
  const { ffprobe } = ffmpegPaths();
  const out = execFileSync(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file], { encoding: "utf8" });
  return Number(out.trim()) || 0;
}

/** Ajusta un intervalo a 3–15 s (centrado) sin salirse del audio. */
export function ajustarIntervalo(start: number, end: number, total = Infinity): { start: number; end: number } {
  let s = Math.max(0, start);
  let e = Math.min(total, Math.max(end, s));
  if (e - s > CLIP_MAX) e = s + CLIP_MAX;
  if (e - s < CLIP_MIN) {
    const falta = CLIP_MIN - (e - s);
    s = Math.max(0, s - falta / 2);
    e = Math.min(total, s + CLIP_MIN);
  }
  return { start: Math.round(s * 100) / 100, end: Math.round(e * 100) / 100 };
}

/** Recorte corto (opus 24 kbps) del audio completo. */
export async function recortar(audio: string, start: number, end: number, out: string): Promise<number> {
  mkdirSync(path.dirname(out), { recursive: true });
  await run(["-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-ss", String(start), "-t", String(end - start), "-i", audio, "-ac", "1", "-c:a", "libopus", "-b:a", `${CLIP_KBPS}k`, "-application", "voip", out]);
  return statSync(out).size;
}

export function sha256File(file: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const h = createHash("sha256");
    createReadStream(file)
      .on("data", (d) => h.update(d))
      .on("end", () => resolve(h.digest("hex")))
      .on("error", reject);
  });
}
