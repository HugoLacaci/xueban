import type { Metadata } from "next";
import { contentFor } from "@/lib/languages/static-content";
import { VideoPlayerPage } from "@/components/videos/video-player";

export const metadata: Metadata = { title: "Vídeo" };

// Exportación estática (GitHub Pages): solo se pregeneran los ids conocidos. Los creados por el usuario
// (palabras, lecturas importadas, vídeos añadidos) se resuelven en app/not-found.tsx a partir de la URL.
export const dynamicParams = false;
export function generateStaticParams({ params }: { params: { lang: string } }) {
  return contentFor(params.lang).videoIds.map((id) => ({ id }));
}

export default async function Page({ params }: PageProps<"/[lang]/videos/[id]">) {
  const { id } = await params;
  return <VideoPlayerPage id={decodeURIComponent(id)} />;
}
