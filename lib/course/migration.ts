/**
 * Migración del temario antiguo (u0-pron, u0-chars, u01…u14) al temario nuevo (e0, a1-uNN, a2-uNN, b1-uNN).
 * Ver docs/TEMARIO.md §7–8. Principios:
 *  - nada se borra: los registros antiguos se quedan (historial y copias de seguridad siguen siendo válidos);
 *  - una lección nueva queda «completada» si TODAS sus lecciones antiguas de origen lo estaban; si solo algunas,
 *    «en curso»; la puntuación es la mejor de las de origen;
 *  - notas y conjuntos de ejercicios del usuario reciben el unitId nuevo y guardan el antiguo en legacyUnitId;
 *  - idempotente: la marca `migration:curriculum-v2` en settings evita repetirla.
 * La parte pura (planCurriculumMigration) se prueba en tests/unit/curriculum-migration.test.ts.
 */

/** Lección antigua → lecciones nuevas en las que se reparte su contenido. */
export const LESSON_MAP: Record<string, string[]> = {
  // Unidad 0 · pronunciación y caracteres → Etapa 0
  "u0p-l1": ["e0-10"],
  "u0p-l2": ["e0-09"],
  "u0p-l3": ["e0-11"],
  "u0p-l4": ["e0-08"],
  "u0c-l1": ["e0-12"],
  "u0c-l2": ["e0-12"],
  "u0c-l3": ["e0-12"],
  "u0c-l4": ["e0-12"],
  // u01 Saludos → a1-u01
  "u01-l1": ["a1-u01-l1"],
  "u01-l2": ["a1-u01-l2"],
  "u01-l3": ["a1-u01-l3"],
  "u01-l4": ["a1-u01-l4"],
  "u01-l5": ["a1-u01-l5"],
  // u02 Números → a1-u02
  "u02-l1": ["a1-u02-l1"],
  "u02-l2": ["a1-u02-l2"],
  "u02-l3": ["a1-u02-l3"],
  "u02-l4": ["a1-u02-l4"],
  "u02-l5": ["a1-u02-l5"],
  // u03 Familia → a1-u03
  "u03-l1": ["a1-u03-l1"],
  "u03-l2": ["a1-u03-l2"],
  "u03-l3": ["a1-u03-l3"],
  "u03-l4": ["a1-u03-l4"],
  "u03-l5": ["a1-u03-l5"],
  // u04 Hora y fechas → a1-u05 (calendario) + a1-u06 (hora)
  "u04-l1": ["a1-u05-l1"],
  "u04-l2": ["a1-u06-l1"],
  "u04-l3": ["a1-u06-l2"],
  "u04-l4": ["a1-u05-l2"],
  "u04-l5": ["a1-u05-l4"],
  // u05 Comida → a1-u09
  "u05-l1": ["a1-u09-l1"],
  "u05-l2": ["a1-u09-l2"],
  "u05-l3": ["a1-u09-l3"],
  "u05-l4": ["a1-u09-l4"],
  "u05-l5": ["a1-u09-l5"],
  // u06 Compras → a1-u16
  "u06-l1": ["a1-u16-l1"],
  "u06-l2": ["a1-u16-l2"],
  "u06-l3": ["a1-u16-l3"],
  "u06-l4": ["a1-u16-l4"],
  // u07 Lugares → a1-u14
  "u07-l1": ["a1-u14-l1"],
  "u07-l2": ["a1-u14-l2"],
  "u07-l3": ["a1-u14-l3"],
  "u07-l4": ["a1-u14-l4"],
  // u08 Transporte → a1-u15 (是…的 pasa a A2)
  "u08-l1": ["a1-u15-l1"],
  "u08-l2": ["a1-u15-l2"],
  "u08-l3": ["a2-u01-l1"],
  "u08-l4": ["a1-u15-l4"],
  // u09 Escuela y trabajo → a1-u17 (complementos de resultado pasan a A2)
  "u09-l1": ["a1-u17-l1"],
  "u09-l2": ["a2-u04-l2"],
  "u09-l3": ["a1-u17-l3"],
  "u09-l4": ["a1-u17-l4"],
  // u10 Tiempo atmosférico → a1-u18
  "u10-l1": ["a1-u18-l1"],
  "u10-l2": ["a1-u18-l2"],
  "u10-l3": ["a1-u18-l3"],
  "u10-l4": ["a1-u18-l4"],
  // u11 Salud → a1-u19
  "u11-l1": ["a1-u19-l1"],
  "u11-l2": ["a1-u19-l2"],
  "u11-l3": ["a1-u19-l3"],
  "u11-l4": ["a1-u19-l4"],
  // u12 Ocio → a1-u12
  "u12-l1": ["a1-u12-l1"],
  "u12-l2": ["a1-u12-l2"],
  "u12-l3": ["a1-u12-l3"],
  "u12-l4": ["a1-u12-l4"],
  "u12-l5": ["a1-u12-l5"],
  // u13 Rutina → a1-u07
  "u13-l1": ["a1-u07-l1"],
  "u13-l2": ["a1-u07-l2"],
  "u13-l3": ["a1-u07-l3"],
  "u13-l4": ["a1-u07-l4"],
  // u14 Teléfono → a1-u20 (是…的 pasa a A2)
  "u14-l1": ["a1-u20-l1"],
  "u14-l2": ["a1-u20-l2"],
  "u14-l3": ["a1-u20-l3"],
  "u14-l4": ["a2-u01-l2"],
  "u14-l5": ["a1-u20-l5"],
};

