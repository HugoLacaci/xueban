/**
 * npm run curriculum:index
 * Genera content/zh/curriculum/index.ts a partir de units.json (cabeceras) y lessons/*.json (una lección por
 * archivo). Así varias personas (o agentes) pueden escribir lecciones en paralelo sin tocar un JSON gigante.
 * Orden de las lecciones: e0-01 … e0-12, e0-cp; aN-uNN-l1, -l2…
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIR = path.join(ROOT, "content", "zh", "curriculum");

export function unitOfLesson(id: string): string {
  return id.startsWith("e0-") ? "e0" : id.replace(/-l\d+$/, "");
}
export function lessonSortKey(id: string): number {
  const e0 = id.match(/^e0-(\d+|cp)$/);
  if (e0) return e0[1] === "cp" ? 99 : Number(e0[1]);
  return Number(id.match(/-l(\d+)$/)?.[1] ?? 0);
}

function main() {
  const units = JSON.parse(readFileSync(path.join(DIR, "units.json"), "utf8")) as { id: string }[];
  const files = existsSync(path.join(DIR, "lessons"))
    ? readdirSync(path.join(DIR, "lessons")).filter((f) => f.endsWith(".json"))
    : [];
  const ids = files.map((f) => f.replace(/\.json$/, ""));
  const known = new Set(units.map((u) => u.id));
  const orphan = ids.filter((id) => !known.has(unitOfLesson(id)));
  if (orphan.length) console.warn("Lecciones sin unidad en units.json:", orphan.join(", "));
  const byUnit = new Map<string, string[]>();
  for (const id of ids.filter((x) => known.has(unitOfLesson(x))))
    byUnit.set(unitOfLesson(id), [...(byUnit.get(unitOfLesson(id)) ?? []), id]);
  for (const list of byUnit.values()) list.sort((a, b) => lessonSortKey(a) - lessonSortKey(b));
  const all = [...byUnit.values()].flat();
  // metadatos ligeros (sin pasos): lo que viaja en el paquete del idioma; los pasos se cargan al abrir la lección
  const meta: Record<string, unknown[]> = {};
  for (const [u, list] of byUnit)
    meta[u] = list.map((id) => {
      const l = JSON.parse(readFileSync(path.join(DIR, "lessons", `${id}.json`), "utf8"));
      return {
        id: l.id,
        title: l.title,
        zh: l.zh,
        goal: l.goal,
        minutes: l.minutes,
        reviewed: l.reviewed,
        vocab: l.vocab,
        extraVocab: l.extraVocab,
        steps: [],
      };
    });
  writeFileSync(path.join(DIR, "meta.json"), JSON.stringify(meta));
  const lines: string[] = [
    "/* Generado por `npm run curriculum:index` (scripts/curriculum-index.ts). No editar a mano. */",
    'import type { Lesson, Unit } from "@/lib/course/types";',
    'import unitsJson from "./units.json";',
    'import metaJson from "./meta.json";',
    "",
    "/** Pasos de cada lección, en trozos separados (import dinámico). */",
    "const LOADERS: Record<string, () => Promise<{ default: unknown }>> = {",
  ];
  for (const id of all)
    lines.push(`  ${JSON.stringify(id)}: () => import("./lessons/${id}.json"),`);
  lines.push("};");
  lines.push("");
  lines.push("const LESSONS = metaJson as unknown as Record<string, Lesson[]>;");
  lines.push("");
  lines.push(
    "/** Unidades del temario v2 con sus lecciones (las unidades aún sin lecciones se omiten). Los pasos llegan con hydrateLesson. */",
  );
  lines.push(
    'export const CURRICULUM_UNITS: Unit[] = (unitsJson as Omit<Unit, "lessons">[]).filter((u) => LESSONS[u.id]?.length).map((u) => ({ ...u, lessons: LESSONS[u.id] }));',
  );
  lines.push("");
  lines.push(
    "const byId = new Map(CURRICULUM_UNITS.flatMap((u) => u.lessons.map((l) => [l.id, l] as const)));",
  );
  lines.push("const pending = new Map<string, Promise<void>>();");
  lines.push(
    "/** Carga los pasos de una lección y los asigna al objeto compartido (idempotente). */",
  );
  lines.push("export function hydrateLesson(id: string): Promise<void> {");
  lines.push("  const l = byId.get(id);");
  lines.push("  if (!l || l.steps.length || !LOADERS[id]) return Promise.resolve();");
  lines.push(
    "  if (!pending.has(id)) pending.set(id, LOADERS[id]().then((m) => void (l.steps = (m.default as Lesson).steps)));",
  );
  lines.push("  return pending.get(id)!;");
  lines.push("}");
  lines.push("");
  lines.push(`/** Unidades planificadas (todas las de units.json), con o sin lecciones. */`);
  lines.push('export const PLANNED_UNITS = unitsJson as Omit<Unit, "lessons">[];');
  lines.push("");
  writeFileSync(path.join(DIR, "index.ts"), lines.join("\n"));
  console.log(`curriculum: ${all.length} lecciones en ${byUnit.size} de ${units.length} unidades`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) main();
