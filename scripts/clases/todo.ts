/**
 * npm run clases:todo — trae las clases nuevas, extrae SOLO el audio y las transcribe.
 *
 *   Orden de fuentes: A) Microsoft Graph (audio en streaming, sin guardar el vídeo)
 *                     B) navegador con tu sesión (Playwright)   → npm run clases:navegador
 *                     C) OneDrive sincronizado en el PC
 *                     D) archivos dejados a mano en clases\entrada\
 *
 * Opciones:
 *   --listar             solo muestra las grabaciones (no procesa nada)
 *   --elegir 1,3,5       procesa solo esas (números de la lista)
 *   --todas              no pregunta: procesa todas las nuevas
 *   --solo-transcribir   no busca nada nuevo; transcribe lo que ya tenga audio
 *   --modelo NOMBRE      modelo de Whisper (por defecto large-v3-turbo)
 *   --sin-graph / --sin-onedrive / --sin-entrada
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync, rmSync } from "node:fs";
import { assertDentroDeClases } from "./limpieza";
import path from "node:path";
import readline from "node:readline/promises";
import { parseDocx, parseVtt, type TeamsSegment } from "../../lib/classes/teams-transcript";
import { extraerAudio, sha256File, duracion } from "./audio";
import { AVISO_CADUCIDAD_DIAS, CADUCIDAD_DIAS, dirs, ffmpegPaths, REPO_DIR } from "./config";
import { archivosEntrada, grabacionesOneDrive } from "./fuentes";
import { downloadUrl, findRecordings, GraphError, signedInAs, tokenSilent, tryTeamsTranscript, type RemoteRecording } from "./graph";
import { diasHasta, fmtBytes, fmtDur, printRecordings } from "./listado";
import { actualizarClase, buscarPorOrigen, claseId, leerRegistro, yaProcesada, type ClaseRegistro, type Metodo } from "./registro";

const argv = process.argv.slice(2);
const flag = (f: string) => argv.includes(f);
const opt = (f: string) => {
  const i = argv.indexOf(f);
  return i >= 0 ? argv[i + 1] : undefined;
};

const MODELO = opt("--modelo") ?? process.env.XUEBAN_WHISPER_MODEL ?? "large-v3-turbo";
const errores: string[] = [];
const avisos: string[] = [];

function log(s: string) {
  console.log(s);
}

function idLibre(fecha: string, titulo: string, itemKey?: string): string {
  const reg = leerRegistro();
  const base = claseId(fecha, titulo);
  let id = base;
  for (let n = 2; reg.clases[id] && reg.clases[id].origen.itemId !== itemKey && reg.clases[id].origen.archivo !== itemKey; n++) id = `${base}-${n}`;
  return id;
}

function progreso(total?: number) {
  let last = 0;
  return (sec: number) => {
    if (Date.now() - last < 3000) return;
    last = Date.now();
    const pct = total ? ` (${Math.min(100, Math.round((100 * sec) / total))} %)` : "";
    process.stdout.write(`\r    audio: ${fmtDur(sec)}${pct}     `);
  };
}

async function elegir<T>(items: T[]): Promise<T[]> {
  const sel = opt("--elegir");
  if (sel) {
    const idx = new Set(sel.split(",").map((s) => Number(s.trim()) - 1));
    return items.filter((_, i) => idx.has(i));
  }
  if (flag("--todas") || !process.stdin.isTTY) return items;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ans = (await rl.question("\n¿Cuáles proceso? [Enter = todas las nuevas · números separados por comas · 0 = ninguna] ")).trim();
  rl.close();
  if (!ans) return items;
  if (ans === "0") return [];
  const idx = new Set(ans.split(",").map((s) => Number(s.trim()) - 1));
  return items.filter((_, i) => idx.has(i));
}

/* ------------------------------------------------------------------ */
/* A) Microsoft Graph                                                  */
/* ------------------------------------------------------------------ */

