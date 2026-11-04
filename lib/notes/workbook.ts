"use client";
/**
 * Cuaderno de ejercicios 练习本: conjuntos de frases en español para traducir al chino, con respuestas de referencia
 * opcionales, SRS por ítem (FSRS) e historial de intentos. Entrada masiva por texto («español | respuesta · otra»)
 * o por foto con OCR. Cada error registrado va al 错题本.
 */
import { db, uuid, type ExerciseItem, type ExerciseSet, type ItemAttempt, type AnswerMode } from "@/lib/db";
import { getActiveLang } from "@/lib/languages/registry";
import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card as FCard, type Grade } from "ts-fsrs";
import { useSettings } from "@/lib/settings";
import type { CorrectionReport } from "@/lib/correction/types";
import { recordError } from "./error-book";

export interface ParsedLine {
  es: string;
  answers: string[];
  hint?: string;
  line: number;
  error?: string;
}

/**
 * Formatos por línea:
 *   Hoy como en casa.
 *   Hoy como en casa. | 我今天在家吃饭。 · 今天我在家吃饭。
 *   Hoy como en casa. | 我今天在家吃饭。 | pista: tiempo antes del verbo
 *   3. Hoy como en casa.   (se quita la numeración)
 */
export function parseWorkbookText(text: string): ParsedLine[] {
  const out: ParsedLine[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    let line = raw.trim();
    if (!line || line.startsWith("#")) return;
    line = line.replace(/^\s*(\d+|[a-z])[.)]\s*/i, "");
    const parts = line.split(/\s*\|\s*/);
    const es = parts[0]?.trim() ?? "";
    if (!es) return;
    const answers = (parts[1] ?? "")
      .split(/\s*[·;／]\s*|\s{2,}/)
      .map((a) => a.trim())
      .filter((a) => /[㐀-鿿]/.test(a));
    const hint = parts[2]?.replace(/^pista:\s*/i, "").trim() || undefined;
    const row: ParsedLine = { es, answers, hint, line: i + 1 };
    if (/[㐀-鿿]/.test(es) && !answers.length) {
      // la línea está en chino: probablemente es la solución de la frase anterior
      const prev = out[out.length - 1];
      if (prev && !prev.answers.length) {
        prev.answers.push(es);
        return;
      }
      row.error = "esta línea está en chino: pon el español a la izquierda y la solución tras |";
    }
    out.push(row);
  });
  return out;
}

function srsFields() {
  const c = createEmptyCard(new Date());
  return { due: c.due.getTime(), stability: c.stability, difficulty: c.difficulty, elapsed_days: c.elapsed_days, scheduled_days: c.scheduled_days, learning_steps: c.learning_steps, reps: c.reps, lapses: c.lapses, state: c.state as ExerciseItem["state"] };
}

export async function createSet(input: { title: string; date?: string; topic?: string; unitId?: string; tags?: string[] }): Promise<ExerciseSet> {
  const now = Date.now();
  const set: ExerciseSet = { id: uuid(), lang: getActiveLang(), title: input.title.trim() || "Ejercicios", date: input.date, topic: input.topic, unitId: input.unitId, tags: input.tags ?? [], createdAt: now, updatedAt: now };
  await db.exerciseSets.put(set);
  return set;
}

export async function addItems(setId: string, rows: { es: string; answers: string[]; hint?: string; tags?: string[]; grammarIds?: string[]; unitId?: string }[]): Promise<ExerciseItem[]> {
  const lang = getActiveLang();
  const existing = await db.exerciseItems.where("setId").equals(setId).count();
  const now = Date.now();
  const items: ExerciseItem[] = rows
    .filter((r) => r.es.trim())
    .map((r, i) => ({ id: uuid(), lang, setId, order: existing + i, es: r.es.trim(), answers: r.answers.map((a) => a.trim()).filter(Boolean), hint: r.hint, tags: r.tags ?? [], grammarIds: r.grammarIds ?? [], unitId: r.unitId, ...srsFields(), attempts: 0, correct: 0, createdAt: now, updatedAt: now }));
  await db.transaction("rw", db.exerciseItems, db.exerciseSets, async () => {
    await db.exerciseItems.bulkPut(items);
    await db.exerciseSets.update(setId, { updatedAt: now });
  });
  return items;
}

