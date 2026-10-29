"use client";
import { useState } from "react";
import Link from "@/lib/languages/link";
import { useLiveQuery } from "dexie-react-hooks";
import { BookOpen, ExternalLink, Headphones, Library, NotebookPen, Timer, Tv, Globe, ListMusic, Smartphone } from "lucide-react";
import { db } from "@/lib/db";
import { getArticles, articleCategories, getResources, type Resource } from "@/lib/study-hall";
import { getActivePack } from "@/lib/languages/registry";
import { Badge, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Lattice, MoonGate } from "@/components/ornament";
import { FilterChip } from "./filter-chip";
import { Pomodoro } from "./pomodoro";
import { NotesPanel } from "./notes";
import { cn } from "@/lib/utils";
import { getActiveLang } from "@/lib/languages/registry";
import { targetLang } from "@/lib/languages/registry";
import { pageNative } from "@/lib/languages/ui-text";
import { Mixed } from "@/components/target/mixed";

const KIND_ICON: Record<Resource["kind"], React.ReactNode> = {
  "youtube-channel": <Tv className="size-4" />,
  "youtube-playlist": <ListMusic className="size-4" />,
  "youtube-video": <Tv className="size-4" />,
  podcast: <Headphones className="size-4" />,
  website: <Globe className="size-4" />,
  app: <Smartphone className="size-4" />,
};

/** Bambú a tinta: tres cañas con nudos y hojas, visto por la ventana redonda. */
function Bamboo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 160" className={cn("h-full w-full text-ink", className)} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        {/* cañas */}
        <path d="M58 170 V118 M58 112 V62 M58 56 V10" strokeWidth="7" opacity="0.85" />
        <path d="M96 170 V128 M96 121 V74 M96 67 V22" strokeWidth="5.5" opacity="0.6" />
        <path d="M124 170 V136 M124 130 V92" strokeWidth="4" opacity="0.4" />
        {/* nudos */}
        <path d="M53 115 H63 M53 59 H63 M92 124 H100 M92 70 H100 M121 133 H127" strokeWidth="2" opacity="0.9" />
      </g>
      {/* hojas */}
      <g fill="currentColor">
        <path d="M58 64 C 40 56, 26 60, 14 72 C 30 70, 46 70, 58 64 Z" opacity="0.8" />
        <path d="M58 60 C 48 42, 36 36, 20 34 C 32 44, 44 54, 58 60 Z" opacity="0.65" />
        <path d="M60 26 C 72 14, 86 10, 104 12 C 90 20, 76 26, 60 26 Z" opacity="0.7" />
        <path d="M96 76 C 108 62, 122 58, 140 60 C 126 68, 112 74, 96 76 Z" opacity="0.5" />
        <path d="M96 80 C 110 82, 122 90, 130 104 C 116 96, 104 90, 96 80 Z" opacity="0.4" />
        <path d="M56 118 C 42 112, 30 116, 18 128 C 34 124, 46 122, 56 118 Z" opacity="0.55" />
      </g>
      {/* flor de ciruelo bermellón: un solo toque de color */}
      <g fill="rgb(var(--cinnabar))" opacity="0.9">
        <circle cx="30" cy="30" r="3.2" />
        <circle cx="36" cy="25" r="3.2" />
        <circle cx="35" cy="34" r="3.2" />
        <circle cx="27" cy="36" r="3" />
        <circle cx="25" cy="27" r="3" />
      </g>
    </svg>
  );
}

