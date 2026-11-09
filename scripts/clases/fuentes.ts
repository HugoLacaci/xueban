/**
 * Fuentes locales de clases: opción C (OneDrive sincronizado) y opción D (carpeta entrada\).
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import os from "node:os";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { looksLikeRecording, parseRecordingName } from "./graph";

export const MEDIA_RE = /\.(mp4|m4v|mov|webm|mkv|m4a|mp3|wav|opus|ogg|flac|aac)$/i;

/** Carpetas raíz de OneDrive en este PC (personal y de la escuela). */
export function onedriveRoots(): string[] {
  const set = new Set<string>();
  for (const k of ["OneDriveCommercial", "OneDrive", "OneDriveConsumer"]) if (process.env[k]) set.add(process.env[k]!);
  const home = os.homedir();
  try {
    for (const d of readdirSync(home)) if (/^OneDrive( - |$)/.test(d)) set.add(path.join(home, d));
  } catch {
    /* sin permisos */
  }
  return [...set].filter((p) => existsSync(p));
}

export interface ArchivoLocal {
  ruta: string;
  nombre: string;
  bytes: number;
  fecha: string;
  titulo: string;
  /** El archivo está solo en la nube (no ocupa disco hasta que se lee). */
  soloNube: boolean;
}

// FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS / OFFLINE: Node no los expone; se deduce con `attrib`.
function soloEnNube(file: string): boolean {
  try {
    const out = execFileSync("attrib", [file], { encoding: "utf8" });
    return /\bU\b/.test(out.slice(0, out.indexOf(file)));
  } catch {
    return false;
  }
}

/** Grabaciones de Teams en las carpetas de OneDrive sincronizadas ("Añadir acceso directo a Mis archivos"). */
export function grabacionesOneDrive(maxDepth = 5): ArchivoLocal[] {
  const out: ArchivoLocal[] = [];
  const walk = (dir: string, depth: number) => {
    if (depth > maxDepth) return;
    let entries: import("node:fs").Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name.startsWith(".") || e.name === "node_modules") continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p, depth + 1);
      else if (e.isFile() && looksLikeRecording({ name: e.name, folder: dir })) {
        const st = statSync(p);
        const { title, date } = parseRecordingName(e.name, st.birthtime.toISOString());
        out.push({ ruta: p, nombre: e.name, bytes: st.size, fecha: date, titulo: title, soloNube: soloEnNube(p) });
      }
    }
  };
  for (const r of onedriveRoots()) walk(r, 0);
  return out.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** Archivos dejados a mano en entrada\ (opción D). La transcripción .vtt/.docx con el mismo nombre va aparte. */
export function archivosEntrada(entrada: string): (ArchivoLocal & { teams?: string })[] {
  if (!existsSync(entrada)) return [];
  const files = readdirSync(entrada);
  return files
    .filter((f) => MEDIA_RE.test(f))
    .map((f) => {
      const ruta = path.join(entrada, f);
      const st = statSync(ruta);
      const base = f.replace(MEDIA_RE, "");
      const m = base.match(/^(\d{4}-\d{2}-\d{2})[_ -]?(.*)$/);
      // Nombre de Teams ("…-20261010_103159-会议记录.mp4") → fecha + hora, como los renombrados a mano.
      const teamsTs = base.match(/(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})\d{2}/);
      const parsed = m
        ? { date: m[1], title: m[2].replace(/[-_]+/g, " ").trim() || "clase" }
        : teamsTs
          ? { date: `${teamsTs[1]}-${teamsTs[2]}-${teamsTs[3]}`, title: `${teamsTs[4]}${teamsTs[5]}` }
          : parseRecordingName(f, st.mtime.toISOString());
      const teams = files.find((x) => x !== f && x.replace(/\.(vtt|docx)$/i, "") === base && /\.(vtt|docx)$/i.test(x));
      return { ruta, nombre: f, bytes: st.size, fecha: parsed.date, titulo: parsed.title, soloNube: false, teams: teams ? path.join(entrada, teams) : undefined };
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}
