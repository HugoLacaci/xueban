"use client";
import { useSearchParams } from "next/navigation";
import { StudyHallHub } from "@/components/study-hall/hub";
import { Redirect } from "@/components/layout/redirect";

/** Lee ?tab= en el cliente (la exportación estática no admite searchParams en el servidor). */
export function HubFromQuery() {
  const sp = useSearchParams();
  const tab = sp.get("tab") ?? "articulos";
  if (tab === "notas") return <Redirect to="/apuntes" />;
  return <StudyHallHub tab={tab} />;
}
