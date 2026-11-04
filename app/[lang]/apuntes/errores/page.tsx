import type { Metadata } from "next";
import { Suspense } from "react";
import { ErrorBookPage } from "@/components/notes/error-book";
import { Spinner } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Cuaderno de errores" };

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <ErrorBookPage />
    </Suspense>
  );
}
