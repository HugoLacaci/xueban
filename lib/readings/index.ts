import readingsJson from "@/content/readings/readings.json";
import type { GradedReading } from "./types";

export const READINGS: GradedReading[] = readingsJson as GradedReading[];

export function readingById(id: string): GradedReading | undefined {
  return READINGS.find((r) => r.id === id);
}
