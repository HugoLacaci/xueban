// node scripts/fix-export-prefetch.mjs [out]
// Tras `next build` con exportación estática: Next 16 escribe los datos de prefetch de segmentos como
// carpetas anidadas (out/ko/ajustes/__next.$d$lang/ajustes/__PAGE__.txt) pero el cliente los pide con
// los segmentos unidos por puntos (out/ko/ajustes/__next.$d$lang.ajustes.__PAGE__.txt). En un hosting
// estático (GitHub Pages) eso da 404 y el prefetch se pierde. Este paso crea esas copias planas.
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve(process.argv[2] ?? "out");
let n = 0;

function flatten(base, dir, prefix) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    const name = `${prefix}.${e.name}`;
    if (e.isDirectory()) flatten(base, p, name);
    else {
      const target = path.join(base, name);
      if (!fs.existsSync(target)) {
        fs.copyFileSync(p, target);
        n++;
      }
    }
  }
}

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const p = path.join(dir, e.name);
    if (e.name.startsWith("__next.")) flatten(dir, p, e.name);
    else walk(p);
  }
}

if (!fs.existsSync(OUT)) {
  console.error(`No existe ${OUT}`);
  process.exit(1);
}
walk(OUT);
console.log(`prefetch: ${n} archivos planos creados en ${path.relative(process.cwd(), OUT) || "."}`);
