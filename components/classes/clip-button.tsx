"use client";
/**
 * Marca «▶ 12:34» de un apunte de clase: si hay recorte del profesor (Blob en IndexedDB) lo reproduce; si no, muestra
 * el minuto de la grabación como texto. Un solo audio a la vez en toda la página.
 */
import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Pause, Play } from "lucide-react";
import { db } from "@/lib/db";
import { fmtTime } from "@/lib/classes/search";
import { cn } from "@/lib/utils";

let current: { audio: HTMLAudioElement; stop: () => void } | null = null;

/** ¿Existe el recorte en IndexedDB? (sin cargar el Blob en la UI). */
export function useClipExists(assetId: string | undefined): boolean {
  return (
    useLiveQuery(async () => (assetId ? (await db.assets.where("id").equals(assetId).count()) > 0 : false), [assetId]) ?? false
  );
}

export function ClipButton({ assetId, t, label, className, variant = "chip" }: { assetId?: string; t?: number; label?: string; className?: string; variant?: "chip" | "button" }) {
  const exists = useClipExists(assetId);
  const [playing, setPlaying] = useState(false);
  const mine = useRef<HTMLAudioElement | null>(null);
  // al desmontar, para solo el audio de este botón
  useEffect(
    () => () => {
      if (current && current.audio === mine.current) current.stop();
    },
    [],
  );

  const time = t !== undefined ? fmtTime(t) : undefined;
  if (!assetId || !exists) {
    if (!time || variant === "button") return null;
    return (
      <span className={cn("tabular inline-flex items-center rounded-full border border-line px-1.5 py-px text-[11px] text-ink-faint", className)} title="Minuto de la grabación (sin recorte de audio)">
        {time}
      </span>
    );
  }

  const play = async () => {
    if (playing && current) {
      current.stop();
      return;
    }
    current?.stop();
    const a = await db.assets.get(assetId);
    if (!a) return;
    const url = URL.createObjectURL(a.blob);
    const audio = new Audio(url);
    const stop = () => {
      audio.pause();
      URL.revokeObjectURL(url);
      setPlaying(false);
      if (current?.audio === audio) current = null;
    };
    audio.onended = stop;
    audio.onerror = stop;
    current = { audio, stop };
    mine.current = audio;
    setPlaying(true);
    await audio.play().catch(stop);
  };

  if (variant === "button")
    return (
      <button type="button" onClick={() => void play()} className={cn("inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-paper-sunk px-3 text-xs font-medium text-ink transition-colors hover:border-ink/30", playing && "border-cinnabar/50 text-cinnabar-ink", className)} aria-pressed={playing}>
        {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />} {label ?? "Escuchar al profesor"}
        {time ? <span className="tabular text-ink-faint">{time}</span> : null}
      </button>
    );

  return (
    <button
      type="button"
      onClick={() => void play()}
      className={cn("tabular inline-flex items-center gap-1 rounded-full border border-cinnabar/40 px-1.5 py-px text-[11px] font-medium text-cinnabar-ink transition-colors hover:bg-cinnabar/10", playing && "bg-cinnabar/10", className)}
      aria-label={`${playing ? "Parar" : "Escuchar"} al profesor${time ? ` (minuto ${time})` : ""}`}
      aria-pressed={playing}
    >
      {playing ? <Pause className="size-3" /> : <Play className="size-3" />}
      {time ?? label ?? "▶"}
    </button>
  );
}
