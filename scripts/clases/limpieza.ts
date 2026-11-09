/**
 * Borrado seguro de lo pesado (vídeo, audio completo, temporales) tras procesar una clase.
 *
 * Reglas (ver PROMPT_CLAUDE_CODE_clases_teams_auto.md §2):
 *  - Solo se borra si: la transcripción existe y cubre > 80 % de la duración, el paquete pasa
 *    la validación zod y los recortes se generaron bien (o se pidió --sin-recortes).
 *  - Solo dentro de clases\ (rutas absolutas normalizadas y resueltas; nunca fuera).
 *  - Borrado definitivo (no Papelera). Nunca se toca la nube.
 *  - Si la clase vino de OneDrive sincronizado (opción C), no se borra: se libera el espacio
 *    (attrib +U -P) y el archivo vuelve a quedar solo en la nube.
 */
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { parseClassPackage } from "../../lib/classes/package-schema";
import { clasesDir, dirs } from "./config";
import type { BorradoItem, ClaseRegistro } from "./registro";

export class FueraDeClasesError extends Error {}

function norm(p: string): string {
  const abs = path.resolve(p);
  return process.platform === "win32" ? abs.toLowerCase() : abs;
}

/** Resuelve enlaces/junctions si el archivo existe (para que no se pueda "escapar" de clases\). */
function real(p: string): string {
  try {
    return realpathSync.native(p);
  } catch {
    return path.resolve(p);
  }
}

/** true si `p` está estrictamente dentro de clases\ (no es la propia carpeta). */
export function dentroDeClases(p: string, root = clasesDir()): boolean {
  const r = norm(real(root));
  const target = norm(real(p));
  const rel = path.relative(r, target);
  return !!rel && !rel.startsWith("..") && !path.isAbsolute(rel);
}

export function assertDentroDeClases(p: string, root = clasesDir()): void {
  if (!dentroDeClases(p, root)) throw new FueraDeClasesError(`Me niego a borrar fuera de ${root}: ${p}`);
}

/** Lo que nunca se borra aunque esté dentro de clases\. */
const PROTEGIDO = /^(transcripciones|paquetes|recortes|\.navegador)([\\/]|$)|^registro\.json$|^LEEME\.md$|^CONTEXTO\.md$|^pendientes\.md$|^estado\.json$/i;

export function protegido(p: string, root = clasesDir()): boolean {
  const rel = path.relative(path.resolve(root), path.resolve(p));
  return PROTEGIDO.test(rel);
}

/* ------------------------------------------------------------------ */

/** Cobertura: fracción de minutos de la clase que tienen al menos un segmento. */
export function coberturaTranscripcion(t: { meta?: { durationSec?: number }; segments?: { start: number; end: number }[] }): number {
  const dur = t.meta?.durationSec ?? 0;
  const segs = t.segments ?? [];
  if (!dur || !segs.length) return 0;
  const win = 60;
  const n = Math.max(1, Math.ceil(dur / win));
  const hit = new Array<boolean>(n).fill(false);
  for (const s of segs) for (let k = Math.floor(s.start / win); k <= Math.min(n - 1, Math.floor(s.end / win)); k++) hit[k] = true;
  return hit.filter(Boolean).length / n;
}

export interface Comprobacion {
  ok: boolean;
  motivos: string[];
}

