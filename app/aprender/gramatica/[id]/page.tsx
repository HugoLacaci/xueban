import type { Metadata } from "next";
import { GRAMMAR } from "@/lib/course";
import { GrammarDetail } from "@/components/learn/grammar-pages";

export const metadata: Metadata = { title: "Gramática" };

// Exportación estática (GitHub Pages): solo se pregeneran los ids conocidos. Los creados por el usuario
// (palabras, lecturas importadas, vídeos añadidos) se resuelven en app/not-found.tsx a partir de la URL.
export const dynamicParams = false;
export function generateStaticParams() {
  return GRAMMAR.map((g) => ({ id: g.id }));
}

export default async function Page({ params }: PageProps<"/aprender/gramatica/[id]">) {
  const { id } = await params;
  return <GrammarDetail id={decodeURIComponent(id)} />;
}
