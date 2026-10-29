import type { Metadata } from "next";
import { Suspense } from "react";
import { HubFromQuery } from "./hub-from-query";

export const metadata: Metadata = { title: "Study Hall" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <HubFromQuery />
    </Suspense>
  );
}
