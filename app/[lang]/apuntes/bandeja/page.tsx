import type { Metadata } from "next";
import { Suspense } from "react";
import { InboxPage } from "@/components/notes/inbox";
import { Spinner } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Bandeja de apuntes" };

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <InboxPage />
    </Suspense>
  );
}
