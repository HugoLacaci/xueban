import { beforeEach, describe, expect, it } from "vitest";
import { db, ensureSeeded, upsertWord, deleteWord, exportBackup, importBackup } from "@/lib/db";

describe("base de datos y semilla", () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it("carga la semilla HSK 1 una sola vez", async () => {
    const r1 = await ensureSeeded();
    expect(r1.seeded).toBe(true);
    expect(r1.count).toBe(302);
    expect(await db.cards.count()).toBe(302 * 3);
    expect((await db.categories.toArray()).length).toBe(22);
    const r2 = await ensureSeeded();
    expect(r2.seeded).toBe(false);
  });

  it("crea palabras nuevas con tarjetas y las actualiza sin duplicar", async () => {
    await ensureSeeded();
    const w = await upsertWord({ hanzi: "咖啡", pinyin: "kāfēi", meaning: "café", category: "Clase", source: "class" });
    expect(w.id).toBe("mine-咖啡");
    expect(await db.cards.where("wordId").equals(w.id).count()).toBe(3);
    const w2 = await upsertWord({ hanzi: "咖啡", pinyin: "kāfēi", meaning: "café (bebida)", category: "Clase" });
    expect(w2.id).toBe(w.id);
    expect(await db.words.where("hanzi").equals("咖啡").count()).toBe(1);
    await deleteWord(w.id);
    expect(await db.cards.where("wordId").equals(w.id).count()).toBe(0);
  });

  it("exporta e importa copias de seguridad", async () => {
    await ensureSeeded();
    await upsertWord({ hanzi: "啤酒", pinyin: "píjiǔ", meaning: "cerveza", category: "Clase" });
    const json = await exportBackup();
    await db.words.clear();
    await importBackup(json, "merge");
    expect(await db.words.get("mine-啤酒")).toBeTruthy();
    expect(await db.words.count()).toBe(303);
  });
});
