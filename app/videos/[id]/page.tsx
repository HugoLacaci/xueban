import type { Metadata } from "next";
import curated from "@/public/videos/index.json";
import { VideoPlayerPage } from "@/components/videos/video-player";

export const metadata: Metadata = { title: "Vídeo" };

// Exportación estática (GitHub Pages): solo se pregeneran los ids conocidos. Los creados por el usuario
// (palabras, lecturas importadas, vídeos añadidos) se resuelven en app/not-found.tsx a partir de la URL.
export const dynamicParams = false;
export function generateStaticParams() {
  return (curated as { id: string }[]).map((v) => ({ id: v.id }));
}

export default async function Page({ params }: PageProps<"/videos/[id]">) {
  const { id } = await params;
  return <VideoPlayerPage id={decodeURIComponent(id)} />;
}
