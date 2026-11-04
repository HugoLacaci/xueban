import type { Metadata } from "next";
import { Suspense } from "react";
import { NotesHub } from "@/components/notes/hub";
import { Spinner } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Apuntes" };

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <NotesHub />
    </Suspense>
  );
}