/** Devuelve las grabaciones que hay que intentar por el navegador (descarga bloqueada), o null si Graph no se pudo usar. */
async function opcionGraph(): Promise<RemoteRecording[] | null> {
  log("\n━━ A) Microsoft Graph ━━");
  const user = await signedInAs();
  if (!user) {
    log("  No hay sesión. Ejecuta primero:  npm run clases:conectar");
    return null;
  }
  try {
    await tokenSilent();
  } catch (e) {
    log(`  ✖ ${e instanceof Error ? e.message : e}  →  npm run clases:conectar`);
    return null;
  }
  log(`  Sesión: ${user}`);
  const { recordings, warnings } = await findRecordings({ expiryDays: CADUCIDAD_DIAS });
  warnings.forEach((w) => avisos.push(`Graph: ${w}`));
  const reg = leerRegistro();
  const nuevas = recordings.filter((r) => !yaProcesada(buscarPorOrigen(reg, r.driveId, r.itemId)));
  printRecordings(recordings, reg);
  if (flag("--listar") || !nuevas.length) {
    if (!nuevas.length) log("  Nada nuevo en Teams.");
    return [];
  }
  log(`\n  Nuevas: ${nuevas.length}`);
  nuevas.forEach((r, i) => log(`   ${String(i + 1).padStart(3)}. ${r.date}  ${r.title}`));
  const elegidas = await elegir(nuevas);
  const porNavegador: RemoteRecording[] = [];
  for (const r of elegidas) {
    const id = idLibre(r.date, r.title, r.itemId);
    log(`\n  ▸ ${id}  (${fmtDur(r.durationSec)})`);
    const dias = diasHasta(r.expiresAt);
    if (dias <= AVISO_CADUCIDAD_DIAS) avisos.push(`${id}: caduca en ~${dias} días`);
    actualizarClase(id, {
      fecha: r.date,
      titulo: r.title,
      origen: { metodo: "graph", nombre: r.name, driveId: r.driveId, itemId: r.itemId, webUrl: r.webUrl },
      hashOriginal: `graph:${r.driveId}:${r.itemId}:${r.size ?? "?"}`,
      duracionSec: r.durationSec,
      caducaEl: r.expiresAt,
      estado: "descubierta",
    });
    // Transcripción de Teams (texto pequeño), si la escuela lo permite.
    const vtt = await tryTeamsTranscript(r, log);
    if (vtt) {
      const f = path.join(dirs().transcripciones, `${id}.teams.vtt`);
      writeFileSync(f, anonimizarVtt(vtt));
      actualizarClase(id, { transcripcionTeams: f });
      log("    ✔ transcripción de Teams");
    }
    try {
      const url = await downloadUrl(r.driveId, r.itemId);
      const out = path.join(dirs().tmp, `${id}.opus`);
      const t0 = Date.now();
      await extraerAudio(url, out, progreso(r.durationSec));
      process.stdout.write("\n");
      const bytes = statSync(out).size;
      log(`    ✔ audio ${fmtBytes(bytes)} en ${Math.round((Date.now() - t0) / 1000)} s (el vídeo no se ha guardado)`);
      actualizarClase(id, { audio: out, hashAudio: await sha256File(out), duracionSec: Math.round(duracion(out)) || r.durationSec, estado: "audio" });
    } catch (e) {
      process.stdout.write("\n");
      const msg = e instanceof Error ? e.message : String(e);
      if (e instanceof GraphError && e.code === "notfound") {
        actualizarClase(id, { estado: "no-disponible", errores: [msg] });
        errores.push(`${id}: ya no está disponible en Teams (caducada o borrada)`);
      } else if (e instanceof GraphError && e.code === "noaccess") {
        log(`    ✖ ${msg} → se intentará por el navegador (opción B)`);
        porNavegador.push(r);
        actualizarClase(id, { errores: [msg] });
      } else {
        errores.push(`${id}: ${msg}`);
        actualizarClase(id, { estado: "error", errores: [msg] });
      }
    }
  }
  return porNavegador;
}

