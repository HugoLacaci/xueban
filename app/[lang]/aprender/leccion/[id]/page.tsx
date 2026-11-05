import type { Metadata } from "next";
import { contentFor } from "@/lib/languages/static-content";
import { LessonPlayer } from "@/components/learn/lesson-player";
import { LESSON_MAP } from "@/lib/course/migration";
import { CURRICULUM_UNITS } from "@/content/zh/curriculum";

export const metadata: Metadata = { title: "Lección" };

// Exportación estática (GitHub Pages): solo se pregeneran los ids conocidos. Los creados por el usuario
// (palabras, lecturas importadas, vídeos añadidos) se resuelven en app/not-found.tsx a partir de la URL.
export const dynamicParams = false;
export function generateStaticParams({ params }: { params: { lang: string } }) {
  const ids = contentFor(params.lang).units.flatMap((u) => u.lessons.map((l) => l.id));
  // temario v2 activo: también las lecciones antiguas (u01-l1…), que redirigen a su equivalente nueva
  if (params.lang === "zh" && ids.some((id) => /^(e0|a1)-/.test(id))) for (const old of Object.keys(LESSON_MAP)) if (!ids.includes(old)) ids.push(old);
  // vista previa del temario v2 mientras no está activo (se abre por URL)
  if (params.lang === "zh") for (const u of CURRICULUM_UNITS) for (const l of u.lessons) if (!ids.includes(l.id)) ids.push(l.id);
  return ids.map((id) => ({ id }));
}

export default async function Page({ params }: PageProps<"/[lang]/aprender/leccion/[id]">) {
  const { id } = await params;
  return <LessonPlayer lessonId={decodeURIComponent(id)} />;
}
