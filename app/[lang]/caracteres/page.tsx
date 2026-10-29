import type { Metadata } from "next";
import { CharactersFromPack } from "@/components/target/characters-from-pack";

export const metadata: Metadata = { title: "Caracteres" };

export default function Page() {
  return <CharactersFromPack />;
}
