import type { Metadata } from "next";
import { VideoLibrary } from "@/components/videos/video-library";

export const metadata: Metadata = { title: "Vídeos" };

export default function Page() {
  return <VideoLibrary />;
}
