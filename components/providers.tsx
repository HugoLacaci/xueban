"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSettings } from "@/lib/settings";
import { ensureSeeded } from "@/lib/db";
import { subscribeKnowledge } from "@/lib/knowledge";
import { warmVoices } from "@/lib/tts";
import { useDictionary } from "@/lib/dictionary/service";
import { TooltipProvider, Spinner } from "@/components/ui/primitives";
import dynamic from "next/dynamic";
import { Toaster } from "@/components/ui/toast";

// Popup de palabra y paleta de búsqueda: solo se usan tras interactuar → fuera del bundle inicial.
const WordPopupHost = dynamic(() => import("@/components/zh/word-popup").then((m) => m.WordPopupHost), { ssr: false });
const CommandPalette = dynamic(() => import("@/components/layout/command-palette").then((m) => m.CommandPalette), { ssr: false });

function hexToRgbTriplet(hex: string): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const { settings, loaded, load, cyclePinyin, update } = useSettings();
  const [seeded, setSeeded] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Carga inicial: ajustes + semilla + conocimiento
  useEffect(() => {
    void (async () => {
      await load();
      await ensureSeeded();
      subscribeKnowledge();
      warmVoices();
      setSeeded(true);
      // Diccionario en segundo plano: tras la primera interacción (o a los 15 s), en un hueco libre del hilo principal.
      // Así no compite con la carga inicial; el popup de palabra lo carga bajo demanda si hace falta antes.
      const idle = (cb: () => void) => ("requestIdleCallback" in window ? (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(cb) : setTimeout(cb, 500));
      let started = false;
      const start = () => {
        if (started) return;
        started = true;
        window.removeEventListener("pointerdown", start);
        window.removeEventListener("keydown", start);
        idle(() => void useDictionary.getState().load());
      };
      window.addEventListener("pointerdown", start, { passive: true });
      window.addEventListener("keydown", start, { passive: true });
      setTimeout(start, 15000);
    })();
  }, [load]);

  // Tema
  useEffect(() => {
    if (!loaded) return;
    const root = document.documentElement;
    const apply = () => {
      const dark = settings.theme === "dark" || (settings.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      root.classList.toggle("dark", dark);
      root.setAttribute("data-theme", dark ? "dark" : "light");
      root.setAttribute("data-tones", settings.toneScheme === "custom" ? "xueban" : settings.toneScheme);
      root.style.setProperty("--zh-scale", String(settings.zhFontScale));
      for (const t of [1, 2, 3, 4, 5] as const) {
        if (settings.toneScheme === "custom") root.style.setProperty(`--tone-${t}`, hexToRgbTriplet(settings.toneColors[t]));
        else root.style.removeProperty(`--tone-${t}`);
      }
      root.classList.toggle("tone-marks", settings.toneMarks);
      document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", dark ? "#181715" : "#F5EFE3"));
    };
    apply();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [loaded, settings.theme, settings.zhFontScale, settings.toneColors, settings.toneScheme, settings.toneMarks]);

  // Atajos globales: P (pinyin), T (traducción)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable || t.getAttribute("role") === "combobox")) return;
      if (e.key === "p" || e.key === "P") void cyclePinyin();
      if (e.key === "t" || e.key === "T") void update((s) => ({ showTranslation: !s.showTranslation }));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cyclePinyin, update]);

  // Onboarding
  useEffect(() => {
    if (loaded && seeded && !settings.onboardingDone && pathname !== "/bienvenida") router.replace("/bienvenida");
  }, [loaded, seeded, settings.onboardingDone, pathname, router]);

  // Service worker (PWA)
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  if (!loaded || !seeded) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-muted">
        <span className="seal size-12 text-2xl" lang="zh-CN">
          学
        </span>
        <Spinner />
        <p className="text-sm">Preparando tu cuaderno…</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      {children}
      <WordPopupHost />
      <CommandPalette />
      <Toaster />
    </TooltipProvider>
  );
}
