"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { create } from "zustand";
import { Search } from "lucide-react";
import { search, useDictionary } from "@/lib/dictionary/service";
import { useKnowledge } from "@/lib/knowledge";
import { NAV_MAIN, NAV_MORE } from "./nav";
import { Pinyin } from "@/components/zh/pinyin";
import { Badge, Spinner } from "@/components/ui/primitives";

interface PaletteState {
  open: boolean;
  setOpen: (o: boolean) => void;
}
export const useCommandPalette = create<PaletteState>((set) => ({ open: false, setOpen: (open) => set({ open }) }));

export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const router = useRouter();
  const [q, setQ] = useState("");
  const dictStatus = useDictionary((s) => s.status);
  const load = useDictionary((s) => s.load);
  const deck = useKnowledge((s) => s.deck);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!useCommandPalette.getState().open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  useEffect(() => {
    if (open && dictStatus === "idle") void load();
  }, [open, dictStatus, load]);

  const results = useMemo(() => (q.trim().length ? search(q, 12) : []), [q, dictStatus, deck]); // eslint-disable-line react-hooks/exhaustive-deps
  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQ("");
      }}
      label="Búsqueda global"
      shouldFilter={false}
      className="fixed left-1/2 top-[12vh] z-[70] w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl animate-pop"
      overlayClassName="fixed inset-0 z-[65] bg-ink/40 backdrop-blur-[2px]"
    >
      <div className="flex items-center gap-2 border-b border-line px-4">
        <Search className="size-4 text-muted" />
        <Command.Input value={q} onValueChange={setQ} placeholder="Busca palabras (汉字, pinyin, español), caracteres o secciones…" className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted" />
        {dictStatus === "loading" ? <Spinner className="size-4" /> : null}
      </div>
      <Command.List className="max-h-[60vh] overflow-y-auto p-2 scrollbar-thin">
        <Command.Empty className="px-3 py-6 text-center text-sm text-muted">
          {q ? (dictStatus === "ready" ? "Sin resultados." : "Cargando diccionario…") : "Escribe para buscar."}
        </Command.Empty>
        {results.length ? (
          <Command.Group heading="Palabras" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted">
            {results.map((r, i) => (
              <Command.Item
                key={`${r.s}-${r.p}-${i}`}
                value={`${r.s}-${i}`}
                onSelect={() => go(`/diccionario?q=${encodeURIComponent(r.s)}`)}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm data-[selected=true]:bg-paper-2"
              >
                <span lang="zh-CN" className="zh text-xl">
                  {r.s}
                </span>
                <Pinyin text={r.p} className="text-sm" />
                <span className="min-w-0 flex-1 truncate text-ink-2">{r.es ?? r.en.slice(0, 2).join("; ")}</span>
                {r.hsk ? <Badge variant="jade">HSK {r.hsk}</Badge> : null}
                {deck.has(r.s) ? <Badge variant="outline">en mazo</Badge> : null}
              </Command.Item>
            ))}
          </Command.Group>
        ) : null}
        <Command.Group heading="Secciones" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted">
          {[...NAV_MAIN, ...NAV_MORE]
            .filter((n) => !q || n.label.toLowerCase().includes(q.toLowerCase()))
            .map((n) => (
              <Command.Item key={n.href} value={`nav-${n.href}`} onSelect={() => go(n.href)} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm data-[selected=true]:bg-paper-2">
                <n.icon className="size-4 text-muted" />
                {n.label}
                <span className="zh text-xs text-muted" lang="zh-CN">
                  {n.zh}
                </span>
              </Command.Item>
            ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
