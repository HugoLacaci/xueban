"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "@/lib/languages/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, EyeOff, List, Moon, Pause, Pickaxe, Play, Repeat, Repeat1, Mic, Sun, Volume2 } from "lucide-react";
import { db, logStudy, type VideoLine } from "@/lib/db";
import { loadVideo, type VideoDoc } from "@/lib/videos";
import { analyzeLine, comprehensionOfLines } from "@/lib/videos/breakdown";
import { useKnowledge } from "@/lib/knowledge";
import { useDictionary } from "@/lib/dictionary/service";
import { getActivePack } from "@/lib/languages/registry";
import { useSettings } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Badge, PageHeader, Spinner, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/primitives";
import { ChineseText } from "@/components/target/target-text";
import { Pinyin } from "@/components/target/reading";
import { ScreenFrame } from "@/components/ornament/borders";
import { SealTag } from "@/components/ornament/seal";
import { QuickAddDialog } from "@/components/flashcards/quick-add";
import { cn } from "@/lib/utils";
import { targetLang } from "@/lib/languages/registry";
import { ui } from "@/lib/languages/ui-text";
import { Mixed } from "@/components/target/mixed";

declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement | string, opts: unknown) => YTPlayer; PlayerState: { PLAYING: number; PAUSED: number; ENDED: number } };
    onYouTubeIframeAPIReady?: () => void;
  }
}
interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(s: number, allow?: boolean): void;
  getCurrentTime(): number;
  getPlayerState(): number;
  setPlaybackRate(r: number): void;
  destroy(): void;
}

function loadYT(): Promise<void> {
  return new Promise((resolve) => {
    if (window.YT?.Player) return resolve();
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    }
  });
}

/** «Modo cine»: tokens de noche aplicados solo al contenedor del reproductor (no cambia el tema global). */
const CINEMA_VARS: React.CSSProperties = {
  ["--paper" as string]: "18 17 16",
  ["--paper-raised" as string]: "28 27 25",
  ["--paper-sunk" as string]: "12 11 10",
  ["--ink" as string]: "236 228 214",
  ["--ink-soft" as string]: "190 180 164",
  ["--ink-faint" as string]: "150 140 126",
  ["--line" as string]: "58 54 49",
  ["--shadow-paper" as string]: "0 1px 2px rgb(0 0 0 / 0.3), 0 8px 24px -8px rgb(0 0 0 / 0.5)",
  ["--shadow-sunk" as string]: "inset 0 1px 2px rgb(0 0 0 / 0.4)",
};

export function VideoPlayerPage({ id }: { id: string }) {
  const [video, setVideo] = useState<VideoDoc | null | undefined>(undefined);
  const dictStatus = useDictionary((s) => s.status);
  const load = useDictionary((s) => s.load);
  useEffect(() => {
    if (dictStatus === "idle") void load();
    void getActivePack().levelLists();
    void loadVideo(id).then(setVideo);
  }, [id, dictStatus, load]);
  if (video === undefined) return <Spinner />;
  if (!video) {
    return (
      <div>
        <PageHeader title="Vídeo no encontrado" />
        <Button asChild variant="secondary">
          <Link href="/videos">
            <ArrowLeft /> Volver
          </Link>
        </Button>
      </div>
    );
  }
  return <Player video={video} />;
}

const pill = (on: boolean) => cn("min-h-8 rounded-[6px] px-2 text-xs tabular-nums transition-colors", on ? "bg-ink text-paper" : "text-ink-soft hover:bg-paper-sunk hover:text-ink");

