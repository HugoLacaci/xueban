"use client";
/**
 * «Ficha de la lección»: cada lección del curso genera automáticamente su apunte resumen (vocabulario, estructuras
 * y frases) al completarla; el usuario puede ampliarlo. Idempotente: un apunte por lección (id fijo).
 */
import { db } from "@/lib/db";
import { getActivePack } from "@/lib/languages/registry";
import { buildNote } from "./repo";

export async function ensureLessonNote(lessonId: string): Promise<string | null> {
  const pack = getActivePack();
  const found = pack.curriculum.lessonById(lessonId);
  if (!found) return null;
  const { unit, lesson } = found;
  const id = `lesson:${pack.id}:${lessonId}`;
  if (await db.notes.get(id)) return id;
  const structures = lesson.steps.filter((s) => s.type === "grammar").map((s) => pack.grammar.byId((s as { id: string }).id)).filter(Boolean);
  const phrases = lesson.steps.filter((s) => s.type === "dialogue").flatMap((s) => (s as { lines: { zh: string; py?: string; es: string }[] }).lines.slice(0, 6).map((l) => ({ zh: l.zh, py: l.py, es: l.es })));
  const note = buildNote({
    id,
    type: "lesson",
    title: `Lección: ${lesson.title}`,
    fields: {
      lessonId,
      lessonTitle: lesson.title,
      vocab: lesson.vocab.map((v) => ({ zh: v.hanzi, py: v.pinyin, es: v.es })),
      structures: structures.map((g) => `${g!.zh} · ${g!.title} → [[zh-grammar-${g!.id}]]`),
      phrases,
    },
    markdown: `## Lo que dijo el profesor\n\n_(amplía aquí: ejemplos, matices, deberes)_\n\n${structures.map((g) => `> 💡 **Truco**: ${g!.summary}`).join("\n\n")}`,
    cues: structures.slice(0, 3).map((g, i) => ({ id: `c${i + 1}`, q: `¿Cuál es la estructura de «${g!.title}»?`, a: g!.pattern })),
    summary: lesson.goal,
    tags: ["lección", unit.id],
    unitId: unit.id,
    grammarIds: structures.map((g) => g!.id),
    level: unit.level === 0 ? 1 : unit.level,
    source: { kind: "lesson", ref: lessonId, href: `/aprender/leccion/${lessonId}` },
  });
  await db.notes.put(note);
  return id;
}
