import type { Metadata } from "next";
import { Suspense } from "react";
import { ReviewSession } from "@/components/flashcards/review-session";
import { Spinner } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Repasar" };

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <ReviewSession />
    </Suspense>
  );
}
