"use client";
/**
 * Study Hall › YouTube: pega cualquier vídeo de YouTube y se abre el reproductor con subtítulos interactivos
 * debajo del vídeo (pinyin opcional encima, traducción debajo, palabras pulsables) y el registro de diálogos
 * a la derecha (pulsar una línea salta a ese momento).
 */
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link2, Play, Trash2 } from "lucide-react";
import Link, { useLangRouter } from "@/lib/languages/link";
import { db } from "@/lib/db";
import { addVideoByUrl, NoTranscriptServerError, parseYouTubeIdClient } from "@/lib/videos";
import { getActiveLang } from "@/lib/languages/registry";
import { Button } from "@/components/ui/button";
import { Card, Input, Spinner } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { Mixed } from "@/components/target/mixed";
import { LyricsImport } from "@/components/videos/lyrics-import";

export function YouTubePanel() {
  const router = useLangRouter();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState<string | null>(null); // URL pendiente de subtítulos subidos a mano
  const mine = useLiveQuery(() => db.videos.where("[lang+source]").equals([getActiveLang(), "user"]).reverse().sortBy("addedAt"), []) ?? [];
  const open = (id: string) => router.push(`/videos/${encodeURIComponent(id)}?de=study-hall`);

  const go = async () => {
    const u = url.trim();
    if (!u) return;
    if (!parseYouTubeIdClient(u)) {
      toast.error("Esa URL no parece de YouTube", "Pega un enlace tipo youtube.com/watch?v=… o youtu.be/…");
      return;
    }
    setBusy(true);
    setManual(null);
    try {
      const v = await addVideoByUrl(u, { reuse: true });
      open(v.id);
    } catch (e) {
      if (e instanceof NoTranscriptServerError || /no tiene subtítulos/.test((e as Error).message)) setManual(u);
      toast.error("No se pudieron sacar los subtítulos automáticamente", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-ink mb-1 font-medium">Mira cualquier vídeo de YouTube con subtítulos interactivos</p>
        <p className="text-ink-soft mb-3 text-sm">
          Debajo del vídeo irá saliendo cada frase (con pinyin encima si lo activas y la traducción debajo); pulsa una palabra para ver su significado. A la derecha, el registro de todos los diálogos: pulsa una línea para saltar a ese momento.
        </p>
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void go();
          }}
        >
          <label htmlFor="sh-yt-url" className="sr-only">
            URL de YouTube
          </label>
          <div className="relative min-w-0 flex-1">
            <Link2 className="text-ink-faint pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden="true" />
            <Input id="sh-yt-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" className="h-11 pl-9" inputMode="url" />
          </div>
          <Button type="submit" variant="ink" size="lg" className="h-11" disabled={busy || !url.trim()}>
            {busy ? <Spinner className="border-paper/50 border-t-paper size-4" /> : <Play />} {busy ? "Sacando subtítulos…" : "Ver con subtítulos"}
          </Button>
        </form>
        <p className="text-ink-faint mt-2 text-xs">
          Usa los subtítulos chinos del vídeo (manuales o automáticos si el vídeo está en chino) y la traducción al español de YouTube. Funciona con la app en local (<code>npm run dev</code>); en la versión publicada, o si el vídeo no tiene subtítulos, puedes{" "}
          <button type="button" className="text-indigo underline underline-offset-2" onClick={() => setManual(url.trim() || "")}>
            subir los subtítulos a mano
          </button>
          .
        </p>
        {manual !== null ? (
          <div className="border-line mt-3 border-t pt-3">
            {!parseYouTubeIdClient(manual) ? <p className="text-ink-soft mb-2 text-sm">Primero pega arriba la URL del vídeo.</p> : null}
            <LyricsImport url={manual} onDone={(id) => open(id)} />
          </div>
        ) : null}
      </Card>

      {mine.length ? (
        <section>
          <p className="text-ink-faint mb-2 text-[11px] font-semibold tracking-[0.12em] uppercase">Tus vídeos ({mine.length})</p>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {mine.slice(0, 12).map((v) => (
              <li key={v.id} className="card-paper flex h-[76px] items-center gap-3 overflow-hidden p-2">
                <Link href={`/videos/${encodeURIComponent(v.id)}?de=study-hall`} className="flex min-w-0 flex-1 items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`} alt="" className="border-line h-[58px] w-[103px] shrink-0 rounded-[6px] border object-cover" loading="lazy" />
                  <span className="min-w-0">
                    <span className="text-ink line-clamp-2 text-sm leading-snug font-medium">
                      <Mixed>{v.title}</Mixed>
                    </span>
                    <span className="text-ink-faint block truncate text-xs">{v.lines.length ? `${v.lines.length} líneas` : "sin subtítulos"}</span>
                  </span>
                </Link>
                <button type="button" onClick={() => void db.videos.delete(v.id)} className="text-ink-faint hover:text-danger shrink-0 rounded p-1" aria-label="Quitar vídeo" title="Quitar">
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
