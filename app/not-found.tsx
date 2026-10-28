"use client";
import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { XiaoMo } from "@/components/ornament/mascot";
import { WordPage } from "@/components/flashcards/word-page";
import { Reader } from "@/components/reading/reader";
import { VideoPlayerPage } from "@/components/videos/video-player";
import { BASE_PATH } from "@/lib/base-path";

const noop = () => () => undefined;
const usePath = () =>
  useSyncExternalStore(
    noop,
    () => window.location.pathname,
    () => null, // en el prerender no hay URL real
  );

function resolve(pathname: string): { kind: "word" | "reading" | "video"; id: string } | null {
  let p = pathname;
  if (BASE_PATH && p.startsWith(BASE_PATH)) p = p.slice(BASE_PATH.length);
  p = p.replace(/\/+$/, "");
  const m = p.match(/^\/(flashcards|lectura|videos)\/([^/]+)$/);
  if (!m) return null;
  const id = decodeURIComponent(m[2]);
  return { kind: m[1] === "flashcards" ? "word" : m[1] === "lectura" ? "reading" : "video", id };
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
  if (fb?.kind === "word") return <WordPage id={fb.id} />;
  if (fb?.kind === "reading") return <Reader id={fb.id} />;
  if (fb?.kind === "video") return <VideoPlayerPage id={fb.id} />;

  return (
    <div className="mx-auto max-w-lg py-10">
      <EmptyState
        icon={<XiaoMo size={72} mood="think" />}
        title="Esta página no existe"
        zh={{ zh: "此路不通", py: "cǐ lù bù tōng", es: "Por aquí no se pasa." }}
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
