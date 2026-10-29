"use client";
import { useSyncExternalStore } from "react";
import Link from "@/lib/languages/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { XiaoMo } from "@/components/ornament/mascot";
import { WordPage } from "@/components/flashcards/word-page";
import { Reader } from "@/components/reading/reader";
import { VideoPlayerPage } from "@/components/videos/video-player";
import { BASE_PATH } from "@/lib/base-path";
import { LanguageProvider } from "@/lib/languages/provider";
import { AppShell } from "@/components/layout/app-shell";
import type { Lang } from "@/lib/languages/types";
import { culture } from "@/lib/languages/ui-text";

const noop = () => () => undefined;
const usePath = () =>
  useSyncExternalStore(
    noop,
    () => window.location.pathname,
    () => null, // en el prerender no hay URL real
  );

function resolve(pathname: string): { kind: "word" | "reading" | "video"; id: string; lang: Lang } | null {
  let p = pathname;
  if (BASE_PATH && p.startsWith(BASE_PATH)) p = p.slice(BASE_PATH.length);
  p = p.replace(/\/+$/, "");
  const m = p.match(/^\/(zh|ja|ko)\/(flashcards|lectura|videos)\/([^/]+)$/);
  if (!m) return null;
  const id = decodeURIComponent(m[3]);
  return { kind: m[2] === "flashcards" ? "word" : m[2] === "lectura" ? "reading" : "video", id, lang: m[1] as Lang };
}

/**
 * Las rutas con identificador solo se pregeneran para los ids conocidos (exportación estática).
 * Lo que crea el usuario (palabras propias, lecturas importadas, vídeos añadidos) llega aquí:
 * leemos la URL real y pintamos la pantalla correspondiente. En GitHub Pages esta página es el 404.html.
 */
export default function NotFound() {
  const pathname = usePath();
  if (pathname === null) return null;
  const fb = resolve(pathname);
  if (fb)
    return (
      <LanguageProvider lang={fb.lang}>
        <AppShell>{fb.kind === "word" ? <WordPage id={fb.id} /> : fb.kind === "reading" ? <Reader id={fb.id} /> : <VideoPlayerPage id={fb.id} />}</AppShell>
      </LanguageProvider>
    );

  return (
    <div className="mx-auto max-w-lg py-10">
      <EmptyState
        icon={<XiaoMo size={72} mood="think" />}
        title="Esta página no existe"
        zh={{ zh: culture().notFound.text, py: culture().notFound.reading, es: culture().notFound.es }}
        description="Puede que el enlace esté mal escrito o que la página haya cambiado de sitio."
        action={
          <Button asChild>
            <Link href="/">Volver a Hoy</Link>
          </Button>
        }
      />
    </div>
  );
}
