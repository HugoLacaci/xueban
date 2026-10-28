import type { Metadata } from "next";
import { Checkpoint } from "@/components/learn/checkpoint";

export const metadata: Metadata = { title: "Checkpoint" };

export default async function Page({ params }: PageProps<"/aprender/checkpoint/[unitId]">) {
  const { unitId } = await params;
  return <Checkpoint unitId={decodeURIComponent(unitId)} />;
}
