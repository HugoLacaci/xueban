import type { Metadata } from "next";
import { UnitMap } from "@/components/learn/unit-map";

export const metadata: Metadata = { title: "Aprender" };

export default function Page() {
  return <UnitMap />;
}
