import type { Metadata } from "next";
import { Redirect } from "@/components/layout/redirect";

export const metadata: Metadata = { title: "Lectura graduada" };

export default function Page() {
  return <Redirect to="/escuchar-leer?tab=lectura" />;
}
