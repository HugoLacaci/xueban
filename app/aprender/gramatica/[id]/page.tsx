import type { Metadata } from "next";
import { GrammarDetail } from "@/components/learn/grammar-pages";

export const metadata: Metadata = { title: "Gramática" };

export default async function Page({ params }: PageProps<"/aprender/gramatica/[id]">) {
  const { id } = await params;
  return <GrammarDetail id={decodeURIComponent(id)} />;
}