/** Las tres condiciones para poder borrar. */
export function comprobarCondiciones(clase: ClaseRegistro, opts: { sinRecortes?: boolean } = {}): Comprobacion {
  const motivos: string[] = [];
  // 1) Transcripción
  if (!clase.transcripcion || !existsSync(clase.transcripcion)) motivos.push("no existe la transcripción");
  else {
    try {
      const t = JSON.parse(readFileSync(clase.transcripcion, "utf8"));
      if (!t.segments?.length) motivos.push("la transcripción está vacía");
      else {
        const cov = coberturaTranscripcion(t);
        if (cov <= 0.8) motivos.push(`la transcripción solo cubre el ${Math.round(cov * 100)} % de la clase (hace falta > 80 %)`);
      }
    } catch (e) {
      motivos.push(`transcripción ilegible: ${e instanceof Error ? e.message : e}`);
    }
  }
  // 2) Paquete válido
  if (!clase.paquete || !existsSync(clase.paquete)) motivos.push("no existe el paquete de clase");
  else {
    try {
      const r = parseClassPackage(JSON.parse(readFileSync(clase.paquete, "utf8")));
      if (!r.ok) motivos.push(`el paquete no pasa la validación: ${r.errors.slice(0, 3).join("; ")}`);
    } catch (e) {
      motivos.push(`paquete ilegible: ${e instanceof Error ? e.message : e}`);
    }
  }
  // 3) Recortes
  if (!opts.sinRecortes) {
    if (!clase.recortes) motivos.push("los recortes no se han generado");
    else if (!existsSync(clase.recortes.dir)) motivos.push("falta la carpeta de recortes");
    else {
      const files = readdirSync(clase.recortes.dir).filter((f) => /\.(opus|ogg)$/.test(f));
      if (files.length < clase.recortes.n) motivos.push(`faltan recortes (${files.length}/${clase.recortes.n})`);
      if (files.some((f) => statSync(path.join(clase.recortes!.dir, f)).size === 0)) motivos.push("hay recortes vacíos");
      // Cada recorte que cita el paquete tiene que existir.
      try {
        const p = JSON.parse(readFileSync(clase.paquete ?? "", "utf8")) as { clips?: { file: string }[] };
        const missing = (p.clips ?? []).filter((c) => !files.includes(c.file));
        if (missing.length) motivos.push(`el paquete cita recortes que no existen: ${missing.map((c) => c.file).join(", ")}`);
      } catch {
        /* ya se avisó arriba */
      }
    }
  }
  return { ok: motivos.length === 0, motivos };
}

export interface ItemLimpieza extends BorradoItem {
  accion: "borrar" | "liberar-onedrive";
}

export interface PlanLimpieza {
  archivos: ItemLimpieza[];
  bytes: number;
}

/**
 * Archivos pesados de esa clase: su audio/vídeo registrado y todo lo de tmp y entrada que empiece por su id.
 * Si vino de OneDrive sincronizado, el original se libera (no se borra) y solo se borra el audio temporal.
 */
export function planLimpieza(clase: ClaseRegistro, root = clasesDir()): PlanLimpieza {
  const d = dirs();
  const items = new Map<string, ItemLimpieza["accion"]>();
  const add = (p: string | undefined, accion: ItemLimpieza["accion"]) => {
    if (p && existsSync(p) && lstatSync(p).isFile()) items.set(path.resolve(p), accion);
  };
  if (clase.origen.metodo === "onedrive") add(clase.origen.archivo, "liberar-onedrive");
  else add(clase.origen.archivo, "borrar");
  add(clase.audio, "borrar");
  for (const dir of [d.tmp, d.entrada]) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) if (f.startsWith(clase.id)) add(path.join(dir, f), "borrar");
  }
  const archivos = [...items]
    .filter(([p, accion]) => accion === "liberar-onedrive" || (dentroDeClases(p, root) && !protegido(p, root)))
    .map(([ruta, accion]) => ({ ruta, accion, bytes: statSync(ruta).size }));
  return { archivos, bytes: archivos.reduce((a, b) => a + b.bytes, 0) };
}

/**
 * Ejecuta el plan. Vuelve a comprobar cada ruta justo antes de tocarla.
 * Devuelve lo realmente borrado/liberado. En `simular` no toca nada.
 */
export function ejecutarLimpieza(plan: PlanLimpieza, opts: { simular?: boolean; root?: string } = {}): ItemLimpieza[] {
  const root = opts.root ?? clasesDir();
  const hecho: ItemLimpieza[] = [];
  for (const a of plan.archivos) {
    if (a.accion === "borrar") {
      assertDentroDeClases(a.ruta, root);
      if (protegido(a.ruta, root)) throw new FueraDeClasesError(`Ruta protegida: ${a.ruta}`);
    }
    if (opts.simular) {
      hecho.push(a);
      continue;
    }
    if (a.accion === "borrar") {
      rmSync(a.ruta, { force: false }); // definitivo: no va a la Papelera
    } else {
      // OneDrive: "Liberar espacio" → solo en la nube. No se borra nada.
      execFileSync("attrib", ["+U", "-P", a.ruta], { stdio: "ignore" });
    }
    hecho.push(a);
  }
  return hecho;
}
