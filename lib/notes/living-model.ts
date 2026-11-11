/**
 * Apuntes vivos: un apunte por gran tema que crece con el temario. Lógica pura (sin Dexie ni React).
 *  - El contenido base vive en content/zh/living/*.json (versionado, reviewed: false).
 *  - Cada sección declara `unlockedBy` (id de la lección que la enseña) y se desbloquea al completarla.
 *  - Las aportaciones del usuario («mías») se guardan aparte (tabla livingNoteAdds) y nunca se sobrescriben.
 */
import type { Sentence } from "@/lib/course/types";
import type { SkeletonSentence, SlotId } from "@/lib/course/skeleton";
import { curriculumRank } from "@/lib/course/skeleton";

export interface LivingSection {
  id: string;
  title: string;
  /** lección que la desbloquea (al completarla) */
  unlockedBy: string;
  /** siempre visible, aunque la lección de `unlockedBy` no esté completada (tablas de consulta) */
  open?: boolean;
  markdown: string;
  skeleton?: { focus: SlotId[]; sentences: SkeletonSentence[] };
  examples?: Sentence[];
  /** apuntes del compendio antiguo (content/zh/notes) reutilizados en esta sección */
  sourceNotes?: string[];
}

export interface LivingNote {
  id: string;
  title: string;
  zh?: string;
  order: number;
  icon?: string;
  summary: string;
  /** apunte de referencia (tabla, esquema) que se puede imprimir aunque no crezca */
  kind?: "topic" | "reference";
  sections: LivingSection[];
  reviewed: boolean;
}

export interface UserAddition {
  id: string;
  noteId: string;
  /** sección tras la que se muestra (vacío → al final) */
  afterSectionId?: string;
  kind: "section" | "example" | "teacher";
  title?: string;
  markdown: string;
  createdAt: number;
  updatedAt: number;
}

export type ProgressLike = Map<string, { status: string; completedAt?: number }>;

export function isUnlocked(section: LivingSection, progress: ProgressLike): boolean {
  return section.open === true || progress.get(section.unlockedBy)?.status === "completed";
}

/** Etiqueta corta de la lección que desbloquea («a1-u11-l2» → «U11»; «e0-05» → «0.5»; «a2-u03-l1» → «A2·U3»). */
export function unlockLabel(lessonId: string): string {
  const e0 = lessonId.match(/^e0-(\d+|cp)/);
  if (e0) return e0[1] === "cp" ? "Etapa 0" : `0.${Number(e0[1])}`;
  const m = lessonId.match(/^(a1|a2|b1)-u(\d+)/);
  if (!m) return lessonId;
  const u = Number(m[2]);
  return m[1] === "a1" ? `U${u}` : `${m[1].toUpperCase()}·U${u}`;
}

/** Secciones ordenadas por el punto del temario en que se enseñan (estable dentro de la misma lección). */
export function orderedSections(note: LivingNote): LivingSection[] {
  return note.sections
    .map((s, i) => ({ s, i }))
    .sort(
      (a, b) =>
        curriculumRank(a.s.unlockedBy) - curriculumRank(b.s.unlockedBy) ||
        lessonNum(a.s.unlockedBy) - lessonNum(b.s.unlockedBy) ||
        a.i - b.i,
    )
    .map((x) => x.s);
}
function lessonNum(id: string): number {
  return Number(id.match(/-l(\d+)$/)?.[1] ?? 0);
}

/** Línea de evolución: «Este apunte creció en U3, U9, U11…» (etiquetas únicas, en orden). */
export function growthTimeline(note: LivingNote): string[] {
  const out: string[] = [];
  for (const s of orderedSections(note)) {
    const l = unlockLabel(s.unlockedBy);
    if (!out.includes(l)) out.push(l);
  }
  return out;
}

/** Lo que crece al completar una lección: por apunte, las secciones nuevas. */
export function growthForLesson(
  notes: LivingNote[],
  lessonId: string,
): { note: LivingNote; sections: LivingSection[] }[] {
  return notes
    .map((note) => ({ note, sections: note.sections.filter((s) => s.unlockedBy === lessonId) }))
    .filter((x) => x.sections.length);
}

/** Novedades recientes (para el panel Hoy): secciones desbloqueadas en los últimos `days` días. */
export function recentGrowth(
  notes: LivingNote[],
  progress: ProgressLike,
  now: number,
  days = 7,
): { note: LivingNote; section: LivingSection; at: number }[] {
  const since = now - days * 86_400_000;
  const out: { note: LivingNote; section: LivingSection; at: number }[] = [];
  for (const note of notes)
    for (const section of note.sections) {
      const p = progress.get(section.unlockedBy);
      if (p?.status === "completed" && (p.completedAt ?? 0) >= since)
        out.push({ note, section, at: p.completedAt ?? 0 });
    }
  return out.sort((a, b) => b.at - a.at);
}

/** Estado del apunte: secciones desbloqueadas / total y la siguiente que se desbloqueará. */
export function noteStatus(
  note: LivingNote,
  progress: ProgressLike,
): { unlocked: number; total: number; next?: LivingSection } {
  const ord = orderedSections(note);
  const unlocked = ord.filter((s) => isUnlocked(s, progress)).length;
  return { unlocked, total: ord.length, next: ord.find((s) => !isUnlocked(s, progress)) };
}

/** Intercala las aportaciones del usuario tras su sección (o al final). Nunca modifica el contenido base. */
export function mergeAdditions(
  sections: LivingSection[],
  adds: UserAddition[],
): ({ type: "base"; section: LivingSection } | { type: "mine"; add: UserAddition })[] {
  const out: ({ type: "base"; section: LivingSection } | { type: "mine"; add: UserAddition })[] =
    [];
  const ids = new Set(sections.map((s) => s.id));
  for (const s of sections) {
    out.push({ type: "base", section: s });
    for (const a of adds
      .filter((x) => x.afterSectionId === s.id)
      .sort((x, y) => x.createdAt - y.createdAt))
      out.push({ type: "mine", add: a });
  }
  for (const a of adds
    .filter((x) => !x.afterSectionId || !ids.has(x.afterSectionId))
    .sort((x, y) => x.createdAt - y.createdAt))
    out.push({ type: "mine", add: a });
  return out;
}

/** Problemas de los apuntes vivos (para content:check). `lessonIds` = lecciones existentes del temario. */
export function checkLivingNotes(
  notes: LivingNote[],
  lessonIds: Set<string>,
  legacyNoteIds?: Set<string>,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const n of notes) {
    if (seen.has(n.id)) out.push(`apunte vivo duplicado: ${n.id}`);
    seen.add(n.id);
    const sec = new Set<string>();
    for (const s of n.sections) {
      if (sec.has(s.id)) out.push(`${n.id}: sección duplicada ${s.id}`);
      sec.add(s.id);
      if (!lessonIds.has(s.unlockedBy))
        out.push(`${n.id}/${s.id}: unlockedBy «${s.unlockedBy}» no es una lección del temario`);
      if (!s.markdown.trim()) out.push(`${n.id}/${s.id}: sección vacía`);
      if (legacyNoteIds)
        for (const src of s.sourceNotes ?? [])
          if (!legacyNoteIds.has(src)) out.push(`${n.id}/${s.id}: sourceNote «${src}» no existe`);
    }
  }
  return out;
}
