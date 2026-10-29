import type { Metadata } from "next";
import { ReadingList } from "@/components/reading/reading-list";

export const metadata: Metadata = { title: "Lectura graduada" };

export default function Page() {
  return <ReadingList />;
}
