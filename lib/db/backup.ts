"use client";
/**
 * Copia de seguridad automática antes de migrar la base de datos a un esquema nuevo.
 * Se guarda en una BD aparte (`xueban-backups`) para poder descargarla desde Ajustes.
 */
import Dexie from "dexie";

export interface BackupRow {
  id: string; // ISO date
  reason: string;
  fromVersion: number;
  json: string;
  size: number;
}

class BackupDB extends Dexie {
  backups!: Dexie.Table<BackupRow, string>;
  constructor() {
    super("xueban-backups");
    this.version(1).stores({ backups: "id" });
  }
}

let backupDb: BackupDB | undefined;
function getBackupDb(): BackupDB {
  if (!backupDb) backupDb = new BackupDB();
  return backupDb;
}

const TARGET_VERSION = 4;

/**
 * Si existe una BD `xueban` con una versión anterior a la actual, la vuelca entera a `xueban-backups`
 * antes de que Dexie ejecute la migración. Idempotente y silencioso si no hay nada que migrar.
 */
export async function backupBeforeMigration(): Promise<BackupRow | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    if (!(await Dexie.exists("xueban"))) return null;
    const probe = new Dexie("xueban");
    await probe.open(); // abre con el esquema existente sin declarar versiones
    const fromVersion = probe.verno;
    if (fromVersion >= TARGET_VERSION) {
      probe.close();
      return null;
    }
    const data: Record<string, unknown[]> = {};
    for (const t of probe.tables) data[t.name] = await t.toArray();
    probe.close();
    const json = JSON.stringify({ app: "xueban", version: fromVersion, lang: "all", exportedAt: new Date().toISOString(), data });
    const row: BackupRow = { id: new Date().toISOString(), reason: `migración v${fromVersion} → v${TARGET_VERSION}`, fromVersion, json, size: json.length };
    await getBackupDb().backups.put(row);
    return row;
  } catch (e) {
    console.warn("No se pudo hacer la copia previa a la migración", e);
    return null;
  }
}

export async function listBackups(): Promise<Omit<BackupRow, "json">[]> {
  if (typeof indexedDB === "undefined") return [];
  const rows = await getBackupDb().backups.toArray();
  return rows.map(({ json, ...r }) => (void json, r)).sort((a, b) => b.id.localeCompare(a.id));
}

export async function getBackup(id: string): Promise<BackupRow | undefined> {
  return getBackupDb().backups.get(id);
}

export async function deleteBackup(id: string): Promise<void> {
  await getBackupDb().backups.delete(id);
}
