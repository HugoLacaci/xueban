import type { Metadata } from "next";
import { READINGS } from "@/lib/readings";
import { Reader } from "@/components/reading/reader";

export const metadata: Metadata = { title: "Lectura" };

// Exportación estática (GitHub Pages): solo se pregeneran los ids conocidos. Los creados por el usuario
// (palabras, lecturas importadas, vídeos añadidos) se resuelven en app/not-found.tsx a partir de la URL.
export const dynamicParams = false;
export function generateStaticParams() {
  return READINGS.map((r) => ({ id: r.id }));
}

export default async function Page({ params }: PageProps<"/lectura/[id]">) {
  const { id } = await params;
  return <Reader id={decodeURIComponent(id)} />;
}
