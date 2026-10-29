"use client";
import { useSearchParams } from "next/navigation";
import { StudyHallHub } from "@/components/study-hall/hub";

/** Lee ?tab= en el cliente (la exportación estática no admite searchParams en el servidor). */
export function HubFromQuery() {
  const sp = useSearchParams();
  const tab = sp.get("tab") ?? "articulos";
  return <StudyHallHub tab={tab} />;
}
