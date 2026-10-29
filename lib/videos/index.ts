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

/** Añade un vídeo por URL usando la ruta API local (yt-dlp / youtubei). */
export async function addVideoByUrl(url: string): Promise<Video> {
  const lang = getActiveLang();
  const res = await fetch(withBase(`/api/youtube/transcript?url=${encodeURIComponent(url)}&lang=${lang}`));
  const data = (await res.json()) as { error?: string; id: string; title: string; channel?: string; thumbnail?: string; lines: VideoLine[] };
  if (!res.ok || data.error) throw new Error(data.error ?? "Error al obtener la transcripción");
  const video: Video = { id: data.id, lang, title: data.title, channel: data.channel, thumbnail: data.thumbnail, lines: data.lines, source: "user", addedAt: Date.now(), watchedSeconds: 0 };
  await db.videos.put(video);
  return video;
}

export function formatDuration(s?: number): string {
  if (!s) return "";
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}
