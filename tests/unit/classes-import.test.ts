import { beforeEach, describe, expect, it } from "vitest";
import Dexie from "dexie";
import { db, upsertWord, XuebanDB } from "@/lib/db";
import { classClipStats, deleteOldClassClips, importClassPackage, previewClassPackage } from "@/lib/classes/import";
import { answerDiffers, contentHash, ddmm, fmtTime, queryTerms, searchClasses } from "@/lib/classes/search";
import { parseClassPackage } from "@/lib/classes/package-schema";
import { validPackage } from "./fixtures/class-package";

const clipBlob = () => new Blob([new Uint8Array([79, 103, 103, 83])], { type: "audio/ogg" });

describe("importación de paquetes de clase", () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it("el paquete de prueba es válido", () => {
    expect(parseClassPackage(validPackage()).ok).toBe(true);
  });

  it("previsualiza palabras nuevas y ya en el mazo, ejercicios con confianza y dudas", async () => {
    await upsertWord({ hanzi: "岁", pinyin: "suì", meaning: "años", category: "Números" });
    const p = await previewClassPackage(validPackage(), db, { livingIds: new Set(["numeros"]) });
    expect(p.noteId).toBe("class-2026-10-14");
    expect(p.noteStatus).toBe("new");
    expect(p.words.map((w) => [w.hanzi, w.inDeck])).toEqual([["岁", true], ["多大", false]]);
    expect(p.structures).toHaveLength(1);
    expect(p.exercises.map((e) => [e.key, e.confidence, e.wrong])).toEqual([["ex:1", "alta", true], ["ex:2", "baja", false]]);
    expect(p.doubts.some((d) => d.kind === "uncertain")).toBe(true);
    expect(p.warnings.join(" ")).toMatch(/confianza baja/);
    expect(p.warnings.join(" ")).toMatch(/living-numeros/); // aportación huérfana
    expect(p.clips.sort()).toEqual(["ex-1.opus", "tip-1.opus", "vocab-1.opus"]);
  });

  it("crea apunte, palabras, conjunto, ejercicios, 错题本, aportaciones y recortes con ids estables", async () => {
    const pkg = validPackage();
    const r = await importClassPackage(pkg, new Map([["ex-1.opus", clipBlob()], ["vocab-1.opus", clipBlob()]]));
    expect(r.noteId).toBe("class-2026-10-14");
    const note = await db.notes.get("class-2026-10-14");
    expect(note?.type).toBe("class");
    expect(note?.kind).toBe("class");
    expect(note?.classDate).toBe("2026-10-14");
    expect(note?.tags).toEqual(expect.arrayContaining(["clase", "clase::2026-10-14"]));
    expect(note?.source).toMatchObject({ kind: "class", ref: pkg.source.file });
    expect(note?.cues[0].q).toMatch(/edad/);
    expect(note?.fields.homework).toContain("página 21");
    expect(note?.wordIds).toHaveLength(2);
    const w = await db.words.where("[lang+hanzi]").equals(["zh", "多大"]).first();
    expect(w?.source).toBe("class");
    expect(w?.tags).toEqual(expect.arrayContaining(["clase", "clase::2026-10-14"]));
    expect(w?.category).toBe("Preguntas");
    expect(await db.cards.where("wordId").equals(w!.id).count()).toBe(3);

    const set = await db.exerciseSets.get("class-2026-10-14:set");
    expect(set?.title).toBe("Clase 14/10: Los números y la edad");
    expect(set?.tags).toContain("corregido-en-clase");
    const ex1 = await db.exerciseItems.get("class-2026-10-14:ex:1");
    expect(ex1).toMatchObject({ origin: "class", classAnswer: "我是二十岁。", answers: ["我二十岁。"], confidence: "alta", clipAssetId: "class-2026-10-14:clip:ex-1.opus", classTimestamp: 700, teacherExplanation: "Con la edad no se usa 是." });
    const ex2 = await db.exerciseItems.get("class-2026-10-14:ex:2");
    expect(ex2).toMatchObject({ confidence: "baja", confirmed: false, claudeProposal: "我弟弟十二岁。" });
    expect(ex2?.clipAssetId).toBeUndefined();
    expect(await db.exerciseItems.where("origin").equals("class").count()).toBe(2);

    // 错题本: solo el ejercicio con respuesta distinta
    const errors = await db.notes.where("[lang+type]").equals(["zh", "error"]).toArray();
    expect(errors).toHaveLength(1);
    expect(errors[0].fields).toMatchObject({ mine: "我是二十岁。", correct: "我二十岁。" });
    expect(String(errors[0].fields.origin)).toMatch(/^clase/);

    const add = await db.livingNoteAdds.get("class-2026-10-14:living:1");
    expect(add).toMatchObject({ kind: "teacher", noteId: "living-numeros", title: "👩‍🏫 Clase del 14/10" });

    expect(r.clips.saved).toBe(2);
    expect(r.clips.missing).toEqual(["tip-1.opus"]);
    const clip = await db.assets.get("class-2026-10-14:clip:ex-1.opus");
    expect(clip?.kind).toBe("class-clip");
    expect((await classClipStats()).count).toBe(2);
  });

  it("es idempotente: reimportar no duplica nada", async () => {
    const pkg = validPackage();
    await importClassPackage(pkg, new Map([["ex-1.opus", clipBlob()]]));
    const counts = async () => [await db.notes.count(), await db.words.count(), await db.exerciseItems.count(), await db.exerciseSets.count(), await db.livingNoteAdds.count(), await db.assets.count(), await db.noteCards.count()];
    const before = await counts();
    const r = await importClassPackage(pkg, new Map([["ex-1.opus", clipBlob()]]));
    expect(await counts()).toEqual(before);
    expect(r.note).toBe("same");
    expect(r.exercises).toEqual({ added: 0, updated: 0, unchanged: 2 });
    expect(r.conflicts).toEqual([]);
    expect(r.errorsAdded).toBe(0);
    const err = await db.notes.where("[lang+type]").equals(["zh", "error"]).first();
    expect(err?.fields.times).toBe(1);
  });

  it("respeta las exclusiones", async () => {
    await importClassPackage(validPackage(), new Map(), { exclude: ["word:多大", "ex:2", "living:1", "clips"] });
    expect(await db.words.where("[lang+hanzi]").equals(["zh", "多大"]).count()).toBe(0);
    expect(await db.exerciseItems.get("class-2026-10-14:ex:2")).toBeUndefined();
    expect(await db.livingNoteAdds.count()).toBe(0);
  });

  it("actualiza lo que el usuario no tocó y devuelve conflicto si cambiaron los dos", async () => {
    await importClassPackage(validPackage());
    // el usuario corrige el ejercicio 2 (confianza baja)
    await db.exerciseItems.update("class-2026-10-14:ex:2", { answers: ["我弟弟十二岁。"], confirmed: true });
    // el paquete cambia los dos ejercicios
    const pkg2 = validPackage();
    pkg2.exercises = pkg2.exercises.map((e, i) => ({ ...e, explanationEs: `${e.explanationEs ?? ""} (revisado ${i})` }));
    const prev = await previewClassPackage(pkg2);
    expect(prev.exercises.map((e) => e.status)).toEqual(["update", "conflict"]);
    expect(prev.conflicts).toEqual(["ex:2"]);
    const r = await importClassPackage(pkg2);
    expect(r.exercises.updated).toBe(1);
    expect(r.conflicts.map((c) => c.key)).toEqual(["ex:2"]);
    expect((await db.exerciseItems.get("class-2026-10-14:ex:1"))?.hint).toMatch(/revisado 0/);
    expect((await db.exerciseItems.get("class-2026-10-14:ex:2"))?.answers).toEqual(["我弟弟十二岁。"]);
    // la UI elige «usar lo del paquete»
    const r2 = await importClassPackage(pkg2, new Map(), { resolve: { "ex:2": "replace" } });
    expect(r2.conflicts).toEqual([]);
    expect((await db.exerciseItems.get("class-2026-10-14:ex:2"))?.answers).toEqual(["我哥哥十二岁。"]);
    // conserva el SRS del ítem
    expect((await db.exerciseItems.get("class-2026-10-14:ex:2"))?.id).toBe("class-2026-10-14:ex:2");
  });

  it("«quedarme con lo mío» no vuelve a preguntar", async () => {
    await importClassPackage(validPackage());
    await db.livingNoteAdds.update("class-2026-10-14:living:1", { markdown: "Mi versión" });
    const pkg2 = validPackage({ livingNoteAdds: [{ noteId: "living-numeros", markdown: "Versión nueva del paquete" }] });
    expect((await importClassPackage(pkg2)).conflicts.map((c) => c.key)).toEqual(["living:1"]);
    await importClassPackage(pkg2, new Map(), { resolve: { "living:1": "keep" } });
    expect((await db.livingNoteAdds.get("class-2026-10-14:living:1"))?.markdown).toBe("Mi versión");
    expect((await importClassPackage(pkg2)).conflicts).toEqual([]);
  });

  it("dos clases el mismo día: la segunda lleva la hora del archivo", async () => {
    await importClassPackage(validPackage({ classDate: "2026-10-07", source: { file: "2026-10-07_1031.opus", transcript: "2026-10-07_1031.json", durationSec: 60 } }));
    const second = validPackage({ classDate: "2026-10-07", title: "Tarde", source: { file: "2026-10-07_1603.opus", transcript: "2026-10-07_1603.json", durationSec: 60 } });
    const r = await importClassPackage(second);
    expect(r.noteId).toBe("class-2026-10-07-1603");
    expect((await importClassPackage(second)).noteId).toBe("class-2026-10-07-1603");
    expect(await db.exerciseItems.get("class-2026-10-07-1603:ex:1")).toBeTruthy();
  });

  it("un paquete con duplicateOf suma sus ejercicios y trucos nuevos a la clase original (sin apunte aparte)", async () => {
    await importClassPackage(validPackage());
    const dup = validPackage({
      classDate: "2026-10-16",
      group: "otro",
      duplicateOf: "2026-10-14_numeros",
      source: { file: "2026-10-16_0900.opus", transcript: "2026-10-16_0900.json", durationSec: 60 },
      vocab: [{ hanzi: "今年", pinyin: "jīnnián", es: "este año", category: "Tiempo y fechas" }],
      teacherTips: [{ text: "No uses 是 delante de la edad." }, { text: "多大 sirve también para tamaños.", clip: "tip-1.opus" }],
      exercises: [
        { es: "Tengo veinte años.", teacherAnswer: ["我二十岁。"], confidence: "alta" }, // repetido
        { es: "¿Cuántos años tiene tu madre?", teacherAnswer: ["你妈妈多大？"], confidence: "alta", clip: "ex-1.opus" },
      ],
    });
    const prev = await previewClassPackage(dup);
    expect(prev.duplicate).toMatchObject({ target: "class-2026-10-14", newExercises: 1, newTips: 1 });
    const r = await importClassPackage(dup, new Map([["ex-1.opus", clipBlob()], ["tip-1.opus", clipBlob()]]));
    expect(r.noteId).toBe("class-2026-10-14");
    expect(await db.notes.get("class-2026-10-16")).toBeUndefined();
    expect(r.exercises).toMatchObject({ added: 1, unchanged: 1 });
    const added = await db.exerciseItems.get("class-2026-10-14:ex:2026-10-16_0900-2");
    expect(added).toMatchObject({ setId: "class-2026-10-14:set", order: 2, clipAssetId: "class-2026-10-14:clip:2026-10-16_0900~ex-1.opus" });
    expect(await db.assets.get("class-2026-10-14:clip:2026-10-16_0900~ex-1.opus")).toBeTruthy();
    const note = await db.notes.get("class-2026-10-14");
    const tips = (note?.fields.classPkg as { teacherTips: { text: string }[] }).teacherTips.map((t) => t.text);
    expect(tips).toHaveLength(2);
    expect(note?.wordIds).toContain("mine-今年");
    // idempotente
    const again = await importClassPackage(dup);
    expect(again.exercises.added).toBe(0);
    expect((await db.notes.get("class-2026-10-14"))?.fields.classPkg).toMatchObject({ teacherTips: expect.arrayContaining([expect.objectContaining({ text: "多大 sirve también para tamaños." })]) });
    // reimportar la clase original conserva los trucos sumados
    await importClassPackage(validPackage({ summary: "Resumen revisado." }));
    expect(((await db.notes.get("class-2026-10-14"))?.fields.classPkg as { teacherTips: unknown[] }).teacherTips).toHaveLength(2);
  });

  it("duplicateOf de una clase no importada: aviso y error claro", async () => {
    const dup = validPackage({ duplicateOf: "2026-09-01_1000" });
    expect((await previewClassPackage(dup)).duplicate?.target).toBeUndefined();
    await expect(importClassPackage(dup)).rejects.toThrow(/impórtala primero/);
  });

  it("borra los recortes de clases antiguas y quita el enlace de los ejercicios", async () => {
    await importClassPackage(validPackage(), new Map([["ex-1.opus", clipBlob()]]));
    expect(await deleteOldClassClips("2026-10-01")).toBe(0);
    expect(await deleteOldClassClips("2026-11-01")).toBe(1);
    expect((await db.exerciseItems.get("class-2026-10-14:ex:1"))?.clipAssetId).toBeUndefined();
  });
});

