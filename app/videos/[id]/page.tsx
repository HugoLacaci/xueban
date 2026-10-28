import type { Metadata } from "next";
import { VideoPlayerPage } from "@/components/videos/video-player";

export const metadata: Metadata = { title: "Vídeo" };

export default async function Page({ params }: PageProps<"/videos/[id]">) {
  const { id } = await params;
  return <VideoPlayerPage id={decodeURIComponent(id)} />;
}
