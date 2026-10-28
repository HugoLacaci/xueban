"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, Check, Plus, X } from "lucide-react";
import { usePopup } from "@/lib/popup-store";
import { lookup, useDictionary } from "@/lib/dictionary/service";
import { useKnowledge } from "@/lib/knowledge";
import { wordPinyin } from "@/lib/pinyin/convert";
import { Pinyin } from "./pinyin";
import { AudioButton } from "./audio-button";
import { Badge, Spinner } from "@/components/ui/primitives";
import { SealTag } from "@/components/ornament/seal";
import { Button } from "@/components/ui/button";
import { QuickAddDialog } from "@/components/flashcards/quick-add";
import { cn } from "@/lib/utils";

export function WordPopupHost() {
  const { word, anchor, context, sourceRef, close } = usePopup();
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; above: boolean } | null>(null);
  const dictStatus = useDictionary((s) => s.status);
  const load = useDictionary((s) => s.load);
  const deck = useKnowledge((s) => s.deck);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (word && dictStatus === "idle") void load();
  }, [word, dictStatus, load]);

  useLayoutEffect(() => {
    if (!anchor || !ref.current) return setPos(null);
    const el = ref.current;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = anchor.x + anchor.width / 2 - w / 2;
    left = Math.max(8, Math.min(vw - w - 8, left));
    let top = anchor.y + anchor.height + 8;
    let above = false;
    if (top + h > vh - 8 && anchor.y - h - 8 > 8) {
      top = anchor.y - h - 8;
      above = true;
    }
    setPos({ top, left, above });
  }, [anchor, word, dictStatus]);

  useEffect(() => {
    if (!word) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        const t = e.target as HTMLElement;
        if (t.closest?.("[data-word]")) return; // el click en otra palabra reabre
        close();
      }
    };
    const onScroll = () => close();
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [word, close]);

  if (!word || !anchor) return null;
  const entries = lookup(word);
  const inDeck = deck.get(word);
  const chars = Array.from(word);
  const fallbackPinyin = wordPinyin(word);

  return (
    <>
      <div
        ref={ref}
        role="dialog"
        aria-label={`Diccionario: ${word}`}
        className={cn("fixed z-[55] w-[min(22rem,calc(100vw-1rem))] rounded-[12px] border border-line bg-paper-raised p-3.5 text-ink shadow-[var(--shadow-float)] motion-safe:animate-pop", !pos && "invisible")}
        style={pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0 }}
      >
        <span className="pointer-events-none absolute inset-x-5 top-0 h-[2px] rounded-b bg-cinnabar/80" aria-hidden="true" />
        {pos ? (
          <span
            aria-hidden="true"
            className={cn("pointer-events-none absolute left-1/2 size-3 -translate-x-1/2 rotate-45 border-line bg-paper-raised", pos.above ? "-bottom-[7px] border-b border-r" : "-top-[7px] border-l border-t")}
          />
        ) : null}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span lang="zh-CN" className="zh-serif text-[2.4rem] font-medium leading-none">
                {word}
              </span>
              <Pinyin text={entries[0]?.p ?? fallbackPinyin} className="text-lg" />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <AudioButton text={word} size="sm" />
            <button onClick={close} className="rounded p-1 text-ink-faint transition-colors hover:text-ink" aria-label="Cerrar">
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="mt-2 max-h-56 space-y-2 overflow-y-auto scrollbar-thin text-sm">
          {dictStatus === "loading" && !entries.length ? (
            <div className="flex items-center gap-2 text-ink-faint">
              <Spinner className="size-4" /> Cargando diccionario…
            </div>
          ) : null}
          {entries.length === 0 && dictStatus !== "loading" ? (
            <p className="text-ink-faint">Sin entrada en el diccionario. {chars.length > 1 ? "Prueba a pulsar cada carácter." : ""}</p>
          ) : null}
          {entries.slice(0, 4).map((e, i) => (
            <div key={i} className={cn(i > 0 && "border-t border-line pt-2")}>
              {i > 0 ? <Pinyin text={e.p} className="text-xs" /> : null}
              {e.es ? <p className="font-serif-es text-base text-ink">{e.es}</p> : null}
              {e.en?.length ? (
                <p className={cn("text-ink-soft", e.es && "text-xs text-ink-faint")}>
                  {e.es ? <span className="mr-1 rounded bg-paper-sunk px-1 text-[10px] uppercase">en</span> : null}
                  {e.en.slice(0, 4).join("; ")}
                </p>
              ) : null}
              <div className="mt-1 flex flex-wrap gap-1">
                {e.hsk ? <SealTag>HSK {e.hsk === 7 ? "7–9" : e.hsk}</SealTag> : null}
                {e.hsk2 ? <Badge variant="outline">HSK 2.0 · {e.hsk2}</Badge> : null}
                {e.cl?.length ? <Badge variant="outline">clasif. {e.cl.join(" ")}</Badge> : null}
                {e.t && e.t !== e.s ? (
                  <Badge variant="muted">
                    繁 <span lang="zh-CN">{e.t}</span>
                  </Badge>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2">
          {inDeck ? (
            <Button size="sm" variant="secondary" asChild>
              <Link href={`/flashcards/${encodeURIComponent(inDeck.id)}`} onClick={close}>
                <Check /> En tu mazo
              </Link>
            </Button>
          ) : (
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus /> 收藏 · Añadir
            </Button>
          )}
          <Button size="sm" variant="ghost" asChild>
            <Link href={`/diccionario?q=${encodeURIComponent(word)}`} onClick={close}>
              <BookOpen /> Ficha
            </Link>
          </Button>
        </div>
        {chars.length > 1 ? (
          <div className="mt-2 flex flex-wrap gap-1 border-t border-line pt-2">
            {chars.map((c, i) => (
              <button
                key={i}
                lang="zh-CN"
                className="zh-serif rounded-[6px] border border-line bg-paper px-2 py-0.5 text-lg transition-colors hover:border-ink/40 hover:bg-paper-sunk"
                onClick={(e) => usePopup.getState().open(c, anchorFrom(e.currentTarget), context, sourceRef)}
              >
                {c}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {adding ? (
        <QuickAddDialog
          open={adding}
          onOpenChange={(o) => {
            setAdding(o);
            if (!o) close();
          }}
          initialHanzi={word}
          initialExample={context}
          sourceRef={sourceRef}
        />
      ) : null}
    </>
  );
}

function anchorFrom(el: Element) {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, width: r.width, height: r.height };
}
