"use client";
import { db, type Video, type VideoLine } from "@/lib/db";
import { withBase } from "@/lib/base-path";

export interface CuratedVideoMeta {
  id: string;
  title: string;
  channel?: string;
  thumbnail?: string;
  durationSeconds?: number;
  level: number;
  lines: number;
  description?: string;
  tags: string[];
}

export interface VideoDoc {
  id: string;
  title: string;
  channel?: string;
  thumbnail?: string;
  durationSeconds?: number;
  level?: number;
  description?: string;
  tags?: string[];
  lines: VideoLine[];
  reviewed?: boolean;
  auto?: boolean;
}

let indexCache: CuratedVideoMeta[] | null = null;
export async function loadCuratedIndex(): Promise<CuratedVideoMeta[]> {
  if (indexCache) return indexCache;
  try {
    const res = await fetch(withBase("/videos/index.json"));
    indexCache = res.ok ? ((await res.json()) as CuratedVideoMeta[]) : [];
  } catch {
    indexCache = [];
  }
  return indexCache;
}

export async function loadCuratedVideo(id: string): Promise<VideoDoc | null> {
  try {
    const res = await fetch(withBase(`/videos/${id}.json`));
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
  const res = await fetch(withBase(`/api/youtube/transcript?url=${encodeURIComponent(url)}`));
  const data = (await res.json()) as { error?: string; id: string; title: string; channel?: string; thumbnail?: string; lines: VideoLine[] };
  if (!res.ok || data.error) throw new Error(data.error ?? "Error al obtener la transcripción");
  const video: Video = { id: data.id, title: data.title, channel: data.channel, thumbnail: data.thumbnail, lines: data.lines, source: "user", addedAt: Date.now(), watchedSeconds: 0 };
  await db.videos.put(video);
  return video;
}

export function formatDuration(s?: number): string {
  if (!s) return "";
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}