/** Quita los nombres de los hablantes de un .vtt antes de guardarlo. */
function anonimizarVtt(vtt: string): string {
  const segs = parseVtt(vtt, { myName: miNombre() });
  return segsToVtt(segs);
}

function segsToVtt(segs: TeamsSegment[]): string {
  const f = (s: number) => new Date(s * 1000).toISOString().slice(11, 23);
  return "WEBVTT\n\n" + segs.map((s) => `${f(s.start)} --> ${f(s.end)}\n<v ${s.speaker ?? "?"}>${s.text}</v>\n`).join("\n");
}

function miNombre(): string | undefined {
  return process.env.XUEBAN_MI_NOMBRE ?? "Hugo";
}

/* ------------------------------------------------------------------ */
/* C) OneDrive sincronizado y D) entrada\                              */
/* ------------------------------------------------------------------ */

async function desdeArchivo(f: { ruta: string; nombre: string; fecha: string; titulo: string; teams?: string; soloNube?: boolean }, metodo: Metodo): Promise<void> {
  const reg = leerRegistro();
  if (Object.values(reg.clases).some((c) => c.origen.archivo && path.resolve(c.origen.archivo) === path.resolve(f.ruta) && yaProcesada(c))) return;
  const id = idLibre(f.fecha, f.titulo, f.ruta);
  log(`\n  ▸ ${id}  ${f.soloNube ? "(solo en la nube: se descarga temporalmente)" : ""}`);
  actualizarClase(id, { fecha: f.fecha, titulo: f.titulo, origen: { metodo, nombre: f.nombre, archivo: f.ruta }, estado: "descubierta" });
  if (f.teams) {
    const segs = /\.docx$/i.test(f.teams) ? parseDocx(readFileSync(f.teams), { myName: miNombre() }) : parseVtt(readFileSync(f.teams, "utf8"), { myName: miNombre() });
    const out = path.join(dirs().transcripciones, `${id}.teams.vtt`);
    writeFileSync(out, segsToVtt(segs));
    actualizarClase(id, { transcripcionTeams: out });
  }
  try {
    const out = path.join(dirs().tmp, `${id}.opus`);
    await extraerAudio(f.ruta, out, progreso());
    process.stdout.write("\n");
    const durAudio = duracion(out);
    actualizarClase(id, { audio: out, hashOriginal: await sha256File(f.ruta), hashAudio: await sha256File(out), duracionSec: Math.round(durAudio), estado: "audio" });
    log(`    ✔ audio ${fmtBytes(statSync(out).size)}`);
    // Vídeo de entrada\: se borra en cuanto el audio está completo (no hace falta para nada más).
    if (metodo === "manual" && !flag("--conservar-video")) {
      const durVideo = duracion(f.ruta);
      if (durVideo > 0 && durAudio >= durVideo * 0.98) {
        assertDentroDeClases(f.ruta);
        const bytes = statSync(f.ruta).size;
        rmSync(f.ruta);
        actualizarClase(id, { borrado: [{ ruta: f.ruta, bytes }], liberadoBytes: bytes, limpieza: "video-borrado-tras-audio" });
        log(`    🗑 vídeo borrado (${fmtBytes(bytes)} liberados): el audio está completo`);
      } else log(`    ⚠ el audio dura ${fmtDur(durAudio)} y el vídeo ${fmtDur(durVideo)}: conservo el vídeo`);
    }
  } catch (e) {
    process.stdout.write("\n");
    const msg = e instanceof Error ? e.message : String(e);
    errores.push(`${id}: ${msg}`);
    actualizarClase(id, { estado: "error", errores: [msg] });
  }
}

/* ------------------------------------------------------------------ */
/* Transcripción                                                       */
/* ------------------------------------------------------------------ */

