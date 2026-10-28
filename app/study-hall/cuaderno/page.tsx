import type { Metadata } from "next";
import { ClassNotebook } from "@/components/study-hall/class-notebook";

export const metadata: Metadata = { title: "Cuaderno de clase" };

export default function Page() {
  return <ClassNotebook />;
}
