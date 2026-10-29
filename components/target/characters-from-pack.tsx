"use client";
import { usePack } from "@/lib/languages/provider";

/** Sección «Caracteres»: cada idioma aporta su página (hanzi · kana y kanji · hangul y hanja). */
export function CharactersFromPack() {
  const Page = usePack().ui.CharactersPage;
  return <Page />;
}
