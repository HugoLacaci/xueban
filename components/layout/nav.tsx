"use client";
import Link from "@/lib/languages/link";
import { useLangPathname } from "@/lib/languages/link";
import { useLangMeta } from "@/lib/languages/provider";
import { NAV_GLYPHS } from "@/lib/languages/glyphs";
import { BarChart3, BookOpen, Dumbbell, GraduationCap, Headphones, Layers, Library, MoreHorizontal, NotebookPen, Settings, Sun, Brush, Lightbulb, Palette, MessageCircle } from "lucide-react";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/primitives";
import { Seal } from "@/components/ornament/seal";
import { Mixed } from "@/components/target/mixed";
import type { Lang } from "@/lib/languages/types";

export interface NavItem {
  href: string;
  label: string;
  zh: string; // carácter pequeño del icono
  icon: React.ComponentType<{ className?: string }>;
  /** Solo en estos idiomas (por defecto, todos) */
  langs?: Lang[];
}

export const NAV_MAIN: NavItem[] = [
  { href: "/", label: "Hoy", zh: "今", icon: Sun },
  { href: "/aprender", label: "Aprender", zh: "学", icon: GraduationCap },
  { href: "/practicar", label: "Practicar", zh: "练", icon: Dumbbell },
  { href: "/apuntes", label: "Apuntes", zh: "笔", icon: NotebookPen },
  { href: "/tutor", label: "Tutor", zh: "师", icon: MessageCircle, langs: ["zh"] },
];

export const NAV_MORE: NavItem[] = [
  { href: "/flashcards", label: "Tarjetas", zh: "卡", icon: Layers },
  { href: "/diccionario", label: "Diccionario", zh: "典", icon: BookOpen },
  { href: "/caracteres", label: "Caracteres", zh: "字", icon: Brush },
  { href: "/escuchar-leer", label: "Escuchar y leer", zh: "听", icon: Headphones },
  { href: "/study-hall", label: "Study Hall", zh: "斋", icon: Library },
  { href: "/progreso", label: "Progreso", zh: "进", icon: BarChart3 },
  { href: "/ajustes", label: "Ajustes", zh: "设", icon: Settings },
];

/** Rutas que cuentan como «activas» de una sección aunque tengan otra URL (fichas de lectura y vídeo). */
const ALIASES: Record<string, string[]> = { "/escuchar-leer": ["/lectura", "/videos"] };

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (pathname === href || pathname.startsWith(href + "/")) return true;
  return (ALIASES[href] ?? []).some((a) => pathname === a || pathname.startsWith(a + "/"));
}

export function navFor(lang: Lang, items: NavItem[]): NavItem[] {
  return items.filter((i) => !i.langs || i.langs.includes(lang));
}

