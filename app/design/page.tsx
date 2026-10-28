import type { Metadata } from "next";
import { StyleGuide } from "@/components/design/style-guide";

export const metadata: Metadata = { title: "Guía de estilo" };

export default function DesignPage() {
  return <StyleGuide />;
}