export async function updateItem(id: string, patch: Partial<ExerciseItem>): Promise<void> {
  await db.exerciseItems.update(id, { ...patch, updatedAt: Date.now() });
}

export async function deleteItem(id: string): Promise<void> {
  await db.transaction("rw", db.exerciseItems, db.itemAttempts, async () => {
    await db.exerciseItems.delete(id);
    await db.itemAttempts.where("itemId").equals(id).delete();
  });
}

export async function deleteSet(id: string): Promise<void> {
  await db.transaction("rw", db.exerciseSets, db.exerciseItems, db.itemAttempts, async () => {
    await db.exerciseSets.delete(id);
    const items = await db.exerciseItems.where("setId").equals(id).toArray();
    for (const it of items) await db.itemAttempts.where("itemId").equals(it.id).delete();
    await db.exerciseItems.where("setId").equals(id).delete();
  });
}

function toF(c: ExerciseItem): FCard {
  return { due: new Date(c.due), stability: c.stability, difficulty: c.difficulty, elapsed_days: c.elapsed_days, scheduled_days: c.scheduled_days, learning_steps: c.learning_steps, reps: c.reps, lapses: c.lapses, state: c.state as State, last_review: c.last_review ? new Date(c.last_review) : undefined };
}

/** Registra un intento: historial, SRS (según el veredicto) y, si hay error, el 错题本. */
export async function recordAttempt(item: ExerciseItem, mode: AnswerMode, answer: string, report: CorrectionReport, opts: { setTitle?: string } = {}): Promise<ExerciseItem> {
  const now = Date.now();
  const attempt: ItemAttempt = { lang: item.lang, itemId: item.id, setId: item.setId, mode, answer, score: report.score, verdict: report.verdict, report, at: now };
  await db.itemAttempts.add(attempt);
  const grade: Grade = report.verdict === "correct" ? Rating.Good : report.verdict === "improvable" ? Rating.Hard : report.verdict === "partial" ? Rating.Hard : Rating.Again;
  const s = useSettings.getState().settings.fsrs;
  const f = fsrs(generatorParameters({ request_retention: s.retention, maximum_interval: s.maxInterval, enable_fuzz: true, enable_short_term: true }));
  const r = f.next(toF(item), new Date(now), grade);
  const next: ExerciseItem = { ...item, due: r.card.due.getTime(), stability: r.card.stability, difficulty: r.card.difficulty, elapsed_days: r.card.elapsed_days, scheduled_days: r.card.scheduled_days, learning_steps: r.card.learning_steps, reps: r.card.reps, lapses: r.card.lapses, state: r.card.state as ExerciseItem["state"], last_review: now, attempts: item.attempts + 1, correct: item.correct + (report.verdict === "correct" ? 1 : 0), lastScore: report.score, lastAt: now, updatedAt: now };
  await db.exerciseItems.put(next);
  // 错题本: solo errores reales (no «parcial»)
  if ((report.verdict === "wrong" || report.verdict === "improvable") && report.corrected) {
    const main = report.errors.find((e) => e.severity === "error") ?? report.errors[0];
    if (main) {
      await recordError({
        mine: report.answer || answer,
        correct: report.corrected,
        es: item.es,
        explanation: main.explanation,
        errorType: main.type,
        ruleId: main.ruleId,
        noteId: main.noteId,
        tip: report.tip,
        origin: `cuaderno · ${opts.setTitle ?? "ejercicios"}`,
        source: { kind: "exercise", ref: item.id, context: item.es, href: `/apuntes/cuaderno?set=${item.setId}&item=${item.id}` },
        tags: item.tags,
      });
    }
  }
  return next;
}

/** Cola de práctica de un conjunto (o de todos): pendientes por SRS primero, luego los no intentados. */
export async function workbookQueue(opts: { setId?: string; dueOnly?: boolean; limit?: number } = {}): Promise<ExerciseItem[]> {
  const lang = getActiveLang();
  const now = Date.now();
  let items = opts.setId ? await db.exerciseItems.where("setId").equals(opts.setId).sortBy("order") : await db.exerciseItems.where("lang").equals(lang).toArray();
  if (opts.dueOnly) items = items.filter((i) => i.due <= now || i.state === 0);
  else items = [...items.filter((i) => i.due <= now && i.state !== 0), ...items.filter((i) => i.state === 0), ...items.filter((i) => i.due > now && i.state !== 0)];
  return items.slice(0, opts.limit ?? 200);
}
