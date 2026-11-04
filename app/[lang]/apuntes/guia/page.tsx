import type { Metadata } from "next";
import { Suspense } from "react";
import { NotesGuide } from "@/components/notes/guide";
import { Spinner } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Cómo tomar apuntes" };

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <NotesGuide />
    </Suspense>
  );
}
