import { beforeEach, describe, expect, it } from "vitest";
import { db, ensureSeeded, newCard } from "@/lib/db";
import { buildQueue, interleave, previewRatings, Rating, reviewCard, schedule } from "@/lib/fsrs/scheduler";

describe("FSRS", () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it("programa intervalos crecientes con Bien y reinicia con Otra vez", () => {
    const now = Date.UTC(2026, 0, 1, 10);
    let c = newCard("w1", "recognition", now);
    const p = previewRatings(c, { retention: 0.9 }, now);
    expect(p.map((x) => x.label)).toEqual(["Otra vez", "Difícil", "Bien", "Fácil"]);
    expect(p[0].due).toBeLessThan(p[3].due);
    let t = now;
    const intervals: number[] = [];
    for (let i = 0; i < 5; i++) {
      const r = schedule(c, Rating.Good, { retention: 0.9 }, t);
      intervals.push(r.card.due - t);
      c = r.card;
      t = r.card.due;
    }
    for (let i = 1; i < intervals.length; i++) expect(intervals[i]).toBeGreaterThanOrEqual(intervals[i - 1]);
    expect(c.state).toBe(2); // Review
    expect(c.reps).toBe(5);
    const again = schedule(c, Rating.Again, { retention: 0.9 }, t);
    expect(again.card.lapses).toBe(1);
    expect(again.card.due - t).toBeLessThan(60 * 60 * 1000);
    expect(again.log.rating).toBe(1);
  });

  it("una retención mayor acorta los intervalos", () => {
    const now = Date.now();
    let a = newCard("w", "recognition", now);
    let b = newCard("w", "recognition", now);
    let ta = now;
    let tb = now;
    for (let i = 0; i < 4; i++) {
      a = schedule(a, Rating.Good, { retention: 0.8 }, ta).card;
      ta = a.due;
      b = schedule(b, Rating.Good, { retention: 0.95 }, tb).card;
      tb = b.due;
    }
    expect(a.scheduled_days).toBeGreaterThan(b.scheduled_days);
  });

  it("persiste repasos y construye la cola con el cupo de nuevas", async () => {
    await ensureSeeded();
    const q1 = await buildQueue({ newPerDay: 3 });
    expect(q1.due.length).toBe(0);
    expect(q1.fresh.length).toBe(9); // 3 palabras × 3 tarjetas
    const card = q1.fresh[0];
    await reviewCard(card, Rating.Again, { retention: 0.9 });
    const stored = await db.cards.get(card.id);
    expect(stored?.reps).toBe(1);
    expect(await db.reviewLogs.count()).toBe(1);
    const stat = await db.daily.toArray();
    expect(stat[0].reviews).toBe(1);
    const q2 = await buildQueue({ newPerDay: 3 });
    // la palabra ya introducida cuenta para el cupo: quedan 2 palabras nuevas
    expect(new Set(q2.fresh.map((c) => c.wordId)).size).toBe(2);
    expect(q2.due.find((c) => c.id === card.id)).toBeUndefined(); // aún no vence (pocos minutos)
    const future = Date.now() + 60 * 60 * 1000;
    const q3 = await buildQueue({ newPerDay: 0 }, future);
    expect(q3.due.map((c) => c.id)).toContain(card.id);
  });

  it("intercala nuevas entre pendientes", () => {
    const due = Array.from({ length: 6 }, (_, i) => newCard(`d${i}`, "recognition"));
    const fresh = Array.from({ length: 2 }, (_, i) => newCard(`n${i}`, "recognition"));
    const q = interleave(due, fresh);
    expect(q.map((c) => c.wordId)).toEqual(["d0", "d1", "d2", "n0", "d3", "d4", "d5", "n1"]);
  });

  it("excluye tarjetas gestionadas por Anki cuando Anki es la fuente de verdad", async () => {
    await ensureSeeded();
    const first = await db.cards.toCollection().first();
    await db.cards.update(first!.id, { ankiState: "review" });
    const q = await buildQueue({ newPerDay: 50, ankiIsSource: true });
    expect(q.fresh.find((c) => c.id === first!.id)).toBeUndefined();
  });
});
