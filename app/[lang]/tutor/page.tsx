import type { Metadata } from "next";
import { Suspense } from "react";
import { TutorPage } from "@/components/tutor/tutor-page";
import { Spinner } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Tutor" };

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <TutorPage />
    </Suspense>
  );
}
