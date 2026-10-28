import { beforeEach, describe, expect, it } from "vitest";
import { db, ensureSeeded, upsertWord } from "@/lib/db";
import { applySync, planSync, pullCardStates, pushWordsToAnki, wordToFields, tagsFor, type AnkiNoteInfo } from "@/lib/anki/sync";
import { MODEL_NAME, FIELDS } from "@/lib/anki/model";
import { createInvoker, AnkiError } from "@/lib/anki/client";

/** AnkiConnect simulado en memoria (subconjunto de acciones). */
function fakeAnki() {
  const notes = new Map<number, AnkiNoteInfo & { deckName: string }>();
  const models = new Set<string>();
  const decks = new Set<string>(["Default"]);
  let nextId = 1000;
  const calls: string[] = [];
  const invoke = async <T,>(action: string, params: Record<string, unknown> = {}): Promise<T> => {
    calls.push(action);
    switch (action) {
      case "version":
        return 6 as T;
      case "modelNames":
        return Array.from(models) as T;
      case "createModel":
        models.add(params.modelName as string);
        return {} as T;
      case "createDeck":
        decks.add(params.deck as string);
        return 1 as T;
      case "findNotes": {
        const q = params.query as string;
        const out: number[] = [];
        for (const n of notes.values()) {
          if (q.includes("WebID:")) {
            const ids = Array.from(q.matchAll(/WebID:"([^"]+)"/g)).map((m) => m[1]);
            if (ids.includes(n.fields.WebID.value)) out.push(n.noteId);
          } else if (q.includes("Hanzi:")) {
            const h = q.match(/Hanzi:"([^"]+)"/)?.[1];
            if (n.fields.Hanzi.value === h) out.push(n.noteId);
          } else out.push(n.noteId);
        }
        return out as T;
      }
      case "notesInfo":
        return (params.notes as number[]).map((id) => notes.get(id)).filter(Boolean) as T;
      case "addNotes": {
        const arr = params.notes as { deckName: string; fields: Record<string, string>; tags: string[] }[];
        return arr.map((n) => {
          const dup = Array.from(notes.values()).find((x) => x.fields.Hanzi.value === n.fields.Hanzi);
          if (dup) return null;
          const id = nextId++;
          notes.set(id, {
            noteId: id,
            modelName: MODEL_NAME,
            tags: n.tags,
            deckName: n.deckName,
            mod: Math.floor(Date.now() / 1000),
            cards: [id * 10, id * 10 + 1, id * 10 + 2],
            fields: Object.fromEntries(FIELDS.map((f, i) => [f, { value: n.fields[f] ?? "", order: i }])),
          });
          return id;
        }) as T;
      }
      case "updateNoteFields": {
        const { id, fields } = params.note as { id: number; fields: Record<string, string> };
        const n = notes.get(id)!;
        for (const [k, v] of Object.entries(fields)) n.fields[k] = { value: v, order: FIELDS.indexOf(k as (typeof FIELDS)[number]) };
        n.mod = Math.floor(Date.now() / 1000) + 1;
        return null as T;
      }
      case "addTags":
        for (const id of params.notes as number[]) {
          const n = notes.get(id)!;
          n.tags = Array.from(new Set([...n.tags, ...(params.tags as string).split(" ")]));
        }
        return null as T;
      case "findCards":
        return Array.from(notes.values()).flatMap((n) => n.cards) as T;
      case "cardsInfo":
        return (params.cards as number[]).map((cid) => {
          const note = Math.floor(cid / 10);
          const ord = cid % 10;
          return { cardId: cid, note, ord, deckName: "x", interval: ord === 0 ? 12 : 0, due: 0, queue: ord === 0 ? 2 : 0, type: ord === 0 ? 2 : 0, reps: 3, lapses: 0 };
        }) as T;
      case "sync":
        return null as T;
      default:
        throw new Error("acción no simulada: " + action);
    }
  };
  return { invoke, notes, models, decks, calls, addRaw: (fields: Partial<Record<(typeof FIELDS)[number], string>>, tags: string[] = []) => {
    const id = nextId++;
    notes.set(id, { noteId: id, modelName: MODEL_NAME, tags, deckName: "中文 Chino::Mis palabras (clase)", mod: Math.floor(Date.now() / 1000) - 100, cards: [id * 10, id * 10 + 1, id * 10 + 2], fields: Object.fromEntries(FIELDS.map((f, i) => [f, { value: fields[f] ?? "", order: i }])) });
    return id;
  } };
}

