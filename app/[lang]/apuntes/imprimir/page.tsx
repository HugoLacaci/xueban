import type { Metadata } from "next";
import { Suspense } from "react";
import { PrintNotesPage } from "@/components/notes/print";
import { Spinner } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Imprimir apuntes" };

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <PrintNotesPage />
    </Suspense>
  );
}