function Player({ video }: { video: VideoDoc }) {
  const settings = useSettings((s) => s.settings);
  const update = useSettings((s) => s.update);
  const known = useKnowledge((s) => s.known);
  const knownChars = useKnowledge((s) => s.knownChars);
  const deck = useKnowledge((s) => s.deck);
  const dictStatus = useDictionary((s) => s.status);
  const playerRef = useRef<YTPlayer | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [cur, setCur] = useState(-1);
  const [rate, setRate] = useState(1);
  const [autoPause, setAutoPause] = useState(false);
  const [repeatLine, setRepeatLine] = useState(false);
  const [ab, setAb] = useState<{ a: number | null; b: number | null }>({ a: null, b: null });
  const [shadow, setShadow] = useState(false);
  const [cinema, setCinema] = useState(false);
  const [mining, setMining] = useState<{ word: string; line: VideoLine } | null>(null);
  const lastPausedLine = useRef(-1);
  const startedAt = useRef(0);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lines = video.lines;

  // comprensión
  const comp = useMemo(() => (dictStatus === "ready" ? comprehensionOfLines(lines, known, knownChars) : null), [lines, known, knownChars, dictStatus]);
  const analyses = useMemo(() => (dictStatus === "ready" ? lines.map((l) => analyzeLine(l.zh, known, new Set(deck.keys()), knownChars)) : []), [lines, known, deck, knownChars, dictStatus]);
  const newWords = useMemo(() => {
    const m = new Map<string, { hanzi: string; pinyin: string; meaning: string; hsk?: number; level?: string; count: number }>();
    for (const a of analyses) for (const w of a.newWords) m.set(w.hanzi, { ...w, count: (m.get(w.hanzi)?.count ?? 0) + 1 });
    return Array.from(m.values()).filter((w) => !deck.has(w.hanzi)).sort((a, b) => (a.hsk ?? 99) - (b.hsk ?? 99) || b.count - a.count);
  }, [analyses, deck]);

  // reproductor
  useEffect(() => {
    let destroyed = false;
    startedAt.current = Date.now();
    void loadYT().then(() => {
      if (destroyed || !hostRef.current || !window.YT) return;
      playerRef.current = new window.YT.Player(hostRef.current, {
        videoId: video.id,
        playerVars: { rel: 0, modestbranding: 1, cc_load_policy: 0, playsinline: 1 },
        events: {
          onReady: () => setReady(true),
          onStateChange: (e: { data: number }) => setPlaying(e.data === window.YT!.PlayerState.PLAYING),
        },
      });
    });
    return () => {
      destroyed = true;
      playerRef.current?.destroy();
      playerRef.current = null;
      const minutes = (Date.now() - startedAt.current) / 60000;
      if (minutes > 0.5) void logStudy({ start: startedAt.current, end: Date.now(), minutes, kind: "video", ref: video.id });
    };
  }, [video.id]);

  // sincronización de líneas
  useEffect(() => {
    if (!ready) return;
    const t = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      const now = p.getCurrentTime();
      setTime(now);
      const idx = lines.findIndex((l) => now >= l.start && now < l.end + 0.15);
      setCur((prev) => {
        if (idx !== prev) {
          // fin de línea anterior
          if (prev >= 0 && (autoPause || shadow) && lastPausedLine.current !== prev && now >= lines[prev].end - 0.05) {
            lastPausedLine.current = prev;
            p.pauseVideo();
            if (repeatLine) return prev;
          }
          if (repeatLine && prev >= 0 && now >= lines[prev].end - 0.05) {
            p.seekTo(lines[prev].start, true);
            return prev;
          }
        }
        return idx;
      });
      if (ab.a !== null && ab.b !== null && now >= ab.b) p.seekTo(ab.a, true);
    }, 150);
    return () => clearInterval(t);
  }, [ready, lines, autoPause, shadow, repeatLine, ab]);

  // desplazar la línea activa
  useEffect(() => {
    if (cur >= 0) lineRefs.current[cur]?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [cur]);

  const seekLine = useCallback(
    (i: number) => {
      const l = lines[i];
      if (!l || !playerRef.current) return;
      lastPausedLine.current = -1;
      playerRef.current.seekTo(l.start, true);
      playerRef.current.playVideo();
      setCur(i);
    },
    [lines],
  );
  const toggle = () => (playing ? playerRef.current?.pauseVideo() : playerRef.current?.playVideo());
  const changeRate = (r: number) => {
    setRate(r);
    playerRef.current?.setPlaybackRate(r);
  };

  // atajos
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === " ") {
        e.preventDefault();
        toggle();
      }
      if (e.key === "ArrowLeft") seekLine(Math.max(0, (cur >= 0 ? cur : 0) - 1));
      if (e.key === "ArrowRight") seekLine(Math.min(lines.length - 1, cur + 1));
      if (e.key === "r" || e.key === "R") seekLine(cur >= 0 ? cur : 0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur, playing, seekLine]);

  const active = cur >= 0 ? lines[cur] : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/videos" className="inline-flex min-h-9 items-center gap-1 rounded-md text-sm text-ink-faint hover:text-ink">
          <ArrowLeft className="size-4" /> Vídeos
        </Link>
        <div className="flex flex-wrap items-center gap-1.5">
          {comp ? <Badge variant={comp.ratio >= 0.9 ? "jade" : comp.ratio >= 0.75 ? "gold" : "default"}>Conoces el {Math.round(comp.ratio * 100)} %</Badge> : null}
          <Badge variant="outline">{lines.length} líneas</Badge>
          {video.level ? <SealTag>{getActivePack().exam.levels[video.level - 1]?.label ?? `Nivel ${video.level}`}</SealTag> : null}
          {video.reviewed === false ? <Badge variant="muted">transcripción sin revisar</Badge> : null}
          <Button size="sm" variant={cinema ? "ink" : "outline"} onClick={() => setCinema((c) => !c)} aria-pressed={cinema} title="Modo cine: oscurece solo el reproductor">
            {cinema ? <Sun /> : <Moon />} {cinema ? "modo papel" : "modo cine"}
          </Button>
        </div>
      </div>
      <h1 className="font-serif-es text-2xl font-semibold leading-tight tracking-tight text-ink sm:text-[28px]"><Mixed>{video.title}</Mixed></h1>

      <div className={cn("grid gap-4 rounded-[14px] transition-colors duration-300 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]", cinema && "-mx-2 bg-paper p-3 text-ink sm:-mx-3 sm:p-4")} style={cinema ? CINEMA_VARS : undefined} data-cinema={cinema || undefined}>
        <div className="min-w-0">
          {/* reproductor en marco de biombo 屏风 */}
          <ScreenFrame className={cn("bg-paper-raised", cinema && "border-ink/40")}>
            <div className="aspect-video bg-black">
              <div ref={hostRef} className="h-full w-full" />
            </div>
          </ScreenFrame>
          {/* subtítulo activo */}
          <div className={cn("relative mt-3 min-h-24 rounded-[12px] border border-line bg-paper-raised px-4 py-3 text-center shadow-[var(--shadow-paper)]", active && "border-l-[3px] border-l-cinnabar")} aria-live="polite">
            {active ? (
              <>
                <ChineseText text={active.zh} size="xl" as="div" sourceRef={`video:${video.id}:${active.start}`} context={active.zh} />
                {settings.showTranslation && active.es ? <p className="mt-1 text-sm text-ink-soft"><Mixed>{active.es}</Mixed></p> : null}
              </>
            ) : (
              <p className="py-4 text-sm text-ink-faint">Pulsa ▶ o una línea de la transcripción.</p>
            )}
          </div>
          {/* controles */}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
            <Button size="icon-sm" variant="ghost" onClick={() => seekLine(Math.max(0, cur - 1))} title="Línea anterior (←)" aria-label="Línea anterior">
              <ChevronLeft />
            </Button>
            <Button size="icon" variant="ink" onClick={toggle} title="Reproducir / pausar (Espacio)" aria-label={playing ? "Pausar" : "Reproducir"}>
              {playing ? <Pause /> : <Play />}
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={() => seekLine(Math.min(lines.length - 1, cur + 1))} title="Línea siguiente (→)" aria-label="Línea siguiente">
              <ChevronRight />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => seekLine(cur >= 0 ? cur : 0)} title="Repetir línea (R)">
              <Repeat1 /> repetir
            </Button>
            <Button size="sm" variant={repeatLine ? "soft" : "ghost"} onClick={() => setRepeatLine((v) => !v)} aria-pressed={repeatLine} title="Bucle de la línea actual">
              <Repeat /> bucle línea
            </Button>
            <Button size="sm" variant={autoPause ? "soft" : "ghost"} onClick={() => setAutoPause((v) => !v)} aria-pressed={autoPause} title="Pausa automática al final de cada línea">
              <Pause /> auto-pausa
            </Button>
            <Button size="sm" variant={shadow ? "soft" : "ghost"} onClick={() => setShadow((v) => !v)} aria-pressed={shadow} title="Shadowing: pausa tras cada línea para que la repitas">
              <Mic /> shadowing
            </Button>
            <div className="flex items-center gap-0.5 rounded-[8px] border border-line p-0.5" role="group" aria-label="Velocidad">
              {[0.75, 1, 1.25].map((r) => (
                <button key={r} onClick={() => changeRate(r)} className={pill(rate === r)} aria-pressed={rate === r}>
                  {r}×
                </button>
              ))}
            </div>
            <div className="flex items-center gap-0.5 rounded-[8px] border border-line p-0.5" role="group" aria-label="Bucle A–B">
              <button onClick={() => setAb((s) => ({ ...s, a: time }))} className={cn(pill(ab.a !== null), ab.a !== null && "bg-celadon text-paper-raised")}>
                A{ab.a !== null ? ` ${ab.a.toFixed(0)}s` : ""}
              </button>
              <button onClick={() => setAb((s) => ({ ...s, b: time }))} className={cn(pill(ab.b !== null), ab.b !== null && "bg-celadon text-paper-raised")}>
                B{ab.b !== null ? ` ${ab.b.toFixed(0)}s` : ""}
              </button>
              {ab.a !== null || ab.b !== null ? (
                <button onClick={() => setAb({ a: null, b: null })} className={pill(false)} aria-label="Quitar bucle A–B">
                  ✕
                </button>
              ) : null}
            </div>
            <Button size="sm" variant="ghost" onClick={() => void update({ showTranslation: !settings.showTranslation })} aria-pressed={settings.showTranslation}>
              {settings.showTranslation ? <EyeOff /> : <Eye />} traducción
            </Button>
          </div>
        </div>

        <Tabs defaultValue="lines" className="min-w-0">
          <TabsList className="w-full">
            <TabsTrigger value="lines" className="flex-1">
              <List className="mr-1 size-4" /> Transcripción
            </TabsTrigger>
            <TabsTrigger value="vocab" className="flex-1">
              <Pickaxe className="mr-1 size-4" /> Vocabulario nuevo ({newWords.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="lines">
            <div className="max-h-[60vh] space-y-0.5 overflow-y-auto rounded-[12px] border border-line bg-paper-raised p-1.5 scrollbar-thin lg:max-h-[70vh]">
              {lines.map((l, i) => {
                const a = analyses[i];
                const isCur = i === cur;
                return (
                  <div
                    key={i}
                    ref={(el) => {
                      lineRefs.current[i] = el;
                    }}
                    className={cn("group rounded-[8px] border-l-[3px] py-2 pl-2.5 pr-2 transition-colors", isCur ? "border-l-cinnabar bg-ink/6" : "border-l-transparent hover:bg-paper-sunk/70")}
                    aria-current={isCur ? "true" : undefined}
                  >
                    <div className="flex items-start gap-2">
                      <button onClick={() => seekLine(i)} className="mt-1 shrink-0 rounded font-mono text-[10px] tabular-nums text-ink-faint hover:text-ink" title="Ir a esta línea" aria-label={`Ir a ${fmt(l.start)}`}>
                        {fmt(l.start)}
                      </button>
                      <div className="min-w-0 flex-1">
                        <ChineseText text={l.zh} size="md" as="div" sourceRef={`video:${video.id}:${l.start}`} context={l.zh} />
                        {settings.showTranslation && l.es ? <p className="text-xs text-ink-soft"><Mixed>{l.es}</Mixed></p> : null}
                        {a ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {a.newWords
                              .filter((w) => !deck.has(w.hanzi))
                              .slice(0, 4)
                              .map((w) => (
                                <button key={w.hanzi} onClick={() => setMining({ word: w.hanzi, line: l })} className="inline-flex min-h-6 items-center rounded-[4px] border border-celadon/50 bg-celadon/10 px-1.5 text-[11px] text-celadon-ink transition-colors hover:bg-celadon/20" title={`${w.pinyin} · ${w.meaning}`}>
                                  <span lang={targetLang()} className="zh">
                                    +{w.hanzi}
                                  </span>
                                  {w.level ? <span className="ml-0.5 text-[9px] opacity-70">{w.level}</span> : null}
                                </button>
                              ))}
                            {a.grammar.slice(0, 2).map((g) => (
                              <Link key={g.id} href={`/aprender/gramatica/${g.id}`} className="inline-flex min-h-6 items-center rounded-[4px] border border-line px-1.5 text-[11px] text-ink-faint hover:bg-paper-sunk hover:text-ink" title={g.title}>
                                <span lang={targetLang()} className="zh">
                                  {g.zh}
                                </span>
                              </Link>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <button onClick={() => setMining({ word: "", line: l })} className="shrink-0 rounded p-1 text-ink-faint opacity-0 transition-opacity hover:text-ink focus-visible:opacity-100 group-hover:opacity-100" title="Minar frase (crear tarjeta de frase)" aria-label="Minar frase">
                        <Pickaxe className="size-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
          <TabsContent value="vocab">
            <div className="max-h-[60vh] overflow-y-auto rounded-[12px] border border-line bg-paper-raised p-1.5 scrollbar-thin lg:max-h-[70vh]">
              {!newWords.length ? (
                <p className="p-3 text-sm text-ink-faint">{dictStatus === "ready" ? `¡Conoces todas las palabras de este vídeo! ${ui().feedback.ok}` : "Cargando diccionario…"}</p>
              ) : (
                <ul className="divide-y divide-line/80">
                  {newWords.map((w) => (
                    <li key={w.hanzi} className="flex items-center gap-3 px-2 py-2">
                      <span lang={targetLang()} className="zh-serif w-16 text-xl text-ink">
                        {w.hanzi}
                      </span>
                      <span className="min-w-0 flex-1">
                        <Pinyin text={w.pinyin} className="block text-sm" />
                        <span className="block truncate text-xs text-ink-soft">{w.meaning || "—"}</span>
                      </span>
                      {w.level ? <SealTag>{w.level}</SealTag> : <Badge variant="muted">fuera de las listas</Badge>}
                      <span className="text-xs tabular-nums text-ink-faint">×{w.count}</span>
                      <Button size="sm" variant="ghost" onClick={() => setMining({ word: w.hanzi, line: lines.find((l) => l.zh.includes(w.hanzi))! })}>
                        <Pickaxe /> añadir
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <p className="text-xs text-ink-faint">
        <Volume2 className="mr-1 inline size-3.5" aria-hidden="true" />
        Atajos: Espacio reproducir/pausar · ← → línea anterior/siguiente · R repetir · P pinyin · T traducción. Pulsa cualquier palabra para ver el diccionario y añadirla.
      </p>
      {mining ? (
        <QuickAddDialog
          open
          onOpenChange={(o) => {
            if (!o) setMining(null);
          }}
          initialHanzi={mining.word}
          initialExample={mining.line.zh}
          source="video"
          sourceRef={`video:${video.id}:${mining.line.start}-${mining.line.end}`}
          onSaved={async (wid) => {
            await db.words.update(wid, { exampleTranslation: mining.line.es, updatedAt: Date.now() });
          }}
        />
      ) : null}
    </div>
  );
}

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}
