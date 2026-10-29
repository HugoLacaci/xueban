"use client";
import { useEffect, useState } from "react";
import { Volume2, Square } from "lucide-react";
import { speak, stopSpeaking } from "@/lib/tts";
import { useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

export function AudioButton({
  text,
  className,
  size = "md",
  rate,
  autoPlay,
  label = "Escuchar",
  variant = "ghost",
}: {
  text: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  rate?: number;
  autoPlay?: boolean;
  label?: string;
  variant?: "ghost" | "solid";
}) {
  const tts = useSettings((s) => s.settings.tts);
  const [playing, setPlaying] = useState(false);

  const play = async () => {
    if (playing) {
      stopSpeaking();
      setPlaying(false);
      return;
    }
    setPlaying(true);
    await speak(text, { rate: rate ?? tts.rate, voiceURI: tts.voiceURI, preferGenerated: tts.preferGenerated });
    setPlaying(false);
  };

  useEffect(() => {
    if (autoPlay) {
      const t = setTimeout(() => void play(), 150);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, autoPlay]);

  const sz = { sm: "size-7 [&_svg]:size-3.5", md: "size-9 [&_svg]:size-4", lg: "size-14 rounded-2xl [&_svg]:size-6" }[size];
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        void play();
      }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full transition-colors",
        variant === "ghost" ? "text-lacquer hover:bg-lacquer-soft" : "bg-lacquer text-white hover:bg-lacquer-dark",
        playing && "bg-lacquer-soft",
        sz,
        className,
      )}
      aria-label={label}
      title={`${label} (Espacio)`}
    >
      {playing ? <Square /> : <Volume2 />}
    </button>
  );
}

/** Hook para reproducir audio con la tecla Espacio en ejercicios. */
export function useSpaceToPlay(text: string | undefined, enabled = true) {
  const tts = useSettings((s) => s.settings.tts);
  useEffect(() => {
    if (!enabled || !text) return;
    const handler = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable || t.tagName === "BUTTON")) return;
      e.preventDefault();
      void speak(text, { rate: tts.rate, voiceURI: tts.voiceURI, preferGenerated: tts.preferGenerated });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [text, enabled, tts]);
}

export function playText(text: string, rate?: number) {
  const tts = useSettings.getState().settings.tts;
  return speak(text, { rate: rate ?? tts.rate, voiceURI: tts.voiceURI, preferGenerated: tts.preferGenerated });
}
