"use client";
/** Selector de idioma de la cabecera: emblema, nombre nativo + español y miniatura de progreso. */
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { useSettings } from "@/lib/settings";
import { LANG_META, LANGS } from "@/lib/languages/registry";
import { stripLang } from "@/lib/languages/link";
import { useLang } from "@/lib/languages/provider";
import type { Lang } from "@/lib/languages/types";
import { globalSummary, type GlobalSummary } from "@/lib/stats";
import { Seal } from "@/components/ornament/seal";
import { cn } from "@/lib/utils";
import { LangPortalCompact } from "./lang-portal";
import { dayPhase } from "@/components/ornament/shan-shui";

export function LanguageSwitcher({ className }: { className?: string }) {
  const lang = useLang();
  const activeLangs = useSettings((s) => s.settings.activeLangs);
  const update = useSettings((s) => s.update);
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sum, setSum] = useState<GlobalSummary | null>(null);
  const meta = LANG_META[lang];
  const phase = dayPhase();

  useEffect(() => {
    if (open) void globalSummary(activeLangs).then(setSum);
  }, [open, activeLangs]);

  const go = (l: Lang) => {
    const { path } = stripLang(pathname ?? "/");
    // conserva la sección si existe en el otro idioma; las fichas con id vuelven a la lista
    const section = path.split("/").slice(0, 2).join("/") || "/";
    router.push(`/${l}${section === "/" ? "" : section}`);
    if (!activeLangs.includes(l)) void update({ activeLangs: [...activeLangs, l] });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className={cn("flex h-9 items-center gap-2 rounded-[8px] border border-line bg-paper-raised px-2 text-sm hover:border-ink/30", className)} aria-label={`${meta.emblem} ${meta.names.native} · idioma: ${meta.names.es}. Cambiar idioma`} data-testid="lang-switcher">
          <Seal text={meta.emblem} size={22} variant={lang === "ja" ? "round" : "square"} />
          <span lang={meta.bcp47} className={cn(meta.cssClass, "hidden text-sm font-medium leading-none sm:inline")}>
            {meta.names.native}
          </span>
          <ChevronDown className="size-3.5 text-ink-faint" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="z-50 w-[22rem] max-w-[calc(100vw-1.5rem)] rounded-[16px] border border-line bg-paper-raised p-2 shadow-[var(--shadow-float)] motion-safe:animate-pop">
        <div className="space-y-1.5">
          {LANGS.filter((l) => activeLangs.includes(l)).map((l) => (
            <DropdownMenuItem
              key={l}
              onSelect={() => go(l)}
              className="block cursor-pointer rounded-[16px] outline-none data-[highlighted]:ring-2 data-[highlighted]:ring-ink/60"
              data-lang={l}
            >
              <LangPortalCompact lang={l} stats={sum?.perLang[l]} phase={phase} current={l === lang} />
            </DropdownMenuItem>
          ))}
          {LANGS.filter((l) => !activeLangs.includes(l)).map((l) => (
            <DropdownMenuItem
              key={l}
              onSelect={() => go(l)}
              className="block cursor-pointer rounded-[16px] outline-none data-[highlighted]:ring-2 data-[highlighted]:ring-ink/60"
              data-lang={l}
            >
              <LangPortalCompact lang={l} phase={phase} state="inactive" />
            </DropdownMenuItem>
          ))}
        </div>
        <DropdownMenuSeparator className="my-2 h-px bg-line" />
        <div className="flex">
          <DropdownMenuItem onSelect={() => router.push("/")} className="flex-1 cursor-pointer rounded-[8px] px-2 py-2 text-sm text-ink-soft outline-none data-[highlighted]:bg-paper-sunk">
            Portada de idiomas
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => router.push("/me")} className="flex-1 cursor-pointer rounded-[8px] px-2 py-2 text-right text-sm text-ink-soft outline-none data-[highlighted]:bg-paper-sunk">
            Todos mis idiomas →
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
