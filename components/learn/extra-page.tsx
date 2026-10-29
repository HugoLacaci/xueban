"use client";
import { usePack } from "@/lib/languages/provider";
import { PageHeader } from "@/components/ui/primitives";

/** Página propia del idioma (conjugación, contadores, cortesía…) aportada por pack.ui.extraPages. */
export function ExtraPage({ id }: { id: string }) {
  const page = usePack().ui.extraPages?.find((p) => p.href === id);
  if (!page) return <PageHeader title="Sección no disponible en este idioma" />;
  const C = page.Component;
  return <C />;
}
