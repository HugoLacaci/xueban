import type { Metadata } from "next";
import { UNITS } from "@/lib/course";
import { LessonPlayer } from "@/components/learn/lesson-player";

export const metadata: Metadata = { title: "Lección" };

// Exportación estática (GitHub Pages): solo se pregeneran los ids conocidos. Los creados por el usuario
// (palabras, lecturas importadas, vídeos añadidos) se resuelven en app/not-found.tsx a partir de la URL.
export const dynamicParams = false;
export function generateStaticParams() {
  return UNITS.flatMap((u) => u.lessons.map((l) => ({ id: l.id })));
}

export default async function Page({ params }: PageProps<"/aprender/leccion/[id]">) {
  const { id } = await params;
  return <LessonPlayer lessonId={decodeURIComponent(id)} />;
}
