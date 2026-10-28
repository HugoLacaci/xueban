import type { Metadata } from "next";
import { ArticleView } from "@/components/study-hall/article";

export const metadata: Metadata = { title: "Artículo" };

export default async function Page({ params }: PageProps<"/study-hall/articulo/[id]">) {
  const { id } = await params;
  return <ArticleView id={decodeURIComponent(id)} />;
}
