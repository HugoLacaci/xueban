/**
 * Repaso espaciado con ts-fsrs (FSRS-6). Convierte entre nuestras tarjetas (Dexie) y las de ts-fsrs,
 * programa repasos, registra logs y construye la cola de sesión (pendientes + nuevas del día).
 */
import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card as FCard, type Grade, type RecordLogItem } from "ts-fsrs";
import { getActiveLang } from "@/lib/languages/registry";
import { db, type Card, type CardType, type ReviewLog, bumpDaily, todayKey } from "@/lib/db";

export type { Grade };
export { Rating, State };

export interface SchedulerOptions {
  retention?: number; // 0.7–0.97
  maxInterval?: number; // días
}

export function makeScheduler(opts: SchedulerOptions = {}) {
  const params = generatorParameters({
    request_retention: opts.retention ?? 0.9,
    maximum_interval: opts.maxInterval ?? 365,
    enable_fuzz: true,
    enable_short_term: true,
  });
  return fsrs(params);
}

export function toFsrs(c: Card): FCard {
  return {
    due: new Date(c.due),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state as State,
    last_review: c.last_review ? new Date(c.last_review) : undefined,
  };
}

export function fromFsrs(base: Card, f: FCard, now: number): Card {
  return {
    ...base,
    due: f.due.getTime(),
    stability: f.stability,
    difficulty: f.difficulty,
    elapsed_days: f.elapsed_days,
    scheduled_days: f.scheduled_days,
    learning_steps: f.learning_steps,
    reps: f.reps,
    lapses: f.lapses,
    state: f.state as Card["state"],
    last_review: f.last_review?.getTime(),
    updatedAt: now,
  };
}

export interface Preview {
  rating: Grade;
  label: string;
  interval: string; // "10 min", "3 d"
  due: number;
}

const LABELS: Record<Grade, string> = { [Rating.Again]: "Otra vez", [Rating.Hard]: "Difícil", [Rating.Good]: "Bien", [Rating.Easy]: "Fácil" };

export function formatInterval(ms: number): string {
  const min = ms / 60000;
  if (min < 1) return "<1 min";
  if (min < 60) return `${Math.round(min)} min`;
  const h = min / 60;
  if (h < 24) return `${Math.round(h)} h`;
  const d = h / 24;
  if (d < 30) return `${Math.round(d)} d`;
  const mo = d / 30;
  if (mo < 12) return `${mo.toFixed(mo < 3 ? 1 : 0)} mes${mo >= 2 ? "es" : ""}`;
  return `${(d / 365).toFixed(1)} a`;
}

