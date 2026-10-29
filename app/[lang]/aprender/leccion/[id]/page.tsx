import type { Metadata } from "next";
import { contentFor } from "@/lib/languages/static-content";
import { LessonPlayer } from "@/components/learn/lesson-player";

export const metadata: Metadata = { title: "Lección" };

// Exportación estática (GitHub Pages): solo se pregeneran los ids conocidos. Los creados por el usuario
// (palabras, lecturas importadas, vídeos añadidos) se resuelven en app/not-found.tsx a partir de la URL.
export const dynamicParams = false;
export function generateStaticParams({ params }: { params: { lang: string } }) {
  return contentFor(params.lang).units.flatMap((u) => u.lessons.map((l) => ({ id: l.id })));
}

export default async function Page({ params }: PageProps<"/[lang]/aprender/leccion/[id]">) {
  const { id } = await params;
  return <LessonPlayer lessonId={decodeURIComponent(id)} />;
}
