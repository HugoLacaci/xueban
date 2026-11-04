"use client";
/**
 * De apunte a práctica: tarjetas SRS (palabras, frases, preguntas Cornell, huecos en los ejemplos, errores)
 * generadas desde los campos del apunte, repaso con FSRS y exportación a Anki.
 */
import { db, uuid, type Note, type NoteCard } from "@/lib/db";
import { getActiveLang } from "@/lib/languages/registry";
import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card as FCard, type Grade } from "ts-fsrs";
import { useSettings } from "@/lib/settings";
import type { Example, Pair, QA } from "./templates";
import { noteExercises } from "./exercises";

const str = (v: unknown) => (typeof v === "string" ? v : "");
const list = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export function newNoteCard(input: { noteId: string; kind: NoteCard["kind"]; front: string; back: string; hint?: string; id?: string }): NoteCard {
  const now = Date.now();
  const c = createEmptyCard(new Date(now));
  return {
    id: input.id ?? `${input.noteId}:${input.kind}:${uuid().slice(0, 8)}`,
    lang: getActiveLang(),
    noteId: input.noteId,
    kind: input.kind,
    front: input.front,
    back: input.back,
    hint: input.hint,
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state as NoteCard["state"],
    suspended: false,
    createdAt: now,
    updatedAt: now,
  };
}

/** Mina una frase de ejemplo: tarjeta «es → zh» ligada al apunte (o a «mined» si no hay apunte). */
export async function minePhrase(input: { zh: string; py?: string; es?: string; noteId?: string }): Promise<NoteCard> {
  const noteId = input.noteId ?? "mined";
  const existing = await db.noteCards.where("[lang+noteId]").equals([getActiveLang(), noteId]).filter((c) => c.back === input.zh).first();
  if (existing) return existing;
  const card = newNoteCard({ noteId, kind: "phrase", front: input.es || input.zh, back: input.zh, hint: input.py });
  await db.noteCards.put(card);
  return card;
}

/** Tarjetas que se pueden derivar de un apunte (deterministas por contenido, para no duplicar). */
export function cardsFromNote(note: Note): Omit<NoteCard, "due" | "stability" | "difficulty" | "elapsed_days" | "scheduled_days" | "learning_steps" | "reps" | "lapses" | "state" | "suspended" | "createdAt" | "updatedAt" | "lang">[] {
  const f = note.fields;
  const out: { id: string; noteId: string; kind: NoteCard["kind"]; front: string; back: string; hint?: string }[] = [];
  const key = (s: string) => s.replace(/\s+/g, "").slice(0, 40);
  // palabra / carácter / partícula
  const hanzi = str(f.hanzi) || str(f.char) || str(f.particle);
  const meaning = str(f.meaning) || list<string>(f.functions)[0] || "";
  if (hanzi && meaning) {
    out.push({ id: `${note.id}:word:${key(hanzi)}`, noteId: note.id, kind: "word", front: meaning, back: hanzi, hint: str(f.pinyin) });
  }
  // frase principal
  if (str(f.zh) && str(f.natural)) out.push({ id: `${note.id}:phrase:${key(str(f.zh))}`, noteId: note.id, kind: "phrase", front: str(f.natural), back: str(f.zh), hint: str(f.pinyin) });
  // ejemplos con traducción
  for (const k of ["examples", "ok", "phrases", "variants"]) {
    for (const e of list<Example>(f[k]).filter((x) => x && x.zh && x.es)) out.push({ id: `${note.id}:phrase:${key(e.zh)}`, noteId: note.id, kind: "phrase", front: e.es!, back: e.zh, hint: e.py });
  }
  // preguntas con respuesta
  for (const q of list<QA>(f.qa).filter((x) => x.q && x.a)) out.push({ id: `${note.id}:phrase:${key(q.q)}`, noteId: note.id, kind: "phrase", front: `Responde: ${q.q}${q.qes ? ` (${q.qes})` : ""}`, back: q.a, hint: q.aes });
  // huecos en los ejemplos (cloze de la palabra del apunte)
  if (hanzi) {
    for (const e of list<Example>(f.examples).filter((x) => x && x.zh.includes(hanzi)).slice(0, 3)) out.push({ id: `${note.id}:cloze:${key(e.zh)}`, noteId: note.id, kind: "cloze", front: e.zh.replace(hanzi, "＿".repeat(Array.from(hanzi).length)) + (e.es ? `\n${e.es}` : ""), back: hanzi, hint: meaning });
  }
  // errores (错题)
  if (note.type === "error" && str(f.correct)) out.push({ id: `${note.id}:error:${key(str(f.correct))}`, noteId: note.id, kind: "error", front: `❌ ${str(f.mine)}\n¿Cómo se dice bien?`, back: str(f.correct), hint: str(f.explanation) });
  for (const p of [...list<Pair>(f.mistakes), ...list<Pair>(f.bad)].filter((x) => x.wrong && x.right).slice(0, 4)) out.push({ id: `${note.id}:error:${key(p.right)}`, noteId: note.id, kind: "error", front: `❌ ${p.wrong}\n¿Cómo se dice bien?`, back: p.right, hint: p.why });
  // preguntas Cornell
  for (const c of note.cues.filter((x) => x.q.trim() && x.a.trim())) out.push({ id: `${note.id}:cue:${c.id}`, noteId: note.id, kind: "cue", front: c.q, back: c.a });
  return out;
}

