import type { Metadata } from "next";
import { GrammarIndex } from "@/components/learn/grammar-pages";

export const metadata: Metadata = { title: "Gramática" };

export default function Page() {
  return <GrammarIndex />;
}
