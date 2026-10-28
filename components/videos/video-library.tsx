"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Clock, Link2, Plus, Trash2, Video as VideoIcon } from "lucide-react";
import { db } from "@/lib/db";
import { addVideoByUrl, formatDuration, loadCuratedIndex, loadCuratedVideo, type CuratedVideoMeta } from "@/lib/videos";
import { useKnowledge } from "@/lib/knowledge";
import { useDictionary } from "@/lib/dictionary/service";
import { comprehensionOfLines } from "@/lib/videos/breakdown";
import { Button } from "@/components/ui/button";
import { Badge, Card, Input, PageHeader, SectionTitle, Spinner } from "@/components/ui/primitives";
import { SealTag } from "@/components/ornament/seal";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function VideoLibrary() {
  const [curated, setCurated] = useState<CuratedVideoMeta[] | null>(null);
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const dictStatus = useDictionary((s) => s.status);
  const load = useDictionary((s) => s.load);
  const known = useKnowledge((s) => s.known);
  const knownChars = useKnowledge((s) => s.knownChars);
  const mine = useLiveQuery(() => db.videos.where("source").equals("user").reverse().sortBy("addedAt"), []) ?? [];

  useEffect(() => {
    if (dictStatus === "idle") void load();
    void loadCuratedIndex().then(setCurated);
  }, [dictStatus, load]);

  // % de comprensión de cada vídeo curado (carga perezosa de transcripciones)
  useEffect(() => {
    if (!curated || dictStatus !== "ready") return;
    let cancelled = false;
    void (async () => {
      const out: Record<string, number> = {};
      for (const v of curated) {
        const doc = await loadCuratedVideo(v.id);
        if (doc) out[v.id] = comprehensionOfLines(doc.lines, known, knownChars).ratio;
        if (cancelled) return;
      }
      setRatios(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [curated, dictStatus, known, knownChars]);

  const mineRatios = useMemo(() => {
    if (dictStatus !== "ready") return {};
    const out: Record<string, number> = {};
    for (const v of mine) out[v.id] = comprehensionOfLines(v.lines, known, knownChars).ratio;
    return out;
  }, [mine, known, knownChars, dictStatus]);

  const add = async () => {
    if (!url.trim()) return;
    setBusy(true);
    try {
      const v = await addVideoByUrl(url.trim());
      toast.success("Vídeo añadido", `${v.lines.length} líneas de subtítulos`);
      setUrl("");
    } catch (e) {
      toast.error("No se pudo añadir el vídeo", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Vídeos" zh="视频" subtitle="Subtítulos interactivos con pinyin y traducción, repetición por línea, pausa automática, velocidad y minado de frases. Pega cualquier URL de YouTube con subtítulos en chino." />
      <Card>
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          <label htmlFor="video-url" className="sr-only">
            URL de YouTube
          </label>
          <div className="relative min-w-0 flex-1">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
            <Input id="video-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" className="h-11 pl-9" inputMode="url" />
          </div>
          <Button type="submit" variant="ink" size="lg" className="h-11" disabled={busy || !url.trim()}>
            {busy ? <Spinner className="size-4 border-paper/50 border-t-paper" /> : <Plus />} Añadir
          </Button>
        </form>
        <p className="mt-2 text-xs text-ink-faint">Obtiene la transcripción con yt-dlp (incluido) en el servidor local. Si el vídeo solo tiene subtítulos tradicionales, se convierten a simplificado. Sin subtítulos no es posible (transcripción local con faster-whisper: ver README).</p>
      </Card>

      {mine.length ? (
        <section>
          <SectionTitle>Mis vídeos</SectionTitle>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mine.map((v) => (
              <VideoCard key={v.id} id={v.id} title={v.title} channel={v.channel} thumbnail={v.thumbnail} lines={v.lines.length} ratio={mineRatios[v.id]} onDelete={() => void db.videos.delete(v.id)} />
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <SectionTitle>Vídeos curados para principiantes</SectionTitle>
        {!curated ? (
          <Spinner />
        ) : !curated.length ? (
          <p className="text-sm text-ink-faint">No hay vídeos curados (ejecuta npm run videos:fetch).</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {curated.map((v) => (
              <VideoCard key={v.id} id={v.id} title={v.title} channel={v.channel} thumbnail={v.thumbnail} duration={v.durationSeconds} level={v.level} lines={v.lines} description={v.description} tags={v.tags} ratio={ratios[v.id]} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Tono del porcentaje conocido: celadón (≥90), oro (≥75), tinta (resto). El rojo se reserva a los sellos. */
function ratioVariant(r: number): "jade" | "gold" | "default" {
  return r >= 0.9 ? "jade" : r >= 0.75 ? "gold" : "default";
}

function VideoCard({ id, title, channel, thumbnail, duration, level, lines, description, tags, ratio, onDelete }: { id: string; title: string; channel?: string; thumbnail?: string; duration?: number; level?: number; lines: number; description?: string; tags?: string[]; ratio?: number; onDelete?: () => void }) {
  return (
    <li className="card-paper group flex flex-col overflow-hidden p-0 transition-[box-shadow,transform] duration-[var(--dur-ui)] ease-[var(--ease-ink)] hover:shadow-[var(--shadow-paper-hover,var(--shadow-paper))] motion-safe:hover:-translate-y-px">
      <Link href={`/videos/${id}`} className="flex flex-1 flex-col focus-visible:outline-none">
        {/* miniatura dentro de un marco de tinta fino */}
        <div className="p-2.5 pb-0">
          <div className={cn("relative aspect-video overflow-hidden rounded-[8px] border border-ink/30 bg-paper-sunk", "after:pointer-events-none after:absolute after:inset-[3px] after:rounded-[6px] after:border after:border-paper-raised/60")}>
            {thumbnail || id ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <VideoIcon className="absolute inset-0 m-auto size-8 text-ink-faint" />
            )}
            {duration ? (
              <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-[4px] bg-ink/85 px-1.5 py-0.5 text-[11px] tabular-nums text-paper">
                <Clock className="size-3" aria-hidden="true" />
                {formatDuration(duration)}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-1 flex-col p-3.5">
          <p className="line-clamp-2 font-medium leading-snug text-ink">{title}</p>
          {channel ? <p className="mt-0.5 text-xs text-ink-faint">{channel}</p> : null}
          {description ? <p className="mt-1.5 line-clamp-2 text-xs text-ink-soft">{description}</p> : null}
          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
            {level ? <SealTag>HSK {level}</SealTag> : null}
            <Badge variant="outline">{lines} líneas</Badge>
            {ratio !== undefined ? <Badge variant={ratioVariant(ratio)}>{Math.round(ratio * 100)} % conocido</Badge> : null}
            {tags?.slice(0, 2).map((t) => (
              <Badge key={t} variant="muted">
                #{t}
              </Badge>
            ))}
          </div>
        </div>
      </Link>
      {onDelete ? (
        <button onClick={onDelete} className="flex w-full items-center justify-center gap-1 border-t border-line py-1.5 text-xs text-ink-faint transition-colors hover:bg-paper-sunk hover:text-danger">
          <Trash2 className="size-3.5" /> quitar
        </button>
      ) : null}
    </li>
  );
}
