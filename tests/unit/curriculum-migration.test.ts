import { beforeEach, describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import {
  LESSON_MAP,
  MIGRATION_KEY,
  UNIT_MAP,
  mapUnitId,
  planCurriculumMigration,
  sourcesOf,
  unitOfLesson,
  type OldProgress,
} from "@/lib/course/migration";
import { runCurriculumMigration } from "@/lib/course/migrate-db";

const OLD_DIR = path.resolve(import.meta.dirname, "../../content/zh/course");
const oldUnits = readdirSync(OLD_DIR)
  .filter((f) => f.endsWith(".json"))
  .map(
    (f) =>
      JSON.parse(readFileSync(path.join(OLD_DIR, f), "utf8")) as {
        id: string;
        lessons: { id: string }[];
      },
  );

const P = (
  lessonId: string,
  status: OldProgress["status"],
  extra: Partial<OldProgress> = {},
): OldProgress => ({
  lessonId,
  unitId: lessonId.split("-")[0],
  status,
  attempts: 1,
  updatedAt: 100,
  ...extra,
});

describe("migración del temario: mapa", () => {
  it("todas las lecciones del temario antiguo tienen destino", () => {
    const missing = oldUnits
      .flatMap((u) => u.lessons.map((l) => l.id))
      .filter((id) => !LESSON_MAP[id]);
    expect(missing).toEqual([]);
  });
  it("todas las unidades antiguas tienen unidad nueva", () => {
    for (const u of oldUnits) expect(UNIT_MAP[u.id], u.id).toBeTruthy();
  });
  it("los destinos tienen formato de id del temario nuevo", () => {
    for (const n of Object.values(LESSON_MAP).flat())
      expect(n).toMatch(/^(e0-(\d{2}|cp)|(a1|a2|b1)-u\d{2}-l\d+)$/);
  });
  it("unidad de una lección nueva", () => {
    expect(unitOfLesson("a1-u05-l2")).toBe("a1-u05");
    expect(unitOfLesson("e0-07")).toBe("e0");
    expect(mapUnitId("u13")).toBe("a1-u07");
    expect(mapUnitId("a1-u03")).toBe("a1-u03");
  });
});

describe("migración del temario: plan", () => {
  it("completada solo si todas las de origen lo estaban; si no, en curso", () => {
    const old = [
      P("u0c-l1", "completed", { score: 0.8 }),
      P("u0c-l2", "completed", { score: 0.9 }),
      P("u0c-l3", "completed"),
      P("u0c-l4", "started"),
      P("u01-l1", "completed", { score: 0.7, completedAt: 50 }),
    ];
    const plan = new Map(planCurriculumMigration(old).map((p) => [p.lessonId, p]));
    expect(plan.get("e0-12")?.status).toBe("started");
    expect(plan.get("e0-12")?.score).toBe(0.9);
    expect(plan.get("a1-u01-l1")).toMatchObject({
      status: "completed",
      unitId: "a1-u01",
      score: 0.7,
      completedAt: 50,
    });
    expect(plan.has("a1-u01-l2")).toBe(false);
  });
  it("no pisa el progreso nuevo que ya exista", () => {
    const old = [P("u01-l1", "started")];
    const existing = new Map([["a1-u01-l1", P("a1-u01-l1", "completed")]]);
    expect(planCurriculumMigration(old, existing)).toEqual([]);
  });
  it("cada lección nueva conoce sus orígenes", () => {
    expect(sourcesOf().get("e0-12")).toEqual(["u0c-l1", "u0c-l2", "u0c-l3", "u0c-l4"]);
  });
});

describe("migración del temario: IndexedDB", () => {
  beforeEach(async () => {
    await db.lessonProgress.clear();
    await db.notes.clear();
    await db.exerciseSets.clear();
    await db.settings.delete(MIGRATION_KEY);
  });

  it("añade el progreso nuevo, conserva el antiguo y las notas del usuario, y es idempotente", async () => {
    await db.lessonProgress.bulkPut([
      { ...P("u01-l1", "completed", { score: 1 }), lang: "zh" },
      { ...P("u13-l2", "started"), lang: "zh" },
    ]);
    const now = Date.now();
    await db.notes.put({
      id: "mine-1",
      lang: "zh",
      kind: "note",
      type: "free",
      status: "active",
      title: "Mi nota",
      markdown: "我很忙",
      tags: [],
      links: [],
      grammarIds: [],
      wordIds: [],
      unitId: "u13",
      pinned: false,
      builtin: false,
      createdAt: now,
      updatedAt: now,
    } as never);
    await db.exerciseSets.put({
      id: "set-1",
      lang: "zh",
      title: "Clase",
      unitId: "u05",
      tags: [],
      createdAt: now,
      updatedAt: now,
    });
    const r = await runCurriculumMigration();
    expect(r).toMatchObject({ lessons: 2, notes: 1, sets: 1 });
    // el antiguo sigue
    expect(await db.lessonProgress.get("u01-l1")).toBeTruthy();
    expect((await db.lessonProgress.get("a1-u01-l1"))?.status).toBe("completed");
    expect((await db.lessonProgress.get("a1-u07-l2"))?.status).toBe("started");
    const note = await db.notes.get("mine-1");
    expect(note).toMatchObject({
      unitId: "a1-u07",
      legacyUnitId: "u13",
      markdown: "我很忙",
      title: "Mi nota",
    });
    expect((await db.exerciseSets.get("set-1"))?.unitId).toBe("a1-u09");
    // idempotente
    expect(await runCurriculumMigration()).toBeNull();
    expect(await db.lessonProgress.count()).toBe(4);
  });
});
