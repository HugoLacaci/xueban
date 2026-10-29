import type { Metadata } from "next";
import { TodayDashboard } from "@/components/today/dashboard";

export const metadata: Metadata = { title: "Hoy" };

export default function HomePage() {
  return <TodayDashboard />;
}
