/**
 * Privacidad de las clases grabadas: el audio de las clases (voz del profesor y de los compañeros) y los paquetes de
 * clase nunca pueden acabar en public/ (se publicaría en GitHub Pages) ni en el repositorio. Viven en
 * C:\CHINA\IDIOMA\clases y, una vez importados, en IndexedDB del navegador.
 */
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { closeSync, existsSync, openSync, readdirSync, readSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const AUDIO = /\.(opus|ogg|m4a)$/i;

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** ¿Parece un paquete de clase? (mira solo el principio del archivo: los JSON de datos pueden ser enormes) */
function looksLikeClassPackage(file: string): boolean {
  const fd = openSync(file, "r");
  try {
    const buf = Buffer.alloc(4096);
    const n = readSync(fd, buf, 0, buf.length, 0);
    const head = buf.subarray(0, n).toString("utf8");
    return /"classDate"\s*:\s*"\d{4}-\d{2}-\d{2}"/.test(head) && /"(summary|topics|vocab|teacherAnswer|exercises)"\s*:/.test(head);
  } finally {
    closeSync(fd);
  }
}

const rel = (p: string) => path.relative(ROOT, p).split(path.sep).join("/");

describe("privacidad de las clases grabadas", () => {
  it("no hay audio de clases ni paquetes de clase en public/", () => {
    const files = walk(path.join(ROOT, "public"));
    const bad = files.filter((f) => AUDIO.test(f) || (/\.json$/i.test(f) && statSync(f).size < 5_000_000 && looksLikeClassPackage(f)) || /(^|\/)(recortes|paquetes|clases)\//.test(rel(f)));
    expect(bad.map(rel)).toEqual([]);
  }, 120_000); // public/ tiene miles de archivos (audio TTS): recorrerlo tarda

  it("no hay audio de clases ni paquetes de clase versionados (ni a punto de versionarse)", () => {
    let list: string[];
    try {
      list = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
        .split(/\r?\n/)
        .filter(Boolean);
    } catch {
      return; // sin git (p. ej. una copia descargada en zip): no hay nada versionado que comprobar
    }
    const bad = list.filter((f) => {
      if (AUDIO.test(f)) return true;
      if (/^(clases|paquetes|recortes)\//.test(f) || /(^|\/)\.navegador\//.test(f)) return true;
      if (!/\.json$/i.test(f)) return false;
      const abs = path.join(ROOT, f);
      return existsSync(abs) && statSync(abs).size < 5_000_000 && looksLikeClassPackage(abs);
    });
    expect(bad).toEqual([]);
  });

  it(".gitignore excluye las carpetas locales de clases", async () => {
    const { readFileSync } = await import("node:fs");
    const gi = readFileSync(path.join(ROOT, ".gitignore"), "utf8").split(/\r?\n/);
    for (const rule of ["/clases/", ".navegador/"]) expect(gi).toContain(rule);
  });
});
