/**
 * Configuración común de la canalización de clases (scripts/clases).
 *
 * Todo lo pesado o privado vive FUERA del repositorio, en C:\CHINA\IDIOMA\clases
 * (se puede cambiar con la variable XUEBAN_CLASES_DIR, p. ej. en los tests).
 */
import { existsSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

export const REPO_DIR = path.resolve(import.meta.dirname, "..", "..");

export function clasesDir(): string {
  return path.resolve(process.env.XUEBAN_CLASES_DIR ?? path.join(REPO_DIR, "..", "clases"));
}

export const dirs = () => {
  const root = clasesDir();
  return {
    root,
    entrada: path.join(root, "entrada"),
    tmp: path.join(root, "tmp"),
    procesadas: path.join(root, "procesadas"),
    transcripciones: path.join(root, "transcripciones"),
    paquetes: path.join(root, "paquetes"),
    recortes: path.join(root, "recortes"),
    navegador: path.join(root, ".navegador"),
    registro: path.join(root, "registro.json"),
    pendientes: path.join(root, "pendientes.md"),
  };
};

/** Caché de tokens de Microsoft (cifrada con DPAPI): fuera del repo y fuera de clases\. */
export function tokenCachePath(): string {
  const base = process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local");
  return path.join(base, "xueban", "msal-cache.bin");
}

let ffmpegCache: { ffmpeg: string; ffprobe: string } | undefined;

/** Busca ffmpeg: variable FFMPEG, PATH o la instalación de winget (Gyan.FFmpeg). */
export function ffmpegPaths(): { ffmpeg: string; ffprobe: string } {
  if (ffmpegCache) return ffmpegCache;
  const candidates: string[] = [];
  if (process.env.FFMPEG) candidates.push(process.env.FFMPEG);
  try {
    const out = execFileSync(process.platform === "win32" ? "where" : "which", ["ffmpeg"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    candidates.push(...out.split(/\r?\n/).filter(Boolean));
  } catch {
    /* no está en el PATH */
  }
  const winget = path.join(process.env.LOCALAPPDATA ?? "", "Microsoft", "WinGet", "Packages");
  if (existsSync(winget)) {
    for (const pkg of readdirSync(winget).filter((d) => d.startsWith("Gyan.FFmpeg"))) {
      for (const build of readdirSync(path.join(winget, pkg))) candidates.push(path.join(winget, pkg, build, "bin", "ffmpeg.exe"));
    }
  }
  const ffmpeg = candidates.find((c) => existsSync(c));
  if (!ffmpeg) throw new Error("No encuentro ffmpeg. Instálalo con:  winget install --id Gyan.FFmpeg -e");
  const ext = path.extname(ffmpeg);
  ffmpegCache = { ffmpeg, ffprobe: path.join(path.dirname(ffmpeg), `ffprobe${ext}`) };
  return ffmpegCache;
}

/** Caducidad por defecto de las grabaciones de Teams (días). Se puede ajustar con XUEBAN_CADUCIDAD_DIAS. */
export const CADUCIDAD_DIAS = Number(process.env.XUEBAN_CADUCIDAD_DIAS ?? 120);
/** Aviso de "caduca pronto" (días que quedan). */
export const AVISO_CADUCIDAD_DIAS = 14;