describe("sincronización con Anki (AnkiConnect simulado)", () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await ensureSeeded();
  });

  it("convierte palabras en campos y etiquetas del modelo", async () => {
    const w = (await db.words.get("hsk1-谢谢"))!;
    const f = wordToFields(w);
    expect(f.Hanzi).toBe("谢谢");
    expect(f.WebID).toBe("hsk1-谢谢");
    expect(f.CrearProduccion).toBe("y");
    expect(f.HSK).toBe("HSK2.0 HSK3.0");
    expect(tagsFor(w)).toEqual(expect.arrayContaining(["HSK1", "HSK2.0", "HSK3.0", "cat::Saludos_y_expresiones"]));
  });

  it("crea el modelo y el mazo, añade notas y actualiza las existentes", async () => {
    const anki = fakeAnki();
    const words = (await db.words.toArray()).slice(0, 5);
    const r1 = await pushWordsToAnki(words, anki.invoke);
    expect(anki.models.has(MODEL_NAME)).toBe(true);
    expect(r1.created).toBe(5);
    // las primeras palabras por id son de "Números y cantidades" (3.ª categoría de la semilla)
    expect(Array.from(anki.decks)).toContain("中文 Chino::HSK 1::03 Números y cantidades");
    const w = await db.words.get(words[0].id);
    expect(w?.ankiNoteId).toBeTruthy();
    await db.words.update(words[0].id, { meaning: "hola (saludo)", updatedAt: Date.now() });
    const r2 = await pushWordsToAnki([(await db.words.get(words[0].id))!], anki.invoke);
    expect(r2.updated).toBe(1);
    expect(r2.created).toBe(0);
    const note = anki.notes.get(w!.ankiNoteId!)!;
    expect(note.fields.Significado.value).toBe("hola (saludo)");
  });

  it("planifica e importa notas nuevas de Anki, asignando WebID a las que no lo tienen", async () => {
    const anki = fakeAnki();
    anki.addRaw({ Hanzi: "啤酒", Pinyin: "píjiǔ", Significado: "cerveza", Categoria: "Comida y bebida", CrearProduccion: "y" }, ["clase"]);
    anki.addRaw({ Hanzi: "咖啡", Pinyin: "kāfēi", Significado: "café", Categoria: "Clase", WebID: "mine-咖啡" });
    const plan = await planSync(anki.invoke);
    expect(plan.newInAnki.length).toBe(2);
    expect(plan.missingWebId.length).toBe(1);
    expect(plan.newInWeb.length).toBe(302);
    const r = await applySync(plan, { importNewFromAnki: true, pushNewToAnki: false, conflictResolution: "auto" }, anki.invoke);
    expect(r.imported).toBe(2);
    const beer = await db.words.get("mine-啤酒");
    expect(beer?.meaning).toBe("cerveza");
    expect(beer?.source).toBe("anki");
    expect(await db.cards.where("wordId").equals("mine-啤酒").count()).toBe(3);
    const raw = Array.from(anki.notes.values()).find((n) => n.fields.Hanzi.value === "啤酒")!;
    expect(raw.fields.WebID.value).toBe("mine-啤酒");
  });

  it("resuelve conflictos: último modificado gana", async () => {
    const anki = fakeAnki();
    await pushWordsToAnki([(await db.words.get("hsk1-谢谢"))!], anki.invoke);
    await db.syncState.put({ key: "anki:lastSync", value: Date.now(), updatedAt: Date.now() });
    // cambio en Anki más reciente que en la web
    const noteId = (await db.words.get("hsk1-谢谢"))!.ankiNoteId!;
    const n = anki.notes.get(noteId)!;
    n.fields.Significado.value = "gracias (Anki)";
    n.mod = Math.floor(Date.now() / 1000) + 60;
    const plan = await planSync(anki.invoke);
    expect(plan.conflicts.length).toBe(1);
    expect(plan.conflicts[0].winner).toBe("anki");
    await applySync(plan, { importNewFromAnki: false, pushNewToAnki: false, conflictResolution: "auto" }, anki.invoke);
    expect((await db.words.get("hsk1-谢谢"))?.meaning).toBe("gracias (Anki)");
  });

  it("lee el estado de las tarjetas de Anki", async () => {
    const anki = fakeAnki();
    await pushWordsToAnki([(await db.words.get("hsk1-你好"))!], anki.invoke);
    const n = await pullCardStates(anki.invoke);
    expect(n).toBe(3);
    const c = await db.cards.get("hsk1-你好:recognition");
    expect(c?.ankiState).toBe("review");
    expect(c?.ankiInterval).toBe(12);
    expect((await db.cards.get("hsk1-你好:production"))?.ankiState).toBe("new");
  });

  it("el cliente distingue Anki apagado de errores de API", async () => {
    const offline = createInvoker("http://127.0.0.1:1", async () => {
      throw new TypeError("fetch failed");
    });
    await expect(offline("version")).rejects.toMatchObject({ kind: "offline" });
    const apiErr = createInvoker("http://x", async () => new Response(JSON.stringify({ result: null, error: "unsupported action" })));
    await expect(apiErr("foo")).rejects.toBeInstanceOf(AnkiError);
  });

  it("acepta palabras nuevas creadas con upsertWord", async () => {
    const anki = fakeAnki();
    const w = await upsertWord({ hanzi: "地铁", pinyin: "dìtiě", meaning: "metro", category: "Transporte", source: "class" });
    const r = await pushWordsToAnki([w], anki.invoke);
    expect(r.created).toBe(1);
    const note = Array.from(anki.notes.values())[0];
    expect(note.deckName).toBe("中文 Chino::Mis palabras (clase)");
    expect(note.tags).toContain("clase");
  });
});
