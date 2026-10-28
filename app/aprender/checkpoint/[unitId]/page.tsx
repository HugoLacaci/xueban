import type { Metadata } from "next";
import { UNITS } from "@/lib/course";
import { Checkpoint } from "@/components/learn/checkpoint";

export const metadata: Metadata = { title: "Checkpoint" };

// Exportación estática (GitHub Pages): solo se pregeneran los ids conocidos. Los creados por el usuario
// (palabras, lecturas importadas, vídeos añadidos) se resuelven en app/not-found.tsx a partir de la URL.
export const dynamicParams = false;
export function generateStaticParams() {
  return UNITS.map((u) => ({ unitId: u.id }));
}

export default async function Page({ params }: PageProps<"/aprender/checkpoint/[unitId]">) {
  const { unitId } = await params;
  return <Checkpoint unitId={decodeURIComponent(unitId)} />;
}
