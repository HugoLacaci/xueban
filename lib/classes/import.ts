"use client";
/**
 * Importación de paquetes de clase (Apuntes → Clases → Importar). Solo chino.
 *
 * Ids estables (reimportar no duplica):
 *   apunte          class-AAAA-MM-DD   (si ese día ya hay otra clase de otro archivo: class-AAAA-MM-DD-HHMM)
 *   ejercicios      <noteId>:ex:<n>    (n desde 1)
 *   conjunto        <noteId>:set
 *   aportaciones    <noteId>:living:<n>
 *   recortes        <noteId>:clip:<archivo>
 *
 * No se pisa lo que el usuario haya editado: cada entidad importada guarda la huella (`importHash`) del contenido que
 * se importó. Al reimportar, si el paquete trae lo mismo → nada; si el usuario no tocó nada → se actualiza; si
 * cambiaron los dos → conflicto (la UI deja elegir con `resolve`).
 */
import { db, upsertWord, categoryId, type ExerciseItem, type ExerciseSet, type LivingNoteAdd, type Note, type Word, type XuebanDB } from "@/lib/db";
import { readingOf } from "@/lib/languages/helpers";
import { onWordSaved } from "@/lib/anki/hooks";
import { buildNote, emptyDoc } from "@/lib/notes/repo";
import { recordError } from "@/lib/notes/error-book";
import { srsFields } from "@/lib/notes/workbook";
import { classPackageId, type ClassExercise, type ClassPackage } from "./package-schema";
import { answerDiffers, classMarkdown, classSetId, clipAssetId, contentHash, ddmm, exerciseId, livingAddId, normalizeZh, sourceTime } from "./search";

const LANG = "zh" as const;
export const CLASS_TAG = "clase";
export const CORRECTED_TAG = "corregido-en-clase";
export const classDateTag = (date: string) => `clase::${date}`;

export type ImportStatus = "new" | "same" | "update" | "conflict";

/** Claves de exclusión: word:<hanzi> · grammar:<i> · phrase:<i> · tip:<i> · ex:<n> · living:<n> · clips */
export interface ImportOptions {
  exclude?: Iterable<string>;
  /** Qué hacer con cada conflicto («note», «ex:<n>», «living:<n>»): quedarme con lo mío o usar lo del paquete. */
  resolve?: Record<string, "keep" | "replace">;
  /** Ids de los apuntes vivos que existen (para avisar de aportaciones huérfanas en la vista previa). */
  livingIds?: ReadonlySet<string>;
  now?: number;
}

/* ------------------------------------------------------------------ ids y proyecciones */

/** Id del apunte de la clase: class-AAAA-MM-DD, o con la hora si ese día ya hay otra clase importada de otro archivo. */
export async function resolveClassNoteId(pkg: ClassPackage, database: XuebanDB = db): Promise<string> {
  const base = classPackageId(pkg);
  const sameFile = (n?: Note) => !n || n.source?.ref === pkg.source.file;
  const first = await database.notes.get(base);
  if (sameFile(first)) return base;
  const hhmm = sourceTime(pkg) ?? contentHash(pkg.source.file).slice(0, 4);
  return `${base}-${hhmm}`;
}

export { exerciseId, livingAddId, clipAssetId, classSetId };

function exerciseContent(e: ClassExercise) {
  return { es: e.es, answers: e.teacherAnswer, hint: e.explanationEs, classAnswer: e.myAnswer, claudeProposal: e.claudeProposal, confidence: e.confidence, classTimestamp: e.t };
}
function itemContent(it: ExerciseItem) {
  return { es: it.es, answers: it.answers, hint: it.hint, classAnswer: it.classAnswer, claudeProposal: it.claudeProposal, confidence: it.confidence, classTimestamp: it.classTimestamp };
}

const NOTE_META = new Set(["classPkg", "classImport", "classExcluded", "classDuplicates", "importHash"]);
function noteContent(n: Pick<Note, "title" | "summary" | "cues" | "fields">) {
  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(n.fields)) if (!NOTE_META.has(k)) fields[k] = v;
  return { title: n.title, summary: n.summary ?? "", cues: n.cues.map((c) => [c.q, c.a]), fields };
}

function livingContent(a: Pick<LivingNoteAdd, "noteId" | "afterSectionId" | "title" | "markdown">) {
  return { noteId: a.noteId, afterSectionId: a.afterSectionId, title: a.title, markdown: a.markdown };
}

function statusOf(importHash: string | undefined, currentHash: string, nextHash: string, exists: boolean): ImportStatus {
  if (!exists) return "new";
  if (nextHash === importHash || nextHash === currentHash) return "same";
  if (!importHash || currentHash === importHash) return "update";
  return "conflict";
}

