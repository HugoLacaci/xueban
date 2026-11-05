"use client";
/**
 * Study Hall › Canciones: canciones populares chinas y canciones para practicar. Al abrir una, se consigue
 * la letra sincronizada (subtítulos del vídeo o LRCLIB) y se abre el reproductor con subtítulos interactivos.
 */
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Check, Music2 } from "lucide-react";
import { useLangRouter } from "@/lib/languages/link";
import { db } from "@/lib/db";
import { addVideoByUrl } from "@/lib/videos";
import { saveSongShell, saveSongWithLyrics } from "@/lib/videos/lyrics";
import { SONGS, songTitle, type Song, type SongKind } from "@/lib/videos/songs";
import { getActivePack } from "@/lib/languages/registry";
import { Badge, Spinner } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const SECTIONS: { kind: SongKind; title: string; zh: string; blurb: string }[] = [
  { kind: "practica", title: "Para practicar", zh: "练习歌曲", blurb: "Lentas, con pronunciación clara y frases que se repiten: ideales para cantar con el pinyin activado." },
  { kind: "popular", title: "Populares", zh: "流行歌曲", blurb: "Lo que suena en China y lo que se canta en el KTV. Más rápidas: usa 0,75× y el bucle de línea." },
];

async function prepare(song: Song): Promise<number> {
  const prev = await db.videos.get(song.id);
  if (prev?.lines.length) return prev.lines.length;
  if (song.captions) {
    try {
      const v = await addVideoByUrl(song.id);
      if (v.lines.length) {
        await db.videos.update(song.id, { title: songTitle(song), channel: song.artist || v.channel });
        return v.lines.length;
      }
    } catch {
      /* sin servidor o sin subtítulos → LRCLIB */
    }
  }
  if (!song.manualLyrics) {
    try {
      const v = await saveSongWithLyrics({ id: song.id, title: songTitle(song), artist: song.artist, track: song.track, duration: song.duration });
      if (v.lines.length) return v.lines.length;
    } catch (e) {
      toast.error("No se pudo consultar LRCLIB", (e as Error).message);
    }
  }
  // sin letra automática: se abre igualmente y el reproductor pide la letra
  if (!(await db.videos.get(song.id))) await saveSongShell({ id: song.id, title: songTitle(song), artist: song.artist });
  return 0;
}

export function SongsPanel() {
  const router = useLangRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const saved = useLiveQuery(async () => new Set((await db.videos.bulkGet(SONGS.map((s) => s.id))).filter((v) => v?.lines.length).map((v) => v!.id)), []) ?? new Set<string>();
  const levels = getActivePack().exam.levels;

  const open = async (s: Song) => {
    setBusy(s.id);
    try {
      const n = await prepare(s);
      if (!n) toast.info("Esta canción no tiene letra automática", "Pega la letra sincronizada (.lrc) en el panel de la derecha.");
      router.push(`/videos/${s.id}?de=canciones`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      {SECTIONS.map((sec) => (
        <section key={sec.kind}>
          <div className="mb-2 flex flex-wrap items-baseline gap-x-2">
            <h2 className="font-serif-es text-ink text-lg font-semibold">{sec.title}</h2>
            <span lang="zh-CN" className="zh-kai text-cinnabar text-sm">
              {sec.zh}
            </span>
            <p className="text-ink-faint w-full text-sm">{sec.blurb}</p>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {SONGS.filter((s) => s.kind === sec.kind).map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => void open(s)}
                  disabled={busy !== null}
                  className={cn("card-paper hover:border-ink/40 flex h-[104px] w-full items-stretch gap-3 overflow-hidden p-2 text-left transition-colors disabled:opacity-70")}
                >
                  <span className="border-line relative h-full w-[112px] shrink-0 overflow-hidden rounded-[6px] border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://i.ytimg.com/vi/${s.id}/mqdefault.jpg`} alt="" className="h-full w-full object-cover" loading="lazy" />
                    {busy === s.id ? (
                      <span className="bg-paper/70 absolute inset-0 flex items-center justify-center">
                        <Spinner className="size-5" />
                      </span>
                    ) : null}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col overflow-hidden py-0.5">
                    <span className="flex min-w-0 items-baseline gap-1.5 whitespace-nowrap">
                      <span lang="zh-CN" className="zh-serif text-ink truncate text-lg leading-tight">
                        {s.track}
                      </span>
                      {s.artist ? (
                        <span lang="zh-CN" className="text-ink-faint min-w-0 truncate text-xs">
                          {s.artist}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-ink-soft mt-0.5 line-clamp-2 text-xs leading-snug" title={s.note}>
                      {s.note}
                    </span>
                    <span className="mt-auto flex items-center gap-1 overflow-hidden">
                      <Badge variant="outline" className="shrink-0">
                        {levels[s.level - 1]?.label ?? `nivel ${s.level}`}
                      </Badge>
                      {saved.has(s.id) ? (
                        <Badge variant="jade" className="shrink-0">
                          <Check className="mr-0.5 size-3" /> letra lista
                        </Badge>
                      ) : s.manualLyrics ? (
                        <Badge variant="muted" className="shrink-0">
                          pegar letra
                        </Badge>
                      ) : (
                        <Badge variant="muted" className="shrink-0">
                          <Music2 className="mr-0.5 size-3" /> {s.captions ? "subtítulos" : "letra auto"}
                        </Badge>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="text-ink-faint text-xs">
        Las letras no forman parte de la app: se obtienen al abrir cada canción de los subtítulos del propio vídeo o de{" "}
        <a href="https://lrclib.net" target="_blank" rel="noreferrer" className="underline underline-offset-2">
          LRCLIB
        </a>{" "}
        (letras sincronizadas abiertas) y se guardan solo en tu navegador. Si la letra va adelantada o retrasada respecto al vídeo, ajústala con los botones «letra ±» del reproductor.
      </p>
    </div>
  );
}
