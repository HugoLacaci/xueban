"use client";
import { useSearchParams } from "next/navigation";
import { BookText, Video } from "lucide-react";
import { useLangRouter } from "@/lib/languages/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/primitives";
import { ReadingList } from "@/components/reading/reading-list";
import { VideoLibrary } from "@/components/videos/video-library";

/** Escuchar y leer 听读: lecturas graduadas y vídeos con subtítulos en dos pestañas (misma URL con ?tab=). */
export function ListenReadPage() {
  const sp = useSearchParams();
  const router = useLangRouter();
  const tab = sp.get("tab") === "videos" ? "videos" : "lectura";
  return (
    <div>
      <Tabs value={tab} onValueChange={(v) => router.replace(`/escuchar-leer?tab=${v}`)}>
        <TabsList className="mb-2">
          <TabsTrigger value="lectura">
            <BookText className="mr-1 size-4" /> Lectura
          </TabsTrigger>
          <TabsTrigger value="videos">
            <Video className="mr-1 size-4" /> Vídeos
          </TabsTrigger>
        </TabsList>
        <TabsContent value="lectura">
          <ReadingList />
        </TabsContent>
        <TabsContent value="videos">
          <VideoLibrary />
        </TabsContent>
      </Tabs>
    </div>
  );
}
