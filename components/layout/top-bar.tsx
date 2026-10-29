"use client";
import { useEffect } from "react";
import Link from "@/lib/languages/link";
import { Languages, Moon, Search, Sun, Monitor, Plug, PlugZap } from "lucide-react";
import { useSettings } from "@/lib/settings";
import { useAnkiStatus } from "@/lib/anki/client";
import { Kbd, Tooltip } from "@/components/ui/primitives";
import { Seal } from "@/components/ornament/seal";
import { cn } from "@/lib/utils";
import { useCommandPalette } from "./command-palette";
import { usePack } from "@/lib/languages/provider";
import { LanguageSwitcher } from "./language-switcher";
import { Mixed } from "@/components/target/mixed";


export function TopBar() {
  const pack = usePack();
  const aid = pack.readingAid;
  const PINYIN_LABEL = aid.modes;
  const alt = aid.altScript;
  const meta = pack.meta;
  const settings = useSettings((s) => s.settings);
  const update = useSettings((s) => s.update);
  const cyclePinyin = useSettings((s) => s.cyclePinyin);
  const anki = useAnkiStatus();
  const openPalette = useCommandPalette((s) => s.setOpen);

  useEffect(() => {
    if (!settings.anki.enabled) return;
    void anki.check(settings.anki.url);
    const t = setInterval(() => void anki.check(settings.anki.url), 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.anki.enabled, settings.anki.url]);

  const ThemeIcon = settings.theme === "dark" ? Moon : settings.theme === "light" ? Sun : Monitor;
  const pm = settings.pinyinMode;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line/70 bg-paper/85 px-3 backdrop-blur sm:px-5">
      <Link href="/" className="flex items-center gap-2 md:hidden">
        <Seal text={meta.brand.native} size={30} rotate={-3} variant={meta.id === "ja" ? "round" : "square"} />
        <span className="hidden font-serif-es text-base font-semibold tracking-tight min-[400px]:inline">{meta.brand.latin}</span>
        <span className="sr-only">, inicio</span>
      </Link>

      <button
        onClick={() => openPalette(true)}
        className="ml-auto flex h-9 items-center gap-2 rounded-[8px] border border-line bg-paper-raised px-3 text-sm text-ink-faint shadow-[var(--shadow-sunk)] transition-colors hover:border-ink/30 sm:min-w-56"
        aria-label="Buscar palabras… (Ctrl+K)"
      >
        <Search className="size-4" />
        <span className="hidden sm:inline">Buscar palabras…</span>
        <span className="ml-auto hidden items-center gap-0.5 sm:flex">
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <div className="flex items-center gap-1">
        <LanguageSwitcher />
        {/* Interruptor de pinyin: estado siempre legible */}
        <Tooltip label={`${PINYIN_LABEL[pm]} · pulsa para cambiar (P)`}>
          <button
            onClick={() => void cyclePinyin()}
            className={cn("flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[8px] border px-2 text-sm transition-colors sm:px-2.5", pm === "show" ? "border-ink/60 bg-ink text-paper" : pm === "unknown" ? "border-cinnabar/50 bg-cinnabar/10 text-cinnabar-ink" : "border-line text-ink-faint hover:bg-paper-sunk")}
            aria-label={`${aid.label} ${pm === "show" ? "ON" : pm === "unknown" ? "nuevas" : "OFF"} · ${aid.name}: ${PINYIN_LABEL[pm]}`}
            aria-pressed={pm !== "hide"}
          >
            <span lang={pack.bcp47} className={cn(meta.cssClass, "text-sm font-medium leading-none")}>
              <Mixed>{aid.label}</Mixed>
            </span>
            <span className="hidden text-[11px] font-medium lg:inline">{pm === "show" ? "ON" : pm === "unknown" ? "nuevas" : "OFF"}</span>
          </button>
        </Tooltip>
        <Tooltip label={`Traducción: ${settings.showTranslation ? "visible" : "oculta"} (T)`}>
          <button onClick={() => void update({ showTranslation: !settings.showTranslation })} className={cn("flex h-9 items-center rounded-[8px] px-2 hover:bg-paper-sunk", !settings.showTranslation && "text-cinnabar")} aria-label="Mostrar u ocultar traducciones" aria-pressed={settings.showTranslation}>
            <Languages className="size-[18px]" />
          </button>
        </Tooltip>
        {alt ? (
        <Tooltip label={`${alt.label}: ${settings.showTraditional ? "sí" : "no"}`}>
          <button onClick={() => void update({ showTraditional: !settings.showTraditional })} className={cn("hidden h-9 min-w-9 items-center justify-center rounded-[8px] px-2 hover:bg-paper-sunk sm:flex", settings.showTraditional && "text-cinnabar")} aria-label={`${alt.glyph} · ${alt.label}`} aria-pressed={settings.showTraditional}>
            <span lang={pack.bcp47} className={cn(meta.cssClass, "text-base leading-none")}>
              {alt.glyph}
            </span>
          </button>
        </Tooltip>
        ) : null}
        <Tooltip label={`Tema: ${settings.theme === "system" ? "sistema" : settings.theme === "dark" ? "oscuro" : "claro"}`}>
          <button onClick={() => void update({ theme: settings.theme === "light" ? "dark" : settings.theme === "dark" ? "system" : "light" })} className="flex h-9 items-center rounded-[8px] px-2 hover:bg-paper-sunk" aria-label="Cambiar tema">
            <ThemeIcon className="size-[18px]" />
          </button>
        </Tooltip>
        {settings.anki.enabled ? (
          <Tooltip label={anki.connected ? `Anki conectado (AnkiConnect v${anki.version})` : `Anki no conectado: ${anki.error ?? "abre Anki"}. Pulsa para ver cómo activarlo.`}>
            <Link href="/ajustes#anki" className={cn("flex h-9 items-center gap-1.5 rounded-[8px] px-2 text-xs font-medium", anki.connected ? "text-celadon-ink" : "text-ink-faint")} aria-label={anki.connected ? "Anki conectado" : "Anki off: no conectado"}>
              {anki.connected ? <PlugZap className="size-[18px]" /> : <Plug className="size-[18px]" />}
              <span className="hidden lg:inline">{anki.connected ? "Anki" : "Anki off"}</span>
            </Link>
          </Tooltip>
        ) : null}
      </div>
    </header>
  );
}
