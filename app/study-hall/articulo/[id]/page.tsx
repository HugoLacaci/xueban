import type { Metadata } from "next";
import { ARTICLES } from "@/lib/study-hall";
import { ArticleView } from "@/components/study-hall/article";

export const metadata: Metadata = { title: "Artículo" };

// Exportación estática (GitHub Pages): solo se pregeneran los ids conocidos. Los creados por el usuario
// (palabras, lecturas importadas, vídeos añadidos) se resuelven en app/not-found.tsx a partir de la URL.
export const dynamicParams = false;
export function generateStaticParams() {
  return ARTICLES.map((a) => ({ id: a.id }));
}

export default async function Page({ params }: PageProps<"/study-hall/articulo/[id]">) {
  const { id } = await params;
  return <ArticleView id={decodeURIComponent(id)} />;
}
