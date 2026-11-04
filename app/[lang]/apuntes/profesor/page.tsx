import type { Metadata } from "next";
import { Suspense } from "react";
import { TeacherNotesPage } from "@/components/notes/teacher-notes";
import { Spinner } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Apuntes del profesor" };

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <TeacherNotesPage />
    </Suspense>
  );
}
