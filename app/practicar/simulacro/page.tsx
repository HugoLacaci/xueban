import type { Metadata } from "next";
import { ExamSimulator } from "@/components/practice/exam";

export const metadata: Metadata = { title: "Simulacro HSK 1" };

export default function Page() {
  return <ExamSimulator />;
}
