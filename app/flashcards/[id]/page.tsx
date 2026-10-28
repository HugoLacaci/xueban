import type { Metadata } from "next";
import { WordPage } from "@/components/flashcards/word-page";

export const metadata: Metadata = { title: "Palabra" };

export default async function Page({ params }: PageProps<"/flashcards/[id]">) {
  const { id } = await params;
  return <WordPage id={decodeURIComponent(id)} />;
}