/** Nombres de recorte que cita el paquete (lista `clips` y campos `clip` sueltos). */
export function referencedClips(pkg: ClassPackage): string[] {
  const s = new Set<string>();
  for (const c of pkg.clips ?? []) s.add(c.file);
  for (const list of [pkg.vocab, pkg.grammar, pkg.phrases, pkg.teacherTips, pkg.exercises] as { clip?: string }[][]) for (const x of list) if (x.clip) s.add(x.clip);
  return [...s];
}

/* ------------------------------------------------------------------ construcción del apunte */

function buildClassNote(pkg: ClassPackage, noteId: string, exclude: ReadonlySet<string>, now: number): Note {
  const vocab = pkg.vocab.filter((v) => !exclude.has(`word:${v.hanzi}`));
  const grammar = pkg.grammar.filter((_, i) => !exclude.has(`grammar:${i}`));
  const phrases = pkg.phrases.filter((_, i) => !exclude.has(`phrase:${i}`));
  const tips = pkg.teacherTips.filter((_, i) => !exclude.has(`tip:${i}`));
  const fields: Record<string, unknown> = {
    date: pkg.classDate,
    teacher: pkg.teacher ?? "",
    topic: pkg.title,
    summaryText: pkg.summary,
    vocabText: vocab.map((v) => [v.hanzi, v.pinyin ?? "", v.es].join(",")).join("\n"),
    grammar: grammar.map((g) => `**${g.title}** · ${g.pattern}\n${g.explanationEs}`).join("\n\n"),
    phrases: phrases.map((p) => ({ zh: p.zh, es: p.es })),
    tips: tips.map((t) => `- ${t.text}`).join("\n"),
    doubts: pkg.myDoubts.map((d) => `- ${d.q}${d.a ? ` → ${d.a}` : ""}`).join("\n"),
    homework: pkg.homework ?? "",
    photos: "",
    classPkg: pkg,
    classExcluded: [...exclude],
    classImport: { file: pkg.source.file, transcript: pkg.source.transcript, importedAt: now },
  };
  const note = buildNote({
    id: noteId,
    lang: LANG,
    type: "class",
    title: pkg.title,
    fields,
    doc: emptyDoc(),
    markdown: classMarkdown(pkg, exclude),
    tags: [CLASS_TAG, classDateTag(pkg.classDate)],
    source: { kind: "class", ref: pkg.source.file, context: pkg.title },
    cues: pkg.cues.map((c, i) => ({ id: `${noteId}:cue:${i + 1}`, q: c.q, a: c.a })),
    summary: pkg.summary,
    classDate: pkg.classDate,
  });
  note.createdAt = now;
  note.updatedAt = now;
  return note;
}

function buildLivingAdds(pkg: ClassPackage, noteId: string) {
  return pkg.livingNoteAdds.map((a, i) => ({
    id: livingAddId(noteId, i + 1),
    noteId: a.noteId,
    afterSectionId: a.sectionId,
    kind: "teacher" as const,
    title: `👩‍🏫 Clase del ${ddmm(pkg.classDate)}`,
    markdown: `${a.title ? `**${a.title}**\n\n` : ""}${a.markdown}`,
  }));
}

/* ------------------------------------------------------------------ vista previa */

export interface PreviewWord {
  key: string;
  hanzi: string;
  pinyin: string;
  es: string;
  category: string;
  example?: { zh: string; es: string };
  inDeck: boolean;
  clip?: string;
}
export interface PreviewExercise {
  key: string;
  n: number;
  es: string;
  myAnswer?: string;
  teacherAnswer: string[];
  explanation?: string;
  confidence: "alta" | "media" | "baja";
  claudeProposal?: string;
  wrong: boolean;
  clip?: string;
  status: ImportStatus;
}
export interface PreviewLiving {
  key: string;
  noteId: string;
  sectionId?: string;
  title?: string;
  markdown: string;
  status: ImportStatus;
  orphan: boolean;
}
export interface ClassPreview {
  noteId: string;
  classDate: string;
  title: string;
  summary: string;
  noteStatus: ImportStatus;
  words: PreviewWord[];
  structures: { key: string; title: string; pattern: string; explanation: string }[];
  phrases: { key: string; zh: string; es: string }[];
  tips: { key: string; text: string }[];
  exercises: PreviewExercise[];
  living: PreviewLiving[];
  /** Lo dudoso: fragmentos que no se oyeron bien (uncertain) y mis dudas de la clase. */
  doubts: { kind: "uncertain" | "myDoubt"; text: string; t?: number }[];
  warnings: string[];
  clips: string[];
  conflicts: string[];
  /** Paquete que repite otra clase (duplicateOf): no se crea apunte; target = apunte al que se suma (si está importado). */
  duplicate?: { ref: string; target?: string; targetTitle?: string; newExercises: number; newTips: number };
}

