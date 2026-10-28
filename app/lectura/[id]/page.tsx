import type { Metadata } from "next";
import { Reader } from "@/components/reading/reader";

export const metadata: Metadata = { title: "Lectura" };

export default async function Page({ params }: PageProps<"/lectura/[id]">) {
  const { id } = await params;
  return <Reader id={decodeURIComponent(id)} />;
}
