/**
 * Índice estático de contenido por idioma para generateStaticParams (servidor, tiempo de build).
 * Importa solo datos (JSON/TS sin React) de cada paquete: no arrastra la UI ni el diccionario.
 */
import type { Lang } from "./types";
import type { Unit, GrammarPoint } from "@/lib/course/types";
import type { GradedReading } from "@/lib/readings/types";
import type { Article } from "@/lib/study-hall/types";
import * as zh from "./zh/content";
import * as ja from "./ja/content";
import * as ko from "./ko/content";
import zhVideos from "@/public/videos/zh/index.json";
import jaVideos from "@/public/videos/ja/index.json";
import koVideos from "@/public/videos/ko/index.json";

export interface StaticContent {
  units: Unit[];
  grammar: GrammarPoint[];
  readings: GradedReading[];
  articles: Article[];
  seedIds: string[];
  videoIds: string[];
}

const CONTENT: Record<Lang, StaticContent> = {
  zh: { units: zh.UNITS, grammar: zh.GRAMMAR, readings: zh.READINGS, articles: zh.ARTICLES, seedIds: zh.SEED.words.map((w) => w.id), videoIds: (zhVideos as { id: string }[]).map((v) => v.id) },
  ja: { units: ja.UNITS, grammar: ja.GRAMMAR, readings: ja.READINGS, articles: ja.ARTICLES, seedIds: ja.SEED.words.map((w) => w.id), videoIds: (jaVideos as { id: string }[]).map((v) => v.id) },
  ko: { units: ko.UNITS, grammar: ko.GRAMMAR, readings: ko.READINGS, articles: ko.ARTICLES, seedIds: ko.SEED.words.map((w) => w.id), videoIds: (koVideos as { id: string }[]).map((v) => v.id) },
};

export function contentFor(lang: string): StaticContent {
  return CONTENT[lang as Lang] ?? CONTENT.zh;
}

export const LANG_PARAMS = [{ lang: "zh" }, { lang: "ja" }, { lang: "ko" }];

/** Páginas propias de cada idioma en «Aprender» (deben coincidir con pack.ui.extraPages). */
export const EXTRA_PAGES: Record<string, string[]> = { zh: ["contadores", "cortesia"], ja: ["conjugacion", "contadores", "cortesia"], ko: ["conjugacion", "contadores", "cortesia"] };