/** Crea (o actualiza el texto de) las tarjetas del apunte y devuelve cuántas tarjetas y ejercicios hay. */
export async function generatePracticeFromNote(note: Note): Promise<{ cards: number; exercises: number; created: number }> {
  const wanted = cardsFromNote(note);
  let created = 0;
  await db.transaction("rw", db.noteCards, async () => {
    for (const w of wanted) {
      const cur = await db.noteCards.get(w.id);
      if (cur) {
        if (cur.front !== w.front || cur.back !== w.back || cur.hint !== w.hint) await db.noteCards.update(w.id, { front: w.front, back: w.back, hint: w.hint, updatedAt: Date.now() });
      } else {
        await db.noteCards.put(newNoteCard(w));
        created++;
      }
    }
  });
  return { cards: wanted.length, exercises: noteExercises(note).length, created };
}

/** Sincroniza las preguntas Cornell de un apunte con sus tarjetas (al guardar el apunte). */
export async function syncCueCards(note: Note): Promise<void> {
  const wanted = cardsFromNote(note).filter((c) => c.kind === "cue");
  const existing = await db.noteCards.where("noteId").equals(note.id).filter((c) => c.kind === "cue").toArray();
  const ids = new Set(wanted.map((w) => w.id));
  for (const e of existing) if (!ids.has(e.id)) await db.noteCards.delete(e.id);
  for (const w of wanted) {
    const cur = await db.noteCards.get(w.id);
    if (!cur) await db.noteCards.put(newNoteCard(w));
    else if (cur.front !== w.front || cur.back !== w.back) await db.noteCards.update(w.id, { front: w.front, back: w.back, updatedAt: Date.now() });
  }
}

/* ------------------------------------------------------------------ repaso FSRS */

function toF(c: NoteCard): FCard {
  return { due: new Date(c.due), stability: c.stability, difficulty: c.difficulty, elapsed_days: c.elapsed_days, scheduled_days: c.scheduled_days, learning_steps: c.learning_steps, reps: c.reps, lapses: c.lapses, state: c.state as State, last_review: c.last_review ? new Date(c.last_review) : undefined };
}

export async function rateNoteCard(card: NoteCard, grade: Grade, now = Date.now()): Promise<NoteCard> {
  const s = useSettings.getState().settings.fsrs;
  const f = fsrs(generatorParameters({ request_retention: s.retention, maximum_interval: s.maxInterval, enable_fuzz: true, enable_short_term: true }));
  const r = f.next(toF(card), new Date(now), grade);
  const next: NoteCard = { ...card, due: r.card.due.getTime(), stability: r.card.stability, difficulty: r.card.difficulty, elapsed_days: r.card.elapsed_days, scheduled_days: r.card.scheduled_days, learning_steps: r.card.learning_steps, reps: r.card.reps, lapses: r.card.lapses, state: r.card.state as NoteCard["state"], last_review: now, updatedAt: now };
  await db.noteCards.put(next);
  await db.notes.update(card.noteId, { lastReviewed: now });
  return next;
}

export { Rating };
export type { Grade };

/** Cola de repaso de tarjetas de apuntes: pendientes primero, luego nuevas (límite). */
export async function noteReviewQueue(opts: { newLimit?: number; kinds?: NoteCard["kind"][]; noteIds?: string[] } = {}): Promise<NoteCard[]> {
  const lang = getActiveLang();
  const now = Date.now();
  let all = await db.noteCards.where("lang").equals(lang).filter((c) => !c.suspended && c.noteId !== "mined-deleted").toArray();
  if (opts.kinds) all = all.filter((c) => opts.kinds!.includes(c.kind));
  if (opts.noteIds) all = all.filter((c) => opts.noteIds!.includes(c.noteId));
  const due = all.filter((c) => c.state !== 0 && c.due <= now).sort((a, b) => a.due - b.due);
  const fresh = all.filter((c) => c.state === 0).sort((a, b) => a.createdAt - b.createdAt).slice(0, opts.newLimit ?? 10);
  return [...due, ...fresh];
}

/* ------------------------------------------------------------------ Anki (tarjetas básicas) */

/** Exporta las tarjetas de apuntes como CSV «frente;dorso;pista;etiquetas» para importar en Anki (tipo Básico). */
export function noteCardsToCsv(cards: NoteCard[], titles: Map<string, string>): string {
  const esc = (s: string) => `"${s.replace(/"/g, '""').replace(/\n/g, "<br>")}"`;
  const rows = cards.map((c) => [esc(c.front), esc(c.back), esc(c.hint ?? ""), esc(`xueban-apuntes ${c.kind} ${(titles.get(c.noteId) ?? "").replace(/\s+/g, "_")}`)].join(";"));
  return ["#separator:;", "#html:true", "#tags column:4", ...rows].join("\n");
}
