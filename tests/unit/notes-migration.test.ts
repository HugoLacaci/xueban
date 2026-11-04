import { describe, expect, it, beforeEach } from "vitest";
import Dexie from "dexie";
import { XuebanDB } from "@/lib/db";
import { legacyNoteToV5 } from "@/lib/db/migrate-notes";
import { backupBeforeMigration, listBackups } from "@/lib/db/backup";
import { markdownToDoc, docToMarkdown, docToText, docRefs } from "@/lib/notes/markdown";

/** Base v4 mínima con el esquema de notas antiguo (solo la tabla notes). */
async function seedV4(name: string) {
  const old = new Dexie(name);
  old.version(4).stores({
    notes: "id, lang, kind, classDate, updatedAt, [lang+kind], [lang+updatedAt]",
    settings: "key",
  });
  await old.open();
  await old.table("notes").bulkPut([
    { id: "n1", lang: "zh", title: "Clase del martes", markdown: "## Gramática\n- 吗 al final\n- **很** + adjetivo\n\n[[是 vs 在]] #clase", wordIds: ["hsk1-吗"], kind: "note", createdAt: 1, updatedAt: 2 },
    { id: "c1", lang: "zh", title: "Clase 3 nov", markdown: "咖啡\n啤酒,píjiǔ,cerveza", wordIds: ["mine-咖啡"], kind: "class", classDate: "2026-11-03", grammar: "- 了 de cambio", homework: "p. 23", createdAt: 3, updatedAt: 4 },
    { id: "j1", lang: "ja", title: "Nota japonesa", markdown: "食べる", wordIds: [], kind: "note", createdAt: 5, updatedAt: 6 },
  ]);
  old.close();
}

describe("migración de apuntes v4 → v5", () => {
  beforeEach(async () => {
    await Dexie.delete("xueban-mig");
    await Dexie.delete("xueban-backups");
  });

  it("convierte una nota antigua y un cuaderno de clase sin perder datos", () => {
    const n = legacyNoteToV5({ id: "n1", lang: "zh", title: "T", markdown: "## Hola\n- a\n- b\n\n[[otro]] #tag", wordIds: ["w"], kind: "note", createdAt: 1, updatedAt: 2 });
    expect(n.type).toBe("free");
    expect(n.status).toBe("active");
    expect(n.markdown).toContain("## Hola");
    expect(n.wordIds).toEqual(["w"]);
    expect(n.links).toEqual(["otro"]);
    expect(n.tags).toContain("tag");
    expect((n.doc as { content: { type: string }[] }).content.map((b) => b.type)).toEqual(["heading", "bulletList", "paragraph"]);
    const c = legacyNoteToV5({ id: "c1", lang: "zh", title: "C", markdown: "咖啡", wordIds: [], kind: "class", classDate: "2026-11-03", grammar: "- 了", homework: "p. 23", createdAt: 1, updatedAt: 2 });
    expect(c.type).toBe("class");
    expect(c.fields).toMatchObject({ date: "2026-11-03", vocabText: "咖啡", grammar: "- 了", homework: "p. 23" });
    expect(c.classDate).toBe("2026-11-03");
    expect(c.tags).toContain("clase");
  });

  it("actualiza una base v4 real a v5 conservando todas las notas y sus campos heredados", async () => {
    await seedV4("xueban-mig");
    const db = new XuebanDB("xueban-mig");
    await db.open();
    expect(db.verno).toBe(5);
    const notes = (await db.notes.toArray()).sort((a, b) => a.createdAt - b.createdAt);
    expect(notes).toHaveLength(3);
    const [n1, c1, j1] = notes;
    expect(n1.type).toBe("free");
    expect(n1.kind).toBe("note");
    expect(n1.markdown).toContain("吗 al final");
    expect(n1.wordIds).toEqual(["hsk1-吗"]);
    expect(n1.links).toEqual(["是 vs 在"]);
    expect(c1.type).toBe("class");
    expect(c1.classDate).toBe("2026-11-03");
    expect(c1.homework).toBe("p. 23");
    expect((c1.fields as { vocabText: string }).vocabText).toContain("啤酒");
    expect(j1.lang).toBe("ja");
    expect(j1.type).toBe("free");
    // índices nuevos funcionan
    expect(await db.notes.where("[lang+type]").equals(["zh", "class"]).count()).toBe(1);
    expect(await db.notes.where("[lang+status]").equals(["zh", "active"]).count()).toBe(2);
    expect(await db.noteCards.count()).toBe(0);
    db.close();
  });

  it("hace copia de seguridad automática antes de migrar", async () => {
    await seedV4("xueban");
    const row = await backupBeforeMigration();
    expect(row).not.toBeNull();
    expect(row!.fromVersion).toBe(4);
    const parsed = JSON.parse(row!.json) as { data: { notes: unknown[] } };
    expect(parsed.data.notes).toHaveLength(3);
    expect((await listBackups()).length).toBe(1);
    await Dexie.delete("xueban");
  });
});

describe("markdown ⇄ bloques", () => {
  it("convierte ida y vuelta títulos, listas, tablas, citas, avisos y bloques propios", () => {
    const md = ["## Estructura", "", "Sujeto + **在** + lugar", "", "- uno", "- dos", "", "1. a", "2. b", "", "| A | B |", "| --- | --- |", "| 不 | 没 |", "", "> 💡 **Truco**: piensa en «todavía»", "", "```xb-example", '{"zh":"我在家。","py":"Wǒ zài jiā.","es":"Estoy en casa."}', "```", "", "> cita normal"].join("\n");
    const doc = markdownToDoc(md);
    const types = doc.content.map((b) => b.type);
    expect(types).toEqual(["heading", "paragraph", "bulletList", "orderedList", "table", "callout", "example", "blockquote"]);
    expect(doc.content[5].attrs).toEqual({ kind: "tip" });
    expect(doc.content[6].attrs).toMatchObject({ zh: "我在家。" });
    const back = docToMarkdown(doc);
    expect(back).toContain("## Estructura");
    expect(back).toContain("**在**");
    expect(back).toContain("| 不 | 没 |");
    expect(back).toContain("> 💡 **Truco**: piensa en «todavía»");
    expect(back).toContain("```xb-example");
    expect(markdownToDoc(back).content.map((b) => b.type)).toEqual(types);
  });

  it("extrae texto, enlaces y etiquetas", () => {
    const doc = markdownToDoc("Ver [[不 vs 没|la diferencia]] y #gramática\n\n他在学校。");
    expect(docRefs(doc)).toEqual({ links: ["不 vs 没"], tags: ["gramática"] });
    expect(docToText(doc)).toContain("他在学校。");
    expect(docToText(doc)).toContain("la diferencia");
  });
});
