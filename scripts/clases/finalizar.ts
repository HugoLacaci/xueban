/**
 * npm run clases:finalizar — después de que Claude Code genere los paquetes:
 *   1. valida cada paquete con zod (lib/classes/package-schema.ts);
 *   2. genera los recortes del profesor (3–15 s, opus 24 kbps) en clases\recortes\AAAA-MM-DD\;
 *   3. borra lo pesado (vídeo, audio completo, temporales) si se cumplen las 3 condiciones.
 *
 * Opciones:
 *   --simular          muestra qué se borraría y cuánto se liberaría (no borra nada)
 *   --confirmar        confirma una vez el borrado automático (tras la primera simulación)
 *   --conservar-video  no borra nada (genera recortes igualmente)
 *   --sin-recortes     no genera recortes (y no los exige para borrar)
 *   --solo ID          solo esa clase
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { parseClassPackage, type ClassPackage } from "../../lib/classes/package-schema";
import { ajustarIntervalo, recortar, duracion } from "./audio";
import { AVISO_CADUCIDAD_DIAS, dirs } from "./config";
import { comprobarCondiciones, ejecutarLimpieza, planLimpieza } from "./limpieza";
import { diasHasta, fmtBytes } from "./listado";
import { actualizarClase, escribirRegistro, leerRegistro, type ClaseRegistro } from "./registro";

const argv = process.argv.slice(2);
const flag = (f: string) => argv.includes(f);
const solo = argv.includes("--solo") ? argv[argv.indexOf("--solo") + 1] : undefined;

interface Totales {
  clases: string[];
  vocab: number;
  grammar: number;
  exercises: number;
  liberado: number;
  recortesBytes: number;
  errores: string[];
  avisos: string[];
}

/** Localiza el paquete de una clase: paquetes\<id>.json (o el que tenga la misma fecha). */
function paqueteDe(c: ClaseRegistro): string | undefined {
  const d = dirs();
  const exact = path.join(d.paquetes, `${c.id}.json`);
  if (existsSync(exact)) return exact;
  if (!existsSync(d.paquetes)) return undefined;
  const cands = readdirSync(d.paquetes).filter((f) => f.startsWith(c.fecha) && f.endsWith(".json"));
  return cands.length === 1 ? path.join(d.paquetes, cands[0]) : undefined;
}

/** Genera los recortes que pide el paquete (campo clips) y los enlaza a ejercicios, palabras, frases… */
async function generarRecortes(c: ClaseRegistro, pkg: ClassPackage, file: string): Promise<{ n: number; bytes: number; dir: string } | undefined> {
  if (!c.audio || !existsSync(c.audio)) return undefined;
  // Una carpeta por clase (no por fecha): hay días con dos grabaciones.
  const dir = path.join(dirs().recortes, c.id);
  mkdirSync(dir, { recursive: true });
  const total = duracion(c.audio);
  let bytes = 0;
  const clips = pkg.clips ?? [];
  for (const clip of clips) {
    const { start, end } = ajustarIntervalo(clip.start, clip.end, total);
    clip.start = start;
    clip.end = end;
    bytes += await recortar(c.audio, start, end, path.join(dir, clip.file));
  }
  // Se guarda el paquete con los intervalos ya ajustados.
  writeFileSync(file, JSON.stringify(pkg, null, 2) + "\n");
  // Recortes huérfanos de ejecuciones anteriores de esta misma clase.
  const keep = new Set(clips.map((x) => x.file));
  for (const f of readdirSync(dir)) if (/\.(opus|ogg)$/.test(f) && !keep.has(f)) rmSync(path.join(dir, f));
  return { n: clips.length, bytes, dir };
}