/** Icono de navegación: icono lucide con el carácter chino pequeño como sello en la esquina. */
function NavGlyph({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  const meta = useLangMeta();
  const glyph = NAV_GLYPHS[meta.id][item.href] ?? item.zh;
  return (
    <span className="relative inline-flex size-6 items-center justify-center">
      <Icon className={cn("size-[18px] transition-colors", active ? "text-cinnabar" : "text-ink-faint group-hover:text-ink")} />
      <span lang={meta.bcp47} className={cn("zh-display absolute -bottom-1 -right-1.5 text-[9px] leading-none", active ? "text-cinnabar" : "text-ink-faint/70")} aria-hidden="true">
        {glyph}
      </span>
    </span>
  );
}

/** Contador de capturas pendientes en la bandeja de apuntes. */
function useInboxCount(lang: Lang): number {
  return useLiveQuery(() => db.notes.where("[lang+status]").equals([lang, "inbox"]).count(), [lang]) ?? 0;
}

function InboxDot({ n, className }: { n: number; className?: string }) {
  if (!n) return null;
  return (
    <span className={cn("tabular inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-cinnabar px-1 text-[10px] font-semibold leading-4 text-paper-raised", className)} aria-label={`${n} capturas sin procesar`}>
      {n}
    </span>
  );
}

/** Barra lateral de escritorio: pergamino colgante (立轴) con el sello-logo arriba. */
export function Sidebar() {
  const meta = useLangMeta();
  const pathname = useLangPathname();
  const inbox = useInboxCount(meta.id);
  const main = navFor(meta.id, NAV_MAIN);
  return (
    <aside className="sticky top-0 hidden h-screen w-[15.5rem] shrink-0 flex-col md:flex">
      <div className="relative mx-3 my-3 flex flex-1 flex-col rounded-[14px] border border-line bg-paper-raised/80 shadow-paper backdrop-blur">
        {/* varillas del pergamino */}
        <span className="pointer-events-none absolute inset-x-4 top-0 h-[3px] rounded-b-full bg-ink/60" aria-hidden="true" />
        <span className="pointer-events-none absolute inset-x-4 bottom-0 h-[3px] rounded-t-full bg-ink/60" aria-hidden="true" />
        <Link prefetch={false} href="/" className="flex items-center gap-3 px-5 pb-3 pt-5">
          <Seal text={meta.brand.native} size={40} rotate={-3} variant={meta.id === "ja" ? "round" : "square"} />
          <span className="leading-tight">
            <span className="block font-serif-es text-[17px] font-semibold tracking-tight text-ink">{meta.brand.latin}</span>
            <span className="block text-[11px] text-ink-faint">{meta.brand.tagline}</span>
          </span>
        </Link>
        <nav className="flex flex-1 flex-col gap-0.5 px-3" aria-label="Principal">
          {[...main, ...NAV_MORE].map((item, i) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                prefetch={false}
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-paper-sunk hover:text-ink",
                  active && "bg-paper-sunk text-ink",
                  i === main.length && "mt-2 border-t border-line pt-3",
                )}
                aria-current={active ? "page" : undefined}
              >
                {active ? <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-cinnabar" aria-hidden="true" /> : null}
                <NavGlyph item={item} active={active} />
                <span className="flex-1">
                  <Mixed>{item.label}</Mixed>
                </span>
                {item.href === "/apuntes" ? <InboxDot n={inbox} /> : null}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-1 px-5 py-4 text-xs text-ink-faint">
          <Link prefetch={false} href="/como-aprender" className="flex items-center gap-2 hover:text-ink">
            <Lightbulb className="size-3.5" /> Cómo aprender con {meta.brand.latin}
          </Link>
          <Link prefetch={false} href="/design" className="flex items-center gap-2 hover:text-ink">
            <Palette className="size-3.5" /> Guía de estilo
          </Link>
        </div>
      </div>
    </aside>
  );
}

/** Barra inferior móvil: Hoy · Aprender · Practicar · Apuntes · Más (+ botón flotante del Tutor en chino). */
export function BottomNav() {
  const meta = useLangMeta();
  const pathname = useLangPathname();
  const [more, setMore] = useState(false);
  const inbox = useInboxCount(meta.id);
  const bottom = navFor(meta.id, NAV_MAIN).filter((i) => i.href !== "/tutor");
  const moreItems = [...navFor(meta.id, NAV_MAIN).filter((i) => i.href === "/tutor"), ...NAV_MORE];
  const moreActive = moreItems.some((i) => isActive(pathname, i.href));
  const tutorEnabled = meta.id === "zh";
  const onTutor = isActive(pathname, "/tutor");
  return (
    <>
      {tutorEnabled && !onTutor ? (
        <Link
          prefetch={false}
          href="/tutor"
          className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom))] right-4 z-40 flex size-12 items-center justify-center rounded-full bg-ink text-paper shadow-[var(--shadow-float)] md:hidden"
          aria-label="Abrir el Tutor"
        >
          <MessageCircle className="size-5" />
          <span lang={meta.bcp47} className="zh-display absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-cinnabar text-[10px] leading-none text-paper-raised" aria-hidden="true">
            师
          </span>
        </Link>
      ) : null}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/92 backdrop-blur md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} aria-label="Principal">
        <div className="flex">
          {bottom.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link prefetch={false} key={item.href} href={item.href} className="group relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-ink-faint" aria-current={active ? "page" : undefined}>
                <NavGlyph item={item} active={active} />
                <span className={cn(active && "text-ink")}>
                  <Mixed>{item.label}</Mixed>
                </span>
                {item.href === "/apuntes" ? <InboxDot n={inbox} className="absolute right-[calc(50%-1.4rem)] top-1" /> : null}
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
            {moreItems.map((item) => (
              <Link
                prefetch={false}
                key={item.href}
                href={item.href}
                onClick={() => setMore(false)}
                className={cn("flex items-center gap-3 rounded-xl border border-line p-3 text-sm font-medium hover:bg-paper-sunk", isActive(pathname, item.href) && "border-cinnabar/40 bg-cinnabar/8")}
              >
                <NavGlyph item={item} active={isActive(pathname, item.href)} />
                <Mixed>{item.label}</Mixed>
              </Link>
            ))}
            <Link prefetch={false} href="/como-aprender" onClick={() => setMore(false)} className="col-span-2 flex items-center gap-3 rounded-xl border border-dashed border-line p-3 text-sm text-ink-faint">
              <Lightbulb className="size-5" /> Cómo aprender con {meta.brand.latin}
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