async function previewDuplicate(pkg: ClassPackage, database: XuebanDB): Promise<ClassPreview> {
  const target = await resolveDuplicateTarget(pkg.duplicateOf!, database);
  const deck = new Set((await database.words.where("[lang+hanzi]").anyOf(pkg.vocab.map((v) => [LANG, v.hanzi])).toArray()).map((w) => w.hanzi));
  const key = dupKey(pkg);
  const items = target ? await database.exerciseItems.where("setId").equals(classSetId(target.id)).toArray() : [];
  const seen = new Set(items.flatMap((i) => [normalizeZh(i.es), ...i.answers.map((a) => `=${normalizeZh(a)}`)]));
  const exercises: PreviewExercise[] = pkg.exercises.map((e, i) => {
    const n = i + 1;
    const exists = items.some((it) => it.id === exerciseId(target?.id ?? "", `${key}-${n}`));
    const dup = !exists && (seen.has(normalizeZh(e.es)) || e.teacherAnswer.some((a) => seen.has(`=${normalizeZh(a)}`)));
    return { key: `ex:${n}`, n, es: e.es, myAnswer: e.myAnswer, teacherAnswer: e.teacherAnswer, explanation: e.explanationEs, confidence: e.confidence, claudeProposal: e.claudeProposal, wrong: answerDiffers(e.myAnswer, e.teacherAnswer), clip: e.clip, status: exists || dup ? "same" : "new" };
  });
  const curTips = ((target?.fields.classPkg as ClassPackage | undefined)?.teacherTips ?? []).map((t) => normalizeZh(t.text));
  const newTips = pkg.teacherTips.filter((t) => !curTips.includes(normalizeZh(t.text))).length;
  const newExercises = exercises.filter((e) => e.status === "new").length;
  const warnings = target
    ? [`Repite el temario de «${target.title}» (${ddmm(target.classDate ?? pkg.classDate)}): no se crea un apunte aparte. Se suman ${newExercises} ejercicio${newExercises === 1 ? "" : "s"} y ${newTips} truco${newTips === 1 ? "" : "s"} nuevos a esa clase (los repetidos se omiten); las palabras van al mazo como siempre.`]
    : [`Repite la clase «${pkg.duplicateOf}», que aún no está importada: impórtala primero.`];
  return {
    noteId: target?.id ?? "",
    classDate: pkg.classDate,
    title: pkg.title,
    summary: pkg.summary,
    noteStatus: target ? "update" : "new",
    words: pkg.vocab.map((v) => ({ key: `word:${v.hanzi}`, hanzi: v.hanzi, pinyin: v.pinyin ?? "", es: v.es, category: v.category, example: v.example, inDeck: deck.has(v.hanzi), clip: v.clip })),
    structures: [],
    phrases: [],
    tips: pkg.teacherTips.map((t, i) => ({ key: `tip:${i}`, text: t.text })),
    exercises,
    living: [],
    doubts: pkg.uncertain.map((u) => ({ kind: "uncertain" as const, text: u.what, t: u.t })),
    warnings,
    clips: referencedClips(pkg),
    conflicts: [],
    duplicate: { ref: pkg.duplicateOf!, target: target?.id, targetTitle: target?.title, newExercises, newTips },
  };
}

