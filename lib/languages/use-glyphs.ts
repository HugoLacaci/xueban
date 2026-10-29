"use client";
import { usePack } from "./provider";
import { PAGE_NATIVE, UI_GLYPHS } from "./glyphs";
import { CULTURE } from "./culture";

/** Glifos, títulos nativos y detalles culturales del idioma activo. */
export function useGlyphs() {
  const pack = usePack();
  return { g: UI_GLYPHS[pack.id], page: PAGE_NATIVE[pack.id], culture: CULTURE[pack.id], lang: pack.id, bcp47: pack.bcp47 };
}