describe("utilidades de clases", () => {
  it("fechas, minutos, huellas y respuestas", () => {
    expect(ddmm("2026-10-03")).toBe("03/10");
    expect(fmtTime(754)).toBe("12:34");
    expect(fmtTime(3723)).toBe("1:02:03");
    expect(contentHash({ a: 1, b: [2] })).toBe(contentHash({ b: [2], a: 1 }));
    expect(answerDiffers("我二十岁", ["我二十岁。"])).toBe(false);
    expect(answerDiffers("我是二十岁。", ["我二十岁。"])).toBe(true);
    expect(answerDiffers(undefined, ["我二十岁。"])).toBe(false);
  });

  it("busca en todas las clases («¿en qué clase explicó 是?»)", () => {
    expect(queryTerms("¿en qué clase explicó 是?")).toEqual(["是"]);
    expect(queryTerms("¿cuándo vimos la edad?")).toEqual(["edad"]);
    const hits = searchClasses([{ noteId: "class-2026-10-14", pkg: validPackage() }], "¿en qué clase explicó 是?");
    expect(hits[0]).toMatchObject({ noteId: "class-2026-10-14", kind: "tip", t: 610 });
    expect(searchClasses([{ noteId: "x", pkg: validPackage() }], "edad").length).toBeGreaterThan(0);
  });
});

