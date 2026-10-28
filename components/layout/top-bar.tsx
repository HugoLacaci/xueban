"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Languages, Moon, Search, Sun, Monitor, Plug, PlugZap } from "lucide-react";
import { useSettings } from "@/lib/settings";
import { useAnkiStatus } from "@/lib/anki/client";
import { Kbd, Tooltip } from "@/components/ui/primitives";
import { Seal } from "@/components/ornament/seal";
import { cn } from "@/lib/utils";
import { useCommandPalette } from "./command-palette";

const PINYIN_LABEL = { show: "Pinyin visible", hide: "Pinyin oculto", unknown: "Pinyin solo en palabras nuevas" } as const;

export function TopBar() {
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
      <Link href="/" className="flex items-center gap-2 md:hidden" aria-label="学伴 Xuébàn, inicio">
        <Seal text="学伴" size={30} rotate={-3} />
        <span className="font-serif-es text-base font-semibold tracking-tight">Xuébàn</span>
      </Link>

      <button
        onClick={() => openPalette(true)}
        className="ml-auto flex h-9 items-center gap-2 rounded-[8px] border border-line bg-paper-raised px-3 text-sm text-ink-faint shadow-[var(--shadow-sunk)] transition-colors hover:border-ink/30 sm:min-w-56"
        aria-label="Buscar (Ctrl+K)"
      >
        <Search className="size-4" />
        <span className="hidden sm:inline">Buscar palabras, caracteres…</span>
        <span className="ml-auto hidden items-center gap-0.5 sm:flex">
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <div className="flex items-center gap-1">
        {/* Interruptor de pinyin: estado siempre legible */}
        <Tooltip label={`${PINYIN_LABEL[pm]} · pulsa para cambiar (P)`}>
          <button
            onClick={() => void cyclePinyin()}
            className={cn("flex h-9 items-center gap-1.5 rounded-[8px] border px-2.5 text-sm transition-colors", pm === "show" ? "border-ink/60 bg-ink text-paper" : pm === "unknown" ? "border-cinnabar/50 bg-cinnabar/10 text-cinnabar-ink" : "border-line text-ink-faint hover:bg-paper-sunk")}
            aria-label={`拼音 ${pm === "show" ? "ON" : pm === "unknown" ? "nuevas" : "OFF"} · ${PINYIN_LABEL[pm]}`}
            aria-pressed={pm !== "hide"}
          >
            <span lang="zh-CN" className="zh text-sm font-medium leading-none">
              拼音
            </span>
            <span className="hidden text-[11px] font-medium lg:inline">{pm === "show" ? "ON" : pm === "unknown" ? "nuevas" : "OFF"}</span>
          </button>
        </Tooltip>
        <Tooltip label={`Traducción: ${settings.showTranslation ? "visible" : "oculta"} (T)`}>
          <button onClick={() => void update({ showTranslation: !settings.showTranslation })} className={cn("flex h-9 items-center rounded-[8px] px-2 hover:bg-paper-sunk", !settings.showTranslation && "text-cinnabar")} aria-label="Mostrar u ocultar traducciones" aria-pressed={settings.showTranslation}>
            <Languages className="size-[18px]" />
          </button>
        </Tooltip>
        <Tooltip label={`Caracteres tradicionales: ${settings.showTraditional ? "sí" : "no"}`}>
          <button onClick={() => void update({ showTraditional: !settings.showTraditional })} className={cn("hidden h-9 items-center rounded-[8px] px-2 hover:bg-paper-sunk sm:flex", settings.showTraditional && "text-cinnabar")} aria-label="Mostrar caracteres tradicionales" aria-pressed={settings.showTraditional}>
            <span lang="zh-CN" className="zh text-base leading-none">
              繁
            </span>
          </button>
        </Tooltip>
        <Tooltip label={`Tema: ${settings.theme === "system" ? "sistema" : settings.theme === "dark" ? "oscuro (夜墨)" : "claro (宣纸)"}`}>
          <button onClick={() => void update({ theme: settings.theme === "light" ? "dark" : settings.theme === "dark" ? "system" : "light" })} className="flex h-9 items-center rounded-[8px] px-2 hover:bg-paper-sunk" aria-label="Cambiar tema">
            <ThemeIcon className="size-[18px]" />
          </button>
        </Tooltip>
        {settings.anki.enabled ? (
          <Tooltip label={anki.connected ? `Anki conectado (AnkiConnect v${anki.version})` : `Anki no conectado: ${anki.error ?? "abre Anki"}. Pulsa para ver cómo activarlo.`}>
            <Link href="/ajustes#anki" className={cn("flex h-9 items-center gap-1.5 rounded-[8px] px-2 text-xs font-medium", anki.connected ? "text-celadon-ink" : "text-ink-faint")} aria-label={anki.connected ? "Anki conectado" : "Anki no conectado"}>
              {anki.connected ? <PlugZap className="size-[18px]" /> : <Plug className="size-[18px]" />}
              <span className="hidden lg:inline">{anki.connected ? "Anki" : "Anki off"}</span>
            </Link>
          </Tooltip>
        ) : null}
      </div>
    </header>
  );
}
