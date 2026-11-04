import type { Metadata } from "next";
import { Suspense } from "react";
import { ListenReadPage } from "@/components/input/listen-read";
import { Spinner } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Escuchar y leer" };

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <ListenReadPage />
    </Suspense>
  );
}
