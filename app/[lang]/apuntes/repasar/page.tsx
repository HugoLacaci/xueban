import type { Metadata } from "next";
import { Suspense } from "react";
import { ReviewNotesPage } from "@/components/notes/review";
import { Spinner } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Repasar apuntes" };

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <ReviewNotesPage />
    </Suspense>
  );
}
