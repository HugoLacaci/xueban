import type { Metadata } from "next";
import { contentFor } from "@/lib/languages/static-content";
import { WordPage } from "@/components/flashcards/word-page";

export const metadata: Metadata = { title: "Palabra" };

// Exportación estática (GitHub Pages): solo se pregeneran los ids conocidos. Los creados por el usuario
// (palabras, lecturas importadas, vídeos añadidos) se resuelven en app/not-found.tsx a partir de la URL.
export const dynamicParams = false;
export function generateStaticParams({ params }: { params: { lang: string } }) {
  return contentFor(params.lang).seedIds.map((id) => ({ id }));
}

export default async function Page({ params }: PageProps<"/[lang]/flashcards/[id]">) {
  const { id } = await params;
  return <WordPage id={decodeURIComponent(id)} />;
}