export async function previewClassPackage(pkg: ClassPackage, database: XuebanDB = db, opts: Pick<ImportOptions, "livingIds"> = {}): Promise<ClassPreview> {
  if (pkg.duplicateOf) return previewDuplicate(pkg, database);
  const noteId = await resolveClassNoteId(pkg, database);
  const existingNote = await database.notes.get(noteId);
  const fresh = buildClassNote(pkg, noteId, new Set(), Date.now());
  const noteStatus = existingNote
    ? statusOf(existingNote.fields.importHash as string | undefined, contentHash(noteContent(existingNote)), contentHash(noteContent(fresh)), true)
    : "new";

  const deck = new Set((await database.words.where("[lang+hanzi]").anyOf(pkg.vocab.map((v) => [LANG, v.hanzi])).toArray()).map((w) => w.hanzi));
  const words: PreviewWord[] = pkg.vocab.map((v) => ({ key: `word:${v.hanzi}`, hanzi: v.hanzi, pinyin: v.pinyin ?? "", es: v.es, category: v.category, example: v.example, inDeck: deck.has(v.hanzi), clip: v.clip }));

  const exercises: PreviewExercise[] = [];
  for (const [i, e] of pkg.exercises.entries()) {
    const n = i + 1;
    const cur = await database.exerciseItems.get(exerciseId(noteId, n));
    const status = cur ? statusOf(cur.importHash, contentHash(itemContent(cur)), contentHash(exerciseContent(e)), true) : "new";
    exercises.push({ key: `ex:${n}`, n, es: e.es, myAnswer: e.myAnswer, teacherAnswer: e.teacherAnswer, explanation: e.explanationEs, confidence: e.confidence, claudeProposal: e.claudeProposal, wrong: answerDiffers(e.myAnswer, e.teacherAnswer), clip: e.clip, status });
  }

  const living: PreviewLiving[] = [];
  for (const [i, a] of buildLivingAdds(pkg, noteId).entries()) {
    const cur = await database.livingNoteAdds.get(a.id);
    const status = cur ? statusOf(cur.importHash, contentHash(livingContent(cur)), contentHash(livingContent(a)), true) : "new";
    living.push({ key: `living:${i + 1}`, noteId: a.noteId, sectionId: a.afterSectionId, title: pkg.livingNoteAdds[i].title, markdown: pkg.livingNoteAdds[i].markdown, status, orphan: opts.livingIds ? !opts.livingIds.has(a.noteId) : false });
  }

  const warnings: string[] = [];
  if (pkg.source.onlyTeamsTranscript) warnings.push("Solo había la transcripción de Teams: el chino puede tener errores de reconocimiento.");
  const low = pkg.exercises.filter((e) => e.confidence === "baja").length;
  if (low) warnings.push(`${low} ejercicio${low > 1 ? "s" : ""} con confianza baja: el audio no estaba claro, revísalo${low > 1 ? "s" : ""} después en el cuaderno.`);
  const proposals = pkg.exercises.filter((e) => e.claudeProposal).length;
  if (proposals) warnings.push(`${proposals} propuesta${proposals > 1 ? "s" : ""} de Claude (no del profesor): se marcan como tales.`);
  if (pkg.asrFixes?.length) warnings.push(`Claude corrigió ${pkg.asrFixes.length} fallo${pkg.asrFixes.length > 1 ? "s" : ""} de reconocimiento (homófonos, etc.).`);
  for (const l of living) if (l.orphan) warnings.push(`La aportación «${l.title ?? l.noteId}» apunta a un apunte vivo que no existe (${l.noteId}).`);
  if (pkg.group === "otro") warnings.push(pkg.coversDate ? `Es de otro grupo del mismo profesor: cubre tu clase del ${ddmm(pkg.coversDate)}, que no se grabó.` : "Es de otro grupo del mismo profesor (sirve de repaso).");
  if (noteId !== classPackageId(pkg)) warnings.push(`Ese día ya hay otra clase importada: esta se guardará como ${noteId}.`);

  const conflicts = [...(noteStatus === "conflict" ? ["note"] : []), ...exercises.filter((e) => e.status === "conflict").map((e) => e.key), ...living.filter((l) => l.status === "conflict").map((l) => l.key)];

  return {
    noteId,
    classDate: pkg.classDate,
    title: pkg.title,
    summary: pkg.summary,
    noteStatus,
    words,
    structures: pkg.grammar.map((g, i) => ({ key: `grammar:${i}`, title: g.title, pattern: g.pattern, explanation: g.explanationEs })),
    phrases: pkg.phrases.map((p, i) => ({ key: `phrase:${i}`, zh: p.zh, es: p.es })),
    tips: pkg.teacherTips.map((t, i) => ({ key: `tip:${i}`, text: t.text })),
    exercises,
    living,
    doubts: [...pkg.uncertain.map((u) => ({ kind: "uncertain" as const, text: u.what, t: u.t })), ...pkg.myDoubts.map((d) => ({ kind: "myDoubt" as const, text: d.a ? `${d.q} → ${d.a}` : d.q, t: d.t }))],
    warnings,
    clips: referencedClips(pkg),
    conflicts,
  };
}

/* ------------------------------------------------------------------ importación */

export interface ImportConflict {
  key: string;
  label: string;
  mine: string;
  theirs: string;
}

export interface ImportResult {
  noteId: string;
  setId: string;
  note: ImportStatus;
  words: { added: number; tagged: number };
  exercises: { added: number; updated: number; unchanged: number };
  living: { added: number; updated: number; unchanged: number };
  errorsAdded: number;
  clips: { saved: number; missing: string[] };
  conflicts: ImportConflict[];
}

