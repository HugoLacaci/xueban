import { notFound } from "next/navigation";
import { LanguageProvider } from "@/lib/languages/provider";
import { LANG_PARAMS } from "@/lib/languages/static-content";
import { AppShell } from "@/components/layout/app-shell";
import type { Lang } from "@/lib/languages/types";

// Ojo: este layout es de servidor. No debe importar lib/languages/registry (contiene los import() de los
// paquetes): el servidor alcanzaría sus archivos "use client" y Next precargaría los tres idiomas en cada página.
const isLang = (x: string): x is Lang => x === "zh" || x === "ja" || x === "ko";

export const dynamicParams = false;
export function generateStaticParams() {
  return LANG_PARAMS;
}

export default async function LangLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <LanguageProvider lang={lang}>
      <AppShell>{children}</AppShell>
    </LanguageProvider>
  );
}
