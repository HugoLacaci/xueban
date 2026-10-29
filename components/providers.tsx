"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSettings } from "@/lib/settings";
import { backupBeforeMigration } from "@/lib/db/backup";
import { subscribeKnowledge } from "@/lib/knowledge";
import { warmVoices } from "@/lib/tts";
import { TooltipProvider, Spinner } from "@/components/ui/primitives";
import { Toaster } from "@/components/ui/toast";
import { withBase } from "@/lib/base-path";
import { targetLang } from "@/lib/languages/registry";


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
      // copia de seguridad automática antes de migrar el esquema de la BD (v2 → v4, multiidioma)
      await backupBeforeMigration();
      await load();
      subscribeKnowledge();
      warmVoices();
      setSeeded(true);
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
    if (loaded && seeded && !settings.onboardingDone && !pathname.startsWith("/bienvenida")) router.replace("/bienvenida");
  }, [loaded, seeded, settings.onboardingDone, pathname, router]);

  // Service worker (PWA)
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(withBase("/sw.js")).catch(() => undefined);
  }, []);

  if (!loaded || !seeded) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-muted">
        <span className="seal size-12 text-2xl" lang={targetLang()}>
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
      <Toaster />
    </TooltipProvider>
  );
}
