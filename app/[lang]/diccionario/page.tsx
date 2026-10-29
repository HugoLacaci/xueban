import type { Metadata } from "next";
import { Suspense } from "react";
import { DictionaryPage } from "@/components/dictionary/dictionary-page";
import { Spinner } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Diccionario" };

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <DictionaryPage />
    </Suspense>
  );
}