const MIME: Record<string, string> = { opus: "audio/ogg; codecs=opus", ogg: "audio/ogg", m4a: "audio/mp4", mp3: "audio/mpeg" };
export const clipMime = (file: string) => MIME[file.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";

async function ensureCategory(name: string): Promise<void> {
  const id = categoryId(LANG, name);
  if (await db.categories.get(id)) return;
  const byName = await db.categories.where("lang").equals(LANG).filter((c) => c.name === name).first();
  if (byName) return;
  await db.categories.put({ id, lang: LANG, name, color: "#7a7064", icon: "Tag", order: 98, builtin: false });
}

/** Palabras: nuevas con upsertWord (+ Anki si está conectado); las que ya están en el mazo solo reciben la etiqueta. */
async function importWords(pkg: ClassPackage, exclude: ReadonlySet<string>, tags: string[], sourceRef: string, result: ImportResult): Promise<string[]> {
  const wordIds: string[] = [];
  for (const v of pkg.vocab) {
    if (exclude.has(`word:${v.hanzi}`)) continue;
    const existing = await db.words.where("[lang+hanzi]").equals([LANG, v.hanzi]).first();
    if (existing) {
      wordIds.push(existing.id);
      const merged = Array.from(new Set([...existing.tags, ...tags]));
      if (merged.length !== existing.tags.length) {
        await db.words.update(existing.id, { tags: merged });
        result.words.tagged++;
      }
      continue;
    }
    await ensureCategory(v.category);
    const w: Word = await upsertWord({ lang: LANG, hanzi: v.hanzi, pinyin: v.pinyin ?? readingOf(v.hanzi), meaning: v.es, category: v.category, example: v.example?.zh, exampleTranslation: v.example?.es, source: "class", sourceRef, tags, hsk: [] });
    void onWordSaved(w);
    wordIds.push(w.id);
    result.words.added++;
  }
  return wordIds;
}

/** Ítem nuevo del cuaderno a partir de un ejercicio del paquete (+ 错题本 si mi respuesta en clase no coincidía). */
async function createClassItem(e: ClassExercise, ctx: { id: string; setId: string; noteId: string; order: number; clipAssetId?: string; date: string; now: number }, result: ImportResult): Promise<void> {
  const row: ExerciseItem = {
    id: ctx.id,
    lang: LANG,
    setId: ctx.setId,
    order: ctx.order,
    es: e.es,
    answers: e.teacherAnswer,
    hint: e.explanationEs,
    tags: [CORRECTED_TAG, ...(e.errorTypes ?? [])],
    grammarIds: e.grammarIds ?? [],
    ...srsFields(),
    attempts: 0,
    correct: 0,
    createdAt: ctx.now,
    updatedAt: ctx.now,
    origin: "class",
    classNoteId: ctx.noteId,
    clipAssetId: ctx.clipAssetId,
    classAnswer: e.myAnswer,
    teacherExplanation: e.explanationEs,
    classTimestamp: e.t,
    confidence: e.confidence,
    claudeProposal: e.claudeProposal,
    confirmed: e.confidence === "baja" ? false : undefined,
    importHash: contentHash(exerciseContent(e)),
  };
  await db.exerciseItems.put(row);
  result.exercises.added++;
  if (e.myAnswer && answerDiffers(e.myAnswer, e.teacherAnswer)) {
    await recordError({
      mine: e.myAnswer,
      correct: e.teacherAnswer[0],
      es: e.es,
      explanation: e.explanationEs ?? "Corregido en clase por el profesor.",
      errorType: e.grammarIds?.length ? "grammar" : "other",
      ruleId: e.grammarIds?.[0],
      origin: `clase · ${ddmm(ctx.date)}`,
      source: { kind: "class", ref: ctx.id, context: e.es, href: `/apuntes/cuaderno?vista=clase&item=${encodeURIComponent(ctx.id)}` },
      tags: [CLASS_TAG, classDateTag(ctx.date)],
    });
    result.errorsAdded++;
  }
}

/* ---- paquetes que repiten el temario de otra clase (duplicateOf) ---- */

const fileBase = (f?: string) => (f ?? "").replace(/\.[^.]+$/, "");
/** Clave estable de un paquete duplicado (base del archivo fuente). */
const dupKey = (pkg: ClassPackage) => fileBase(pkg.source.file).replace(/[^\w-]/g, "_");

/**
 * Apunte de la clase a la que remite `duplicateOf`: id del paquete («2026-10-07_1603», se busca por el archivo
 * fuente), id del apunte («class-2026-10-07») o fecha («2026-10-07»).
 */
export async function resolveDuplicateTarget(ref: string, database: XuebanDB = db): Promise<Note | undefined> {
  const base = fileBase(ref.replace(/\.json$/, ""));
  const all = await database.notes.where("[lang+kind]").equals([LANG, "class"]).toArray();
  return all.find((n) => fileBase(n.source?.ref) === base) ?? all.find((n) => n.id === ref) ?? (/^\d{4}-\d{2}-\d{2}$/.test(ref) ? all.find((n) => n.id === `class-${ref}`) : undefined);
}

type StoredTip = ClassPackage["teacherTips"][number] & { dup?: string };

/** Trucos añadidos a una clase desde paquetes duplicados: se conservan aunque se reimporte la clase original. */
function keepMergedTips(next: ClassPackage, cur?: ClassPackage): ClassPackage {
  const extra = ((cur?.teacherTips ?? []) as StoredTip[]).filter((t) => t.dup && !next.teacherTips.some((x) => normalizeZh(x.text) === normalizeZh(t.text)));
  return extra.length ? { ...next, teacherTips: [...next.teacherTips, ...extra] } : next;
}

async function importDuplicate(pkg: ClassPackage, clips: Map<string, Blob>, exclude: ReadonlySet<string>, now: number): Promise<ImportResult> {
  const target = await resolveDuplicateTarget(pkg.duplicateOf!);
  if (!target) throw new Error(`Este paquete repite la clase «${pkg.duplicateOf}», que aún no está importada: impórtala primero.`);
  const noteId = target.id;
  const setId = classSetId(noteId);
  const key = dupKey(pkg);
  const date = target.classDate ?? pkg.classDate;
  const result: ImportResult = { noteId, setId, note: "same", words: { added: 0, tagged: 0 }, exercises: { added: 0, updated: 0, unchanged: 0 }, living: { added: 0, updated: 0, unchanged: 0 }, errorsAdded: 0, clips: { saved: 0, missing: [] }, conflicts: [] };

  // recortes: con el prefijo del paquete (los nombres ex-1.opus… chocarían con los de la clase original)
  const available = new Set<string>();
  if (!exclude.has("clips")) {
    for (const file of referencedClips(pkg)) {
      const id = clipAssetId(noteId, `${key}~${file}`);
      const blob = clips.get(file);
      if (blob) {
        await db.assets.put({ id, lang: LANG, noteId, kind: "class-clip", mime: blob.type || clipMime(file), blob, name: file, createdAt: now });
        result.clips.saved++;
        available.add(file);
      } else if (await db.assets.get(id)) available.add(file);
      else result.clips.missing.push(file);
    }
  }
  const clipName = (file?: string) => (file && available.has(file) ? `${key}~${file}` : undefined);

  // palabras al mazo como siempre (etiquetadas con la clase a la que se suman)
  const wordIds = await importWords(pkg, exclude, [CLASS_TAG, classDateTag(date)], noteId, result);

  // ejercicios nuevos (deduplicados por el enunciado y la respuesta) al conjunto de la clase original
  const items = await db.exerciseItems.where("setId").equals(setId).toArray();
  const seen = new Set(items.flatMap((i) => [normalizeZh(i.es), ...i.answers.map((a) => `=${normalizeZh(a)}`)]));
  let order = items.reduce((m, i) => Math.max(m, i.order), -1) + 1;
  const todo = pkg.exercises.map((e, i) => ({ e, n: i + 1 })).filter(({ n }) => !exclude.has(`ex:${n}`));
  if (todo.length && !(await db.exerciseSets.get(setId))) await db.exerciseSets.put({ id: setId, lang: LANG, title: `Clase ${ddmm(date)}: ${target.title}`, date, tags: [CORRECTED_TAG, CLASS_TAG, classDateTag(date)], createdAt: now, updatedAt: now });
  for (const { e, n } of todo) {
    const id = exerciseId(noteId, `${key}-${n}`);
    if (await db.exerciseItems.get(id)) {
      result.exercises.unchanged++;
      continue;
    }
    if (seen.has(normalizeZh(e.es)) || e.teacherAnswer.some((a) => seen.has(`=${normalizeZh(a)}`))) {
      result.exercises.unchanged++;
      continue;
    }
    seen.add(normalizeZh(e.es));
    const clip = clipName(e.clip);
    await createClassItem(e, { id, setId, noteId, order: order++, clipAssetId: clip ? clipAssetId(noteId, clip) : undefined, date, now }, result);
  }

  // trucos nuevos del profesor (deduplicados por texto) dentro del paquete guardado en el apunte (no tocan la huella)
  const cur = (await db.notes.get(noteId))!;
  const curPkg = cur.fields.classPkg as ClassPackage | undefined;
  const tips = [...((curPkg?.teacherTips ?? []) as StoredTip[])];
  for (const t of pkg.teacherTips) {
    if (tips.some((x) => normalizeZh(x.text) === normalizeZh(t.text))) continue;
    tips.push({ text: t.text, t: undefined, clip: clipName(t.clip), dup: key });
  }
  const merged = Array.from(new Set([...((cur.fields.classDuplicates as string[] | undefined) ?? []), key]));
  await db.notes.update(noteId, { wordIds: Array.from(new Set([...cur.wordIds, ...wordIds])), fields: { ...cur.fields, ...(curPkg ? { classPkg: { ...curPkg, teacherTips: tips } } : {}), classDuplicates: merged } });
  return result;
}

export async function importClassPackage(pkg: ClassPackage, clips: Map<string, Blob> = new Map(), opts: ImportOptions = {}): Promise<ImportResult> {
  const now = opts.now ?? Date.now();
  const exclude = new Set(opts.exclude ?? []);
  if (pkg.duplicateOf) return importDuplicate(pkg, clips, exclude, now);
  const resolve = opts.resolve ?? {};
  const noteId = await resolveClassNoteId(pkg);
  const setId = classSetId(noteId);
  const date = pkg.classDate;
  const tags = [CLASS_TAG, classDateTag(date)];
  const result: ImportResult = { noteId, setId, note: "new", words: { added: 0, tagged: 0 }, exercises: { added: 0, updated: 0, unchanged: 0 }, living: { added: 0, updated: 0, unchanged: 0 }, errorsAdded: 0, clips: { saved: 0, missing: [] }, conflicts: [] };

  // 1. Recortes del profesor (Blob en IndexedDB, privados)
  const available = new Set<string>();
  if (!exclude.has("clips")) {
    for (const file of referencedClips(pkg)) {
      const id = clipAssetId(noteId, file);
      const blob = clips.get(file);
      if (blob) {
        await db.assets.put({ id, lang: LANG, noteId, kind: "class-clip", mime: blob.type || clipMime(file), blob, name: file, createdAt: now });
        result.clips.saved++;
        available.add(file);
      } else if (await db.assets.get(id)) available.add(file);
      else result.clips.missing.push(file);
    }
  }
  const clipRef = (file?: string) => (file && available.has(file) ? clipAssetId(noteId, file) : undefined);

  // 2. Palabras
  const wordIds = await importWords(pkg, exclude, tags, noteId, result);

  // 3. Apunte de clase
  const fresh = buildClassNote(pkg, noteId, exclude, now);
  fresh.wordIds = wordIds;
  const freshHash = contentHash(noteContent(fresh));
  fresh.fields.importHash = freshHash;
  const cur = await db.notes.get(noteId);
  if (cur) {
    // lo que sumaron los paquetes duplicados (trucos) se conserva
    fresh.fields.classPkg = keepMergedTips(pkg, cur.fields.classPkg as ClassPackage | undefined);
    if (cur.fields.classDuplicates) fresh.fields.classDuplicates = cur.fields.classDuplicates;
  }
  if (!cur) {
    await db.notes.put(fresh);
    result.note = "new";
  } else {
    const st = statusOf(cur.fields.importHash as string | undefined, contentHash(noteContent(cur)), freshHash, true);
    result.note = st;
    const replace = st === "update" || (st === "conflict" && resolve.note === "replace");
    if (replace) {
      await db.notes.put({ ...fresh, createdAt: cur.createdAt, pinned: cur.pinned, status: cur.status, doc: cur.doc, markdown: fresh.markdown, lastReviewed: cur.lastReviewed, tags: Array.from(new Set([...cur.tags, ...fresh.tags])), wordIds: Array.from(new Set([...cur.wordIds, ...wordIds])), links: cur.links });
    } else {
      if (st === "conflict" && !resolve.note) result.conflicts.push({ key: "note", label: "Apunte de la clase", mine: cur.title, theirs: fresh.title });
      // aunque se conserve lo del usuario, se enlazan las palabras nuevas y se guarda el paquete para las marcas ▶
      await db.notes.update(noteId, { wordIds: Array.from(new Set([...cur.wordIds, ...wordIds])), fields: { ...cur.fields, classPkg: fresh.fields.classPkg, classImport: fresh.fields.classImport, classExcluded: fresh.fields.classExcluded, ...(st === "conflict" && resolve.note === "keep" ? { importHash: freshHash } : {}) } });
    }
  }

  // 4. Conjunto «Clase DD/MM: título» del cuaderno 练习本
  const setTitle = `Clase ${ddmm(date)}: ${pkg.title}`;
  const curSet = await db.exerciseSets.get(setId);
  const set: ExerciseSet = { id: setId, lang: LANG, title: setTitle, date, topic: pkg.topics.slice(0, 3).join(", ") || undefined, tags: [CORRECTED_TAG, ...tags], createdAt: curSet?.createdAt ?? now, updatedAt: now };
  const exercises = pkg.exercises.map((e, i) => ({ e, n: i + 1 })).filter(({ n }) => !exclude.has(`ex:${n}`));
  if (exercises.length || curSet) await db.exerciseSets.put(curSet ? { ...curSet, title: set.title, date, tags: Array.from(new Set([...curSet.tags, ...set.tags])), updatedAt: now } : set);

  // 5. Un ítem por ejercicio (+ 错题本 si mi respuesta en clase no coincidía)
  for (const { e, n } of exercises) {
    const id = exerciseId(noteId, n);
    const content = exerciseContent(e);
    const hash = contentHash(content);
    const item = await db.exerciseItems.get(id);
    const classFields = { origin: "class" as const, classNoteId: noteId, clipAssetId: clipRef(e.clip) ?? item?.clipAssetId };
    if (!item) {
      await createClassItem(e, { id, setId, noteId, order: n - 1, clipAssetId: classFields.clipAssetId, date, now }, result);
      continue;
    }
    const st = statusOf(item.importHash, contentHash(itemContent(item)), hash, true);
    const replace = st === "update" || (st === "conflict" && resolve[`ex:${n}`] === "replace");
    if (replace) {
      await db.exerciseItems.put({ ...item, ...classFields, es: e.es, answers: e.teacherAnswer, hint: e.explanationEs, classAnswer: e.myAnswer, teacherExplanation: e.explanationEs, classTimestamp: e.t, confidence: e.confidence, claudeProposal: e.claudeProposal, confirmed: e.confidence === "baja" ? (item.confirmed ?? false) : item.confirmed, grammarIds: e.grammarIds ?? item.grammarIds, importHash: hash, updatedAt: now });
      result.exercises.updated++;
    } else {
      if (st === "conflict" && !resolve[`ex:${n}`]) result.conflicts.push({ key: `ex:${n}`, label: `Ejercicio ${n}: ${e.es}`, mine: item.answers.join(" · "), theirs: e.teacherAnswer.join(" · ") });
      const patch: Partial<ExerciseItem> = { ...classFields };
      if (st === "conflict" && resolve[`ex:${n}`] === "keep") patch.importHash = hash;
      await db.exerciseItems.update(id, patch);
      result.exercises.unchanged++;
    }
  }

  // 6. Aportaciones a los apuntes vivos («👩‍🏫 Clase del DD/MM», tras la sección del paquete)
  for (const [i, a] of buildLivingAdds(pkg, noteId).entries()) {
    if (exclude.has(`living:${i + 1}`)) continue;
    const hash = contentHash(livingContent(a));
    const curAdd = await db.livingNoteAdds.get(a.id);
    if (!curAdd) {
      await db.livingNoteAdds.put({ ...a, lang: LANG, createdAt: now, updatedAt: now, importHash: hash });
      result.living.added++;
      continue;
    }
    const st = statusOf(curAdd.importHash, contentHash(livingContent(curAdd)), hash, true);
    if (st === "update" || (st === "conflict" && resolve[`living:${i + 1}`] === "replace")) {
      await db.livingNoteAdds.put({ ...curAdd, ...a, importHash: hash, updatedAt: now });
      result.living.updated++;
    } else {
      if (st === "conflict" && !resolve[`living:${i + 1}`]) result.conflicts.push({ key: `living:${i + 1}`, label: `Aportación a «${a.noteId}»`, mine: curAdd.markdown, theirs: a.markdown });
      if (st === "conflict" && resolve[`living:${i + 1}`] === "keep") await db.livingNoteAdds.update(a.id, { importHash: hash });
      result.living.unchanged++;
    }
  }

  return result;
}

/* ------------------------------------------------------------------ consultas para la UI */

/** Paquete guardado en un apunte de clase importado (o undefined si es un apunte de clase escrito a mano). */
export function packageOf(n: Pick<Note, "fields">): ClassPackage | undefined {
  return n.fields?.classPkg as ClassPackage | undefined;
}

/** Espacio que ocupan los recortes de clase en IndexedDB. */
export async function classClipStats(): Promise<{ count: number; bytes: number; byNote: Map<string, { count: number; bytes: number }> }> {
  const rows = await db.assets.where("kind").equals("class-clip").toArray();
  const byNote = new Map<string, { count: number; bytes: number }>();
  let bytes = 0;
  for (const a of rows) {
    const b = a.blob?.size ?? 0;
    bytes += b;
    const k = a.noteId ?? "";
    const c = byNote.get(k) ?? { count: 0, bytes: 0 };
    c.count++;
    c.bytes += b;
    byNote.set(k, c);
  }
  return { count: rows.length, bytes, byNote };
}

/** Borra los recortes de las clases anteriores a `beforeDate` (AAAA-MM-DD). Los ejercicios pierden el botón ▶. */
export async function deleteOldClassClips(beforeDate: string): Promise<number> {
  const notes = await db.notes.where("[lang+kind]").equals([LANG, "class"]).filter((n) => (n.classDate ?? "") < beforeDate).toArray();
  const ids = new Set(notes.map((n) => n.id));
  const rows = await db.assets.where("kind").equals("class-clip").filter((a) => ids.has(a.noteId ?? "")).toArray();
  await db.transaction("rw", db.assets, db.exerciseItems, async () => {
    await db.assets.bulkDelete(rows.map((a) => a.id));
    const gone = new Set(rows.map((a) => a.id));
    await db.exerciseItems.where("origin").equals("class").modify((it: ExerciseItem) => {
      if (it.clipAssetId && gone.has(it.clipAssetId)) delete it.clipAssetId;
    });
  });
  return rows.length;
}
