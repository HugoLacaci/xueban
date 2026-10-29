export interface Article {
  id: string;
  title: string;
  zh: string; // título en la lengua meta
  category: string;
  minutes: number;
  summary: string;
  markdown: string;
  sources?: { title: string; url: string }[];
  reviewed?: boolean;
}

export interface Resource {
  title: string;
  url: string;
  kind: "youtube-channel" | "youtube-playlist" | "youtube-video" | "podcast" | "website" | "app";
  level: string;
  skills: string[];
  duration?: string;
  language: string;
  why: string;
  verified: boolean;
  verifiedTitle?: string;
  verifiedBy?: string;
}
