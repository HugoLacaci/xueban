import type { Metadata } from "next";
import { CharactersPage } from "@/components/characters/characters-page";

export const metadata: Metadata = { title: "Caracteres y radicales" };

export default function Page() {
  return <CharactersPage />;
}
