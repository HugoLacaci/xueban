import type { VideoLine } from "@/lib/db/schema";

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
  language?: string;
}
