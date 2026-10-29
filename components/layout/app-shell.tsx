"use client";
import { usePathname } from "next/navigation";
import { Sidebar, BottomNav } from "./nav";
import { TopBar } from "./top-bar";
import dynamic from "next/dynamic";

// Popup de palabra y paleta de búsqueda: solo se usan tras interactuar → fuera del bundle inicial.
const WordPopupHost = dynamic(() => import("@/components/target/word-popup").then((m) => m.WordPopupHost), { ssr: false });
const CommandPalette = dynamic(() => import("@/components/layout/command-palette").then((m) => m.CommandPalette), { ssr: false });

const FULLSCREEN = ["/bienvenida"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bare = FULLSCREEN.some((p) => pathname.startsWith(p));
  if (bare) return <main className="min-h-screen">{children}</main>;
  const extras = (
    <>
      <WordPopupHost />
      <CommandPalette />
    </>
  );
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-5 sm:px-6 md:pb-10">{children}</main>
      </div>
      <BottomNav />
      {extras}
    </div>
  );
}
