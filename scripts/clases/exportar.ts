/**
 * npm run clases:exportar — prepara clases\para-importar\ para importar TODAS las clases de una vez
 * en la web (Apuntes → Mis clases → Importar → seleccionar todos los archivos de la carpeta).
 *
 * Los recortes se renombran a "<id>__<archivo>.opus" (y se reescriben las referencias del paquete)
 * para que no choquen los nombres entre clases (todas tienen ex-1.opus…).
 * Los paquetes marcados como duplicateOf van a una segunda carpeta: se importan DESPUÉS.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseClassPackage, type ClassPackage } from "../../lib/classes/package-schema";
import { dirs } from "./config";
import { assertDentroDeClases } from "./limpieza";

export function renombrarRecortes(pkg: ClassPackage, id: string): ClassPackage {
  const ren = (f?: string) => (f ? `${id}__${f}` : f);
  const p = structuredClone(pkg);
  for (const list of [p.vocab, p.grammar, p.phrases, p.teacherTips, p.exercises] as { clip?: string }[][]) for (const x of list) x.clip = ren(x.clip);
  for (const c of p.clips ?? []) c.file = ren(c.file)!;
  return p;
}

function main() {
  const d = dirs();
  const out = path.join(d.root, "para-importar");
  if (existsSync(out)) {
    assertDentroDeClases(out);
    rmSync(out, { recursive: true });
  }
  const principal = path.join(out, "1-clases");
  const repes = path.join(out, "2-repeticiones");
  mkdirSync(principal, { recursive: true });
  mkdirSync(repes, { recursive: true });
  let n = 0,
    audios = 0;
  const errores: string[] = [];
  for (const f of readdirSync(d.paquetes).filter((x) => x.endsWith(".json"))) {
    const id = f.replace(/\.json$/, "");
    const r = parseClassPackage(JSON.parse(readFileSync(path.join(d.paquetes, f), "utf8")));
    if (!r.ok) {
      errores.push(`${id}: ${r.errors[0]}`);
      continue;
    }
    const dest = r.data.duplicateOf ? repes : principal;
    writeFileSync(path.join(dest, f), JSON.stringify(renombrarRecortes(r.data, id), null, 2));
    for (const c of r.data.clips ?? []) {
      const src = path.join(d.recortes, id, c.file);
      if (existsSync(src)) {
        copyFileSync(src, path.join(dest, `${id}__${c.file}`));
        audios++;
      } else errores.push(`${id}: falta el recorte ${c.file}`);
    }
    n++;
  }
  console.log(`✔ ${n} clases y ${audios} recortes en ${out}`);
  console.log("  1) Importa todo lo de 1-clases  2) Después, todo lo de 2-repeticiones (si hay).");
  for (const e of errores) console.log(`  ⚠ ${e}`);
}

main();
