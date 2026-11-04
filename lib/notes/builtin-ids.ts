/**
 * Ids de los apuntes del profesor (compendios) por idioma, para generateStaticParams (servidor, tiempo de build).
 * Solo datos: no importa React ni Dexie.
 */
import { BUILTIN_NOTE_IDS as zh } from "@/content/zh/notes";

export function builtinNoteIds(lang: string): string[] {
  // la exportación estática exige al menos una ruta por idioma: «_» muestra «apunte no encontrado»
  return lang === "zh" ? zh : ["_"];
}
