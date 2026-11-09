/**
 * npm run clases:recoger — mueve de Descargas a clases\entrada\ las grabaciones de Teams ya
 * descargadas del todo (las que aún se están bajando, .crdownload, se dejan), con nombre limpio
 * AAAA-MM-DD_HHMM.mp4. Las que ya están en el registro se ignoran.
 */
import { existsSync, mkdirSync, readdirSync, renameSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { dirs } from "./config";
import { looksLikeRecording } from "./graph";
import { leerRegistro } from "./registro";

export function nombreLimpio(nombre: string): string | undefined {
  const m = nombre.match(/(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})\d{2}/);
  return m ? `${m[1]}-${m[2]}-${m[3]}_${m[4]}${m[5]}.mp4` : undefined;
}

function main() {
  const desc = process.env.XUEBAN_DESCARGAS ?? path.join(os.homedir(), "Downloads");
  const d = dirs();
  mkdirSync(d.entrada, { recursive: true });
  const reg = leerRegistro();
  const hechas = new Set(Object.keys(reg.clases));
  let n = 0;
  for (const f of readdirSync(desc)) {
    if (!/\.mp4$/i.test(f) || !looksLikeRecording({ name: f, folder: "Recordings" }) && !/会议记录/.test(f)) continue;
    const limpio = nombreLimpio(f);
    if (!limpio) continue;
    if (hechas.has(limpio.replace(/\.mp4$/, ""))) {
      console.log(`· ${limpio} ya procesada: se deja en Descargas`);
      continue;
    }
    const dest = path.join(d.entrada, limpio);
    if (existsSync(dest)) continue;
    // Chrome bloquea el archivo unos segundos al terminar (lo analiza): se reintenta.
    for (let i = 0; ; i++) {
      try {
        renameSync(path.join(desc, f), dest);
        break;
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "EBUSY" || i >= 30) throw e;
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2000);
      }
    }
    console.log(`✔ ${limpio}  (${(statSync(dest).size / 1024 ** 3).toFixed(2)} GB)`);
    n++;
  }
  const pend = readdirSync(desc).filter((f) => f.endsWith(".crdownload") && /会议|Reuni/.test(f)).length;
  console.log(`${n} grabación(es) movidas a entrada\\. ${pend ? `${pend} aún descargándose.` : ""}`);
}

main();
