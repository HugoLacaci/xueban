"use client";
/**
 * Enlaces y navegación con prefijo de idioma: href="/aprender" → "/ja/aprender".
 * Las rutas globales (/, /me, /bienvenida, /design, /creditos, /como-aprender) no se prefijan.
 */
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, type ComponentProps } from "react";
import { isLang, LANGS } from "./registry";
import type { Lang } from "./types";
import { useLang } from "./provider";

export const GLOBAL_ROUTES = ["/me", "/bienvenida", "/design", "/creditos", "/como-aprender", "/api"];

export function isGlobalRoute(href: string): boolean {
  return GLOBAL_ROUTES.some((g) => href === g || href.startsWith(g + "/") || href.startsWith(g + "?") || href.startsWith(g + "#"));
}

/** Añade el prefijo de idioma a una ruta interna absoluta (idempotente). */
export function langHref(lang: Lang, href: string): string {
  if (!href.startsWith("/")) return href;
  if (isGlobalRoute(href)) return href;
  const seg = href.split(/[/?#]/)[1];
  if (isLang(seg)) return href;
  if (href === "/") return `/${lang}`;
  return `/${lang}${href}`;
}

/** Quita el prefijo de idioma: "/ja/aprender" → "/aprender"; "/ja" → "/". */
export function stripLang(pathname: string): { lang: Lang | null; path: string } {
  const m = pathname.match(/^\/(zh|ja|ko)(\/.*)?$/);
  if (!m) return { lang: null, path: pathname };
  return { lang: m[1] as Lang, path: m[2] && m[2] !== "/" ? m[2] : "/" };
}

export function langFromPathname(pathname: string): Lang | null {
  return stripLang(pathname).lang;
}

type LinkProps = ComponentProps<typeof NextLink>;

/** <Link> de Next que prefija el idioma activo. */
export function Link({ href, ...rest }: LinkProps) {
  const lang = useLang();
  const h = typeof href === "string" ? langHref(lang, href) : href;
  return <NextLink href={h} {...rest} />;
}

export default Link;

/** Router con prefijo de idioma. */
export function useLangRouter() {
  const router = useRouter();
  const lang = useLang();
  return useMemo(
    () => ({
      push: (href: string) => router.push(langHref(lang, href)),
      replace: (href: string) => router.replace(langHref(lang, href)),
      back: () => router.back(),
      prefetch: (href: string) => router.prefetch(langHref(lang, href)),
    }),
    [router, lang],
  );
}

/** Ruta actual sin el prefijo de idioma ("/" dentro de /ja). */
export function useLangPathname(): string {
  const pathname = usePathname();
  return stripLang(pathname ?? "/").path;
}

export function useLangHref() {
  const lang = useLang();
  return useCallback((href: string) => langHref(lang, href), [lang]);
}

export { LANGS };
