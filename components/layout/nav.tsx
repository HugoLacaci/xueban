"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, BookText, Dumbbell, GraduationCap, Layers, Library, MoreHorizontal, Settings, Sun, Brush, Video, Lightbulb, Palette } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/primitives";
import { Seal } from "@/components/ornament/seal";

export interface NavItem {
  href: string;
  label: string;
  zh: string; // carácter pequeño del icono
  icon: React.ComponentType<{ className?: string }>;
}

export const NAV_MAIN: NavItem[] = [
  { href: "/", label: "Hoy", zh: "今", icon: Sun },
  { href: "/aprender", label: "Aprender", zh: "学", icon: GraduationCap },
  { href: "/practicar", label: "Practicar", zh: "练", icon: Dumbbell },
  { href: "/flashcards", label: "Tarjetas", zh: "卡", icon: Layers },
];

export const NAV_MORE: NavItem[] = [
  { href: "/diccionario", label: "Diccionario", zh: "典", icon: BookOpen },
  { href: "/caracteres", label: "Caracteres", zh: "字", icon: Brush },
  { href: "/lectura", label: "Lectura", zh: "读", icon: BookText },
  { href: "/videos", label: "Vídeos", zh: "视", icon: Video },
  { href: "/study-hall", label: "Study Hall", zh: "斋", icon: Library },
  { href: "/progreso", label: "Progreso", zh: "进", icon: BarChart3 },
  { href: "/ajustes", label: "Ajustes", zh: "设", icon: Settings },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

/** Icono de navegación: icono lucide con el carácter chino pequeño como sello en la esquina. */
function NavGlyph({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <span className="relative inline-flex size-6 items-center justify-center">
      <Icon className={cn("size-[18px] transition-colors", active ? "text-cinnabar" : "text-ink-faint group-hover:text-ink")} />
      <span lang="zh-CN" className={cn("zh-display absolute -bottom-1 -right-1.5 text-[9px] leading-none", active ? "text-cinnabar" : "text-ink-faint/70")} aria-hidden="true">
        {item.zh}
      </span>
    </span>
  );
}

/** Barra lateral de escritorio: pergamino colgante (立轴) con el sello-logo arriba. */
export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-[15.5rem] shrink-0 flex-col md:flex">
      <div className="relative mx-3 my-3 flex flex-1 flex-col rounded-[14px] border border-line bg-paper-raised/80 shadow-paper backdrop-blur">
        {/* varillas del pergamino */}
        <span className="pointer-events-none absolute inset-x-4 top-0 h-[3px] rounded-b-full bg-ink/60" aria-hidden="true" />
        <span className="pointer-events-none absolute inset-x-4 bottom-0 h-[3px] rounded-t-full bg-ink/60" aria-hidden="true" />
        <Link prefetch={false} href="/" className="flex items-center gap-3 px-5 pb-3 pt-5">
          <Seal text="学伴" size={40} rotate={-3} />
          <span className="leading-tight">
            <span className="block font-serif-es text-[17px] font-semibold tracking-tight text-ink">Xuébàn</span>
            <span className="block text-[11px] text-ink-faint">tu compañero de chino</span>
          </span>
        </Link>
        <nav className="flex flex-1 flex-col gap-0.5 px-3" aria-label="Principal">
          {[...NAV_MAIN, ...NAV_MORE].map((item, i) => {
            const active = isActive(pathname, item.href);
            return (
              <Link prefetch={false}
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-paper-sunk hover:text-ink",
                  active && "bg-paper-sunk text-ink",
                  i === NAV_MAIN.length && "mt-2 border-t border-line pt-3",
                )}
                aria-current={active ? "page" : undefined}
              >
                {active ? <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-cinnabar" aria-hidden="true" /> : null}
                <NavGlyph item={item} active={active} />
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="space-y-1 px-5 py-4 text-xs text-ink-faint">
          <Link prefetch={false} href="/como-aprender" className="flex items-center gap-2 hover:text-ink">
            <Lightbulb className="size-3.5" /> Cómo aprender con Xuébàn
          </Link>
          <Link prefetch={false} href="/design" className="flex items-center gap-2 hover:text-ink">
            <Palette className="size-3.5" /> Guía de estilo
          </Link>
        </div>
      </div>
    </aside>
  );
}

/** Barra inferior móvil: 5 iconos, el activo con punto bermellón. */
export function BottomNav() {
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  const moreActive = NAV_MORE.some((i) => isActive(pathname, i.href));
  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/92 backdrop-blur md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} aria-label="Principal">
        <div className="flex">
          {NAV_MAIN.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link prefetch={false} key={item.href} href={item.href} className="group relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-ink-faint" aria-current={active ? "page" : undefined}>
                <NavGlyph item={item} active={active} />
                <span className={cn(active && "text-ink")}>{item.label}</span>
                {active ? <span className="absolute bottom-1 size-1 rounded-full bg-cinnabar" aria-hidden="true" /> : null}
              </Link>
            );
          })}
          <button onClick={() => setMore(true)} className={cn("relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-ink-faint", moreActive && "text-ink")} aria-haspopup="dialog">
            <span className="relative inline-flex size-6 items-center justify-center">
              <MoreHorizontal className={cn("size-[18px]", moreActive && "text-cinnabar")} />
            </span>
            Más
            {moreActive ? <span className="absolute bottom-1 size-1 rounded-full bg-cinnabar" aria-hidden="true" /> : null}
          </button>
        </div>
      </nav>
      <Dialog open={more} onOpenChange={setMore}>
        <DialogContent title="Más secciones" side="bottom">
          <div className="grid grid-cols-2 gap-2">
            {NAV_MORE.map((item) => (
              <Link prefetch={false}
                key={item.href}
                href={item.href}
                onClick={() => setMore(false)}
                className={cn("flex items-center gap-3 rounded-xl border border-line p-3 text-sm font-medium hover:bg-paper-sunk", isActive(pathname, item.href) && "border-cinnabar/40 bg-cinnabar/8")}
              >
                <NavGlyph item={item} active={isActive(pathname, item.href)} />
                {item.label}
              </Link>
            ))}
            <Link prefetch={false} href="/como-aprender" onClick={() => setMore(false)} className="col-span-2 flex items-center gap-3 rounded-xl border border-dashed border-line p-3 text-sm text-ink-faint">
              <Lightbulb className="size-5" /> Cómo aprender con Xuébàn
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
