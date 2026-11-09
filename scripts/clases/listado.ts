/** Tabla de grabaciones para la consola, con avisos de caducidad. */
import { AVISO_CADUCIDAD_DIAS } from "./config";
import type { RemoteRecording } from "./graph";
import { buscarPorOrigen, type Registro } from "./registro";

export function diasHasta(iso: string, now = Date.now()): number {
  return Math.floor((new Date(iso).getTime() - now) / 86400_000);
}

export function fmtDur(sec?: number): string {
  if (!sec) return "  ?  ";
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`;
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export function printRecordings(recs: RemoteRecording[], reg: Registro): void {
  if (!recs.length) {
    console.log("No he encontrado grabaciones de Teams en tu cuenta.");
    return;
  }
  console.log(`Grabaciones encontradas (${recs.length}), de la más antigua a la más nueva:\n`);
  recs.forEach((r, i) => {
    const prev = buscarPorOrigen(reg, r.driveId, r.itemId);
    const dias = diasHasta(r.expiresAt);
    const estado = prev ? `[${prev.estado}]` : "[nueva]";
    const aviso = dias < 0 ? "  ⚠ probablemente caducada" : dias <= AVISO_CADUCIDAD_DIAS ? `  ⚠ caduca en ~${dias} días` : "";
    console.log(`${String(i + 1).padStart(3)}. ${r.date}  ${fmtDur(r.durationSec).padStart(8)}  ${r.title.slice(0, 50).padEnd(50)} ${estado}${aviso}`);
  });
  console.log("\n(La caducidad es una estimación: fecha de grabación + días de retención de Teams.)");
}
