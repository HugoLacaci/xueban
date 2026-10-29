import { LastLangShell } from "@/components/layout/last-lang-shell";

/** Rutas globales (no dependen de un idioma): usan el último idioma estudiado para el tema y los textos de ejemplo. */
export default function GlobalLayout({ children }: { children: React.ReactNode }) {
  return <LastLangShell>{children}</LastLangShell>;
}
