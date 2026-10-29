import type { Metadata } from "next";
import { FlashcardsPage } from "@/components/flashcards/flashcards-page";

export const metadata: Metadata = { title: "Flashcards" };

export default function Page() {
  return <FlashcardsPage />;
}
