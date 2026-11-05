"use client";
import { db, type Video, type VideoLine } from "@/lib/db";
import { withBase } from "@/lib/base-path";
import { getActiveLang } from "@/lib/languages/registry";
import type { Lang } from "@/lib/languages/types";

export type { CuratedVideoMeta, VideoDoc } from "./types";
import type { CuratedVideoMeta, VideoDoc } from "./types";

const indexCache = new Map<string, CuratedVideoMeta[]>();
export async function loadCuratedIndex(lang: Lang = getActiveLang()): Promise<CuratedVideoMeta[]> {
  const cached = indexCache.get(lang);
  if (cached) return cached;
  let list: CuratedVideoMeta[] = [];
  try {
    const res = await fetch(withBase(`/videos/${lang}/index.json`));
    list = res.ok ? ((await res.json()) as CuratedVideoMeta[]) : [];
  } catch {
    list = [];
  }
  indexCache.set(lang, list);
  return list;
}

export async function loadCuratedVideo(id: string): Promise<VideoDoc | null> {
  try {
    const res = await fetch(withBase(`/videos/${getActiveLang()}/${id}.json`));
    if (!res.ok) return null;
    return (await res.json()) as VideoDoc;
  } catch {
    return null;
  }
}

/** Vídeo (curado o del usuario) como documento unificado. */
export async function loadVideo(id: string): Promise<VideoDoc | null> {
  const user = await db.videos.get(id);
  if (user) return { id: user.id, title: user.title, channel: user.channel, thumbnail: user.thumbnail, level: user.level, lines: user.lines };
  return loadCuratedVideo(id);
}

/** Error de «no hay servidor de transcripciones» (p. ej. la versión estática de GitHub Pages). */
export class NoTranscriptServerError extends Error {
  constructor() {
    super("Esta versión de la app no tiene servidor de transcripciones (GitHub Pages). Ábrela en local con «npm run dev» o sube el archivo de subtítulos (.srt / .vtt).");
    this.name = "NoTranscriptServerError";
  }
}

/** Añade un vídeo por URL usando la ruta API local (yt-dlp / youtubei). Si ya está guardado, lo devuelve sin descargar. */
export async function addVideoByUrl(url: string, opts: { reuse?: boolean } = {}): Promise<Video> {
  const lang = getActiveLang();
  const known = parseYouTubeIdClient(url);
  if (opts.reuse && known) {
    const prev = await db.videos.get(known);
    if (prev?.lines.length) return prev;
  }
  let res: Response;
  try {
    res = await fetch(withBase(`/api/youtube/transcript?url=${encodeURIComponent(url)}&lang=${lang}`));
  } catch {
    throw new NoTranscriptServerError();
  }
  const isJson = (res.headers.get("content-type") ?? "").includes("json");
  if (!isJson) throw new NoTranscriptServerError();
  const data = (await res.json()) as { error?: string; id: string; title: string; channel?: string; thumbnail?: string; lines: VideoLine[] };
  if (!res.ok || data.error) throw new Error(data.error ?? "Error al obtener la transcripción");
  const video: Video = { id: data.id, lang, title: data.title, channel: data.channel, thumbnail: data.thumbnail, lines: data.lines, source: "user", addedAt: Date.now(), watchedSeconds: 0 };
  await db.videos.put(video);
  return video;
}

/** Igual que parseYouTubeId del servidor, sin dependencias de Node. */
export function parseYouTubeIdClient(input: string): string | null {
  const s = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("/")[0] || null;
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const m = u.pathname.match(/\/(shorts|embed|live)\/([A-Za-z0-9_-]{11})/);
    if (m) return m[2];
  } catch {
    /* no es URL */
  }
  return null;
}

/**
 * Alternativa sin servidor: el usuario pega la URL y sube los subtítulos (.srt / .vtt) en la lengua meta
 * y, opcionalmente, en español. Funciona también en la versión estática.
 */
export async function addVideoFromSubtitles(url: string, target: string, translation?: string, title?: string): Promise<Video> {
  const { parseSubtitles, alignTranslation } = await import("./align");
  const id = parseYouTubeIdClient(url);
  if (!id) throw new Error("URL o id de YouTube inválido");
  const lang = getActiveLang();
  let lines = parseSubtitles(target);
  if (!lines.length) throw new Error("El archivo de subtítulos no tiene líneas legibles (.srt o .vtt).");
  if (lang === "zh") {
    const OpenCC = await import("opencc-js");
    const toSimp = OpenCC.Converter({ from: "tw", to: "cn" });
    lines = lines.map((l) => ({ ...l, zh: toSimp(l.zh) }));
  }
  const aligned = translation ? alignTranslation(lines, parseSubtitles(translation)) : lines;
  let meta: { title?: string; author_name?: string } = {};
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`);
    if (r.ok) meta = (await r.json()) as typeof meta;
  } catch {
    /* sin metadatos */
  }
  const video: Video = { id, lang, title: title || meta.title || `Vídeo ${id}`, channel: meta.author_name, thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, lines: aligned, source: "user", addedAt: Date.now(), watchedSeconds: 0 };
  await db.videos.put(video);
  return video;
}

export function formatDuration(s?: number): string {
  if (!s) return "";
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}
