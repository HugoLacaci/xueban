import type { Metadata } from "next";
import { Suspense } from "react";
import { LivingNotesPage } from "@/components/notes/living-notes";
import { Spinner } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Apuntes vivos" };

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <LivingNotesPage />
    </Suspense>
  );
}
