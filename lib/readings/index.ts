/** Fachada de lecturas graduadas del idioma activo (contenido en cada paquete). */
import type { GradedReading } from "./types";
import { getActivePack } from "@/lib/languages/registry";

export function getReadings(): GradedReading[] {
  return getActivePack().readings;
}

export function readingById(id: string): GradedReading | undefined {
  return getActivePack().readings.find((r) => r.id === id);
}