describe("migración v6 → v7", () => {
  beforeEach(async () => {
    await Dexie.delete("xueban-v7");
  });

  it("marca los ejercicios existentes como «manual» y crea el índice origin", async () => {
    const old = new Dexie("xueban-v7");
    old.version(6).stores({
      exerciseItems: "id, lang, setId, due, state, unitId, *tags, *grammarIds, [lang+due], [lang+setId], [setId+order]",
      livingNoteAdds: "id, lang, noteId, updatedAt, [lang+noteId]",
    });
    await old.open();
    await old.table("exerciseItems").bulkPut([
      { id: "i1", lang: "zh", setId: "s1", order: 0, es: "Hola", answers: ["你好"], tags: [], grammarIds: [], due: 0, state: 0 },
      { id: "i2", lang: "ja", setId: "s2", order: 0, es: "Hola", answers: ["こんにちは"], tags: [], grammarIds: [], due: 0, state: 0 },
    ]);
    old.close();
    const db7 = new XuebanDB("xueban-v7");
    await db7.open();
    expect(db7.verno).toBe(7);
    expect(await db7.exerciseItems.where("origin").equals("manual").count()).toBe(2);
    expect((await db7.exerciseItems.get("i1"))?.answers).toEqual(["你好"]);
    db7.close();
  });
});
