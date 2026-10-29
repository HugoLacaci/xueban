import type { Metadata } from "next";
import { ProgressPage } from "@/components/progress/progress-page";

export const metadata: Metadata = { title: "Progreso" };

export default function Page() {
  return <ProgressPage />;
}
