import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkbookPage } from "@/components/notes/workbook";
import { Spinner } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Cuaderno de ejercicios" };

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <WorkbookPage />
    </Suspense>
  );
}
