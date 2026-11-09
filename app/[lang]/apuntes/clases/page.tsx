import type { Metadata } from "next";
import { Suspense } from "react";
import { ClassesRoute } from "@/components/classes/classes-page";
import { Spinner } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Mis clases" };

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <ClassesRoute />
    </Suspense>
  );
}