async function main() {
  const reg = leerRegistro();
  const simular = flag("--simular") || (!reg.borradoConfirmado && !flag("--confirmar"));
  const conservar = flag("--conservar-video");
  const sinRecortes = flag("--sin-recortes");
  if (flag("--confirmar") && !reg.borradoConfirmado) {
    reg.borradoConfirmado = true;
    escribirRegistro(reg);
    console.log("✔ Borrado automático confirmado. A partir de ahora se borra lo pesado al terminar cada clase (--conservar-video para evitarlo).\n");
  }
  if (simular && !flag("--simular")) console.log("ℹ Primera vez: modo SIMULACIÓN. Revisa lo que se borraría y, si te parece bien, ejecuta:  npm run clases:finalizar -- --confirmar\n");

  const tot: Totales = { clases: [], vocab: 0, grammar: 0, exercises: 0, liberado: 0, recortesBytes: 0, errores: [], avisos: [] };
  const clases = Object.values(leerRegistro().clases)
    .filter((c) => (solo ? c.id === solo : ["transcrita", "analizada", "solo-transcripcion-teams"].includes(c.estado)))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  for (const c0 of clases) {
    let c = c0;
    const file = paqueteDe(c);
    if (!file) continue; // aún sin analizar
    console.log(`▸ ${c.id}`);
    let pkg: ClassPackage;
    try {
      const r = parseClassPackage(JSON.parse(readFileSync(file, "utf8")));
      if (!r.ok) {
        tot.errores.push(`${c.id}: el paquete no pasa la validación → no se borra nada\n      ${r.errors.slice(0, 5).join("\n      ")}`);
        actualizarClase(c.id, { paquete: file, estado: "error", errores: r.errors.slice(0, 10) });
        continue;
      }
      pkg = r.data;
    } catch (e) {
      tot.errores.push(`${c.id}: paquete ilegible (${e instanceof Error ? e.message : e})`);
      continue;
    }
    c = actualizarClase(c.id, { paquete: file, estado: c.estado === "solo-transcripcion-teams" ? c.estado : "analizada" });

    // Recortes
    const sinAudio = !c.audio || !existsSync(c.audio);
    if (!sinRecortes && !sinAudio) {
      try {
        const rec = await generarRecortes(c, pkg, file);
        if (rec) {
          c = actualizarClase(c.id, { recortes: rec });
          tot.recortesBytes += rec.bytes;
          console.log(`  ✔ ${rec.n} recortes (${fmtBytes(rec.bytes)})`);
        }
      } catch (e) {
        tot.errores.push(`${c.id}: fallo al generar recortes → no se borra nada (${e instanceof Error ? e.message : e})`);
        continue;
      }
    }

    tot.clases.push(c.id);
    tot.vocab += pkg.vocab.length;
    tot.grammar += pkg.grammar.length;
    tot.exercises += pkg.exercises.length;
    if (c.caducaEl && diasHasta(c.caducaEl) <= AVISO_CADUCIDAD_DIAS) tot.avisos.push(`${c.id} caduca en Teams en ~${diasHasta(c.caducaEl)} días`);

    // Limpieza
    if (conservar) {
      actualizarClase(c.id, { estado: "finalizada", limpieza: "conservado", procesadoEl: new Date().toISOString() });
      console.log("  · se conserva el audio (--conservar-video)");
      continue;
    }
    const ok = comprobarCondiciones(c, { sinRecortes: sinRecortes || sinAudio });
    if (!ok.ok) {
      tot.errores.push(`${c.id}: no se borra nada porque ${ok.motivos.join("; ")}`);
      continue;
    }
    const plan = planLimpieza(c);
    const hecho = ejecutarLimpieza(plan, { simular });
    const bytes = hecho.reduce((a, b) => a + b.bytes, 0);
    for (const h of hecho) console.log(`  ${simular ? "(simulado) " : ""}${h.accion === "borrar" ? "borra" : "libera (OneDrive)"}: ${path.basename(h.ruta)}  ${fmtBytes(h.bytes)}`);
    if (!hecho.length) console.log("  · no queda nada pesado que borrar");
    if (simular) {
      tot.liberado += bytes;
      actualizarClase(c.id, { limpieza: "simulado" });
    } else {
      tot.liberado += bytes;
      actualizarClase(c.id, {
        estado: "finalizada",
        procesadoEl: new Date().toISOString(),
        borrado: hecho.map(({ ruta, bytes }) => ({ ruta, bytes })),
        liberadoBytes: (c.liberadoBytes ?? 0) + bytes,
        limpieza: hecho.some((h) => h.accion === "liberar-onedrive") ? "liberado-onedrive" : "borrado",
        audio: undefined,
      });
    }
  }

  // Resumen de la tanda
  console.log("\n━━ Resumen de la tanda ━━");
  console.log(`  Clases: ${tot.clases.length}${tot.clases.length ? ` (${tot.clases.join(", ")})` : ""}`);
  console.log(`  Palabras: ${tot.vocab} · Estructuras: ${tot.grammar} · Ejercicios corregidos: ${tot.exercises}`);
  console.log(`  Recortes: ${fmtBytes(tot.recortesBytes)}`);
  console.log(`  Espacio ${simular ? "que se liberaría" : "liberado"}: ${fmtBytes(tot.liberado)}`);
  const reg2 = leerRegistro();
  const pronto = Object.values(reg2.clases).filter((c) => c.caducaEl && !["finalizada", "no-disponible"].includes(c.estado) && diasHasta(c.caducaEl) <= AVISO_CADUCIDAD_DIAS);
  for (const c of pronto) tot.avisos.push(`${c.id} (sin terminar) caduca en ~${diasHasta(c.caducaEl!)} días`);
  for (const a of [...new Set(tot.avisos)]) console.log(`  ⚠ ${a}`);
  for (const e of tot.errores) console.log(`  ✖ ${e}`);
  if (simular) console.log("\n  Modo simulación: no se ha borrado nada. Para activar el borrado:  npm run clases:finalizar -- --confirmar");
  if (tot.errores.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

