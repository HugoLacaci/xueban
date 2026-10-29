"use client";
/**
 * Contexto del idioma activo. Carga el paquete de forma diferida, lo marca como activo en el
 * registro (para el código no React) y fija data-lang en <html> para el tema visual.
 */
import { createContext, useContext, useEffect, useState } from "react";
import { getPack, loadPack, setActiveLang, usePackStore, LANG_META } from "./registry";
import type { Lang, LanguagePack } from "./types";
import { useSettings } from "@/lib/settings";
import { ensureSeeded } from "@/lib/db/repo";
import { computeKnowledge } from "@/lib/knowledge";
import { useDictionary } from "@/lib/dictionary/service";

interface LangContextValue {
  lang: Lang;
  pack: LanguagePack;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LanguageProvider({ lang, children, fallback }: { lang: Lang; children: React.ReactNode; fallback?: React.ReactNode }) {
  // paquete ya cargado (síncrono) o el que termine de cargar el efecto
  const [loadedPack, setLoadedPack] = useState<LanguagePack | undefined>(undefined);
  const cached = getPack(lang);
  const pack = cached ?? (loadedPack?.id === lang ? loadedPack : undefined);
  const update = useSettings((s) => s.update);
  const loaded = useSettings((s) => s.loaded);
  const lastLang = useSettings((s) => s.settings.lastLang);

  useEffect(() => {
    let cancelled = false;
    const existing = getPack(lang);
    if (existing) {
      setActiveLang(lang);
      void ensureSeeded(lang).then(() => computeKnowledge());
    } else {
      void loadPack(lang).then(async (p) => {
        if (cancelled) return;
        setActiveLang(lang);
        await ensureSeeded(lang);
        void computeKnowledge();
        if (!cancelled) setLoadedPack(p);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [lang]);

  // fuentes del idioma (variables CSS de next/font) en <html>
  useEffect(() => {
    const vars = pack?.theme.fontVars?.split(" ").filter(Boolean) ?? [];
    document.documentElement.classList.add(...vars);
  }, [pack]);

  // data-lang en <html> (tema) — la interfaz sigue en español (lang="es")
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.getAttribute("data-lang");
    root.setAttribute("data-lang", lang);
    if (prev && prev !== lang) {
      root.classList.add("lang-switch");
      const t = setTimeout(() => root.classList.remove("lang-switch"), 700);
      return () => clearTimeout(t);
    }
  }, [lang]);

  // diccionario del idioma en segundo plano: tras la primera interacción (o a los 15 s)
  useEffect(() => {
    if (!pack || pack.id !== lang) return;
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
      const idle = (cb: () => void) => ("requestIdleCallback" in window ? (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(cb) : setTimeout(cb, 500));
      idle(() => void useDictionary.getState().load());
    };
    window.addEventListener("pointerdown", start, { passive: true });
    window.addEventListener("keydown", start, { passive: true });
    const t = setTimeout(start, 15000);
    return () => {
      clearTimeout(t);
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
  }, [pack, lang]);

  // recuerda el último idioma usado
  useEffect(() => {
    if (loaded && lastLang !== lang) void update({ lastLang: lang });
  }, [loaded, lastLang, lang, update]);

  // el paquete cargado debe ser el del idioma pedido (al cambiar de idioma se espera al nuevo)
  if (!pack || pack.id !== lang) {
    return (
      fallback ?? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted">
          <span className="seal size-12 text-2xl" lang={LANG_META[lang].bcp47}>
            {LANG_META[lang].emblem}
          </span>
          <p className="text-sm">Cargando {LANG_META[lang].names.es.toLowerCase()}…</p>
        </div>
      )
    );
  }
  // código no React (getActivePack) debe ver ya el idioma de este árbol
  if (usePackStore.getState().active !== lang) setActiveLang(lang);
  return (
    <LangContext.Provider key={lang} value={{ lang, pack }}>
      {children}
    </LangContext.Provider>
  );
}

/** Idioma activo. Fuera de /{lang} devuelve el último usado (ajustes). */
export function useLang(): Lang {
  const ctx = useContext(LangContext);
  const last = useSettings((s) => s.settings.lastLang);
  return ctx?.lang ?? last ?? "zh";
}

/** Paquete activo. Debe usarse dentro de <LanguageProvider>. */
export function usePack(): LanguagePack {
  const ctx = useContext(LangContext);
  // fuera del provider (p. ej. /me): el paquete del idioma activo si ya está cargado
  const pack = usePackStore((s) => s.packs[s.active]);
  if (ctx) return ctx.pack;
  if (!pack) throw new Error("usePack() fuera de <LanguageProvider> y sin paquete cargado");
  return pack;
}

export function usePackOptional(): LanguagePack | undefined {
  const ctx = useContext(LangContext);
  const pack = usePackStore((s) => s.packs[s.active]);
  return ctx?.pack ?? pack;
}

export function useLangMeta() {
  return LANG_META[useLang()];
}