/** Previsualiza los cuatro botones para una tarjeta. */
export function previewRatings(card: Card, opts: SchedulerOptions, now = Date.now()): Preview[] {
  const f = makeScheduler(opts);
  const rec = f.repeat(toFsrs(card), new Date(now));
  return ([Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as Grade[]).map((g) => {
    const item: RecordLogItem = rec[g];
    return { rating: g, label: LABELS[g], interval: formatInterval(item.card.due.getTime() - now), due: item.card.due.getTime() };
  });
}

/** Aplica una valoración: devuelve la tarjeta actualizada y el log (puro; no escribe en la BD). */
export function schedule(card: Card, rating: Grade, opts: SchedulerOptions, now = Date.now()): { card: Card; log: Omit<ReviewLog, "id"> } {
  const f = makeScheduler(opts);
  const rec = f.repeat(toFsrs(card), new Date(now));
  const item = rec[rating];
  const next = fromFsrs(card, item.card, now);
  const log: Omit<ReviewLog, "id"> = {
    lang: card.lang,
    cardId: card.id,
    wordId: card.wordId,
    rating,
    state: item.log.state as Card["state"],
    due: item.log.due.getTime(),
    stability: item.log.stability,
    difficulty: item.log.difficulty,
    elapsed_days: item.log.elapsed_days,
    last_elapsed_days: item.log.last_elapsed_days,
    scheduled_days: item.log.scheduled_days,
    review: item.log.review.getTime(),
  };
  return { card: next, log };
}

/** Aplica y persiste una valoración. */
export async function reviewCard(card: Card, rating: Grade, opts: SchedulerOptions, durationMs?: number): Promise<Card> {
  const now = Date.now();
  const { card: next, log } = schedule(card, rating, opts, now);
  await db.transaction("rw", db.cards, db.reviewLogs, db.daily, async () => {
    await db.cards.put(next);
    await db.reviewLogs.add({ ...log, durationMs });
    await bumpDaily({ reviews: 1, correct: rating >= Rating.Good ? 1 : 0, exercises: 0 }, card.lang);
  });
  return next;
}

/** Deshace la última valoración de una tarjeta (restaura desde el log anterior). */
export async function undoReview(prev: Card, logId?: number): Promise<void> {
  await db.transaction("rw", db.cards, db.reviewLogs, async () => {
    await db.cards.put(prev);
    if (logId !== undefined) await db.reviewLogs.delete(logId);
    else {
      const last = await db.reviewLogs.where("cardId").equals(prev.id).reverse().sortBy("review");
      if (last[0]?.id !== undefined) await db.reviewLogs.delete(last[0].id);
    }
  });
}

export interface QueueOptions {
  newPerDay: number;
  types?: CardType[];
  categories?: string[];
  wordIds?: string[];
  ankiIsSource?: boolean; // si Anki es la fuente de verdad, se excluyen tarjetas con estado en Anki
  limit?: number;
  includeNew?: boolean;
}

/** Construye la cola de repaso: pendientes (ordenadas por due) + nuevas (hasta el cupo diario restante). */
export async function buildQueue(opts: QueueOptions, now = Date.now()): Promise<{ due: Card[]; fresh: Card[]; newToday: number }> {
  const all = await db.cards.where("lang").equals(getActiveLang()).toArray();
  const wordFilter = opts.wordIds ? new Set(opts.wordIds) : undefined;
  let words: Map<string, { category: string }> | undefined;
  if (opts.categories?.length) {
    const ws = await db.words.where("lang").equals(getActiveLang()).toArray();
    words = new Map(ws.map((w) => [w.id, { category: w.category }]));
  }
  const ok = (c: Card) => {
    if (c.suspended) return false;
    if (opts.types && !opts.types.includes(c.type)) return false;
    if (wordFilter && !wordFilter.has(c.wordId)) return false;
    if (opts.categories?.length && words && !opts.categories.includes(words.get(c.wordId)?.category ?? "")) return false;
    if (opts.ankiIsSource && c.ankiState && c.ankiState !== "new") return false;
    return true;
  };
  const due = all.filter((c) => ok(c) && c.state !== 0 && c.due <= now).sort((a, b) => a.due - b.due);
  const today = await db.daily.get(`${getActiveLang()}:${todayKey()}`);
  const newToday = today?.newWords ?? 0;
  // nuevas introducidas hoy = tarjetas con first review hoy; aproximamos con reviewLogs de hoy en estado New
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const logsToday = await db.reviewLogs.where("[lang+review]").between([getActiveLang(), startOfDay.getTime()], [getActiveLang(), Infinity]).toArray();
  const newWordsToday = new Set(logsToday.filter((l) => l.state === 0).map((l) => l.wordId)).size;
  const remainingNew = Math.max(0, opts.newPerDay - newWordsToday);
  let fresh: Card[] = [];
  if (opts.includeNew !== false && remainingNew > 0) {
    // agrupar por palabra: introducir todas las tarjetas de una palabra a la vez, en orden de creación
    const byWord = new Map<string, Card[]>();
    for (const c of all) {
      if (!ok(c) || c.state !== 0) continue;
      byWord.set(c.wordId, [...(byWord.get(c.wordId) ?? []), c]);
    }
    const wordsOrdered = Array.from(byWord.entries()).sort((a, b) => a[1][0].createdAt - b[1][0].createdAt || a[0].localeCompare(b[0]));
    for (const [, cards] of wordsOrdered.slice(0, remainingNew)) fresh.push(...cards.sort((a, b) => typeOrder(a.type) - typeOrder(b.type)));
  }
  if (opts.limit) {
    due.splice(opts.limit);
    fresh = fresh.slice(0, Math.max(0, opts.limit - due.length));
  }
  return { due, fresh, newToday };
}

function typeOrder(t: CardType): number {
  return ["recognition", "listening", "sentence", "production", "writing"].indexOf(t);
}

/** Intercala tarjetas pendientes y nuevas para la sesión (nueva cada ~3 repasos). */
export function interleave(due: Card[], fresh: Card[]): Card[] {
  const out: Card[] = [];
  let i = 0;
  let j = 0;
  while (i < due.length || j < fresh.length) {
    for (let k = 0; k < 3 && i < due.length; k++) out.push(due[i++]);
    if (j < fresh.length) out.push(fresh[j++]);
  }
  return out;
}

export function emptyFsrsCard(now = Date.now()): FCard {
  return createEmptyCard(new Date(now));
}
