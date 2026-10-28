import type { Metadata } from "next";
import { StudyHallHub } from "@/components/study-hall/hub";

export const metadata: Metadata = { title: "Study Hall" };

export default async function Page({ searchParams }: PageProps<"/study-hall">) {
  const sp = await searchParams;
  const tab = typeof sp.tab === "string" ? sp.tab : "articulos";
  return <StudyHallHub tab={tab} />;
}