function whisper(c: ClaseRegistro, out: string, rescate: boolean): Promise<void> {
  const meta = JSON.stringify({ classId: c.id, classDate: c.fecha, title: c.titulo, original: c.origen.nombre, method: c.origen.metodo, rescate });
  const py = path.join(REPO_DIR, "scripts", "clases", "py");
  return new Promise<void>((resolve, reject) => {
    const p = spawn("uv", ["run", "--project", py, "python", "-I", path.join(py, "transcribe.py"), c.audio!, out, "--modelo", MODELO, "--meta", meta, ...(rescate ? ["--rescate"] : [])], {
      stdio: ["ignore", "inherit", "inherit"],
      windowsHide: true,
      env: { ...process.env, HF_HUB_DISABLE_SYMLINKS_WARNING: "1", PYTHONIOENCODING: "utf-8", FFMPEG: ffmpegPaths().ffmpeg },
    });
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`la transcripción terminó con código ${code}`))));
  });
}

function transcribir(c: ClaseRegistro): Promise<void> {
  const out = path.join(dirs().transcripciones, `${c.id}.json`);
  return whisper(c, out, flag("--rescate"))
    .then(async () => {
      // Si casi no ha recogido voz (audio bajo o lejano), se repite en modo rescate.
      const cov = JSON.parse(readFileSync(out, "utf8")).meta?.speechCoverage ?? 1;
      if (cov < 0.2 && !flag("--rescate")) {
        log(`  ⚠ solo ${Math.round(cov * 100)} % de voz reconocida: repito en modo rescate (volumen normalizado)`);
        await whisper(c, out, true);
      }
    })
    .then(() => {
    // Se añade la transcripción de Teams (anonimizada) como apoyo.
    if (c.transcripcionTeams && existsSync(c.transcripcionTeams)) {
      const t = JSON.parse(readFileSync(out, "utf8"));
      t.teamsTranscript = parseVtt(readFileSync(c.transcripcionTeams, "utf8"));
      writeFileSync(out, JSON.stringify(t, null, 1));
    }
    actualizarClase(c.id, { transcripcion: out, estado: "transcrita" });
  });
}

/** Clase sin audio (descarga bloqueada) pero con transcripción de Teams: se transcribe "a medias". */
function soloTeams(c: ClaseRegistro): void {
  const out = path.join(dirs().transcripciones, `${c.id}.json`);
  const segs = parseVtt(readFileSync(c.transcripcionTeams!, "utf8"));
  const dur = c.duracionSec ?? segs.at(-1)?.end ?? 0;
  writeFileSync(
    out,
    JSON.stringify(
      {
        version: 1,
        meta: { classId: c.id, classDate: c.fecha, title: c.titulo, durationSec: dur, model: "teams", method: "solo transcripción de Teams (calidad del chino limitada)", onlyTeams: true },
        segments: segs.map((s) => ({ ...s, lang: /[一-鿿]/.test(s.text) ? "zh" : "es", confidence: 0.5 })),
      },
      null,
      1,
    ),
  );
  actualizarClase(c.id, { transcripcion: out, estado: "solo-transcripcion-teams" });
}

/* ------------------------------------------------------------------ */

