import type { Metadata } from "next";
import { Suspense } from "react";
import { ClassNotebook } from "@/components/study-hall/class-notebook";
import { Spinner } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Cuaderno de clase" };

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <ClassNotebook />
    </Suspense>
  );
}
