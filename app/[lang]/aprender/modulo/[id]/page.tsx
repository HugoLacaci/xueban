import type { Metadata } from "next";
import { ExtraPage } from "@/components/learn/extra-page";
import { EXTRA_PAGES } from "@/lib/languages/static-content";

export const metadata: Metadata = { title: "Aprender" };

export const dynamicParams = false;
export function generateStaticParams({ params }: { params: { lang: string } }) {
  return (EXTRA_PAGES[params.lang] ?? []).map((id) => ({ id }));
}

export default async function Page({ params }: PageProps<"/[lang]/aprender/modulo/[id]">) {
  const { id } = await params;
  return <ExtraPage id={decodeURIComponent(id)} />;
}
