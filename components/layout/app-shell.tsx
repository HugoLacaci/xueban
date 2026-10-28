"use client";
import { usePathname } from "next/navigation";
import { Sidebar, BottomNav } from "./nav";
import { TopBar } from "./top-bar";

const FULLSCREEN = ["/bienvenida"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bare = FULLSCREEN.some((p) => pathname.startsWith(p));
  if (bare) return <main className="min-h-screen">{children}</main>;
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-5 sm:px-6 md:pb-10">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