/** Cabecera del 书斋: ventana luna con bambú sobre celosía al 5 %. */
function StudyHallHeader({ classes }: { classes: number }) {
  return (
    <header className="card-paper relative overflow-hidden">
      <div className="text-ink">
        <Lattice variant="ice" opacity={0.05} size={44} />
      </div>
      <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-8 sm:p-7">
        <MoonGate size={132} className="mx-auto sm:mx-0">
          <Bamboo className="translate-y-2 scale-[1.15]" />
        </MoonGate>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <span className="zh-display block text-sm text-cinnabar" lang={targetLang()}>
            {pageNative("studyHall")}
          </span>
          <h1 className="font-serif-es text-[28px] font-semibold leading-tight tracking-tight text-ink sm:text-[34px]">Study Hall</h1>
          <p className="mx-auto mt-1.5 max-w-xl text-sm text-ink-faint sm:mx-0">Artículos breves sobre cómo aprender {getActivePack().meta.names.adjective}, recursos verificados por nivel, temporizador de incienso, notas y tu cuaderno de clase.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
            <Button asChild variant="ink">
              <Link href="/study-hall/cuaderno">
                <NotebookPen /> Cuaderno de clase{classes ? ` (${classes})` : ""}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/como-aprender">Cómo aprender</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

export function StudyHallHub({ tab = "articulos" }: { tab?: string }) {
  const [cat, setCat] = useState("");
  const [level, setLevel] = useState("");
  const classes = useLiveQuery(() => db.notes.where("[lang+kind]").equals([getActiveLang(), "class"]).count(), []) ?? 0;
  const articles = getArticles().filter((a) => !cat || a.category === cat);
  const resources = getResources().filter((r) => !level || r.level === level || r.level.includes(level));
  return (
    <div className="space-y-5">
      <StudyHallHeader classes={classes} />
      <Tabs defaultValue={tab}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="articulos">
            <BookOpen className="mr-1 size-4" /> Artículos
          </TabsTrigger>
          <TabsTrigger value="recursos">
            <Library className="mr-1 size-4" /> Recursos
          </TabsTrigger>
          <TabsTrigger value="pomodoro">
            <Timer className="mr-1 size-4" /> Pomodoro
          </TabsTrigger>
          <TabsTrigger value="notas">
            <NotebookPen className="mr-1 size-4" /> Notas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="articulos">
          <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por categoría">
            <FilterChip active={!cat} onClick={() => setCat("")}>
              todos
            </FilterChip>
            {articleCategories().map((c) => (
              <FilterChip key={c} active={cat === c} onClick={() => setCat(c)}>
                {c}
              </FilterChip>
            ))}
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a, i) => (
              <li key={a.id}>
                <Link href={`/study-hall/articulo/${a.id}`} className="card-paper group relative flex h-full flex-col gap-1.5 p-5 transition-[transform,box-shadow] duration-[var(--dur-ui)] ease-[var(--ease-ink)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)]">
                  <span className="flex items-start justify-between gap-2">
                    <span lang={targetLang()} className="zh-kai text-base leading-tight text-cinnabar">
                      {a.zh}
                    </span>
                    <span className="tabular shrink-0 font-serif-es text-xs text-ink-faint">{String(i + 1).padStart(2, "0")}</span>
                  </span>
                  <span className="font-serif-es text-lg font-semibold leading-snug tracking-tight text-ink group-hover:underline group-hover:decoration-ink/30 group-hover:underline-offset-4"><Mixed>{a.title}</Mixed></span>
                  <span className="text-sm leading-relaxed text-ink-soft"><Mixed>{a.summary}</Mixed></span>
                  <span className="mt-auto flex items-center gap-2 pt-3">
                    <Badge variant="outline">{a.category}</Badge>
                    <span className="tabular text-xs text-ink-faint">{a.minutes} min</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="recursos">
          <p className="mb-3 text-sm text-ink-faint">Todos los enlaces se han comprobado (YouTube oEmbed / HTTP 200) al generar la lista. Elige por nivel y destreza; lo ideal es ≥ 95 % de comprensión.</p>
          <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por nivel">
            {["", "0", "1", "2", "3"].map((l) => (
              <FilterChip key={l} active={level === l} onClick={() => setLevel(l)}>
                {l === "" ? "todos" : l === "0" ? "Desde cero" : `${getActivePack().exam.levels[Number(l) - 1]?.label ?? `nivel ${l}`}`}
              </FilterChip>
            ))}
          </div>
          <ul className="card-paper divide-y divide-line">
            {resources.map((r) => (
              <li key={r.url}>
                <a href={r.url} target="_blank" rel="noreferrer" className="flex gap-3 px-4 py-3 transition-colors duration-[var(--dur-ui)] hover:bg-paper-sunk/60 sm:px-5">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-paper-sunk text-ink-soft">{KIND_ICON[r.kind]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 font-medium text-ink">
                      <Mixed>{r.title}</Mixed> <ExternalLink className="size-3 text-ink-faint" />
                    </span>
                    <span className="block text-sm text-ink-soft">{r.why}</span>
                    <span className="mt-1.5 flex flex-wrap gap-1">
                      <Badge variant="jade">nivel {r.level}</Badge>
                      {r.duration ? <Badge variant="muted">{r.duration}</Badge> : null}
                      <Badge variant="outline">{r.language}</Badge>
                      {r.skills.slice(0, 3).map((s) => (
                        <Badge key={s} variant="muted">
                          {s}
                        </Badge>
                      ))}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="pomodoro">
          <Pomodoro />
        </TabsContent>

        <TabsContent value="notas">
          <NotesPanel />
        </TabsContent>
      </Tabs>
      <p className="text-sm text-ink-faint">
        ¿Nuevo en la app? Lee{" "}
        <Link href="/como-aprender" className="text-indigo underline underline-offset-2">
          Cómo aprender con Xuébàn
        </Link>{" "}
        (1 pantalla) y luego{" "}
        <Link href="/study-hall/articulo/como-estudiar-con-la-escuela" className="text-indigo underline underline-offset-2">
          cómo combinar la escuela con la app
        </Link>
        .
      </p>
    </div>
  );
}
