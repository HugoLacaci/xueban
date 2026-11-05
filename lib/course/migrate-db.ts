"use client";
/**
 * Ejecuta la migración del temario antiguo al nuevo sobre IndexedDB (ver lib/course/migration.ts).
 * Idempotente (marca en settings) y no destructiva: solo AÑADE filas de progreso nuevas y el unitId nuevo
 * (el antiguo se guarda en legacyUnitId).
 */
import { db } from "@/lib/db";
import {
  mapUnitId,
  MIGRATION_KEY,
  planCurriculumMigration,
  UNIT_MAP,
  type OldProgress,
} from "./migration";

export async function runCurriculumMigration(): Promise<{
  lessons: number;
  notes: number;
  sets: number;
  items: number;
} | null> {
  const done = await db.settings.get(MIGRATION_KEY);
  if (done) return null;
  const result = { lessons: 0, notes: 0, sets: 0, items: 0 };
  await db.transaction(
    "rw",
    [db.lessonProgress, db.notes, db.exerciseSets, db.exerciseItems, db.settings],
    async () => {
      const rows = await db.lessonProgress.where("lang").equals("zh").toArray();
      const existing = new Map<string, OldProgress>(rows.map((r) => [r.lessonId, r]));
      const plan = planCurriculumMigration(rows, existing);
      if (plan.length)
        await db.lessonProgress.bulkPut(plan.map((p) => ({ ...p, lang: "zh" as const })));
      result.lessons = plan.length;
      const legacy = new Set(Object.keys(UNIT_MAP));
      result.notes = await db.notes
        .where("lang")
        .equals("zh")
        .filter((n) => Boolean(n.unitId && legacy.has(n.unitId) && !n.builtin))
        .modify((n) => {
          n.legacyUnitId = n.unitId;
          n.unitId = mapUnitId(n.unitId);
        });
      result.sets = await db.exerciseSets
        .where("lang")
        .equals("zh")
        .filter((s) => Boolean(s.unitId && legacy.has(s.unitId)))
        .modify((s) => {
          s.legacyUnitId = s.unitId;
          s.unitId = mapUnitId(s.unitId);
        });
      result.items = await db.exerciseItems
        .where("lang")
        .equals("zh")
        .filter((s) => Boolean(s.unitId && legacy.has(s.unitId)))
        .modify((s) => {
          s.legacyUnitId = s.unitId;
          s.unitId = mapUnitId(s.unitId);
        });
      await db.settings.put({
        key: MIGRATION_KEY,
        value: { at: Date.now(), ...result },
        updatedAt: Date.now(),
      });
    },
  );
  return result;
}
