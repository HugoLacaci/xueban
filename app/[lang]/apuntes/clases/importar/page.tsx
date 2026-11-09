import type { Metadata } from "next";
import { Suspense } from "react";
import { ClassImportPage } from "@/components/classes/import-page";
import { Spinner } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Importar clases" };

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <ClassImportPage />
    </Suspense>
  );
}
