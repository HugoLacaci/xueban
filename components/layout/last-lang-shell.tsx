"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useSettings } from "@/lib/settings";
import { LanguageProvider } from "@/lib/languages/provider";
import { isLang } from "@/lib/languages/registry";
import { AppShell } from "./app-shell";

function Inner({ children }: { children: React.ReactNode }) {
  const lastLang = useSettings((s) => s.settings.lastLang);
  const sp = useSearchParams();
  const q = sp.get("lang");
  const lang = isLang(q) ? q : lastLang;
  return (
    <LanguageProvider lang={lang}>
      <AppShell>{children}</AppShell>
    </LanguageProvider>
  );
}

export function LastLangShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <Inner>{children}</Inner>
    </Suspense>
  );
}
