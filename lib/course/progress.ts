"use client";
import { db, type LessonProgress } from "@/lib/db";
import { getUnits } from "./index";
import { getActiveLang } from "@/lib/languages/registry";

let migrated: Promise<unknown> | undefined;
/** Con el temario v2 del chino activo, migra una vez el progreso antiguo (lib/course/migrate-db.ts). */
function ensureMigrated(): Promise<unknown> {
  if (getActiveLang() !== "zh" || getUnits()[0]?.id !== "e0") return Promise.resolve();
  migrated ??= import("./migrate-db")
    .then((m) => m.runCurriculumMigration())
    .catch((e) => console.warn("Migración del temario", e));
  return migrated;
}

export async function getProgressMap(): Promise<Map<string, LessonProgress>> {
  await ensureMigrated();
  const rows = await db.lessonProgress.where("lang").equals(getActiveLang()).toArray();
  return new Map(rows.map((r) => [r.lessonId, r]));
}

export async function markStarted(unitId: string, lessonId: string): Promise<void> {
  const cur = await db.lessonProgress.get(lessonId);
  if (cur && cur.status === "completed") return;
  await db.lessonProgress.put({
    lessonId,
    unitId,
    lang: getActiveLang(),
    status: "started",
    attempts: cur?.attempts ?? 0,
    score: cur?.score,
    updatedAt: Date.now(),
  });
}

export async function markCompleted(
  unitId: string,
  lessonId: string,
  score?: number,
): Promise<void> {
  // ficha de la lección (apunte resumen automático, ampliable)
  void import("@/lib/notes/lesson-note")
    .then((m) => m.ensureLessonNote(lessonId))
    .catch(() => undefined);
  const cur = await db.lessonProgress.get(lessonId);
  await db.lessonProgress.put({
    lessonId,
    unitId,
    lang: getActiveLang(),
    status: "completed",
    attempts: (cur?.attempts ?? 0) + 1,
    score: score !== undefined ? Math.max(score, cur?.score ?? 0) : cur?.score,
    completedAt: cur?.completedAt ?? Date.now(),
    updatedAt: Date.now(),
  });
}

/** Primera lección no completada (siguiendo el orden del curso). */
export function nextRecommended(
  progress: Map<string, LessonProgress>,
): { unitId: string; lessonId: string } | null {
  for (const u of getUnits())
    for (const l of u.lessons)
      if (progress.get(l.id)?.status !== "completed") return { unitId: u.id, lessonId: l.id };
  return null;
}

export function unitStats(
  unitId: string,
  progress: Map<string, LessonProgress>,
): { total: number; done: number; started: number } {
  const u = getUnits().find((x) => x.id === unitId);
  if (!u) return { total: 0, done: 0, started: 0 };
  let done = 0;
  let started = 0;
  for (const l of u.lessons) {
    const p = progress.get(l.id);
    if (p?.status === "completed") done++;
    else if (p?.status === "started") started++;
  }
  return { total: u.lessons.length, done, started };
}
