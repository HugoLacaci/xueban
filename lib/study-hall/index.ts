/** Fachada del Study Hall del idioma activo (artículos y recursos viven en cada paquete). */
import type { Article, Resource } from "./types";
import { getActivePack } from "@/lib/languages/registry";

export type { Article, Resource };

export function getArticles(): Article[] {
  return getActivePack().articles;
}

export function getResources(): Resource[] {
  return getActivePack().resources.filter((r) => r.verified);
}

export function articleById(id: string): Article | undefined {
  return getActivePack().articles.find((a) => a.id === id);
}

export function articleCategories(): string[] {
  return Array.from(new Set(getActivePack().articles.map((a) => a.category)));
}