/** Unidad antigua → unidad nueva principal (para notas, conjuntos de ejercicios y role-plays). */
export const UNIT_MAP: Record<string, string> = {
  "u0-pron": "e0",
  "u0-chars": "e0",
  u0: "e0",
  u01: "a1-u01",
  u02: "a1-u02",
  u03: "a1-u03",
  u04: "a1-u05",
  u05: "a1-u09",
  u06: "a1-u16",
  u07: "a1-u14",
  u08: "a1-u15",
  u09: "a1-u17",
  u10: "a1-u18",
  u11: "a1-u19",
  u12: "a1-u12",
  u13: "a1-u07",
  u14: "a1-u20",
};

export const MIGRATION_KEY = "migration:curriculum-v2";

/** Unidad nueva a la que pertenece una lección nueva («a1-u05-l2» → «a1-u05»; «e0-03» → «e0»). */
export function unitOfLesson(lessonId: string): string {
  if (/^e0-/.test(lessonId)) return "e0";
  return lessonId.replace(/-l\d+$/, "");
}

export interface OldProgress {
  lessonId: string;
  unitId: string;
  status: "locked" | "available" | "started" | "completed";
  score?: number;
  attempts: number;
  completedAt?: number;
  updatedAt: number;
}

/** Inverso de LESSON_MAP: lección nueva → lecciones antiguas de origen. */
export function sourcesOf(): Map<string, string[]> {
  const inv = new Map<string, string[]>();
  for (const [old, news] of Object.entries(LESSON_MAP))
    for (const n of news) inv.set(n, [...(inv.get(n) ?? []), old]);
  return inv;
}

/**
 * Calcula el progreso nuevo a partir del antiguo. No toca filas nuevas que ya existan con más avance
 * (si el usuario ya ha hecho la lección nueva, gana su progreso real).
 */
export function planCurriculumMigration(
  old: OldProgress[],
  existingNew: Map<string, OldProgress> = new Map(),
): OldProgress[] {
  const byOld = new Map(old.map((p) => [p.lessonId, p]));
  const out: OldProgress[] = [];
  for (const [newId, srcs] of sourcesOf()) {
    const rows = srcs.map((s) => byOld.get(s)).filter((r): r is OldProgress => Boolean(r));
    if (!rows.length) continue;
    const allDone = srcs.every((s) => byOld.get(s)?.status === "completed");
    const anyTouched = rows.some((r) => r.status === "completed" || r.status === "started");
    if (!anyTouched) continue;
    const scores = rows.map((r) => r.score).filter((x): x is number => typeof x === "number");
    const status: OldProgress["status"] = allDone ? "completed" : "started";
    const cur = existingNew.get(newId);
    if (cur && (cur.status === "completed" || (cur.status === "started" && status === "started")))
      continue;
    out.push({
      lessonId: newId,
      unitId: unitOfLesson(newId),
      status,
      score: scores.length ? Math.max(...scores) : undefined,
      attempts: rows.reduce((a, r) => a + (r.attempts ?? 0), 0),
      completedAt: allDone ? Math.max(...rows.map((r) => r.completedAt ?? r.updatedAt)) : undefined,
      updatedAt: Math.max(...rows.map((r) => r.updatedAt)),
    });
  }
  return out;
}

/** unitId antiguo → nuevo (si no es antiguo, se devuelve igual). */
export function mapUnitId(unitId: string | undefined): string | undefined {
  if (!unitId) return unitId;
  return UNIT_MAP[unitId] ?? unitId;
}
