import type { Metadata } from "next";
import { Suspense } from "react";
import { UnitSheet } from "@/components/learn/unit-sheet";
import { Spinner } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Ficha resumen" };

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <UnitSheet />
    </Suspense>
  );
}
