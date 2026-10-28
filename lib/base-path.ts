/**
 * Ruta base de la app. Vacía en local y en servidores propios; «/xueban» en GitHub Pages
 * (se fija con NEXT_PUBLIC_BASE_PATH en el build estático). next/link y el router la añaden
 * solos; los fetch a /data, /videos, /audio y el service worker necesitan este prefijo.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function withBase(path: string): string {
  if (!BASE_PATH) return path;
  return path.startsWith("/") ? `${BASE_PATH}${path}` : path;
}