async function main() {
  const d = dirs();
  for (const k of ["entrada", "tmp", "transcripciones", "paquetes", "recortes"] as const) mkdirSync(d[k], { recursive: true });
  const t0 = Date.now();

  if (!flag("--solo-transcribir")) {
    let graph: RemoteRecording[] | null = null;
    if (!flag("--sin-graph")) {
      try {
        graph = await opcionGraph();
      } catch (e) {
        log(`  ✖ ${e instanceof Error ? e.message : e}`);
        graph = null;
      }
    }
    if (graph === null || graph.length) {
      log("\n━━ B) Navegador ━━");
      if (!existsSync(d.navegador)) log("  Sin perfil de navegador todavía. Para usarlo:  npm run clases:navegador -- --iniciar");
      else if (graph?.length) log(`  ${graph.length} grabación(es) con descarga bloqueada → npm run clases:navegador (busca el botón Descargar o lee la transcripción).`);
      else log("  Graph no disponible → npm run clases:navegador");
    }
    if (flag("--listar")) return;
    if (!flag("--sin-onedrive")) {
      log("\n━━ C) OneDrive sincronizado ━━");
      const od = grabacionesOneDrive();
      if (!od.length) log("  No hay grabaciones en las carpetas de OneDrive de este PC.");
      for (const f of od) await desdeArchivo(f, "onedrive");
    }
    if (!flag("--sin-entrada")) {
      log("\n━━ D) clases\\entrada ━━");
      const files = archivosEntrada(d.entrada);
      if (!files.length) log("  Vacía.");
      for (const f of files) await desdeArchivo(f, "manual");
    }
  }

  if (flag("--solo-extraer")) {
    escribirPendientes();
    resumen(Date.now() - t0);
    return;
  }
  // Transcribir todo lo que tenga audio (y las de solo-Teams).
  const reg = leerRegistro();
  const conAudio = Object.values(reg.clases)
    .filter((c) => c.estado === "audio" && c.audio && existsSync(c.audio))
    .filter((c) => !opt("--ids") || opt("--ids")!.split(",").includes(c.id))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  if (conAudio.length) log(`\n━━ Transcripción (${MODELO}) ━━`);
  for (const c of conAudio) {
    log(`\n  ▸ ${c.id}`);
    try {
      await transcribir(c);
    } catch (e) {
      errores.push(`${c.id}: ${e instanceof Error ? e.message : e}`);
    }
  }
  for (const c of Object.values(leerRegistro().clases).filter((c) => c.estado === "descubierta" && c.transcripcionTeams && !c.audio)) soloTeams(c);

  escribirPendientes();
  resumen(Date.now() - t0);
}

function escribirPendientes() {
  const reg = leerRegistro();
  const pend = Object.values(reg.clases)
    .filter((c) => (c.estado === "transcrita" || c.estado === "solo-transcripcion-teams") && !c.paquete)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  const md = [
    "# Clases pendientes de analizar",
    "",
    pend.length ? "Dile a Claude Code: **«analiza las clases nuevas»**." : "No hay nada pendiente.",
    "",
    ...pend.map((c) => `- ${c.fecha} · ${c.titulo} · ${fmtDur(c.duracionSec)} · \`transcripciones/${c.id}.json\`${c.estado === "solo-transcripcion-teams" ? " · ⚠ solo transcripción de Teams" : ""}`),
    "",
  ].join("\n");
  writeFileSync(dirs().pendientes, md);
}

function resumen(ms: number) {
  const reg = leerRegistro();
  const all = Object.values(reg.clases);
  const pend = all.filter((c) => (c.estado === "transcrita" || c.estado === "solo-transcripcion-teams") && !c.paquete);
  const pronto = all.filter((c) => c.caducaEl && c.estado !== "finalizada" && diasHasta(c.caducaEl) <= AVISO_CADUCIDAD_DIAS);
  log("\n━━ Resumen ━━");
  log(`  Pendientes de analizar: ${pend.length}${pend.length ? "  → dile a Claude Code «analiza las clases nuevas»" : ""}`);
  for (const c of pend) log(`    · ${c.fecha} ${c.titulo}`);
  if (pronto.length) log(`  ⚠ Caducan pronto (sin terminar): ${pronto.map((c) => `${c.id} (~${diasHasta(c.caducaEl!)} d)`).join(", ")}`);
  for (const a of avisos) log(`  ⚠ ${a}`);
  for (const e of errores) log(`  ✖ ${e}`);
  log(`  Tiempo: ${Math.round(ms / 60000)} min`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
