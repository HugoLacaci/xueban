import type { Metadata } from "next";
import { GlobalPanel } from "@/components/layout/global-panel";

export const metadata: Metadata = { title: "Mis idiomas" };

export default function Page() {
  return <GlobalPanel />;
}
