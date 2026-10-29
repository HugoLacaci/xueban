/** Utilidades de identificadores y fechas (sin dependencias de Dexie para evitar ciclos). */

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿぀-ヿ가-힯]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Id de categoría: el chino conserva el slug llano (compatibilidad); los demás llevan prefijo. */
export function categoryId(lang: string, name: string): string {
  const s = slugify(name);
  return lang === "zh" ? s : `${lang}:${s}`;
}
