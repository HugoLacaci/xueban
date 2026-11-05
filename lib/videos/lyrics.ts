"use client";
/**
 * Letras sincronizadas desde LRCLIB (https://lrclib.net, base de datos abierta y gratuita con CORS):
 * se piden en el navegador al abrir una canción; no se incluyen letras en la app.
 */
import { db, type Video } from "@/lib/db";
import { getActiveLang } from "@/lib/languages/registry";
import { parseLrc } from "./align";

interface LrcLibHit {
  id: number;
  trackName: string;
  artistName: string;
  duration: number;
  syncedLyrics: string | null;
}

let toSimp: ((s: string) => string) | null = null;
async function simp(s: string): Promise<string> {
  if (!toSimp) {
    const OpenCC = await import("opencc-js");
    toSimp = OpenCC.Converter({ from: "tw", to: "cn" });
  }
  return toSimp(s);
}

/** Busca la letra sincronizada; prefiere la de duración más cercana a `duration` (s) si se conoce. */
export async function fetchSyncedLyrics(track: string, artist: string, duration?: number): Promise<string | null> {
  const q = new URLSearchParams({ track_name: track, artist_name: artist });
  const res = await fetch(`https://lrclib.net/api/search?${q}`);
  if (!res.ok) throw new Error(`LRCLIB respondió ${res.status}`);
  const hits = ((await res.json()) as LrcLibHit[]).filter((h) => h.syncedLyrics && /[一-鿿]/.test(h.syncedLyrics));
  if (!hits.length) return null;
  const score = (h: LrcLibHit) => (duration && h.duration ? Math.abs(h.duration - duration) : 50) - (/[们这个为]/.test(h.syncedLyrics!) ? 1 : 0); // ligera preferencia por simplificado
  hits.sort((a, b) => score(a) - score(b));
  return hits[0].syncedLyrics;
}

/** Guarda la canción sin letra (el reproductor pedirá pegarla). */
export async function saveSongShell(song: { id: string; title: string; artist: string }): Promise<Video> {
  const video: Video = { id: song.id, lang: getActiveLang(), title: song.title, channel: song.artist, thumbnail: `https://i.ytimg.com/vi/${song.id}/hqdefault.jpg`, lines: [], source: "user", addedAt: Date.now(), watchedSeconds: 0 };
  await db.videos.put(video);
  return video;
}

/** Desplaza todos los tiempos de un vídeo guardado (letra adelantada o retrasada respecto al vídeo). */
export async function shiftVideoLines(id: string, delta: number): Promise<void> {
  const v = await db.videos.get(id);
  if (!v) return;
  await db.videos.update(id, { lines: v.lines.map((l) => ({ ...l, start: Math.max(0, l.start + delta), end: Math.max(0, l.end + delta) })) });
}

/** Crea (o actualiza) el vídeo de una canción con su letra sincronizada. `offset` (s) se suma a todos los tiempos. */
export async function saveSongWithLyrics(song: { id: string; title: string; artist: string; track: string; duration?: number }, offset = 0): Promise<Video> {
  const lrc = await fetchSyncedLyrics(song.track, song.artist, song.duration);
  const raw = lrc ? parseLrc(lrc) : [];
  const lines = await Promise.all(raw.map(async (l) => ({ start: Math.max(0, l.start + offset), end: Math.max(0, l.end + offset), zh: await simp(l.zh) })));
  const prev = await db.videos.get(song.id);
  const video: Video = {
    id: song.id,
    lang: getActiveLang(),
    title: song.title,
    channel: song.artist,
    thumbnail: `https://i.ytimg.com/vi/${song.id}/hqdefault.jpg`,
    lines,
    source: "user",
    addedAt: prev?.addedAt ?? Date.now(),
    watchedSeconds: prev?.watchedSeconds ?? 0,
  };
  await db.videos.put(video);
  return video;
}
