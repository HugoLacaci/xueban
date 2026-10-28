import articlesJson from "@/content/articles.json";
import resourcesJson from "@/content/resources.json";

export interface Article {
  id: string;
  title: string;
  zh: string;
  category: string;
  minutes: number;
  summary: string;
  markdown: string;
  sources?: { title: string; url: string }[];
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

export const ARTICLES: Article[] = articlesJson as Article[];
export const RESOURCES: Resource[] = (resourcesJson as Resource[]).filter((r) => r.verified);

export function articleById(id: string): Article | undefined {
  return ARTICLES.find((a) => a.id === id);
}

export const ARTICLE_CATEGORIES = Array.from(new Set(ARTICLES.map((a) => a.category)));
