import type { Metadata } from "next";
import { Suspense } from "react";
import { PracticePage } from "@/components/practice/practice-page";
import { Spinner } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Practicar" };

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <PracticePage />
    </Suspense>
  );
}
