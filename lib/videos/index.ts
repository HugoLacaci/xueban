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
    super("Para sacar los subtítulos automáticamente, abre la app en este ordenador con «npm run dev» (la web publicada lo usará). Si no, sube el archivo de subtítulos.");
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
  const query = `/api/youtube/transcript?url=${encodeURIComponent(url)}&lang=${lang}`;
  type Payload = { error?: string; id: string; title: string; channel?: string; thumbnail?: string; lines: VideoLine[] };
  const tryFetch = async (u: string): Promise<{ ok: boolean; data: Payload } | null> => {
    try {
      const r = await fetch(u);
      if (!(r.headers.get("content-type") ?? "").includes("json")) return null;
      return { ok: r.ok, data: (await r.json()) as Payload };
    } catch {
      return null;
    }
  };
  // Ruta API de esta misma app (npm run dev: yt-dlp). En la web publicada (GitHub Pages) no existe:
  // se usa el servidor local del usuario si tiene la app abierta con npm run dev en ese ordenador.
  const isStatic = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";
  const sources = isStatic ? [`http://localhost:3000${query}`] : [withBase(query)];
  let firstError: string | null = null;
  let data: Payload | null = null;
  for (const u of sources) {
    if (!u) continue;
    const r = await tryFetch(u);
    if (!r) continue;
    if (r.ok && !r.data.error) {
      data = r.data;
      break;
    }
    firstError ??= r.data.error ?? "Error al obtener la transcripción";
  }
  if (!data) {
    if (firstError) throw new Error(firstError);
    throw new NoTranscriptServerError();
  }
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
