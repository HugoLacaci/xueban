import type { Metadata } from "next";
import { LessonPlayer } from "@/components/learn/lesson-player";

export const metadata: Metadata = { title: "Lección" };

export default async function Page({ params }: PageProps<"/aprender/leccion/[id]">) {
  const { id } = await params;
  return <LessonPlayer lessonId={decodeURIComponent(id)} />;
}
