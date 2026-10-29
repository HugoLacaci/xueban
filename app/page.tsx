import type { Metadata } from "next";
import { LanguageHome } from "@/components/layout/language-home";

export const metadata: Metadata = { title: "Elige idioma" };

export default function RootPage() {
  return <LanguageHome />;
}
