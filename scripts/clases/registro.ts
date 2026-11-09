/**
 * clases\registro.json: qué clases se han traído, transcrito, analizado y limpiado.
 * Se escribe de forma atómica (archivo temporal + renombrar) para que un corte no lo deje a medias.
 */
import { existsSync, readFileSync, renameSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { dirs } from "./config";

export type Metodo = "graph" | "navegador" | "onedrive" | "manual";
export type EstadoClase =
  | "descubierta" // vista en Teams, aún sin audio
  | "audio" // audio extraído en tmp\
  | "transcrita" // transcripción lista: pendiente de análisis
  | "analizada" // paquete generado, pendiente de finalizar
  | "finalizada" // paquete validado + recortes + limpieza hecha
  | "solo-transcripcion-teams" // sin audio (descarga bloqueada): calidad del chino limitada
  | "no-disponible" // caducada o borrada en Teams
  | "error";

export interface BorradoItem {
  ruta: string;
  bytes: number;
}

export interface ClaseRegistro {
  id: string; // AAAA-MM-DD_tema
  fecha: string;
  titulo: string;
  origen: {
    metodo: Metodo;
    nombre: string;
    driveId?: string;
    itemId?: string;
    webUrl?: string;
    archivo?: string;
  };
  /** sha256 del archivo original (si hubo archivo local) o "graph:<driveId>:<itemId>:<tamaño>" si se leyó en streaming. */
  hashOriginal?: string;
  hashAudio?: string;
  duracionSec?: number;
  caducaEl?: string;
  estado: EstadoClase;
  audio?: string;
  transcripcion?: string;
  transcripcionTeams?: string;
  paquete?: string;
  recortes?: { n: number; bytes: number; dir: string };
  procesadoEl?: string;
  borrado?: BorradoItem[];
  liberadoBytes?: number;
  /** "borrado" | "liberado-onedrive" | "simulado" | "conservado" */
  limpieza?: string;
  errores?: string[];
  actualizadoEl: string;
}

export interface Registro {
  version: 1;
  /** El usuario confirmó una vez el borrado automático tras la simulación. */
  borradoConfirmado: boolean;
  clases: Record<string, ClaseRegistro>;
}

export function registroVacio(): Registro {
  return { version: 1, borradoConfirmado: false, clases: {} };
}

export function leerRegistro(file = dirs().registro): Registro {
  if (!existsSync(file)) return registroVacio();
  const raw = JSON.parse(readFileSync(file, "utf8")) as Partial<Registro>;
  return { ...registroVacio(), ...raw, clases: raw.clases ?? {} };
}

export function escribirRegistro(reg: Registro, file = dirs().registro): void {
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(reg, null, 2) + "\n", "utf8");
  renameSync(tmp, file);
}

/** Actualiza (o crea) una clase y guarda el registro. */
export function actualizarClase(id: string, patch: Partial<ClaseRegistro> & Pick<ClaseRegistro, "fecha" | "titulo" | "origen"> | Partial<ClaseRegistro>, file = dirs().registro): ClaseRegistro {
  const reg = leerRegistro(file);
  const prev = reg.clases[id];
  const next = { ...prev, ...patch, id, actualizadoEl: new Date().toISOString() } as ClaseRegistro;
  next.estado ??= "descubierta";
  reg.clases[id] = next;
  escribirRegistro(reg, file);
  return next;
}

/** Id estable de una clase: fecha + tema en minúsculas sin acentos. */
export function claseId(fecha: string, titulo: string): string {
  const slug = titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${fecha}_${slug || "clase"}`;
}

/** Busca una clase ya registrada que venga del mismo origen remoto. */
export function buscarPorOrigen(reg: Registro, driveId?: string, itemId?: string): ClaseRegistro | undefined {
  if (!itemId) return undefined;
  return Object.values(reg.clases).find((c) => c.origen.itemId === itemId && (!driveId || c.origen.driveId === driveId));
}

export function yaProcesada(c: ClaseRegistro | undefined): boolean {
  return !!c && ["transcrita", "analizada", "finalizada", "solo-transcripcion-teams"].includes(c.estado);
}
