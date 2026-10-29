/**
 * Fronteras de los paquetes de idioma: solo el registro (lib/languages/registry.ts) y el propio paquete
 * pueden importar lib/languages/{zh,ja,ko}. Así cada paquete se carga de forma diferida y el núcleo no
 * depende de ningún idioma concreto.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const DIRS = ["app", "components", "lib", "scripts"];
const PACKS = ["zh", "ja", "ko"] as const;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|mts|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

const files = DIRS.flatMap((d) => walk(path.join(ROOT, d)));
const rel = (p: string) => path.relative(ROOT, p).split(path.sep).join("/");
const IMPORT_RE = /(?:import|export)\s[^;]*?from\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

/** Paquete al que apunta una ruta de import resuelta (o null). */
function targetPack(fromFile: string, spec: string): string | null {
  let abs: string;
  if (spec.startsWith("@/")) abs = path.join(ROOT, spec.slice(2));
  else if (spec.startsWith(".")) abs = path.resolve(path.dirname(fromFile), spec);
  else return null;
  const r = rel(abs);
  const m = r.match(/^lib\/languages\/(zh|ja|ko)(\/|$)/);
  return m ? m[1] : null;
}

/** Paquete al que pertenece un archivo (o null). Los scripts de datos de cada idioma cuentan como su paquete. */
function ownerPack(file: string): string | null {
  const r = rel(file);
  const m = r.match(/^lib\/languages\/(zh|ja|ko)\//) ?? r.match(/^scripts\/data\/(zh|ja|ko)\./);
  return m ? m[1] : null;
}

// registry.ts: carga diferida de los paquetes; static-content.ts: contenido estático para generateStaticParams
// (solo en el servidor); build-anki.ts: generador de mazos .apkg en Node.
const ALLOWED = new Set(["lib/languages/registry.ts", "lib/languages/static-content.ts", "scripts/build-anki.ts"]);

describe("fronteras de los paquetes de idioma", () => {
  it("ningún archivo fuera de un paquete (salvo el registro) importa lib/languages/{zh,ja,ko}", () => {
    const violations: string[] = [];
    for (const f of files) {
      if (ALLOWED.has(rel(f))) continue;
      const src = readFileSync(f, "utf8");
      const owner = ownerPack(f);
      for (const m of src.matchAll(IMPORT_RE)) {
        const spec = m[1] ?? m[2];
        const t = targetPack(f, spec);
        if (t && t !== owner) violations.push(`${rel(f)} → ${spec}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("existen los tres paquetes", () => {
    for (const p of PACKS) expect(statSync(path.join(ROOT, "lib", "languages", p, "index.ts")).isFile()).toBe(true);
  });
});
