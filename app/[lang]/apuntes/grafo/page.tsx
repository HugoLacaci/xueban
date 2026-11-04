import type { Metadata } from "next";
import { Suspense } from "react";
import { NotesGraphPage } from "@/components/notes/graph";
import { Spinner } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Grafo de apuntes" };

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <NotesGraphPage />
    </Suspense>
  );
}
