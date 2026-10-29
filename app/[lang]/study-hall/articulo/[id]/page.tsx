import type { Metadata } from "next";
import { contentFor } from "@/lib/languages/static-content";
import { ArticleView } from "@/components/study-hall/article";

export const metadata: Metadata = { title: "Artículo" };

// Exportación estática (GitHub Pages): solo se pregeneran los ids conocidos. Los creados por el usuario
// (palabras, lecturas importadas, vídeos añadidos) se resuelven en app/not-found.tsx a partir de la URL.
export const dynamicParams = false;
export function generateStaticParams({ params }: { params: { lang: string } }) {
  return contentFor(params.lang).articles.map((a) => ({ id: a.id }));
}

export default async function Page({ params }: PageProps<"/[lang]/study-hall/articulo/[id]">) {
  const { id } = await params;
  return <ArticleView id={decodeURIComponent(id)} />;
}
