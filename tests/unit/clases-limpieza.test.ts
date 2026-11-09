/** Borrado seguro de la canalización de clases (scripts/clases/limpieza.ts) y registro. */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync, symlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { assertDentroDeClases, comprobarCondiciones, coberturaTranscripcion, dentroDeClases, ejecutarLimpieza, planLimpieza, FueraDeClasesError } from "@/scripts/clases/limpieza";
import { actualizarClase, claseId, leerRegistro, type ClaseRegistro } from "@/scripts/clases/registro";
import { validPackage } from "./fixtures/class-package";

let base: string; // carpeta temporal que contiene clases\ y una carpeta "vecina" fuera
let root: string;

function write(p: string, content: string | Buffer = "x") {
  mkdirSync(path.dirname(p), { recursive: true });
  writeFileSync(p, content);
  return p;
}

function transcript(durationSec: number, segs: [number, number][]) {
  return JSON.stringify({ version: 1, meta: { durationSec }, segments: segs.map(([start, end]) => ({ start, end, lang: "zh", text: "你好", confidence: 0.9 })) });
}

function clase(over: Partial<ClaseRegistro> = {}): ClaseRegistro {
  const id = "2026-10-14_numeros";
  const tr = write(path.join(root, "transcripciones", `${id}.json`), transcript(600, Array.from({ length: 10 }, (_, i) => [i * 60 + 5, i * 60 + 50])));
  const pq = write(path.join(root, "paquetes", `${id}.json`), JSON.stringify(validPackage()));
  const rdir = path.join(root, "recortes", "2026-10-14");
  for (const f of ["ex-1.opus", "vocab-1.opus", "tip-1.opus"]) write(path.join(rdir, f), Buffer.alloc(2000, 1));
  const audio = write(path.join(root, "tmp", `${id}.opus`), Buffer.alloc(5000, 1));
  return {
    id,
    fecha: "2026-10-14",
    titulo: "Números",
    origen: { metodo: "graph", nombre: "Clase-20261014_180000-Grabación de la reunión.mp4", driveId: "d", itemId: "i" },
    estado: "analizada",
    audio,
    transcripcion: tr,
    paquete: pq,
    recortes: { n: 3, bytes: 6000, dir: rdir },
    actualizadoEl: new Date().toISOString(),
    ...over,
  };
}

beforeEach(() => {
  base = mkdtempSync(path.join(os.tmpdir(), "xb-clases-"));
  root = path.join(base, "clases");
  mkdirSync(root, { recursive: true });
  process.env.XUEBAN_CLASES_DIR = root;
});
afterEach(() => {
  delete process.env.XUEBAN_CLASES_DIR;
  rmSync(base, { recursive: true, force: true });
});

describe("dentro de clases\\", () => {
  it("acepta rutas internas y rechaza la propia carpeta, rutas de fuera y ..", () => {
    expect(dentroDeClases(path.join(root, "tmp", "a.opus"), root)).toBe(true);
    expect(dentroDeClases(root, root)).toBe(false);
    expect(dentroDeClases(path.join(base, "otra", "a.mp4"), root)).toBe(false);
    expect(dentroDeClases(path.join(root, "..", "clases-falsa", "a.mp4"), root)).toBe(false);
    expect(dentroDeClases(path.join(root, "tmp", "..", "..", "a.mp4"), root)).toBe(false);
    expect(dentroDeClases("C:\\Windows\\notepad.exe", root)).toBe(false);
    expect(() => assertDentroDeClases(path.join(base, "fuera.txt"), root)).toThrow(FueraDeClasesError);
  });

  it("no se deja engañar por un enlace que apunta fuera", () => {
    const fuera = write(path.join(base, "fuera", "video.mp4"));
    const link = path.join(root, "tmp", "enlace.mp4");
    mkdirSync(path.dirname(link), { recursive: true });
    try {
      symlinkSync(fuera, link);
    } catch {
      return; // Windows sin permiso para crear enlaces: se omite
    }
    expect(dentroDeClases(link, root)).toBe(false);
  });

  it("nunca borra fuera de clases\\ aunque el plan lo pida", () => {
    const fuera = write(path.join(base, "importante.mp4"), "no me borres");
    expect(() => ejecutarLimpieza({ archivos: [{ ruta: fuera, bytes: 12, accion: "borrar" }], bytes: 12 }, { root })).toThrow(FueraDeClasesError);
    expect(existsSync(fuera)).toBe(true);
  });

  it("nunca borra transcripciones, paquetes, recortes ni el registro", () => {
    const c = clase();
    expect(() => ejecutarLimpieza({ archivos: [{ ruta: c.paquete!, bytes: 1, accion: "borrar" }], bytes: 1 }, { root })).toThrow();
    expect(existsSync(c.paquete!)).toBe(true);
  });
});

