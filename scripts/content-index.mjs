// node scripts/content-index.mjs — genera content/{ja,ko}/index.ts con importaciones estáticas
// de todos los ficheros de contenido presentes (unidades del curso, gramática, lecturas, artículos,
// recursos, banco del simulacro y semilla). Así el paquete de idioma no depende de una lista a mano.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
for (const lang of ["ja", "ko"]) {
  const dir = path.join(ROOT, "content", lang);
  if (!fs.existsSync(dir)) continue;
  const lines = ["// Generado por scripts/content-index.mjs — no editar a mano.", 'import type { Unit, GrammarPoint } from "@/lib/course/types";', 'import type { GradedReading } from "@/lib/readings/types";', 'import type { Article, Resource } from "@/lib/study-hall/types";'];
  const courseDir = path.join(dir, "course");
  const units = fs.existsSync(courseDir) ? fs.readdirSync(courseDir).filter((f) => f.endsWith(".json")).sort() : [];
  units.forEach((f, i) => lines.push(`import u${i} from "./course/${f}";`));
  const opt = (name, file, fallback, type) => {
    if (fs.existsSync(path.join(dir, file))) {
      lines.push(`import ${name}Json from "./${file}";`);
      return `export const ${name} = ${name}Json as unknown as ${type};`;
    }
    return `export const ${name}: ${type} = ${fallback};`;
  };
  const seedFile = lang === "ja" ? "seed/ja_n5_vocab.json" : "seed/ko_topik1_vocab.json";
  const exportsOut = [
    opt("GRAMMAR", "grammar.json", "[]", "GrammarPoint[]"),
    opt("READINGS", "readings/readings.json", "[]", "GradedReading[]"),
    opt("ARTICLES", "articles.json", "[]", "Article[]"),
    opt("RESOURCES", "resources.json", "[]", "Resource[]"),
    opt("EXAM_BANK", "exam.json", "{}", "Record<string, unknown[]>"),
    opt("SEED_JSON", seedFile, '{ version: 0, source: "", levelTag: "", words: [] }', "{ version: number; source: string; levelTag: string; words: unknown[] }"),
  ];
  lines.push(`export const UNITS: Unit[] = ([${units.map((_, i) => `u${i}`).join(", ")}] as unknown as Unit[]).sort((a, b) => a.order - b.order);`);
  lines.push(...exportsOut);
  fs.writeFileSync(path.join(dir, "index.ts"), lines.join("\n") + "\n");
  console.log(`✓ content/${lang}/index.ts · ${units.length} unidades`);
}
