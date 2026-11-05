"use client";
/**
 * Importar subtítulos o letra a un vídeo ya guardado (o a uno nuevo): pega el texto o sube un archivo
 * .lrc / .srt / .vtt en la lengua meta y, opcionalmente, la traducción. Sirve para canciones cuyo vídeo
 * no trae subtítulos y para la versión estática de la app (sin servidor de transcripciones).
 */
import { useState } from "react";
import { FileUp } from "lucide-react";
import { addVideoFromSubtitles } from "@/lib/videos";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

function FileOrPaste({ label, value, onChange, optional }: { label: string; value: string; onChange: (v: string) => void; optional?: boolean }) {
  return (
    <label className="block min-w-0 flex-1">
      <span className="text-ink-soft mb-1 flex items-center justify-between gap-2 text-xs font-medium">
        <span>
          {label} {optional ? <span className="text-ink-faint font-normal">(opcional)</span> : null}
        </span>
        <span className="text-ink-faint hover:text-ink relative inline-flex cursor-pointer items-center gap-1 font-normal">
          <FileUp className="size-3.5" /> subir archivo
          <input
            type="file"
            accept=".lrc,.srt,.vtt,.txt,text/plain,text/vtt"
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) onChange(await f.text());
              e.target.value = "";
            }}
          />
        </span>
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        spellCheck={false}
        placeholder={"[00:12.30]月亮代表我的心\n…  o bien un .srt / .vtt"}
        className="border-line bg-paper-raised focus-visible:ring-lacquer/30 scrollbar-thin w-full resize-y rounded-[8px] border px-2.5 py-2 font-mono text-xs focus-visible:ring-2 focus-visible:outline-none"
      />
    </label>
  );
}

export function LyricsImport({ url, title, onDone, className }: { url: string; title?: string; onDone?: (id: string) => void; className?: string }) {
  const [target, setTarget] = useState("");
  const [tr, setTr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <FileOrPaste label="Letra / subtítulos en chino (.lrc, .srt, .vtt)" value={target} onChange={setTarget} />
        <FileOrPaste label="Traducción (.lrc, .srt, .vtt)" value={tr} onChange={setTr} optional />
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-ink-faint text-[11px]">Las letras sincronizadas .lrc se encuentran buscando «nombre de la canción lrc». Se guardan solo en tu navegador.</p>
        <Button
          size="sm"
          variant="ink"
          disabled={busy || !target.trim()}
          onClick={async () => {
            setBusy(true);
            try {
              const v = await addVideoFromSubtitles(url, target, tr.trim() || undefined, title);
              toast.success("Subtítulos añadidos", `${v.lines.length} líneas`);
              onDone?.(v.id);
            } catch (e) {
              toast.error("No se pudieron leer los subtítulos", (e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Usar estos subtítulos
        </Button>
      </div>
    </div>
  );
}