describe("condiciones para borrar", () => {
  it("todo correcto → se puede borrar", () => {
    expect(comprobarCondiciones(clase())).toEqual({ ok: true, motivos: [] });
  });

  it("no borra si el paquete no pasa la validación zod", () => {
    const c = clase();
    writeFileSync(c.paquete!, JSON.stringify({ ...validPackage(), classDate: "14/10/2026" }));
    const r = comprobarCondiciones(c);
    expect(r.ok).toBe(false);
    expect(r.motivos.join()).toMatch(/validación/);
  });

  it("no borra si la transcripción cubre poco (≤ 80 %)", () => {
    const c = clase();
    writeFileSync(c.transcripcion!, transcript(600, [[0, 100], [120, 300]])); // 6 de 10 minutos
    expect(comprobarCondiciones(c).motivos.join()).toMatch(/80 %/);
  });

  it("no borra si faltan los recortes, salvo con --sin-recortes", () => {
    const c = clase();
    rmSync(c.recortes!.dir, { recursive: true });
    expect(comprobarCondiciones(c).ok).toBe(false);
    expect(comprobarCondiciones(c, { sinRecortes: true }).ok).toBe(true);
  });

  it("cobertura por minutos", () => {
    expect(coberturaTranscripcion({ meta: { durationSec: 300 }, segments: [{ start: 0, end: 299 }] })).toBe(1);
    expect(coberturaTranscripcion({ meta: { durationSec: 300 }, segments: [] })).toBe(0);
  });
});

describe("plan y ejecución", () => {
  it("borra el audio y los temporales de esa clase, nada más", () => {
    const c = clase();
    const otro = write(path.join(root, "tmp", "2026-10-21_otra.opus"), "otra clase");
    const video = write(path.join(root, "entrada", `${c.id}.mp4`), Buffer.alloc(9000, 1));
    const plan = planLimpieza(c, root);
    expect(plan.archivos.map((a) => path.basename(a.ruta)).sort()).toEqual([`${c.id}.mp4`, `${c.id}.opus`]);
    expect(plan.bytes).toBe(14000);

    const sim = ejecutarLimpieza(plan, { simular: true, root });
    expect(sim).toHaveLength(2);
    expect(existsSync(video)).toBe(true); // simular no toca nada

    ejecutarLimpieza(plan, { root });
    expect(existsSync(video)).toBe(false);
    expect(existsSync(c.audio!)).toBe(false);
    expect(existsSync(otro)).toBe(true);
    expect(existsSync(c.paquete!)).toBe(true);
    expect(existsSync(c.transcripcion!)).toBe(true);
  });

  it("OneDrive: el original se libera, no se borra", () => {
    const od = write(path.join(base, "OneDrive", "Recordings", "clase.mp4"), Buffer.alloc(100, 1));
    const c = clase({ origen: { metodo: "onedrive", nombre: "clase.mp4", archivo: od } });
    const plan = planLimpieza(c, root);
    expect(plan.archivos.find((a) => a.ruta === path.resolve(od))?.accion).toBe("liberar-onedrive");
    expect(plan.archivos.filter((a) => a.accion === "borrar").every((a) => dentroDeClases(a.ruta, root))).toBe(true);
  });
});

describe("registro", () => {
  it("se escribe de forma atómica y conserva lo anterior", () => {
    const id = claseId("2026-10-14", "Los números y la edad");
    expect(id).toBe("2026-10-14_los-numeros-y-la-edad");
    actualizarClase(id, { fecha: "2026-10-14", titulo: "Los números", origen: { metodo: "graph", nombre: "x.mp4", itemId: "abc" }, estado: "transcrita" });
    actualizarClase(id, { estado: "finalizada", liberadoBytes: 123, borrado: [{ ruta: "C:/x", bytes: 123 }], limpieza: "borrado" });
    const reg = leerRegistro();
    const c = reg.clases[id];
    expect(c.estado).toBe("finalizada");
    expect(c.origen.itemId).toBe("abc");
    expect(c.liberadoBytes).toBe(123);
    expect(reg.borradoConfirmado).toBe(false);
    const raw = JSON.parse(readFileSync(path.join(root, "registro.json"), "utf8"));
    expect(raw.version).toBe(1);
    expect(existsSync(path.join(root, `registro.json.${process.pid}.tmp`))).toBe(false);
  });
});
